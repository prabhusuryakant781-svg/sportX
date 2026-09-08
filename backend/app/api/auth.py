"""
Auth routes (/signup, /login)
"""
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup")
def signup():
    pass

@router.post("/login")
def login():
    pass
