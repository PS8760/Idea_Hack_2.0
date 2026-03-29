from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from database import get_db
from models import ComplaintCreate, ComplaintUpdate, AnalyzePreviewRequest
from auth_utils import get_current_user
from ai_service import analyze_complaint, suggest_reply
from duplicate_detector import embed, find_duplicates, check_duplicate_for_user
from complaint_classifier import classify, get_model_info
from email_service import (
    send_escalation_email, send_complaint_confirmation,
    send_status_update, send_agent_reply, send_sla_warning
)
from bson import ObjectId
from datetime import datetime, timedelta
from collections import Counter
import csv, io

router = APIRouter()
SLA_HOURS = {"high": 4, "medium": 24, "low": 72}
ESCALATION_CHAIN = ["web", "chat", "email", "whatsapp", "phone"]

def serialize(doc) -> dict:
    doc["_id"] = str(doc["_id"])
    doc.pop("embedding", None)
    return doc

def can_view(doc, user) -> bool:
    """User sees own complaints. Agent sees assigned/escalated to their channel. Admin sees all."""
    role = user.get("role", "user")
    uid = str(user["_id"])
    if role == "admin":
        return True
    if role == "user":
        return doc.get("user_id") == uid
    if role == "agent":
        # current assignment OR previously assigned via reassign
        if doc.get("assigned_agent_id") == uid:
            return True
        if doc.get("channel") == user.get("agent_channel"):
            return True
        # check reassign history — old agent can still view
        for entry in doc.get("reassign_history", []):
            if entry.get("from_agent_id") == uid:
                return True
        return False
    return False

# ── Analyze preview ─────────────────────────────────────────────────────────
@router.post("/analyze-preview")
async def analyze_preview(body: AnalyzePreviewRequest, user=Depends(get_current_user)):
    result = analyze_complaint(body.text)
    db = get_db()
    dups = await find_duplicates(db, body.text)
    result["is_duplicate"] = len(dups) > 0
    return result

