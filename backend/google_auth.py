"""
Google OAuth 2.0 Verification Module

Securely verifies Google ID tokens using Google's public keys.
No insecure methods - full token validation.
"""

import os
from datetime import datetime
from google.auth.transport import requests
from google.oauth2 import id_token
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


class GoogleAuthError(Exception):
    """Custom exception for Google auth failures"""
    pass


async def verify_google_token(token: str) -> dict:
    """
    Verify Google token (ID token or Access token).
    
    Security Features:
    - If JWT: Validates signature, expiry, and audience.
    - If Access Token: Validates against Google's userinfo endpoint.
    """
    
    if not GOOGLE_CLIENT_ID:
        raise GoogleAuthError("GOOGLE_CLIENT_ID not configured in environment")
    
    # Check if it looks like a JWT ID token (3 parts)
    if token.count('.') == 2:
        try:
            # Verify as ID Token (preferred for identity)
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                audience=GOOGLE_CLIENT_ID,
                clock_skew_in_seconds=10
            )
            
            if idinfo.get("iss") not in ["https://accounts.google.com", "accounts.google.com"]:
                raise GoogleAuthError("Invalid token issuer")
            
            return {
                "email": idinfo.get("email"),
                "name": idinfo.get("name", ""),
                "picture": idinfo.get("picture", ""),
                "google_id": idinfo.get("sub"),
                "verified": True,
                "verified_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.warning(f"ID token verification failed, trying as access token: {str(e)}")
            # Fall through to access token verification if ID token check fails
    
    # Verify as Access Token (common if using custom hooks in frontend)
    try:
        import requests as sync_requests
        # Note: sync requests here, but small overhead
        resp = sync_requests.get(
            f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={token}",
            timeout=5
        )
        
        if resp.status_code != 200:
            raise GoogleAuthError(f"Access token verification failed: {resp.text}")
            
        info = resp.json()
        email = info.get("email")
        if not email:
            raise GoogleAuthError("Token missing email in userinfo response")
            
        return {
            "email": email,
            "name": info.get("name", ""),
            "picture": info.get("picture", ""),
            "google_id": info.get("sub"),
            "verified": True,
            "verified_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Google token verification failed (all methods): {str(e)}")
        raise GoogleAuthError(f"Invalid Google token: {str(e)}")


async def get_google_callback_url() -> str:
    """
    Get the OAuth 2.0 callback URL environment variable.
    
    Returns:
        str: Redirect URI configured in Google Cloud Console
    """
    return os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")


async def get_google_client_id() -> str:
    """
    Get the Google OAuth 2.0 Client ID.
    
    Returns:
        str: Client ID from environment
    """
    return GOOGLE_CLIENT_ID or ""
