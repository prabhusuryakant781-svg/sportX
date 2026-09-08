# 🤖 SportX AI & Computer Vision (Group 3: Person 5 + Person 6)

## Tech Stack
- **Library:** MediaPipe Pose (BlazePose)
- **Computer Vision:** OpenCV (Python)
- **Math/Vectors:** NumPy
- **Mode:** On-device real-time landmark tracking (33 keypoints)

## Supported Exercises (P0 Scope)
1. **Squat (`processors/squat.py`):** Knee flexion/extension, hip depth analysis, spine lean.
2. **Push-up (`processors/pushup.py`):** Elbow angle, body alignment, chest depth.
3. **Bicep Curl (`processors/bicep_curl.py`):** Elbow flexion, shoulder stability.

## AI Result JSON Contract (Sent to Frontend/Backend)
```json
{
  "exercise": "squat",
  "reps": 12,
  "score": 88.5,
  "current_state": "UP",
  "feedback": "Great depth! Squeeze glutes at top",
  "landmark_confidence": 0.94
}
```

## Setup Command
```bash
cd ai
python -m venv venv
# Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
python camera_stream.py
```
