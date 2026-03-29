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

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://idea-hack-2-0.vercel.app",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
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
