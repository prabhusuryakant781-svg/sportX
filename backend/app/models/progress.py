"""
Progress & Streak Schemas
"""
from pydantic import BaseModel
from typing import List, Optional

class ProgressSummary(BaseModel):
    user_id: str
    total_workouts: int
    total_reps: int
    total_xp: number = 0
    current_streak: int
    longest_streak: int
