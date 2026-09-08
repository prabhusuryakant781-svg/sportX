"""
Workout routes (GET /workouts, POST /workouts/start, POST /workouts/complete)
"""
from fastapi import APIRouter

router = APIRouter(prefix="/workouts", tags=["Workouts"])

@router.get("/")
def get_workouts():
    pass

@router.post("/start")
def start_workout():
    pass

@router.post("/complete")
def complete_workout():
    pass
