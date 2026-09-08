"""
Campus Challenge & Leaderboard Schemas
"""
from pydantic import BaseModel
from typing import Optional

class Challenge(BaseModel):
    id: str
    title: str
    target_metric: str
    target_value: int
    participants_count: int

class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    college: str
    points: int
