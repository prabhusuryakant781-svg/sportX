# 🤝 SportX — Integration & API Contract

> **Applies to:** Group 1 (Frontend), Group 2 (Backend), Group 3 (AI)  
> **Rule:** All three groups must strictly adhere to these payload definitions and endpoint URLs.

---

## 1. Endpoints & Methods

| Endpoint | Method | Purpose | Request Body | Response Body |
|---|---|---|---|---|
| `/api/v1/auth/signup` | `POST` | Create user | `{ email, password, name, college_name, department }` | `{ token, user }` |
| `/api/v1/auth/login` | `POST` | Authenticate | `{ email, password }` | `{ token, user }` |
| `/api/v1/profile` | `GET` | Load profile | *None (Bearer Token)* | `{ id, name, college, fitness_goal, available_time, total_xp, streak }` |
| `/api/v1/profile` | `PUT` | Update preferences | `{ fitness_goal, fitness_level, available_time, equipment }` | `{ status: "success", profile }` |
| `/api/v1/workouts` | `GET` | Get workout options | `?time=20&goal=fitness` | `[ { id, name, duration, exercises: [...] } ]` |
| `/api/v1/workouts/start` | `POST` | Start session | `{ workout_id, exercise_id }` | `{ session_token, started_at }` |
| `/api/v1/workouts/complete`| `POST` | Save completed workout | `{ user_id, exercise_id, reps, score, duration_seconds }` | `{ xp_earned, new_streak, summary }` |
| `/api/v1/progress` | `GET` | Get history/progress | *None (Bearer Token)* | `{ streak, total_reps, history: [...] }` |
| `/api/v1/challenges` | `GET` | Get active challenges | *None* | `[ { id, title, target_reps, participants } ]` |
| `/api/v1/challenges/join` | `POST` | Join challenge | `{ challenge_id }` | `{ status: "joined" }` |
| `/api/v1/leaderboard` | `GET` | Get ranking | `?scope=college` | `[ { rank: 1, name, college, points } ]` |

---

## 2. AI Result Format (Vision Engine ➔ Frontend / Backend)

During or immediately following an AI camera session, the AI module produces results structured in this exact JSON schema:

```json
{
  "exercise": "pushup",
  "reps": 12,
  "score": 86,
  "current_state": "UP",
  "feedback": "Keep your elbows closer to your body",
  "form_errors": [
    {
      "error_type": "elbow_flare",
      "count": 2
    }
  ],
  "duration_seconds": 65
}
```

---

## 3. End-to-End Integration Flow

$$\text{USER} \rightarrow \text{FRONTEND} \rightarrow \text{CAMERA/AI} \rightarrow \text{ANALYSIS} \rightarrow \text{BACKEND API} \rightarrow \text{DATABASE} \rightarrow \text{RESULT} \rightarrow \text{PROGRESS / POINTS / CHALLENGE}$$

1. **Frontend** mounts the camera view and loads supported exercise parameters.
2. **AI Engine** runs pose estimation at 30 FPS, detects reps, checks angles, and dispatches real-time HUD feedback.
3. Upon workout completion, Frontend sends the payload to `POST /api/v1/workouts/complete`.
4. **Backend** validates session metrics, writes session history into **Database**, updates streak counters, and recalculates XP.
5. **Frontend** receives the result payload, displays the celebration screen, and updates the local progress chart.
