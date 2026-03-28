from fastapi import APIRouter, Depends, HTTPException, Query
from database import get_db
from models import ComplaintCreate, ComplaintUpdate, AnalyzePreviewRequest
from auth_utils import get_current_user
from ai_service import analyze_complaint, suggest_reply, ai_assist_step, bullet_summary
from duplicate_detector import embed, find_duplicates
from email_service import send_escalation_email
from bson import ObjectId
from datetime import datetime, timedelta
from collections import Counter
from pydantic import BaseModel

router = APIRouter()
SLA_HOURS = {"high": 4, "medium": 24, "low": 72}
ESCALATION_CHAIN = ["web", "chat", "email", "whatsapp", "phone"]

def serialize(doc) -> dict:
    doc["_id"] = str(doc["_id"])
    doc.pop("embedding", None)
    # Ensure datetime fields are ISO strings so JS can parse them correctly
    for field in ("created_at", "updated_at", "sla_deadline"):
        if field in doc and hasattr(doc[field], "isoformat"):
            doc[field] = doc[field].isoformat() + "Z"
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
    result = await analyze_complaint(body.text)
    db = get_db()
    dups = await find_duplicates(db, body.text)
    result["is_duplicate"] = len(dups) > 0
    return result

# ── Submit complaint (user picks a channel → auto-assigns matching agent) ───
@router.post("")
async def create_complaint(body: ComplaintCreate, user=Depends(get_current_user)):
    db = get_db()
    ai = await analyze_complaint(body.description)
    embedding = embed(f"{body.title} {body.description}")
    dups = await find_duplicates(db, f"{body.title} {body.description}")

    priority = ai.get("priority", "medium")
    sla_deadline = datetime.utcnow() + timedelta(hours=SLA_HOURS.get(priority, 24))

    # Find an active agent for the chosen channel
    agent = await db.users.find_one({"role": "agent", "agent_channel": body.channel, "active": {"$ne": False}})
    assigned_agent_id = str(agent["_id"]) if agent else None
    assigned_agent = agent.get("name", "") if agent else ""

    doc = {
        "title": body.title,
        "description": body.description,
        "category": ai.get("category", body.category),
        "channel": body.channel,
        "sentiment": ai.get("sentiment", "neutral"),
        "priority": priority,
        "summary": ai.get("summary", ""),
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
    await db.complaints.update_one({"_id": ObjectId(complaint_id)}, {"$set": update})
    return serialize(await db.complaints.find_one({"_id": ObjectId(complaint_id)}))

# ── Agent reply suggestion ──────────────────────────────────────────────────
@router.post("/{complaint_id}/suggest-reply")
async def suggest_reply_endpoint(complaint_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc or not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")
    suggestion = await suggest_reply(
        doc["title"],
        doc["description"],
        doc.get("category", ""),
        doc.get("escalation_history", [])
    )
    return {"suggestion": suggestion}

# ── AI Assistant (step-by-step user guidance) ────────────────────────────────
class AssistRequest(BaseModel):
    conversation: list  # [{"role": "user"|"assistant", "content": str}]

@router.post("/{complaint_id}/assist")
async def ai_assist(complaint_id: str, body: AssistRequest, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc or not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")
    reply = await ai_assist_step(
        doc["title"], doc["description"],
        doc.get("category", "Other"),
        body.conversation
    )
    return {"reply": reply}


# ── AI bullet-point summary ──────────────────────────────────────────────────
@router.get("/{complaint_id}/bullet-summary")
async def get_bullet_summary(complaint_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc or not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")
    points = await bullet_summary(doc["title"], doc["description"], doc.get("category", "Other"))
    return {"points": points}


# ── Targeted escalation — agent picks the target agent ──────────────────────
class EscalateRequest(BaseModel):
    target_agent_id: str
    reason: str = ""  # agent-provided reason for escalation

@router.post("/{complaint_id}/escalate-to")
async def escalate_to_agent(complaint_id: str, body: EscalateRequest, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc or not can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied")
    if user.get("role") not in ("agent", "admin"):
        raise HTTPException(status_code=403, detail="Only agents and admins can escalate")

    target = await db.users.find_one({"_id": ObjectId(body.target_agent_id), "role": "agent"})
    if not target:
        raise HTTPException(status_code=404, detail="Target agent not found")

    current_channel = doc.get("channel", "web")
    current_messages = doc.get("messages", [])
    history = doc.get("escalation_history", [])

    chat_summary = ""
    if current_messages:
        lines = [f"{m['sender_name']} ({m['sender_role']}): {m['text']}" for m in current_messages]
        try:
            from ai_service import summarize_text
            chat_summary = await summarize_text("\n".join(lines))
        except Exception:
            chat_summary = f"{len(current_messages)} messages exchanged."

    history.append({
        "from": current_channel,
        "to": target.get("agent_channel", "web"),
        "reason": body.reason.strip() or f"Escalated to {target.get('name')} by {user.get('name', 'agent')}.",
        "at": datetime.utcnow().isoformat(),
        "escalated_by": str(user["_id"]),
        "escalated_by_name": user.get("name", ""),
        "chat_snapshot": current_messages,
        "chat_summary": chat_summary,
    })

    update = {
        "channel": target.get("agent_channel", current_channel),
        "escalated_to": target.get("agent_channel"),
        "escalation_history": history,
        "assigned_agent_id": str(target["_id"]),
        "assigned_agent": target.get("name", ""),
        "status": "open",
        "updated_at": datetime.utcnow(),
        "messages": [],
    }
    await db.complaints.update_one({"_id": ObjectId(complaint_id)}, {"$set": update})

    owner = await db.users.find_one({"_id": ObjectId(doc["user_id"])})
    if owner and owner.get("email"):
        await send_escalation_email(
            owner["email"], owner.get("name", "User"),
            doc["title"], current_channel, target.get("agent_channel", ""), history[-1]["reason"]
        )

    return serialize(await db.complaints.find_one({"_id": ObjectId(complaint_id)}))


# ── List agents (for escalation picker) ─────────────────────────────────────
@router.get("/{complaint_id}/available-agents")
async def available_agents(complaint_id: str, user=Depends(get_current_user)):
    if user.get("role") not in ("agent", "admin"):
        raise HTTPException(status_code=403, detail="Agents and admins only")
    db = get_db()
    cursor = db.users.find({"role": "agent", "active": {"$ne": False}})
    agents = []
    async for a in cursor:
        if str(a["_id"]) != str(user["_id"]):  # exclude self
            agents.append({
                "id": str(a["_id"]),
                "name": a.get("name", ""),
                "channel": a.get("agent_channel", "web"),
                "specialization": a.get("specialization", "General"),
            })
    return agents


# ── Delete complaint (owner or admin only) ──────────────────────────────────
@router.delete("/{complaint_id}")
async def delete_complaint(complaint_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    role = user.get("role", "user")
    uid = str(user["_id"])
    # Only the complaint owner or an admin can delete
    if role != "admin" and doc.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.complaints.delete_one({"_id": ObjectId(complaint_id)})
    return {"deleted": True}
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
            chat_summary = await summarize_text("\n".join(lines))
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