# ── Public demo analyze (no auth — for landing page) ────────────────────────
@router.post("/demo/analyze")
async def demo_analyze(body: AnalyzePreviewRequest):
    """Public endpoint for landing page demo — no authentication required."""
    if len(body.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Text too short")
    if len(body.text) > 2000:
        raise HTTPException(status_code=400, detail="Text too long")
    result = analyze_complaint(body.text)
    # Don't run duplicate check for public demo
    result["is_duplicate"] = False
    return result
# ── Submit complaint (user picks a channel → auto-assigns matching agent) ───
@router.post("")
async def create_complaint(body: ComplaintCreate, user=Depends(get_current_user)):
    db = get_db()
    uid = str(user["_id"])

    # ── Duplicate check BEFORE creating ────────────────────────────────────
    ai_title = body.title or body.description[:60]
    dup_check = await check_duplicate_for_user(db, uid, ai_title, body.description)
    if dup_check["is_duplicate"]:
        raise HTTPException(
            status_code=409,
            detail={
                "type": "duplicate",
                "message": "A similar complaint is already being processed.",
                "existing_id": dup_check["existing_id"],
                "existing_title": dup_check["existing_title"],
                "existing_status": dup_check.get("existing_status", "open"),
            }
        )

    ai = analyze_complaint(body.description)
    embedding = embed(f"{body.title} {body.description}")
    dups = await find_duplicates(db, f"{body.title} {body.description}")

    priority = ai.get("priority", "medium")
    sla_deadline = datetime.utcnow() + timedelta(hours=SLA_HOURS.get(priority, 24))

    # ── ML-powered smart routing ────────────────────────────────────────────
    full_text = f"{body.title} {body.description}".strip()
    ml_result = classify(full_text)
    ml_category     = ml_result["category"]
    ml_specialization = ml_result["specialization"]
    ml_confidence   = ml_result["confidence"]

    # Use ML category if confidence > 50%, else fall back to LLM category
    final_category = ml_category if ml_confidence > 0.5 else ai.get("category", body.category)

    # For routing, combine ML + LLM — if both agree, high confidence
    llm_category = ai.get("category", "Other")
    from complaint_classifier import CATEGORY_TO_SPECIALIZATION
    llm_specialization = CATEGORY_TO_SPECIALIZATION.get(llm_category, "General")

    # Use ML specialization if confident, else use LLM specialization
    routing_specialization = ml_specialization if ml_confidence > 0.5 else llm_specialization

    print(f"[ROUTING] ML:{ml_category}({ml_confidence:.0%}) LLM:{llm_category} → routing as: {routing_specialization} on channel: {body.channel}")

    # ── 6-tier routing priority ──────────────────────────────────────────────
    # Tier 1: channel + specialization (perfect match)
    # Tier 2: specialization only, non-General (right expert, any channel)
    # Tier 3: channel + General specialization (right channel, generalist)
    # Tier 4: channel only (right channel, any specialization)
    # Tier 5: specialization only (right expert, any channel — last expert attempt)
    # Tier 6: any active agent (absolute fallback)

    agent = None
    routing_method = "none"

    # Tier 1: perfect match
    if routing_specialization != "General":
        agent = await db.users.find_one({
            "role": "agent",
            "agent_channel": body.channel,
            "specialization": routing_specialization,
            "active": {"$ne": False}
        })
        if agent: routing_method = "channel+specialization"

    # Tier 2: specialist on any channel (specialization > channel)
    if not agent and routing_specialization != "General":
        agent = await db.users.find_one({
            "role": "agent",
            "specialization": routing_specialization,
            "active": {"$ne": False}
        })
        if agent: routing_method = "specialization_only"

    # Tier 3: General agent on correct channel
    if not agent:
        agent = await db.users.find_one({
            "role": "agent",
            "agent_channel": body.channel,
            "specialization": "General",
            "active": {"$ne": False}
        })
        if agent: routing_method = "channel+general"

    # Tier 4: any agent on correct channel
    if not agent:
        agent = await db.users.find_one({
            "role": "agent",
            "agent_channel": body.channel,
            "active": {"$ne": False}
        })
        if agent: routing_method = "channel_only"

    # Tier 5: any specialist regardless of channel (try LLM category too)
    if not agent and llm_specialization != "General" and llm_specialization != routing_specialization:
        agent = await db.users.find_one({
            "role": "agent",
            "specialization": llm_specialization,
            "active": {"$ne": False}
        })
        if agent: routing_method = "llm_specialization"

    # Tier 6: absolute fallback — any active agent
    if not agent:
        agent = await db.users.find_one({
            "role": "agent",
            "active": {"$ne": False}
        })
        if agent: routing_method = "fallback"

    assigned_agent_id = str(agent["_id"]) if agent else None
    assigned_agent    = agent.get("name", "") if agent else ""

    print(f"[ROUTING] → Assigned: '{assigned_agent}' via [{routing_method}]")

    # Flag for escalation suggestion if routing wasn't ideal
    needs_escalation_suggestion = (
        routing_method in ("channel_only", "channel+general", "fallback", "llm_specialization")
        and routing_specialization != "General"
        and ml_confidence > 0.5
    )

    doc = {
        "title": body.title or ai.get("title", body.description[:60]),
        "description": body.description,
        "category": final_category,
        "product": ai.get("product", body.product or "General"),
        "channel": body.channel,
        "contact_number": body.contact_number,
        "sentiment": ai.get("sentiment", "neutral"),
        "priority": priority,
        "severity_score": ai.get("severity_score", 5),
        "summary": ai.get("summary", ""),
        "key_issues": ai.get("key_issues", []),
        "urgency_signals": ai.get("urgency_signals", []),
        "suggested_actions": ai.get("suggested_actions", []),
        "status": "open",
        "sla_deadline": sla_deadline,
        "is_duplicate": len(dups) > 0,
        "duplicates_of": dups,
        "embedding": embedding,
        "user_id": str(user["_id"]),
        "assigned_agent_id": assigned_agent_id,
        "assigned_agent": assigned_agent,
        "escalation_history": [],
        "messages": [],
        # ML routing metadata
        "ml_category": ml_category,
        "ml_specialization": ml_specialization,
        "ml_confidence": ml_confidence,
        "routing_method": routing_method,
        "needs_escalation_suggestion": needs_escalation_suggestion,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.complaints.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc.pop("embedding")

    # Send confirmation email (all channels)
    if user.get("email"):
        import asyncio
        asyncio.create_task(send_complaint_confirmation(
            user["email"], user.get("name", "User"),
            doc["_id"], doc["title"], doc["category"],
            priority, sla_deadline, assigned_agent
        ))

    return doc

# ── My complaints (user's own) ──────────────────────────────────────────────
@router.get("/mine")
async def my_complaints(user=Depends(get_current_user)):
    db = get_db()
    cursor = db.complaints.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    return [serialize(doc) async for doc in cursor]

# ── List complaints (role-scoped) ───────────────────────────────────────────
@router.get("")
async def list_complaints(
    status: str = None, priority: str = None,
    search: str = None, channel: str = None,
    user=Depends(get_current_user)
):
    db = get_db()
    role = user.get("role", "user")
    uid = str(user["_id"])

    query = {}
    if role == "user":
        query["user_id"] = uid
    elif role == "agent":
        query["$or"] = [
            {"assigned_agent_id": uid},
            {"channel": user.get("agent_channel")}
        ]
    # admin → no filter

    if status:   query["status"] = status
    if priority: query["priority"] = priority
    if channel:  query["channel"] = channel
    if search:   query["title"] = {"$regex": search, "$options": "i"}

    cursor = db.complaints.find(query).sort("created_at", -1).limit(200)
    return [serialize(doc) async for doc in cursor]

# ── Insights (admin/agent only) ─────────────────────────────────────────────
@router.get("/insights")
async def get_insights(user=Depends(get_current_user)):
    db = get_db()
    role = user.get("role", "user")
    uid = str(user["_id"])
    query = {} if role == "admin" else {"$or": [{"assigned_agent_id": uid}, {"channel": user.get("agent_channel")}]}
    all_docs = await db.complaints.find(query).to_list(length=1000)

    from collections import defaultdict
    daily = defaultdict(int)
    for d in all_docs:
        if d.get("created_at"):
            daily[d["created_at"].strftime("%m/%d")] += 1
    trend = [{"date": k, "count": v} for k, v in sorted(daily.items())[-14:]]

    now = datetime.utcnow()
    breaches = sum(1 for d in all_docs if d.get("sla_deadline") and d["sla_deadline"] < now and d.get("status") != "resolved")
    resolved = [d for d in all_docs if d.get("status") == "resolved" and d.get("updated_at") and d.get("created_at")]
    avg_res = round(sum((d["updated_at"] - d["created_at"]).total_seconds() for d in resolved) / len(resolved) / 3600, 1) if resolved else None
    title_counts = Counter(d.get("title") for d in all_docs)

    # ── Channel performance breakdown ──────────────────────────────────────
    channels = ["web", "email", "whatsapp", "phone", "chat"]
    channel_perf = {}
    for ch in channels:
        ch_docs = [d for d in all_docs if d.get("channel") == ch]
        if not ch_docs:
            continue
        ch_resolved = [d for d in ch_docs if d.get("status") == "resolved" and d.get("updated_at") and d.get("created_at")]
        ch_breaches = sum(1 for d in ch_docs if d.get("sla_deadline") and d["sla_deadline"] < now and d.get("status") != "resolved")
        ch_avg_res = round(sum((d["updated_at"] - d["created_at"]).total_seconds() for d in ch_resolved) / len(ch_resolved) / 3600, 1) if ch_resolved else None
        ch_sla_total = len([d for d in ch_docs if d.get("sla_deadline")])
        ch_sla_met = ch_sla_total - ch_breaches
        ch_sla_rate = round((ch_sla_met / ch_sla_total) * 100) if ch_sla_total > 0 else 100
        channel_perf[ch] = {
            "total": len(ch_docs),
            "open": sum(1 for d in ch_docs if d.get("status") == "open"),
            "in_progress": sum(1 for d in ch_docs if d.get("status") == "in-progress"),
            "resolved": len(ch_resolved),
            "sla_breaches": ch_breaches,
            "sla_compliance": ch_sla_rate,
            "avg_resolution_hours": ch_avg_res,
        }

    return {
        "total": len(all_docs),
        "by_category": dict(Counter(d.get("category") for d in all_docs)),
        "by_sentiment": dict(Counter(d.get("sentiment") for d in all_docs)),
        "by_priority":  dict(Counter(d.get("priority") for d in all_docs)),
        "by_status":    dict(Counter(d.get("status") for d in all_docs)),
        "daily_trend": trend,
        "sla_breaches": breaches,
        "avg_resolution_time": avg_res,
        "top_issues": [{"title": t, "count": c} for t, c in title_counts.most_common(5) if c > 1],
        "channel_performance": channel_perf,
    }

# ── ML Model info (admin only) ───────────────────────────────────────────────
@router.get("/model/info")
async def model_info_endpoint(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return get_model_info()

# ── Regulatory CSV export (admin only) ──────────────────────────────────────
@router.get("/export/csv")
async def export_csv(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    docs = await db.complaints.find({}).sort("created_at", -1).to_list(length=5000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Complaint ID", "Title", "Category", "Product", "Channel",
        "Priority", "Severity Score", "Sentiment", "Status",
        "Assigned Agent", "SLA Deadline", "SLA Breached",
        "Is Duplicate", "Escalation Count",
        "Created At", "Updated At", "Resolution Time (hrs)"
    ])
    now = datetime.utcnow()
    for d in docs:
        sla = d.get("sla_deadline")
        created = d.get("created_at")
        updated = d.get("updated_at")
        sla_breached = "Yes" if sla and sla < now and d.get("status") != "resolved" else "No"
        res_time = ""
        if d.get("status") == "resolved" and created and updated:
            res_time = round((updated - created).total_seconds() / 3600, 2)
        writer.writerow([
            str(d["_id"]),
            d.get("title", ""),
            d.get("category", ""),
            d.get("product", ""),
            d.get("channel", ""),
            d.get("priority", ""),
            d.get("severity_score", ""),
            d.get("sentiment", ""),
            d.get("status", ""),
            d.get("assigned_agent", ""),
            sla.strftime("%Y-%m-%d %H:%M") if sla else "",
            sla_breached,
            "Yes" if d.get("is_duplicate") else "No",
            len(d.get("escalation_history", [])),
            created.strftime("%Y-%m-%d %H:%M") if created else "",
            updated.strftime("%Y-%m-%d %H:%M") if updated else "",
            res_time,
        ])

    output.seek(0)
    filename = f"complaints_report_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ── AI Narrator (role-scoped) ─────────────────────────────────────────────────
@router.get("/ai-narrator")
async def ai_narrator(user=Depends(get_current_user)):
    if user.get("role") not in ("admin", "agent"):
        raise HTTPException(status_code=403, detail="Not allowed")
    db = get_db()
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_1h  = now - timedelta(hours=1)
    role = user.get("role")
    uid  = str(user["_id"])

    # Scope query — agent sees only their assigned complaints
    if role == "agent":
        query = {"$or": [
            {"assigned_agent_id": uid},
            {"channel": user.get("agent_channel")}
        ]}
    else:
        query = {}

    all_docs   = await db.complaints.find(query).to_list(length=500)
    today_docs = [d for d in all_docs if d.get("created_at") and d["created_at"] >= last_24h]
    hour_docs  = [d for d in all_docs if d.get("created_at") and d["created_at"] >= last_1h]

    open_count   = sum(1 for d in all_docs if d.get("status") == "open")
    inprog_count = sum(1 for d in all_docs if d.get("status") == "in-progress")
    resolved_count = sum(1 for d in all_docs if d.get("status") == "resolved")
    breaches     = sum(1 for d in all_docs if d.get("sla_deadline") and d["sla_deadline"] < now and d.get("status") != "resolved")
    high_prio    = sum(1 for d in all_docs if d.get("priority") == "high" and d.get("status") != "resolved")

    today_cats = dict(Counter(d.get("category") for d in today_docs))
    top_cat    = max(today_cats, key=today_cats.get) if today_cats else None
    today_sentiments = dict(Counter(d.get("sentiment") for d in today_docs))
    neg_pct = round(today_sentiments.get("negative", 0) / max(len(today_docs), 1) * 100)
    urgent = [d for d in all_docs if d.get("priority") == "high" and d.get("status") != "resolved"]
    urgent_titles = [d.get("title", "") for d in urgent[:3]]

    if not all_docs:
        msg = "Your queue is clear — no complaints assigned to you yet." if role == "agent" else "No complaints in the system yet."
        return {"narrative": msg, "generated_at": now.isoformat(), "stats": {}}

    try:
        from ai_service import _chat
        if role == "agent":
            agent_name = user.get("name", "Agent")
            prompt = f"""You are an AI analyst briefing a support agent named {agent_name}. Write a concise personal performance and queue briefing. Sound like a smart analyst, not a robot. Be specific with numbers. Max 3 sentences. Address the agent directly.

Agent's queue data:
- Total complaints assigned: {len(all_docs)}
- New assigned in last 24 hours: {len(today_docs)}
- Currently open: {open_count}
- In progress: {inprog_count}
- Resolved total: {resolved_count}
- SLA breaches in their queue: {breaches}
- High priority unresolved: {high_prio}
- Top complaint category: {top_cat or 'N/A'}
- Negative sentiment complaints: {neg_pct}%
- Most urgent titles: {urgent_titles}

Write the briefing now, addressing {agent_name} directly. Start directly with the insight:"""
        else:
            prompt = f"""You are an AI operations analyst for a customer complaint management platform. Write a concise, insightful real-time status briefing for the admin. Sound like a smart analyst, not a robot. Be specific with numbers. Max 3 sentences.

Current data:
- Total complaints in system: {len(all_docs)}
- New in last 24 hours: {len(today_docs)}
- New in last 1 hour: {len(hour_docs)}
- Currently open: {open_count}
- In progress: {inprog_count}
- SLA breaches right now: {breaches}
- High priority unresolved: {high_prio}
- Top category today: {top_cat or 'N/A'} ({today_cats.get(top_cat, 0) if top_cat else 0} complaints)
- Negative sentiment today: {neg_pct}%
- Most urgent titles: {urgent_titles}

Write the briefing now. Start directly with the insight, no preamble:"""

        narrative = _chat(prompt)
        return {
            "narrative": narrative,
            "generated_at": now.isoformat(),
            "stats": {
                "today": len(today_docs),
                "last_hour": len(hour_docs),
                "open": open_count,
                "breaches": breaches,
                "high_priority": high_prio,
                "neg_pct": neg_pct,
            }
        }
    except Exception as e:
        print(f"[NARRATOR] failed: {e}")
        narrative = f"{len(today_docs)} complaints received in the last 24 hours. "
        if breaches > 0:
            narrative += f"{breaches} SLA breach{'es' if breaches > 1 else ''} require immediate attention. "
        if high_prio > 0:
            narrative += f"{high_prio} high-priority complaint{'s' if high_prio > 1 else ''} pending resolution."
        return {"narrative": narrative.strip(), "generated_at": now.isoformat(), "stats": {"today": len(today_docs), "breaches": breaches, "high_priority": high_prio}}

# ── Complaint Heatmap (admin/agent) ──────────────────────────────────────────
@router.get("/heatmap")
async def complaint_heatmap(user=Depends(get_current_user)):
    if user.get("role") not in ("admin", "agent"):
        raise HTTPException(status_code=403, detail="Not allowed")
    db = get_db()
    role = user.get("role")
    uid  = str(user["_id"])

    query = {} if role == "admin" else {"$or": [{"assigned_agent_id": uid}, {"channel": user.get("agent_channel")}]}
    # Last 8 weeks
    cutoff = datetime.utcnow() - timedelta(weeks=8)
    query["created_at"] = {"$gte": cutoff}

    docs = await db.complaints.find(query, {"created_at": 1}).to_list(length=5000)

    # Build 7×24 matrix (day_of_week × hour)
    matrix = [[0] * 24 for _ in range(7)]
    for d in docs:
        dt = d.get("created_at")
        if dt:
            matrix[dt.weekday()][dt.hour] += 1

    max_val = max(max(row) for row in matrix) or 1
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    return {
        "matrix": matrix,
        "max_value": max_val,
        "days": days,
        "total_in_period": len(docs),
    }

# ── Similar complaints ────────────────────────────────────────────────────────
@router.get("/{complaint_id}/similar")
async def get_similar_complaints(complaint_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")

    # Find complaints with same category, excluding current
    same_cat = await db.complaints.find({
        "_id": {"$ne": ObjectId(complaint_id)},
        "category": doc.get("category"),
        "status": "resolved",  # only show resolved — so agent sees how it was fixed
    }).sort("created_at", -1).limit(50).to_list(length=50)

    if not same_cat:
        # Fallback: any resolved complaint
        same_cat = await db.complaints.find({
            "_id": {"$ne": ObjectId(complaint_id)},
            "status": "resolved",
        }).sort("created_at", -1).limit(50).to_list(length=50)

    if not same_cat:
        return {"similar": []}

    # Score by word overlap with current complaint
    import re
    def normalize(text):
        return set(re.sub(r'[^\w\s]', '', text.lower()).split())

    current_words = normalize(f"{doc.get('title','')} {doc.get('description','')[:200]}")

    scored = []
    for s in same_cat:
        s_words = normalize(f"{s.get('title','')} {s.get('description','')[:200]}")
        if not current_words or not s_words:
            continue
        overlap = len(current_words & s_words) / len(current_words | s_words)
        scored.append((overlap, s))

    scored.sort(key=lambda x: -x[0])
    top = scored[:3]

    result = []
    for score, s in top:
        # Get last agent message as resolution note
        messages = s.get("messages", [])
        resolution_note = next(
            (m["text"] for m in reversed(messages) if m.get("sender_role") == "agent"),
            None
        )
        # Get status history note
        status_history = s.get("status_history", [])
        resolution_audit = next(
            (h["note"] for h in reversed(status_history) if h.get("to_status") == "resolved" and h.get("note")),
            None
        )
        result.append({
            "id": str(s["_id"]),
            "title": s.get("title", ""),
            "category": s.get("category", ""),
            "priority": s.get("priority", ""),
            "channel": s.get("channel", ""),
            "similarity_score": round(score * 100),
            "resolution_note": resolution_audit or resolution_note or "Resolved without notes.",
            "resolved_at": s.get("updated_at", "").isoformat() if s.get("updated_at") else "",
            "summary": s.get("summary", ""),
        })

    return {"similar": result}
@router.get("/report/root-cause")
async def root_cause_report(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    docs = await db.complaints.find({}).sort("created_at", -1).to_list(length=200)
    if not docs:
        return {"report": "No complaints data available yet."}

    # Build a compact summary for the AI
    category_counts = dict(Counter(d.get("category") for d in docs))
    sentiment_counts = dict(Counter(d.get("sentiment") for d in docs))
    top_titles = [t for t, c in Counter(d.get("title") for d in docs).most_common(10)]
    sla_breaches = sum(1 for d in docs if d.get("sla_deadline") and
                       d["sla_deadline"] < datetime.utcnow() and d.get("status") != "resolved")
    high_priority = sum(1 for d in docs if d.get("priority") == "high")
    all_issues = []
    for d in docs:
        all_issues.extend(d.get("key_issues", []))
    top_issues = [issue for issue, _ in Counter(all_issues).most_common(10)]

    try:
        from ai_service import _chat
        prompt = f"""You are a senior customer experience analyst. Based on this complaint data, write a concise root cause analysis report.

Data summary:
- Total complaints: {len(docs)}
- By category: {category_counts}
- By sentiment: {sentiment_counts}
- High priority complaints: {high_priority}
- SLA breaches: {sla_breaches}
- Most frequent complaint titles: {top_titles[:5]}
- Most common extracted issues: {top_issues[:8]}

Write a structured report with:
1. Executive Summary (2-3 sentences)
2. Top 3 Root Causes identified
3. Most affected product/service areas
4. Recommended immediate actions (3 bullet points)
5. Regulatory risk assessment (1-2 sentences)

Keep it professional, concise, and actionable. Max 300 words."""
        report = _chat(prompt)
        return {"report": report, "generated_at": datetime.utcnow().isoformat()}
    except Exception as e:
        return {"report": f"Report generation failed: {e}", "generated_at": datetime.utcnow().isoformat()}

# ── Get single complaint ────────────────────────────────────────────────────
@router.get("/{complaint_id}")
async def get_complaint(complaint_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")
    return serialize(doc)

# ── Update status/priority ──────────────────────────────────────────────────
@router.patch("/{complaint_id}")
async def update_complaint(complaint_id: str, body: ComplaintUpdate, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc or not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")
    update = {"updated_at": datetime.utcnow()}
    if body.status:   update["status"] = body.status
    if body.priority: update["priority"] = body.priority

    # Store status change in audit trail
    if body.status and body.status != doc.get("status"):
        audit_entry = {
            "from_status": doc.get("status"),
            "to_status": body.status,
            "changed_by": user.get("name", ""),
            "changed_by_role": user.get("role", ""),
            "note": body.note or "",
            "at": datetime.utcnow().isoformat(),
        }
        await db.complaints.update_one(
            {"_id": ObjectId(complaint_id)},
            {"$push": {"status_history": audit_entry}}
        )

    await db.complaints.update_one({"_id": ObjectId(complaint_id)}, {"$set": update})

    # Send status update email to complaint owner
    if body.status and body.status != doc.get("status"):
        owner = await db.users.find_one({"_id": ObjectId(doc["user_id"])})
        if owner and owner.get("email"):
            import asyncio
            asyncio.create_task(send_status_update(
                owner["email"], owner.get("name", "User"),
                complaint_id, doc.get("title", ""),
                body.status, user.get("name", "")
            ))

    return serialize(await db.complaints.find_one({"_id": ObjectId(complaint_id)}))

# ── Agent email reply (email channel) ──────────────────────────────────────
@router.post("/{complaint_id}/email-reply")
async def send_email_reply(complaint_id: str, body: dict, user=Depends(get_current_user)):
    if user.get("role") not in ("agent", "admin"):
        raise HTTPException(status_code=403, detail="Agents and admins only")
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc or not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")

    reply_text = body.get("reply", "").strip()
    if not reply_text:
        raise HTTPException(status_code=400, detail="Reply text is required")

    # Store reply in messages array as a regular message
    from bson import ObjectId as ObjId
    from datetime import timezone, timedelta
    IST = timezone(timedelta(hours=5, minutes=30))
    message = {
        "id": str(ObjId()),
        "sender_id": str(user["_id"]),
        "sender_name": user.get("name", ""),
        "sender_role": user.get("role", "agent"),
        "text": reply_text,
        "msg_type": "email",
        "at": datetime.now(IST).isoformat(),
        "read": False,
    }
    await db.complaints.update_one(
        {"_id": ObjectId(complaint_id)},
        {"$push": {"messages": message}, "$set": {"updated_at": datetime.utcnow()}}
    )

    # Send actual email to complaint owner
    owner = await db.users.find_one({"_id": ObjectId(doc["user_id"])})
    if owner and owner.get("email"):
        import asyncio
        asyncio.create_task(send_agent_reply(
            owner["email"], owner.get("name", "User"),
            complaint_id, doc.get("title", ""),
            user.get("name", "Agent"), reply_text
        ))

    return {"sent": True, "message": message}

# ── Agent reply suggestion ──────────────────────────────────────────────────
@router.post("/{complaint_id}/suggest-reply")
async def suggest_reply_endpoint(complaint_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc or not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")
    # Include escalation history in context
    history_ctx = ""
    for e in doc.get("escalation_history", []):
        history_ctx += f"\n- Escalated from {e['from']} to {e['to']}: {e['reason']}"
    return {"suggestion": suggest_reply(doc["title"], doc["description"] + history_ctx, doc.get("category", ""))}

# ── Escalate complaint ──────────────────────────────────────────────────────
@router.post("/{complaint_id}/escalate")
async def escalate_complaint(complaint_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc or not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")

    current_channel = doc.get("channel", "web")
    history = doc.get("escalation_history", [])
    current_messages = doc.get("messages", [])

    try:
        idx = ESCALATION_CHAIN.index(current_channel)
        next_channel = ESCALATION_CHAIN[(idx + 1) % len(ESCALATION_CHAIN)]
    except ValueError:
        next_channel = "email"

    # Find next agent
    next_agent = await db.users.find_one({"role": "agent", "agent_channel": next_channel, "active": {"$ne": False}})
    reason = f"No resolution via {current_channel}. Escalated by {user.get('name', 'agent')}."

    # Build AI summary of the current chat session
    chat_summary = ""
    if current_messages:
        lines = [f"{m['sender_name']} ({m['sender_role']}): {m['text']}" for m in current_messages]
        try:
            from ai_service import summarize_text
            chat_summary = summarize_text("\n".join(lines))
        except Exception:
            chat_summary = f"{len(current_messages)} messages exchanged via {current_channel} channel."

    history.append({
        "from": current_channel,
        "to": next_channel,
        "reason": reason,
        "at": datetime.utcnow().isoformat(),
        "escalated_by": str(user["_id"]),
        "escalated_by_name": user.get("name", ""),
        # Snapshot the full chat + AI summary for the previous agent's history
        "chat_snapshot": current_messages,
        "chat_summary": chat_summary,
    })

    update = {
        "channel": next_channel,
        "escalated_to": next_channel,
        "escalation_history": history,
        "status": "open",
        "updated_at": datetime.utcnow(),
        # Clear messages so new agent starts a fresh session
        "messages": [],
    }
    if next_agent:
        update["assigned_agent_id"] = str(next_agent["_id"])
        update["assigned_agent"] = next_agent.get("name", "")

    await db.complaints.update_one({"_id": ObjectId(complaint_id)}, {"$set": update})

    # Email the complaint owner
    owner = await db.users.find_one({"_id": ObjectId(doc["user_id"])})
    if owner and owner.get("email"):
        await send_escalation_email(
            owner["email"], owner.get("name", "User"),
            doc["title"], current_channel, next_channel, reason
        )

    return serialize(await db.complaints.find_one({"_id": ObjectId(complaint_id)}))


# ── Delete complaint (owner or admin only) ──────────────────────────────────
@router.delete("/{complaint_id}")
async def delete_complaint(complaint_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    # Only the complaint owner or an admin can delete
    if user.get("role") != "admin" and doc.get("user_id") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    await db.complaints.delete_one({"_id": ObjectId(complaint_id)})
    return {"deleted": True}
