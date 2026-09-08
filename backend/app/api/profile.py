"""
Student Profile routes (GET /profile, PUT /profile)
"""
from fastapi import APIRouter

router = APIRouter(prefix="/profile", tags=["Student Profile"])

@router.get("/")
def get_profile():
    pass

@router.put("/")
def update_profile():
    pass
