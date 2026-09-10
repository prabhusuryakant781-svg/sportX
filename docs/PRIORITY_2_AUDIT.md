# 🔍 SportX Priority 2 Comprehensive Architecture Audit

**Target Firebase Project:** `sportx-ab5f`  
**Primary Database:** Cloud Firestore  
**Backend:** Firebase Cloud Functions 2nd Gen (Node.js/TypeScript Express)  
**Edge Vision Engine:** MediaPipe Tasks Vision (`PoseLandmarker` in `VIDEO` mode, 100% on-device)  
**AI Intelligence:** Google Gemini (`gemini-2.5-flash`, server-side only)  
**Client Applications:** React 18 + Vite (`frontend/`) & Flutter Mobile (`mobile/`)

---

## 1. Existing Vision Pipeline
- **Implementation:** React web component [`frontend/src/components/CameraWorkout.jsx`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/components/CameraWorkout.jsx) powered by [`frontend/src/services/poseLandmarker.js`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/services/poseLandmarker.js) using `@mediapipe/tasks-vision` with `pose_landmarker_lite.task` model running locally in `VIDEO` mode.
- **Landmark Normalization:** [`frontend/src/utils/mediapipeLandmarks.js`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/utils/mediapipeLandmarks.js) maps 33 MediaPipe indices to 13 SportX anatomical keypoints, converts normalized `(0..1)` coordinates to canvas pixels, applies temporal EMA smoothing (`alpha = 0.45`), and rejects physically impossible joint teleportation (> 35% canvas diagonal).
- **Rep & Form Counting:** [`frontend/src/utils/repCounterFSM.js`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/utils/repCounterFSM.js) evaluates biomechanical joint angles (`hip`-`knee`-`ankle` for squats, `shoulder`-`elbow`-`wrist` for pushups, feet width / hand height for jumping jacks).
- **Framing & Positioning:** [`frontend/src/utils/poseMath.js`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/utils/poseMath.js) verifies full body visibility, head clipping, and feet clipping.
- **Privacy Assurance:** Webcam video frames are never streamed or uploaded to Firebase/backend; inference executes strictly on the user's device. Only derived metrics (reps, score, duration, detected errors) are passed to `onFinishWorkout`.

---

## 2. Existing Workout Session Flow
- **Initiation:** User navigates to `/camera/:planId/:exerciseId`. Currently, the frontend starts the camera locally without creating a server-side session document in advance.
- **Active Tracking:** Video frames update canvas skeleton HUD, rep count, form score, and real-time audio/haptic feedback.
- **Completion:** [`frontend/src/pages/CameraWorkoutPage.jsx`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/pages/CameraWorkoutPage.jsx) creates a client timestamp `sessionId = 'session_' + Date.now()`, calls `api.submitVisionResult(visionData)` (`POST /api/v1/vision/results`), and calls `api.completeSession(sessionId, payload)` (`POST /api/v1/sessions/:sessionId/complete`).
- **Navigation:** Routes to [`frontend/src/pages/SessionResultPage.jsx`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/pages/SessionResultPage.jsx) displaying reps, form score, streak, XP earned, and confetti.
- **Gap Identified:** Missing pre-session creation via `POST /api/v1/sessions/start`, and missing post-workout AI analysis trigger on `SessionResultPage.jsx`.

---

## 3. Existing Firestore Collections
- `users`: User profiles, goals, sport, equipment, server-calculated stats (`xp`, `level`, `currentStreak`, `longestStreak`, `badges`, `totalWorkouts`, `totalMinutes`, `totalCalories`).
- `workoutSessions`: Authoritative workout records (`sessionId`, `userId`, `workoutId`, `startTime`, `completionTime`, `durationMinutes`, `durationSeconds`, `totalReps`, `formAccuracyAverage`, `caloriesBurned`, `xpEarned`, `status`).
- `activityLogs`: Immutable telemetry logs per completed exercise set.
- `progress`: Aggregated user progress metrics (`weeklyProgress`, `monthlyProgress`, `totalReps`, `personalRecords`, `formScoreTrends`).
- `visionResults`: Structured Computer Vision analysis outputs (`sessionId`, `userId`, `exerciseId`, `reps`, `formScore`, `confidence`, `errors`, `timestamp`).
- `coachInsights`: AI-generated personalized coaching insights and session analysis.
- `streaks`: Server-authoritative daily streak tracking.
- `xpTransactions`: Immutable ledger recording every XP award for anti-cheat verification.
- `badges` & `userBadges`: Master catalog and user trophy unlocks.
- `workouts`, `workoutPlans`, `exercises`, `sports`, `challenges`, `lobbies`, `notifications`, `deviceTokens`, `bugReports`.

