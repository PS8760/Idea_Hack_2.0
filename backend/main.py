import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import connect_db, close_db
from routers import auth, complaints, contact, chat, admin, internal_chat, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(title="SmartResolve AI", lifespan=lifespan)

def get_allowed_origins():
    origins = ["http://localhost:5173", "http://localhost:3000"]
    frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if frontend_url:
        origins.append(frontend_url)
        # also allow with and without trailing slash
        if frontend_url.endswith("/"):
            origins.append(frontend_url.rstrip("/"))
        else:
            origins.append(frontend_url + "/")
    return origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/auth",       tags=["auth"])
app.include_router(complaints.router,    prefix="/complaints", tags=["complaints"])
app.include_router(contact.router,       prefix="/contact",    tags=["contact"])
app.include_router(chat.router,          prefix="/complaints", tags=["chat"])
app.include_router(admin.router,         prefix="/admin",      tags=["admin"])
app.include_router(internal_chat.router, prefix="/internal",   tags=["internal-chat"])
app.include_router(reports.router,       prefix="/reports",     tags=["reports"])

@app.get("/")
async def root():
    return {"status": "SmartResolve AI running"}
