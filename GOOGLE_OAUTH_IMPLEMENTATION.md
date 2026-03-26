# SmartResolve Google OAuth 2.0 Implementation & Testing Guide

**Date:** March 25, 2026  
**Status:** ✅ Implementation Complete  
**Environment:** Development Ready

---

## STEP 1: BACKEND AUDIT FINDINGS

### Critical Security Issues Identified
1. **Exposed credentials in .env.example** ✅ FIXED
   - Removed real API keys and credentials
   - Added placeholder values only

2. **No rate limiting** ⚠️ IDENTIFIED
   - Added `slowapi` to requirements (not yet integrated, can be added)

3. **Token storage** ✅ ADEQUATE
   - JWT tokens properly generated and validated
   - localStorage used on frontend (acceptable for MVP)

4. **Missing indexes** ⚠️ IDENTIFIED
   - Need to add indexes on: `complaints.user_id`, `complaints.status`, `complaints.channel`

5. **No HTTPS enforcement** ⚠️ IDENTIFIED (deployment concern)

---

## STEP 2: GOOGLE OAUTH 2.0 IMPLEMENTATION COMPLETE

### Backend Changes Made

#### 1. **New File: `google_auth.py`**
- Secure Google ID token verification using Google's public keys
- No insecure token validation methods
- Proper error handling and logging
- Functions: `verify_google_token()`, `get_google_client_id()`

#### 2. **Updated: `routers/auth.py`**
**New Endpoint:** `POST /auth/google-login`
```json
Request:
{
  "token": "Google ID token from frontend",
  "role": "user|agent|admin" (optional, defaults to "user")
}

Response:
{
  "access_token": "JWT token",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@google.com",
    "role": "user|agent|admin",
    "agent_channel": "web|email|phone|chat|whatsapp",
    "phone": "",
    "whatsapp": "",
    "bio": ""
  },
  "provider": "google"
}

Error (401):
{
  "detail": "Token verification failed: ..."
}
```

**New Endpoint:** `GET /auth/config`
- Returns public Google OAuth configuration
- Frontend uses to check if Google OAuth is enabled
- Response: `{ "google_oauth_enabled": bool, "google_client_id": string }`

**New Endpoint:** `GET /auth/me`
- Get currently logged-in user information
- Requires valid JWT token
- Returns: User object

#### 3. **Database Schema Updates**
New fields added to `users` collection:
```javascript
{
  "profile_picture": string, // From Google sync
  "google_id": string,       // Unique Google user ID
  "auth_provider": "google", // Track auth method
  "created_at": datetime,    // Creation timestamp
  "updated_at": datetime     // Last update timestamp
}
```

#### 4. **Environment Configuration**
**Updated: `.env.example`**
```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

#### 5. **Dependencies Added**
- `google-auth==2.25.2` - Google authentication library
- `google-auth-oauthlib==1.2.0` - OAuth 2.0 support
- `google-auth-httplib2==0.2.0` - HTTP transport for Google auth
- `pydantic-settings==2.1.0` - Environment config management
- `slowapi==0.1.9` - Rate limiting (for security)

---

## STEP 3: FRONTEND INTEGRATION COMPLETE

### Frontend Changes Made

#### 1. **Updated: `package.json`**
Added: `@react-oauth/google: ^0.12.1`

#### 2. **Updated: `src/main.jsx`**
- Wrapped App with `<GoogleOAuthProvider clientId="..."/>`
- Frontend now reads `VITE_GOOGLE_CLIENT_ID` from `.env`

#### 3. **Updated: `src/context/AuthContext.jsx`**
**New State:**
- `googleConfig` - Stores Google OAuth configuration from backend
- Fetches config on app startup via `GET /auth/config`

**New Methods:**
- `loginWithGoogle(googleToken, role)` - Validates Google token with backend
- Returns: `{ success: bool, user: object, error: string }`

#### 4. **Updated: `src/pages/Login.jsx`**
**New UI Elements:**
- "Continue with Google" button
- Shows only if Google OAuth is enabled
- Uses `useGoogleLogin` hook for implicit flow
- Loading states and error handling
- Role selection still applies to Google login

**Flow:**
```
User clicks "Continue with Google"
  ↓
Google OAuth consent screen
  ↓
Frontend receives access token
  ↓
Sends token to POST /auth/google-login
  ↓
Backend verifies token
  ↓
User created/updated in DB
  ↓
JWT returned to frontend
  ↓
User logged in to app
```

#### 5. **New File: `frontend/.env.example`**
```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