---

## 4. Existing Backend APIs / Cloud Functions
- Master Router: [`backend/functions/src/index.ts`](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/index.ts) mounts `/api/v1` routes:
  - `POST /api/v1/sessions/start`: Creates in-progress session.
  - `POST /api/v1/sessions/:sessionId/complete`: Idempotent completion, server-side XP calculation, streak progression, badge unlocking, progress aggregation.
  - `GET  /api/v1/sessions/:sessionId`: Retrieves single session with ownership verification.
  - `GET  /api/v1/progress/summary`: Returns weekly/monthly progress, PRs, and trends.
  - `POST /api/v1/vision/results`: Ingests validated Vision result into `visionResults` collection.
  - `GET  /api/v1/vision/results`: Retrieves recent vision records for authenticated user.
  - `POST /api/v1/vision/feedback`: Generates AI biomechanics feedback for vision results.
  - `POST /api/v1/ai/ask-coach`: Consults AI Coach with user context.
  - `POST /api/v1/ai/generate-workout`: Personalized workout generator.
  - `GET  /api/v1/ai/progress`: AI progress analysis.
  - `GET  /api/v1/ai/consistency`: AI consistency insights.

---

## 5. Existing AI Coach Implementation
- **Core Engine:** [`backend/functions/src/ai/coach.ts`](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/ai/coach.ts)
  - Enforces strict system instructions: Grounded in supplied user context, truthful, no false camera claims, safe medical disclaimers, strict JSON output schema.
  - Input validation: max 500 characters, non-empty, authenticated UID.
  - Output validation: [`backend/functions/src/ai/validators.ts`](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/ai/validators.ts) verifies schema `{ summary, strengths, recommendations, nextFocus }`.
  - Offline/Test Mode: `generateLocalTestResponse()` provides deterministic mock responses during automated unit tests or when `GEMINI_API_KEY` is not present.

---

