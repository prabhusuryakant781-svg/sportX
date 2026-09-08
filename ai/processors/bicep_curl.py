"""
Bicep Curl Rep Counter & Elbow Tracking Analyzer
Monitors: Shoulder-Elbow-Wrist angle (<40 curled, >160 extended)
Elbow stability (preventing swinging).
"""

class BicepCurlProcessor:
    def __init__(self):
        self.stage = "DOWN"
        self.rep_count = 0

    def evaluate(self, landmarks):
        pass
