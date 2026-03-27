from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "user"
    agent_channel: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None

class ComplaintCreate(BaseModel):
    title: str
    description: str
    category: str = "Other"
    channel: str = "web"
    product: Optional[str] = None
    contact_number: Optional[str] = None
class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    note: Optional[str] = None

class AnalyzePreviewRequest(BaseModel):
    text: str
