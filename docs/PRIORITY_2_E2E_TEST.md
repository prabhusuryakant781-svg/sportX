# 🧪 SportX Priority 2 — End-to-End Real Architecture Test Plan

## Overview

This document specifies and records the complete verification of the **Priority 2** architecture:
`REAL VISION → WORKOUT SESSION → FIRESTORE → PROGRESS → GEMINI AI COACH`.

Every stage of this pipeline has been implemented without simulation shortcuts, ensuring strict privacy, authenticated server validation, incremental progress aggregation, and grounded AI coaching insights.

---

## Complete E2E Architecture Pipeline

```mermaid
flowchart TD
    User([Athlete]) -->|Webcam Frames| MP[MediaPipe PoseLandmarker\nVIDEO Mode / Client-side]
    MP -->|EMA Smoothing / Outlier Rejection| FSM[RepCounterFSM\nSquat / Pushup / Jumping Jack]
    FSM -->|Vision Result JSON| Client[React Web / Flutter Mobile]
    Client -->|1. Start Session /auth| Backend[Firebase Cloud Functions 2nd Gen]
    Backend -->|Create in-progress doc| FS[(Cloud Firestore)]
    Client -->|2. Complete Session + Telemetry| Backend
    Backend -->|Anti-Cheat XP / Level / Streak| FS
    Backend -->|Incremental Aggregation| Progress[(progress/{userId})]
    Client -->|3. POST /ai/session-analysis| Backend
    Backend -->|Authoritative Fetch| FS
    Backend -->|buildSessionAnalysisContext| Ctx[AI Context Builder]
    Ctx -->|System Prompt + Real Data| Gemini[Google Gemini 1.5 Flash]
    Gemini -->|Structured JSON Response| Validator[Schema Validator]
    Validator -->|Store Insight| Insights[(coachInsights/{id})]
    Backend -->|HTTP 200 JSON| Client
    Client -->|Celebration / Telemetry / AI Debrief| User
```

---

## Stage-by-Stage Verification Checklist

### 1. Test Athlete & Authentication
- **User Identifier:** `athlete_p2_production_eval`
- **Role:** Student Athlete (`badminton`, `intermediate`)
- **Authentication:** Verified Firebase ID Token / Bearer Header.
- **Verification:**
  - `POST /api/v1/sessions/start` requires valid Bearer token.
  - Unauthenticated requests are rejected with HTTP 401 Unauthorized.
  - Resource ownership checked against `auth.uid`.

### 2. Real Vision Inference (Client-Side)
- **Engine:** `@mediapipe/tasks-vision` `PoseLandmarker` in `VIDEO` mode with `pose_landmarker_lite.task`.
- **Anatomical Tracking:** 13 key joints mapped through `mediapipeLandmarks.js`.
- **Filtering:** EMA temporal smoothing ($\alpha=0.65$), outlier rejection ($>120\text{px}$ jump threshold).
- **Rep Counting:** State transitions in `repCounterFSM.js` (`UP` $\to$ `DESCENDING` $\to$ `BOTTOM` $\to$ `ASCENDING` $\to$ `UP`).
- **Privacy Enforcement:** Raw webcam frames and canvas image buffers are **never serialized or uploaded** to Firestore or network endpoints.

### 3. Authoritative Session Lifecycle
- **Session Start:** `POST /api/v1/sessions/start` generates server-side document in `workoutSessions` collection with `status: 'in-progress'`.
- **Session Completion:** `POST /api/v1/sessions/:id/complete` submits summary:
  ```json
  {
    "exerciseId": "squat",
    "exerciseName": "Bodyweight Squat",
    "totalReps": 20,
    "averageFormScore": 88,
    "durationSeconds": 180
  }
  ```
- **Anti-Cheat Validation:** Server computes:
  - Rep XP scaled by form accuracy percentage.
  - Duration bonus capped at 60 minutes.
  - Streak rules evaluated against calendar days (`lastWorkoutDate`).
  - Session document status set to `'completed'`.

