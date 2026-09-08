"""
User & Profile Pydantic Schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserBase(BaseModel):
    email: EmailStr
    name: str
    college_name: Optional[str] = None
    department: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserProfileUpdate(BaseModel):
    fitness_goal: Optional[str] = "fitness"
    fitness_level: Optional[str] = "beginner"
    available_time_minutes: Optional[int] = 20
    equipment: Optional[List[str]] = ["none"]