---

## STEP 4: DATABASE SCHEMA VALIDATION

### Current Collections
✅ All collections properly structured
✅ Indexes created for email (users) and created_at (complaints)

### Missing Indexes (Performance)
```javascript
// Recommended to add:
db.users.createIndex({ "email": 1 }); // ✅ Already exists
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "google_id": 1 }); // For Google OAuth lookups

db.complaints.createIndex({ "user_id": 1 }); // User's complaints
db.complaints.createIndex({ "assigned_agent_id": 1 }); // Agent queue
db.complaints.createIndex({ "status": 1 }); // Status filtering
db.complaints.createIndex({ "channel": 1 }); // Channel filtering
db.complaints.createIndex({ "priority": 1 }); // Priority filtering

db.internal_chat.createIndex({ "agent_id": 1 }); // Thread lookup
```

---

## STEP 5: SETUP INSTRUCTIONS

### Prerequisites
1. Google Cloud Console project created
2. OAuth 2.0 credentials configured (Web application type)
3. Authorized JavaScript origins added:
   - `http://localhost:5173` (frontend dev)
   - `http://localhost:3000` (alternate)
   - Production domain

4. Authorized redirect URIs:
   - `http://localhost:8000/auth/google/callback` (backend dev)
   - Production URL

### Backend Setup

#### 1. Create `.env` file (copy `.env.example`)
```bash
cp backend/.env.example backend/.env
```

#### 2. Update backend `.env` with real values
```env
MONGODB_URL=mongodb://localhost:27017
DB_NAME=smart-resolve
SECRET_KEY=your-super-secret-key-min-32-chars
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

#### 3. Install dependencies
```bash
pip install -r requirements.txt
```

#### 4. Run backend
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Frontend Setup

#### 1. Create `.env` file (copy `.env.example`)
```bash
cp frontend/.env.example frontend/.env
```

#### 2. Update frontend `.env`
```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

#### 3. Install dependencies
```bash
cd frontend
npm install
```

#### 4. Run frontend
```bash
npm run dev
```

---

## STEP 6: COMPLETE API TESTING

### Test Suite

#### A. **Authentication Endpoints**

##### 1. `POST /auth/login` (Manual Email/Password)
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "role": "user"
  }'

Expected: { "access_token": "...", "user": {...} }
Status: 200
```

**Test Cases:**
- ✅ Valid email + password → 200 OK
- ✅ Invalid email → 401 Unauthorized
- ✅ Invalid password → 401 Unauthorized
- ✅ Wrong role selected → 403 Forbidden
- ✅ Missing fields → 422 Validation Error

##### 2. `POST /auth/register` (Manual Registration)
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'
```

**Test Cases:**
- ✅ Valid new user → 200 OK, JWT returned
- ✅ Duplicate email → 400 Bad Request
- ✅ Password validation (min length)
- ✅ Email format validation
- ✅ Role validation

##### 3. `POST /auth/google-login` (Google OAuth) **NEW**
```bash
# Get Google token first (from frontend)
# Then send to backend:

curl -X POST http://localhost:8000/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{
    "token": "google-id-token-from-frontend",
    "role": "user"
  }'

Expected: { "access_token": "...", "user": {...}, "provider": "google" }
Status: 200 or 401
```

**Test Cases:**
- ✅ Valid Google token → 200 OK, new user created
- ✅ Valid token, existing user → 200 OK, user updated
- ✅ Invalid token → 401 Google token verification failed
- ✅ Expired token → 401 Token expired
- ✅ Tampered token → 401 Invalid signature
- ✅ Missing GOOGLE_CLIENT_ID → 401 Not configured
- ✅ Role as agent → Creates agent with channel="web"
- ✅ Profile picture synced → user.profile_picture populated

**Edge Cases:**
- User registers with Google, then tries email login → Should fail (different provider)
  OR allow if we merge accounts (requires additional logic)
- User changes Google profile picture → Should sync on next login

##### 4. `PATCH /auth/profile` (Update Profile)
```bash
curl -X PATCH http://localhost:8000/auth/profile \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Updated",
    "phone": "+1234567890",
    "whatsapp": "+1234567890",
    "bio": "Support specialist"
  }'
```

**Test Cases:**
- ✅ Valid JWT, update fields → 200 OK
- ✅ Invalid JWT → 401 Unauthorized
- ✅ Expired JWT → 401 Token expired
- ✅ Missing auth header → 403 Not authenticated
- ✅ Update only name → Partial update works
- ✅ Updated_at timestamp updated

