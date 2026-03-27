"""
Internal messaging between agents and admin.
- Each agent has one thread with admin.
- Agent sees only their own thread.
- Admin sees all threads (one per agent).
- Messages stored in `internal_messages` collection.
"""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth_utils import get_current_user
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone, timedelta

router = APIRouter()

IST = timezone(timedelta(hours=5, minutes=30))

def ist_now_iso() -> str:
    return datetime.now(IST).isoformat()

def serialize_msg(m: dict) -> dict:
    m["_id"] = str(m["_id"])
    return m

from typing import Optional

class SendBody(BaseModel):
    text: str
    to_agent_id: Optional[str] = None  # admin sets this to target a specific agent thread

# ── Get threads (admin: all agents; agent: own thread) ──────────────────────
@router.get("/threads")
async def get_threads(user=Depends(get_current_user)):
    role = user.get("role")
    if role not in ("admin", "agent"):
        raise HTTPException(status_code=403, detail="Not allowed")

    db = get_db()

    if role == "admin":
        # Get ALL agents (not just ones with messages)
        all_agents = await db.users.find({"role": "agent"}).to_list(length=200)

        # Get message summaries for agents that have messages
        pipeline = [
            {"$group": {
                "_id": "$agent_id",
                "last_msg": {"$last": "$text"},
                "last_at": {"$last": "$at"},
                "unread": {"$sum": {"$cond": [
                    {"$and": [{"$eq": ["$sender_role", "agent"]}, {"$eq": ["$read_by_admin", False]}]},
                    1, 0
                ]}},
            }},
        ]
        msg_summaries = await db.internal_messages.aggregate(pipeline).to_list(length=200)
        msg_map = {str(t["_id"]): t for t in msg_summaries}

        # Merge agents with their message summaries
        threads = []
        for agent in all_agents:
            aid = str(agent["_id"])
            summary = msg_map.get(aid, {})
            threads.append({
                "agent_id": aid,
                "agent_name": agent.get("name", "Unknown"),
                "agent_channel": agent.get("agent_channel", ""),
                "specialization": agent.get("specialization", "General"),
                "active": agent.get("active", True),
                "last_msg": summary.get("last_msg", ""),
                "last_at": summary.get("last_at", ""),
                "unread": summary.get("unread", 0),
                "has_messages": aid in msg_map,
            })

        # Sort: unread first, then by last message time, then alphabetically
        threads.sort(key=lambda t: (
            -(t["unread"] > 0),
            -(t["last_at"] != ""),
            t["last_at"] or "",
        ), reverse=False)
        threads.sort(key=lambda t: t["unread"], reverse=True)

        return threads
    else:
        # Agent: return summary of their own thread
        uid = str(user["_id"])
        last = await db.internal_messages.find_one(
            {"agent_id": uid}, sort=[("at", -1)]
        )
        unread = await db.internal_messages.count_documents(
            {"agent_id": uid, "sender_role": "admin", "read_by_agent": False}
        )
        return [{
            "agent_id": uid,
            "agent_name": user.get("name", ""),
            "agent_channel": user.get("agent_channel", ""),
            "specialization": user.get("specialization", "General"),
            "last_msg": last.get("text", "") if last else "",
            "last_at": last.get("at", "") if last else "",
            "unread": unread,
            "has_messages": last is not None,
        }]

# ── Get messages in a thread ─────────────────────────────────────────────────
@router.get("/threads/{agent_id}/messages")
async def get_thread_messages(agent_id: str, user=Depends(get_current_user)):
    role = user.get("role")
    uid = str(user["_id"])

    if role == "agent" and uid != agent_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if role not in ("admin", "agent"):
        raise HTTPException(status_code=403, detail="Not allowed")

    db = get_db()

    # Mark messages as read
    if role == "admin":
        await db.internal_messages.update_many(
            {"agent_id": agent_id, "sender_role": "agent", "read_by_admin": False},
            {"$set": {"read_by_admin": True}}
        )
    else:
        await db.internal_messages.update_many(
            {"agent_id": agent_id, "sender_role": "admin", "read_by_agent": False},
            {"$set": {"read_by_agent": True}}
        )

    cursor = db.internal_messages.find({"agent_id": agent_id}).sort("at", 1)
    msgs = []
    async for m in cursor:
        msgs.append({
            "id": str(m["_id"]),
            "sender_id": m.get("sender_id", ""),
            "sender_name": m.get("sender_name", ""),
            "sender_role": m.get("sender_role", ""),
            "text": m.get("text", ""),
            "at": m.get("at", ""),
        })
    return msgs

# ── Send a message ───────────────────────────────────────────────────────────
@router.post("/threads/{agent_id}/messages")
async def send_thread_message(agent_id: str, body: SendBody, user=Depends(get_current_user)):
    role = user.get("role")
    uid = str(user["_id"])

    if role == "agent" and uid != agent_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if role not in ("admin", "agent"):
        raise HTTPException(status_code=403, detail="Not allowed")

    db = get_db()

    # Resolve agent name for the thread
    agent = await db.users.find_one({"_id": ObjectId(agent_id), "role": "agent"})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    msg = {
        "agent_id": agent_id,
        "agent_name": agent.get("name", ""),
        "sender_id": uid,
        "sender_name": user.get("name", ""),
        "sender_role": role,
        "text": body.text,
        "at": ist_now_iso(),
        "read_by_admin": role == "admin",   # admin's own messages are already "read" by admin
        "read_by_agent": role == "agent",   # agent's own messages are already "read" by agent
    }
    result = await db.internal_messages.insert_one(msg)
    msg["id"] = str(result.inserted_id)
    msg.pop("_id", None)
    return msg

# ── Unread count for current user ────────────────────────────────────────────
@router.get("/unread")
async def get_unread_count(user=Depends(get_current_user)):
    role = user.get("role")
    uid = str(user["_id"])
    db = get_db()

    if role == "admin":
        count = await db.internal_messages.count_documents(
            {"sender_role": "agent", "read_by_admin": False}
        )
    elif role == "agent":
        count = await db.internal_messages.count_documents(
            {"agent_id": uid, "sender_role": "admin", "read_by_agent": False}
        )
    else:
        count = 0
    return {"unread": count}
