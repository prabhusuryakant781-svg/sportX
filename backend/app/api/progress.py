"""
Progress & Stats routes (GET /progress)
"""
from fastapi import APIRouter

router = APIRouter(prefix="/progress", tags=["Progress & History"])

@router.get("/")
def get_progress():
    pass