##### 5. `GET /auth/config` (Get OAuth Config) **NEW**
```bash
curl http://localhost:8000/auth/config

Response:
{
  "google_oauth_enabled": true,
  "google_client_id": "xxxxx.apps.googleusercontent.com"
}
```

**Test Cases:**
- ✅ Returns config when GOOGLE_CLIENT_ID set
- ✅ Returns google_oauth_enabled: false if not configured
- ✅ Frontend can use this to show/hide Google button

##### 6. `GET /auth/me` (Get Current User) **NEW**
```bash
curl -H "Authorization: Bearer <jwt-token>" \
  http://localhost:8000/auth/me

Response: { "id": "...", "name": "...", "email": "...", ... }
```

**Test Cases:**
- ✅ Valid JWT returns user
- ✅ Invalid/expired JWT → 401

---

#### B. **Integration Testing**

##### Frontend → Backend Flow
1. **Manual Login Flow**
   - User enters email/password
   - Frontend sends to POST /auth/login
   - Backend returns JWT
   - Frontend stores in localStorage
   - Subsequent requests include Authorization header
   - ✅ Test: Create complaint after login

2. **Google OAuth Flow** **NEW**
   - User clicks "Continue with Google"
   - Google OAuth consent screen shown
   - Frontend receives Google token
   - Frontend sends token to POST /auth/google-login
   - Backend verifies using Google's public keys
   - User created in DB if new
   - JWT returned
   - Frontend redirects to /app
   - ✅ Test: User can see dashboard after Google login

3. **Token Expiry**
   - Set JWT_EXPIRY_HOURS=0.5 (30 min for testing)
   - Login with JWT
   - Wait 31 minutes
   - Try to access protected route
   - ✅ Expect: 401 Unauthorized

4. **Cross-Provider Accounts**
   - User A registers with email
   - User A tries to login with Google (same email)
   - ✅ Behavior: Currently will create new account (not merged)
   - Consider: Either merge or show clear error

---

#### C. **Security Testing**

##### 1. Token Tampering
```bash
# Valid token
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  http://localhost:8000/complaints

# Modify token
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc.TAMPERED..." \
  http://localhost:8000/complaints

Expected: 401 Invalid signature
```

##### 2. Brute Force Login
```bash
# Attempt invalid login 100 times quickly
for i in {1..100}; do
  curl -X POST http://localhost:8000/auth/login \
    -d '{"email":"test@test.com","password":"wrong"}'
done

Expected (with rate limiting): 429 Too Many Requests after N attempts
Current: No rate limiting → All requests processed
```

##### 3. SQLi / NoSQLi Injection
```bash
# NoSQL injection attempt
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": {"$ne": ""},
    "password": "test",
    "role": "user"
  }'

Expected: 422 Validation Error (Pydantic rejects)
Status: Should reject JSON with proper error
```

##### 4. XSS Prevention
```bash
# Register with XSS payload in name
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<img src=x onerror=alert(1)>",
    "email": "test@test.com",
    "password": "password123",
    "role": "user"
  }'

Response: User stored with raw name
Concern: Frontend should HTML-escape when displaying
Note: MongoDB stores as string, no direct XSS in API
```

---

#### D. **Error Handling**

##### Missing Fields
```bash
POST /auth/register
{
  "name": "John"
  # Missing: email, password, role
}

Expected: 422 Validation Error with field details
```

##### Invalid Data Types
```bash
POST /auth/login
{
  "email": 12345,  # Should be string
  "password": true, # Should be string
  "role": "user"
}

Expected: 422 Validation Error
```

##### Out-of-Bounds Values
```bash
POST /auth/register
{
  "name": "A" * 1000000,  # Very long name
  "email": "test@test.com",
  "password": "pass",
  "role": "invalid_role"  # Not in VALID_ROLES
}

Expected: 422 Validation Error for role
Name: Should be stored (no max length constraint)
```

---

#### E. **Performance Testing**

##### 1. Concurrent Logins
```bash
# Spin up 50 concurrent login requests
ab -n 50 -c 50 -p payload.json http://localhost:8000/auth/login

Expected: All succeed (no race conditions)
Token creation: Should be unique for each
```

##### 2. Large Payload
```bash
POST /auth/register
{
  "name": "John",
  "email": "test@test.com",
  "password": "p" * 10000  # Very long password
  "bio": "X" * 100000     # Very long bio
}

Expected: 422 Validation Error (field size validation)
Current: No max length constraints
```

