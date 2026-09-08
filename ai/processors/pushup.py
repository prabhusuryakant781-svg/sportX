"""
Push-up Rep Counter & Alignment Analyzer
Monitors: Shoulder-Elbow-Wrist angle (<90 at bottom)
Shoulder-Hip-Ankle alignment to prevent hip sagging.
"""

class PushupProcessor:
    def __init__(self):
        self.stage = "UP"
        self.rep_count = 0

    def evaluate(self, landmarks):
        pass
