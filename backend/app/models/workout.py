"""
Workout & Session Pydantic Schemas
"""
from pydantic import BaseModel
from typing import List, Optional

class ExerciseBase(BaseModel):
    id: str
    name: str
    target_area: str
    difficulty: str
    ai_supported: bool

class WorkoutSessionComplete(BaseModel):
    user_id: str
    exercise_id: str
    completed_reps: int
    form_score: float
    duration_seconds: int
    feedback_notes: Optional[str] = None
