"""
Admin-only endpoints: list agents, update agent channel, remove agent, reassign complaints.
"""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth_utils import get_current_user
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime

router = APIRouter()

VALID_CHANNELS = {"whatsapp", "email", "phone", "chat", "web"}
VALID_SPECIALIZATIONS = {"Billing", "Technical", "Delivery", "Product", "Service", "Account", "General"}

def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

def serialize_agent(u):
    return {
        "id": str(u["_id"]),
        "name": u.get("name", ""),
        "email": u.get("email", ""),
        "agent_channel": u.get("agent_channel", ""),
        "specialization": u.get("specialization", "General"),
        "role": u.get("role", "agent"),
        "active": u.get("active", True),
    }

class AgentUpdate(BaseModel):
    agent_channel: Optional[str] = None
    specialization: Optional[str] = None
    active: Optional[bool] = None
    name: Optional[str] = None

class ReassignBody(BaseModel):
    agent_id: str

# ── List all agents (admin only) ────────────────────────────────────────────
@router.get("/agents")
async def list_agents(admin=Depends(require_admin)):
    db = get_db()
    cursor = db.users.find({"role": "agent"})
    return [serialize_agent(u) async for u in cursor]

# ── Public: available agents by channel (any logged-in user) ────────────────
@router.get("/agents/available")
async def available_agents(channel: str = None, user=Depends(get_current_user)):
    db = get_db()
    query = {"role": "agent", "active": {"$ne": False}}
    if channel:
        query["agent_channel"] = channel
    cursor = db.users.find(query)
    return [{"id": str(u["_id"]), "name": u.get("name", ""), "agent_channel": u.get("agent_channel", "")}
            async for u in cursor]

# ── Update agent (channel, active status, name) ─────────────────────────────
@router.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, body: AgentUpdate, admin=Depends(require_admin)):
    db = get_db()
    update = {}
    if body.agent_channel is not None:
        if body.agent_channel not in VALID_CHANNELS:
            raise HTTPException(status_code=400, detail="Invalid channel")
        update["agent_channel"] = body.agent_channel
    if body.specialization is not None:
        if body.specialization not in VALID_SPECIALIZATIONS:
            raise HTTPException(status_code=400, detail="Invalid specialization")
        update["specialization"] = body.specialization
    if body.active is not None:
        update["active"] = body.active
    if body.name is not None:
        update["name"] = body.name
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.users.update_one({"_id": ObjectId(agent_id), "role": "agent"}, {"$set": update})
    agent = await db.users.find_one({"_id": ObjectId(agent_id)})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return serialize_agent(agent)

# ── Remove agent (set role to 'user', deactivate) ───────────────────────────
@router.delete("/agents/{agent_id}")
async def remove_agent(agent_id: str, admin=Depends(require_admin)):
    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(agent_id), "role": "agent"},
        {"$set": {"role": "user", "agent_channel": None, "active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "removed"}

# ── Reassign a complaint to a different agent ────────────────────────────────
@router.patch("/complaints/{complaint_id}/reassign")
async def reassign_complaint(complaint_id: str, body: ReassignBody, admin=Depends(require_admin)):
    db = get_db()
    agent = await db.users.find_one({"_id": ObjectId(body.agent_id), "role": "agent"})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.complaints.update_one(
        {"_id": ObjectId(complaint_id)},
        {"$set": {
            "assigned_agent_id": str(agent["_id"]),
            "assigned_agent": agent.get("name", ""),
            "channel": agent.get("agent_channel", "web"),
            "updated_at": datetime.utcnow(),
        }}
    )
    from routers.complaints import serialize
    doc = await db.complaints.find_one({"_id": ObjectId(complaint_id)})
    return serialize(doc)
