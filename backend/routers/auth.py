from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import UserRegister, UserLogin
from auth_utils import hash_password, verify_password, create_token, get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from google_auth import verify_google_token, GoogleAuthError
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_ROLES = {"user", "agent", "admin"}
VALID_CHANNELS = {"whatsapp", "email", "phone", "chat", "web"}

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    bio: Optional[str] = None


class GoogleLoginRequest(BaseModel):
    """Google OAuth 2.0 login request with ID token"""
    token: str  # Google ID token from frontend
    role: Optional[str] = "user"  # User can specify their role


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user["email"],
        "role": user.get("role", "user"),
        "agent_channel": user.get("agent_channel"),
        "phone": user.get("phone", ""),
        "whatsapp": user.get("whatsapp", ""),
        "bio": user.get("bio", ""),
    }

@router.post("/register")
async def register(body: UserRegister):
    db = get_db()
    role = body.role or "user"
    if role not in VALID_ROLES:
        role = "user"
    agent_channel = None
    if role == "agent":
        agent_channel = getattr(body, "agent_channel", "web") or "web"
        if agent_channel not in VALID_CHANNELS:
            agent_channel = "web"
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    result = await db.users.insert_one({
        "name": body.name,
        "email": body.email,
        "password": hash_password(body.password),
        "role": role,
        "agent_channel": agent_channel,
        "phone": "",
        "whatsapp": "",
        "bio": "",
    })
    user = await db.users.find_one({"_id": result.inserted_id})
    return {"access_token": create_token(str(user["_id"])), "user": serialize_user(user)}

@router.post("/login")
async def login(body: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Enforce role match — user must log in via the correct role portal
    if body.role and body.role in VALID_ROLES:
        actual_role = user.get("role", "user")
        if actual_role != body.role:
            raise HTTPException(
                status_code=403,
                detail=f"This account is registered as '{actual_role}'. Please select the correct role."
            )

    return {"access_token": create_token(str(user["_id"])), "user": serialize_user(user)}


@router.post("/google-login")
async def google_login(body: GoogleLoginRequest):
    """
    Google OAuth 2.0 Login Endpoint
    
    Flow:
    1. Frontend verifies Google token and sends to backend
    2. Backend verifies token using Google's public keys
    3. Creates/updates user in database
    4. Returns JWT token and user data
    
    Security:
    - Token verified against Google's public keys
    - Checks token expiry and signature
    - Role-based user creation/lookup
    
    Args:
        body: GoogleLoginRequest with Google ID token
        
    Returns:
        dict: {access_token: str, user: dict}
    """
    
    db = get_db()
    
    # Verify Google ID token
    try:
        verified_info = await verify_google_token(body.token)
    except GoogleAuthError as e:
        logger.warning(f"Google token verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))
    
    email = verified_info.get("email")
    name = verified_info.get("name", "")
    picture = verified_info.get("picture", "")
    google_id = verified_info.get("google_id")
    
    # Validate role
    role = (body.role or "user").lower()
    if role not in VALID_ROLES:
        role = "user"
    
    # Determine agent channel (if registering as agent)
    agent_channel = None
    if role == "agent":
        agent_channel = "web"  # Default channel for Google OAuth agents
    
    # Find or create user
    existing_user = await db.users.find_one({"email": email})
    
    if existing_user:
        # User exists - update last login
        await db.users.update_one(
            {"_id": existing_user["_id"]},
            {
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "profile_picture": picture,  # Update profile picture
                    "google_id": google_id,  # Ensure google_id is stored
                    "auth_provider": "google"  # Track auth method
                }
            }
        )
        user = await db.users.find_one({"_id": existing_user["_id"]})
        logger.info(f"✅ Google login for existing user: {email}")
    else:
        # New user - create account
        result = await db.users.insert_one({
            "name": name,
            "email": email,
            "password": "",  # No password for Google OAuth users
            "role": role,
            "agent_channel": agent_channel,
            "phone": "",
            "whatsapp": "",
            "bio": "",
            "profile_picture": picture,
            "google_id": google_id,
            "auth_provider": "google",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
        user = await db.users.find_one({"_id": result.inserted_id})
        logger.info(f"✅ Google login created new user: {email}")
    
    # Return JWT token + user data
    return {
        "access_token": create_token(str(user["_id"])),
        "user": serialize_user(user),
        "provider": "google"
    }

@router.patch("/profile")
async def update_profile(body: ProfileUpdate, user=Depends(get_current_user)):
    db = get_db()
    # Convert model to dict, excluding unset values
    update_data = body.model_dump(exclude_unset=True)
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.users.update_one(
            {"_id": user["_id"]}, 
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"_id": user["_id"]})
    return serialize_user(updated_user)


@router.get("/config")
async def get_auth_config():
    """
    Get public authentication configuration (for frontend).
    
    Returns:
        dict: Public auth config including Google Client ID
    """
    from google_auth import get_google_client_id
    
    google_client_id = await get_google_client_id()
    
    return {
        "google_oauth_enabled": bool(google_client_id),
        "google_client_id": google_client_id,
    }


@router.get("/me")
async def get_current_user_info(user=Depends(get_current_user)):
    """
    Get currently logged-in user information.
    
    Returns:
        dict: Current user data
    """
    return serialize_user(user)
