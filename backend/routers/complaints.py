from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from database import get_db
from models import ComplaintCreate, ComplaintUpdate, AnalyzePreviewRequest
from auth_utils import get_current_user
from ai_service import analyze_complaint, suggest_reply
from duplicate_detector import embed, find_duplicates, check_duplicate_for_user
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
        return (doc.get("assigned_agent_id") == uid or
                doc.get("channel") == user.get("agent_channel"))
    return False

# ── Analyze preview ─────────────────────────────────────────────────────────
@router.post("/analyze-preview")
async def analyze_preview(body: AnalyzePreviewRequest, user=Depends(get_current_user)):
    result = analyze_complaint(body.text)
    db = get_db()
    dups = await find_duplicates(db, body.text)
    result["is_duplicate"] = len(dups) > 0
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

    # Find an active agent for the chosen channel
    agent = await db.users.find_one({"role": "agent", "agent_channel": body.channel, "active": {"$ne": False}})
    assigned_agent_id = str(agent["_id"]) if agent else None
    assigned_agent = agent.get("name", "") if agent else ""

    doc = {
        "title": body.title or ai.get("title", body.description[:60]),
        "description": body.description,
        "category": ai.get("category", body.category),
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
    }

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

# ── AI Root Cause Report (admin only) ───────────────────────────────────────
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
