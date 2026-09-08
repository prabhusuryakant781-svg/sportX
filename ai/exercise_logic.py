"""
SportX Exercise State Machine & Feedback Dispatcher
Group 3 (Person 6 - AI Exercise Logic)
Dispatches landmarks to specific exercise processors and aggregates score/reps.
"""

class ExerciseEngine:
    def __init__(self, exercise_type: str):
        self.exercise_type = exercise_type
        self.reps = 0
        self.current_state = "UP"
        self.form_score = 100.0

    def process_frame_landmarks(self, landmarks):
        pass
