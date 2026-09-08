"""
Campus Challenges & Leaderboard routes (GET /challenges, POST /challenges/join, GET /leaderboard)
"""
from fastapi import APIRouter

router = APIRouter(tags=["Campus Challenges & Leaderboard"])

@router.get("/challenges")
def get_challenges():
    pass

@router.post("/challenges/join")
def join_challenge():
    pass

@router.get("/leaderboard")
def get_leaderboard():
    pass