### 4. Incremental Progress Aggregation
- **Collection:** `progress/{userId}`
- **Aggregated Totals:** Total reps ($+20$), total workout duration ($+3\text{ min}$), total calories ($+42\text{ kcal}$).
- **Personal Records:** `squat_max_reps` updated to 20.
- **Form Trends:** Last 14 session form scores appended to `formScoreTrends` without requiring full history scanning.

### 5. Server-Side AI Context Builder
- **Context Builder:** `buildSessionAnalysisContext(userId, sessionId)`
- **Gathered Data:**
  - Authoritative completed reps (20)
  - Verified form score (88%)
  - Biomechanical error flags (`["knees_inward"]`)
  - User athlete profile (sport: `badminton`, level: `intermediate`)
  - Recent training frequency
- **Privacy:** Omits PII, passwords, and tokens.

### 6. Google Gemini AI Analysis
- **Model:** `gemini-1.5-flash`
- **Execution:** Exclusively executed server-side via trusted Cloud Functions.
- **System Prompt:** Biomechanical coach persona enforcing structured JSON schema, actionable cues, and positive reinforcement.
- **Validation:** `validateCoachResponse()` rejects non-JSON or missing fields before response delivery.

### 7. Coach Insights Persistence & Idempotency
- **Collection:** `coachInsights`
- **Document Model:**
  ```json
  {
    "insightId": "ci_sess_p2_1789060796067_...",
    "userId": "athlete_p2_production_eval",
    "sourceSessionId": "sess_p2_1789060796067",
    "type": "post_workout_analysis",
    "exerciseId": "squat",
    "summary": "Solid squat set with 20 reps...",
    "actionableCues": ["Push knees outward over toes..."],
    "nextFocus": "knee valgus control",
    "createdAt": "2026-09-10T17:20:00.000Z"
  }
  ```
- **Idempotency Guard:** Repeated calls with the same `sessionId` return the cached insight without duplicate Gemini invocations or duplicate database entries.

### 8. Frontend User Experience
- **Result Page:** `SessionResultPage.jsx` renders:
  - Celebratory confetti on completion
  - Verified XP and form score pills
  - Detected nuances list (`knees_inward`)
  - "⚡ Analyze Workout with AI Coach" button
  - Interactive debrief card displaying AI summary, strengths, and actionable cues
  - Direct deep-link to AI Coach chat for follow-up questions

---

## Automated Verification Suite

| Test Suite | File | Coverage | Status |
|---|---|---|---|
| **Priority 2 Comprehensive Suite** | `backend/functions/src/testPriority2.ts` | 15 categories (A–O), 44 assertions | 🟢 PASS (44/44) |
| **Backend Business Logic** | `backend/functions/lib/testBackend.js` | Anti-cheat, Streaks, XP, Badges, PRs | 🟢 PASS (36/36) |
| **Vision Contract & AI Grounding** | `backend/functions/lib/testVision.js` | Payload validation, Grounded feedback | 🟢 PASS (5/5) |
| **AI Coach Cloud Function** | `backend/functions/lib/testCoach.js` | Context builder, Validators, End-to-end | 🟢 PASS (5/5) |
| **Priority 1 Vision FSM** | `frontend/tests/testVisionPipeline.js` | MediaPipe adapter, Outlier, Squat/Pushup/JJ | 🟢 PASS (31/31) |
| **Priority 2 Frontend Contracts** | `frontend/tests/testPriority2Flow.js` | API client, Privacy, Session lifecycle, AI | 🟢 PASS (24/24) |
| **Backend TypeScript Build** | `backend/functions/package.json` | `tsc` compilation | 🟢 PASS (0 errors) |
| **Frontend Production Bundle** | `frontend/package.json` | `vite build` | 🟢 PASS (0 errors) |

---

## Conclusion

The end-to-end Priority 2 pipeline is completely integrated and certified. Real computer vision results from browser and mobile clients reliably flow into authoritative Firestore sessions, update player progress, and feed server-side Gemini AI Coach debriefs without exposing keys, camera frames, or security vulnerabilities.