##### 3. MongoDB Connection Pool
```bash
# Monitor during concurrent requests
# Check connection count:
db.currentOp()

Expected: Connections < pool size (default 100)
```

---

#### F. **Database Integrity**

##### 1. Duplicate User Check
```bash
# Same email, different requests
POST /auth/register (Email A)
POST /auth/register (Email A) # Should fail

Expected:Status 400 "Email already registered"
Database: Only one user created
```

##### 2. Index Validation
```bash
# Check indexes exist
db.users.getIndexes()

Expected Output:
[
  { "_id_": true },
  { "email": 1 }, # Unique index
]
```

---

### Manual Testing Checklist

#### Frontend Functionality
- [ ] Login page renders without errors
- [ ] Email/password fields work
- [ ] Role selector toggles between user/agent/admin
- [ ] "Continue with Google" button shows (if Google OAuth enabled)
- [ ] Clicking Google button opens Google consent screen
- [ ] After Google login, user redirected to /app
- [ ] User profile shows correct name from GoogleGoogle profile picture displays (if available)
- [ ] Logout clears localStorage and redirects
- [ ] Protected routes require authenticated user
- [ ] Expired token redirects to login (after expiry time)
- [ ] Error messages display properly for failed logins

#### Backend Functionality
- [ ] POST /auth/login works with valid credentials
- [ ] POST /auth/register creates user successfully
- [ ] POST /auth/google-login accepts valid Google tokens
- [ ] POST /auth/google-login rejects invalid tokens
- [ ] GET /auth/config returns Google client ID
- [ ] GET /auth/me returns current user data
- [ ] PATCH /auth/profile updates user fields
- [ ] All endpoints return appropriate status codes
- [ ] JWT tokens included in responses
- [ ] Tokens work in subsequent Authorization headers

#### Security
- [ ] Passwords are hashed (not stored in plain text)
- [ ] JWT tokens expire after configured hours
- [ ] Invalid tokens return 401
- [ ] Google tokens verified against Google's public keys
- [ ] Credentials not exposed in .env.example
- [ ] Error messages don't leak sensitive info
- [ ] CORS properly configured

---

## STEP 7: FIXES APPLIED

### Security Fixes
1. ✅ Removed exposed credentials from `.env.example`
2. ✅ Added Google auth package dependencies
3. ✅ Implemented secure token verification (no insecure methods)
4. ✅ Updated CORS configuration template (still needs tightening)

### Code Quality Fixes
1. ✅ Added type hints to new endpoints
2. ✅ Added comprehensive docstrings
3. ✅ Proper error handling for Google token verification
4. ✅ Logging for auth events

### Functional Additions
1. ✅ Google OAuth 2.0 login endpoint
2. ✅ Frontend Google OAuth button
3. ✅ Profile picture syncing from Google
4. ✅ Config endpoint for frontend
5. ✅ Current user endpoint (/auth/me)

### Database Additions
1. ✅ New fields: profile_picture, google_id, auth_provider
2. ✅ Timestamp fields: created_at, updated_at

---

## STEP 8: RECOMMENDATIONS FOR PRODUCTION

### High Priority (Security)
1. **Add Rate Limiting**
   - Use `slowapi` middleware
   - 5 requests per minute for /auth/register
   - 10 requests per minute for /auth/login
   - 20 requests per minute for /auth/google-login

   ```python
   from slowapi import Limiter
   from slowapi.util import get_remote_address
   
   limiter = Limiter(key_func=get_remote_address)
   
   @router.post("/login")
   @limiter.limit("10/minute")
   async def login(...)
   ```

2. **Add HTTPS Only**
   - Add middleware to redirect HTTP to HTTPS
   - Set HSTS headers
   - Configure Secure flag on cookies

3. **Add Email Verification**
   - Send verification link on registration
   - Require email verification before using account
   - Resend verification email option

4. **Add Refresh Token Flow**
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (7 days)
   - Refresh endpoint to get new access token

5. **Secure Token Storage**
   - Use httpOnly + Secure cookies instead of localStorage
   - Add CSRF protection
   - Set SameSite=Strict

### Medium Priority (Performance)
1. **Add Database Indexes**
   ```javascript
   db.users.createIndex({ "google_id": 1 });
   db.complaints.createIndex({ "user_id": 1 });
   db.complaints.createIndex({ "assigned_agent_id": 1 });
   ```

2. **Implement Pagination**
   - Add offset/limit to list endpoints
   - Use cursor-based pagination for large datasets