## 6. Existing Gemini Integration
- **Server-Side REST Execution:** `callGeminiApi()` in [`backend/functions/src/ai/coach.ts`](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/ai/coach.ts#L61-L170).
- **Candidate Model Fallback:** Tries `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash-latest` → `gemini-1.5-flash`.
- **Security:** Key is read from `process.env.GEMINI_API_KEY` only on the server. Never exposed to frontend or Flutter. Logs sanitize and redact API keys (`key=[REDACTED]`).

---

## 7. Existing Progress Implementation
- **Data Access:** [`backend/functions/src/repositories/progressRepository.ts`](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/repositories/progressRepository.ts).
- **Incremental Aggregation:** `recordWorkout()` appends to `formScoreTrends` (last 14 sessions), tracks personal records (`${exerciseId}_max_reps`), aggregates total reps, duration, and calories, and calculates weekly/monthly completion percentages.
- **Frontend Access:** `GET /api/v1/progress/summary` via [`frontend/src/services/api.js`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/services/api.js#L76).

---

## 8. Existing Authentication Flow
- **Client:** Firebase Client SDK in [`frontend/src/services/firebase.js`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/services/firebase.js).
- **State Management:** [`frontend/src/context/AuthContext.jsx`](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/context/AuthContext.jsx) manages login/signup/logout/password reset.
- **Token Propagation:** `api.js` attaches `Authorization: Bearer <getIdToken()>` on every request.
- **Server Verification:** [`backend/functions/src/auth/index.ts`](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/auth/index.ts) decodes JWT via `admin.auth().verifyIdToken()`, rejecting invalid tokens.

---

## 9. Existing Frontend API Flow
- Handled by central singleton `api` in `frontend/src/services/api.js`.
- Communicates directly with backend at `/api/v1/*`.
- Handled pages: `CameraWorkoutPage.jsx`, `AICoachPage.jsx`, `SessionResultPage.jsx`, `DashboardPage.jsx`, `ProgressPage.jsx`.

---

## 10. Existing Flutter API Flow
- `mobile/lib/core/network/api_client.dart` maintains HTTP headers with Firebase ID Token.
- `mobile/lib/services/auth_service.dart` supports email/password authentication.
- `mobile/lib/services/ai_coach_service.dart` calls `/ai/ask-coach`.
- Flutter models exist for `user_model.dart` and `vision_result_model.dart`.

---

## 11. Missing Connections
1. **Server-Side Session Start:** `CameraWorkout.jsx` does not call `api.startSession()` when workout tracking begins; session ID is currently generated client-side at finish time.
2. **Session History Endpoint:** `GET /api/v1/sessions` is missing from `sessionsRouter` (only `GET /sessions/:sessionId` exists).
3. **Dedicated Post-Workout AI Analysis Endpoint:** `POST /api/v1/ai/session-analysis` does not exist to analyze a completed session by `sessionId`, ground advice in authoritative Firestore session & vision data, and persist to `coachInsights`.
4. **Post-Workout Analysis UI:** `SessionResultPage.jsx` does not feature an "Analyze My Workout with AI Coach" action to request post-workout analysis.
5. **Coach Insight Repository:** No dedicated repository exists for saving and querying `coachInsights/{insightId}` documents.
6. **Progress Endpoint Alias:** `GET /api/v1/progress` should be supported alongside `GET /api/v1/progress/summary`.
7. **Flutter Mobile Services:** Mobile models and services for sessions (`workout_session_service.dart`), progress (`progress_service.dart`), and coach insights are missing.

---

## 12. Duplicate / Conflicting Architecture
- `backend/app/`: Legacy FastAPI placeholder with Python `pass` statements. Dead code; not used in production.
- `database/`: Legacy SQLite schemas and seeds. Dead code; not used in production.
- `backend/functions/src/aiCoach/index.ts`: Contains legacy simulated form feedback (`/ai/analyze-form`) with randomized numbers, whereas `backend/functions/src/ai/coach.ts` contains the real, grounded `generateFormFeedbackHandler`. Unification is required.

---

## 13. Recommended Implementation Plan
1. **Standardize Internal Vision Result & Session Lifecycle:**
   - Update `CameraWorkout.jsx` and `CameraWorkoutPage.jsx` to initiate a session via `api.startSession({ exerciseId, planId })` on start.
   - On completion, submit both structured Vision result (`POST /vision/results`) and completed session (`POST /sessions/:sessionId/complete`).
2. **Add Missing Session & Progress Endpoints:**
   - Add `GET /api/v1/sessions` to `sessionsRouter` (returns user's session history).
   - Add `GET /api/v1/progress` alias to `progressRouter`.
3. **Implement Coach Insights Repository & AI Session Analysis Endpoint:**
   - Create [`backend/functions/src/repositories/coachInsightRepository.ts`](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/repositories/coachInsightRepository.ts).
   - Create `POST /api/v1/ai/session-analysis` in `backend/functions/src/ai/coach.ts` and route it through `index.ts`.
   - Gathers authoritative `workoutSessions/{sessionId}` and linked `visionResults` from Firestore, builds grounded AI prompt, invokes Gemini, saves to `coachInsights/{insightId}`, and returns structured output.
4. **Upgrade Frontend Session Result Screen:**
   - In `SessionResultPage.jsx`: display exercise name, reps, duration, form score, and detected issues; add "🤖 Analyze with AI Coach" button that calls `api.analyzeSession(sessionId)` and renders the structured AI analysis.
5. **Implement Shared Flutter Services:**
   - Add `session_model.dart`, `progress_model.dart`, `coach_insight_model.dart`.
   - Add `workout_session_service.dart` and `progress_service.dart`.
6. **Automated Verification:**
   - Create comprehensive unit test suites covering all 15 required verification criteria (A–O).
   - Validate full builds across backend and frontend.
