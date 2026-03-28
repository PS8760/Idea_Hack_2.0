"""
Regulatory Reporting — admin only.
Generates complaint register reports with full audit trail,
SLA compliance, category breakdown, and AI executive summary.
Supports CSV export and JSON for frontend preview.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from database import get_db
from auth_utils import get_current_user
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from bson import ObjectId
import csv, io, json, os

router = APIRouter()

def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

def _parse_date(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d")

def _fmt(dt) -> str:
    if not dt: return "—"
    if isinstance(dt, str): return dt[:19].replace("T", " ")
    return dt.strftime("%Y-%m-%d %H:%M")

def _sla_status(doc) -> str:
    deadline = doc.get("sla_deadline")
    status   = doc.get("status", "open")
    if status == "resolved": return "Met"
    if not deadline: return "N/A"
    return "Breached" if deadline < datetime.utcnow() else "Within SLA"

def _resolution_hours(doc) -> str:
    if doc.get("status") != "resolved": return "—"
    c, u = doc.get("created_at"), doc.get("updated_at")
    if not c or not u: return "—"
    hrs = round((u - c).total_seconds() / 3600, 1)
    return f"{hrs}h"

async def _fetch_complaints(db, date_from: str, date_to: str, channel: str = None, status: str = None):
    try:
        start = _parse_date(date_from)
        end   = _parse_date(date_to) + timedelta(days=1)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    if (end - start).days > 366:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 1 year")

    query = {"created_at": {"$gte": start, "$lt": end}}
    if channel and channel != "all": query["channel"] = channel
    if status  and status  != "all": query["status"]  = status

    cursor = db.complaints.find(query).sort("created_at", -1).limit(5000)
    return [doc async for doc in cursor]

# ── Report preview (JSON) ────────────────────────────────────────────────────
@router.get("/preview")
async def report_preview(
    date_from: str = Query(...),
    date_to:   str = Query(...),
    channel:   str = Query("all"),
    status:    str = Query("all"),
    admin=Depends(require_admin)
):
    db = get_db()
    docs = await _fetch_complaints(db, date_from, date_to, channel, status)

    if not docs:
        return {
            "total": 0, "rows": [], "summary": {},
            "ai_summary": "No complaints found for the selected period.",
            "date_from": date_from, "date_to": date_to,
        }

    now = datetime.utcnow()
    resolved   = [d for d in docs if d.get("status") == "resolved"]
    breached   = [d for d in docs if _sla_status(d) == "Breached"]
    open_count = len([d for d in docs if d.get("status") == "open"])
    inprog     = len([d for d in docs if d.get("status") == "in-progress"])

    res_times = []
    for d in resolved:
        c, u = d.get("created_at"), d.get("updated_at")
        if c and u:
            res_times.append((u - c).total_seconds() / 3600)
    avg_res = round(sum(res_times) / len(res_times), 1) if res_times else None

    by_category = dict(Counter(d.get("category", "Other") for d in docs))
    by_channel  = dict(Counter(d.get("channel",  "web")   for d in docs))
    by_priority = dict(Counter(d.get("priority", "medium") for d in docs))
    by_sentiment= dict(Counter(d.get("sentiment","neutral") for d in docs))

    # SLA compliance rate
    sla_total     = len([d for d in docs if d.get("sla_deadline")])
    sla_compliant = sla_total - len(breached)
    sla_rate      = round((sla_compliant / sla_total * 100), 1) if sla_total else 100

    # Top 5 issues
    top_issues = [{"title": t, "count": c}
                  for t, c in Counter(d.get("title","") for d in docs).most_common(5) if c > 1]

    # Escalation stats
    escalated = len([d for d in docs if d.get("escalation_history")])

    summary = {
        "total": len(docs),
        "resolved": len(resolved),
        "open": open_count,
        "in_progress": inprog,
        "sla_breaches": len(breached),
        "sla_compliance_rate": sla_rate,
        "avg_resolution_hours": avg_res,
        "escalated": escalated,
        "by_category": by_category,
        "by_channel": by_channel,
        "by_priority": by_priority,
        "by_sentiment": by_sentiment,
        "top_issues": top_issues,
    }

    # AI executive summary
    ai_summary = _generate_ai_summary(summary, date_from, date_to)

    # Rows for preview table (max 100 for UI)
    rows = []
    for i, d in enumerate(docs[:100]):
        rows.append({
            "ref":         f"SR-{str(d['_id'])[-6:].upper()}",
            "title":       d.get("title", "—"),
            "category":    d.get("category", "—"),
            "product":     d.get("product", "—"),
            "channel":     d.get("channel", "—"),
            "priority":    d.get("priority", "—"),
            "sentiment":   d.get("sentiment", "—"),
            "severity":    d.get("severity_score", "—"),
            "status":      d.get("status", "—"),
            "sla_status":  _sla_status(d),
            "assigned_agent": d.get("assigned_agent", "Unassigned"),
            "escalated":   "Yes" if d.get("escalation_history") else "No",
            "resolution_time": _resolution_hours(d),
            "created_at":  _fmt(d.get("created_at")),
            "resolved_at": _fmt(d.get("updated_at")) if d.get("status") == "resolved" else "—",
        })

    return {
        "total": len(docs),
        "showing": len(rows),
        "rows": rows,
        "summary": summary,
        "ai_summary": ai_summary,
        "date_from": date_from,
        "date_to": date_to,
        "generated_at": _fmt(now),
    }

# ── CSV export ───────────────────────────────────────────────────────────────
@router.get("/export/csv")
async def export_csv(
    date_from: str = Query(...),
    date_to:   str = Query(...),
    channel:   str = Query("all"),
    status:    str = Query("all"),
    admin=Depends(require_admin)
):
    db = get_db()
    docs = await _fetch_complaints(db, date_from, date_to, channel, status)

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    # Header
    writer.writerow([
        "Reference ID", "Title", "Description", "Category", "Product",
        "Channel", "Priority", "Severity Score", "Sentiment", "Status",
        "SLA Status", "SLA Deadline", "Resolution Time",
        "Assigned Agent", "Escalated", "Escalation Count",
        "Key Issues", "Submitted At", "Resolved At",
    ])

    for d in docs:
        key_issues = "; ".join(d.get("key_issues", []))
        esc_history = d.get("escalation_history", [])
        writer.writerow([
            f"SR-{str(d['_id'])[-6:].upper()}",
            d.get("title", ""),
            d.get("description", "")[:200].replace("\n", " "),
            d.get("category", ""),
            d.get("product", ""),
            d.get("channel", ""),
            d.get("priority", ""),
            d.get("severity_score", ""),
            d.get("sentiment", ""),
            d.get("status", ""),
            _sla_status(d),
            _fmt(d.get("sla_deadline")),
            _resolution_hours(d),
            d.get("assigned_agent", "Unassigned"),
            "Yes" if esc_history else "No",
            len(esc_history),
            key_issues,
            _fmt(d.get("created_at")),
            _fmt(d.get("updated_at")) if d.get("status") == "resolved" else "",
        ])

    output.seek(0)
    filename = f"complaint_report_{date_from}_to_{date_to}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ── AI executive summary ─────────────────────────────────────────────────────
def _generate_ai_summary(summary: dict, date_from: str, date_to: str) -> str:
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        model  = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

        top_cats = sorted(summary["by_category"].items(), key=lambda x: -x[1])[:3]
        top_cat_str = ", ".join([f"{k} ({v})" for k, v in top_cats])
        top_issues_str = ", ".join([i["title"] for i in summary.get("top_issues", [])[:3]])

        prompt = f"""You are a compliance officer writing an executive summary for a regulatory complaint report.

Period: {date_from} to {date_to}
Total complaints: {summary['total']}
Resolved: {summary['resolved']} | Open: {summary['open']} | In Progress: {summary['in_progress']}
SLA compliance rate: {summary['sla_compliance_rate']}%
SLA breaches: {summary['sla_breaches']}
Average resolution time: {summary['avg_resolution_hours']}h
Escalated complaints: {summary['escalated']}
Top categories: {top_cat_str}
Recurring issues: {top_issues_str or 'None'}
Sentiment: {summary['by_sentiment']}

Write a 3-4 sentence professional executive summary highlighting key findings, compliance status, and any areas of concern. Be specific with numbers. Do not use bullet points."""

        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[REPORT AI] summary failed: {e}")
        total = summary['total']
        rate  = summary['sla_compliance_rate']
        res   = summary['resolved']
        return (f"During the selected period, {total} complaints were received with a resolution rate of "
                f"{round(res/total*100) if total else 0}% and SLA compliance of {rate}%. "
                f"{summary['sla_breaches']} SLA breaches were recorded requiring immediate attention.")