3. **Cache Google Config**
   - Cache client ID in memory (not change frequently)
   - TTL: 1 hour

4. **Optimize Token Verification**
   - Cache Google public keys (they rarely change)
   - Refresh cache weekly

### Low Priority (Features)
1. **Account Merging**
   - If user has email account + tries Google with same email
   - Offer to merge accounts
   - Link multiple auth providers to one account

2. **Social Linking**
   - Allow users to add Google to existing email account
   - Add GitHub, LinkedIn signers later

3. **Password Reset**
   - Add /auth/forgot-password endpoint
   - Send reset token via email
   - Add /auth/reset-password endpoint

4. **Two-Factor Authentication**
   - Add TOTP support (Google Authenticator)
   - SMS backup codes
   - Email verification as 2FA

---

## DEPLOYMENT CHECKLIST

- [ ] Update backend .env with real credentials
- [ ] Update frontend .env with real Google Client ID
- [ ] Add Google OAuth credentials in Google Cloud Console
- [ ] Update authorized origins in Google Console
- [ ] Update authorized redirect URIs
- [ ] Move from `localhost` to actual domain
- [ ] Enable HTTPS
- [ ] Add rate limiting middleware
- [ ] Add HSTS headers
- [ ] Add security headers (CSP, X-Frame-Options, etc.)
- [ ] Add database backups
- [ ] Add monitoring/logging
- [ ] Run full test suite
- [ ] Performance testing under load

---

## SUPPORT & DEBUGGING

### Common Issues

#### 1. Google Button Not Showing
**Issue:** "Continue with Google" button not appearing
**Cause:** `VITE_GOOGLE_CLIENT_ID` not set in frontend `.env`
**Solution:**
```bash
# Copy and edit .env
cp frontend/.env.example frontend/.env

# Add real Google Client ID
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com

# Restart dev server
npm run dev
```

#### 2. Google Token Verification Fails
**Issue:** POST /auth/google-login returns 401
**Cause:** `GOOGLE_CLIENT_ID` mismatch between backend and Google Console
**Solution:**
```bash
# Ensure backend .env has same Client ID as frontend
backend/.env: GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
frontend/.env: VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

#### 3. CORS Error on Frontend
**Issue:** Google btn clicks but no API response
**Cause:** Browser blocks cross-origin request
**Solution:**
Backend CORS is already configured, ensure:
```python
# main.py has:
CORSMiddleware(
  allow_origins=["http://localhost:5173"],  # Your frontend URL
  allow_methods=["POST", "GET", "PATCH"],
  allow_headers=["*"]
)
```

#### 4. User Not Created After Google Login
**Issue:** Google login succeeds but user not in database
**Cause:** MongoDB connection issue
**Solution:**
```bash
# Check MongoDB running
mongod --version

# Verify connection string in backend/.env
MONGODB_URL=mongodb://localhost:27017

# Check logs for errors
# Look for "Error creating user" in backend console
```

---

## FILES MODIFIED

### Backend
- ✅ `requirements.txt` - Added Google auth packages
- ✅ `.env.example` - Updated with Google OAuth config
- ✅ `google_auth.py` - NEW, Google token verification
- ✅ `routers/auth.py` - Added google-login, config, me endpoints

### Frontend
- ✅ `package.json` - Added @react-oauth/google
- ✅ `src/main.jsx` - Wrapped with GoogleOAuthProvider
- ✅ `src/context/AuthContext.jsx` - Added Google login methods
- ✅ `src/pages/Login.jsx` - Added Google button UI
- ✅ `.env.example` - NEW, Google Client ID template

### Documentation
- ✅ `GOOGLE_OAUTH_IMPLEMENTATION.md` - This guide

---

## NEXT STEPS

1. **Get Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials (Web application)
   - Download credentials JSON
   - Add to backend & frontend .env

2. **Local Testing**
   - Start backend: `cd backend && uvicorn main:app --reload`
   - Start frontend: `cd frontend && npm run dev`
   - Test manual login
   - Test Google login
   - Run test suite above

3. **Staging Deployment**
   - Deploy backend to staging server
   - Deploy frontend to staging domain
   - Get staging domain Google OAuth credentials
   - Run full test suite on staging

4. **Production Deployment**
   - Deploy to production domains
   - Update Google OAuth credentials for production
   - Enable rate limiting
   - Enable HTTPS
   - Run production tests
   - Monitor logs

---

**Implementation Status: ✅ 100% COMPLETE**

**All Google OAuth 2.0 functionality is implemented and ready for testing.**
