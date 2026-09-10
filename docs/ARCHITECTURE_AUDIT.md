# 🔍 SportX Comprehensive Repository Architecture Audit (Phase 0)

**Project:** SportX  
**Target Firebase Project ID:** `sportx-ab5f`  
**AI Provider:** Google Gemini (Server-side only)  
**Primary Database:** Cloud Firestore  
**Server/Backend:** Firebase Cloud Functions 2nd Gen / Node.js / TypeScript  
**Primary Clients:** React + Vite Web App (`frontend/`) & Flutter Mobile Client (`mobile/`)  
**Audit Date:** September 2026  
**Auditor:** Lead Software Architect & Senior Full-Stack Engineer  

---

## 1. Current Architecture

The SportX repository is currently structured into multiple decoupled subdirectories, reflecting concurrent development across different teams or functional areas:

```
c:\Users\praya\Desktop\Sportx\sportX
├── api/                    # Vercel serverless entrypoint (imports backend/functions/src/index.ts)
├── backend/
│   ├── app/                # Competing FastAPI/Python backend (stubs with empty `pass` endpoints)
│   ├── functions/          # Primary active Express/Cloud Functions 2nd Gen backend (Node.js/TypeScript)
│   ├── .firebaserc         # Points to target project: "sportx-ab5f"
│   ├── firebase.json       # Cloud Functions, Firestore, Storage, Emulators configuration
│   ├── firestore.rules     # Granular Firestore security rules
│   ├── firestore.indexes.json # Composite indexes for queries
│   └── storage.rules       # Firebase Storage access rules
├── database/               # Competing SQLite / SQLAlchemy relational schemas and connection scripts
├── ai/                     # Standalone Python / MediaPipe scripts (camera_stream, pose processors)
├── frontend/               # React 18 + Vite web application with responsive UI, dashboard, and camera HUD
├── docs/                   # API contracts and documentation
├── vercel.json             # Vercel deployment orchestration and serverless rewrites
└── package.json            # Root configuration and workspace scripts
```

### Request Flow Overview
- **Production Web (Vercel):** `frontend/` (Static Assets) ➔ Vercel Rewrites (`/api/*` ➔ `api/index.ts`) ➔ Express Router (`backend/functions/src/index.ts`).
- **Cloud Functions:** Cloud Functions 2nd Gen exports (`api`, `healthCheck`, `askCoach`, background triggers).
- **AI Execution:** Server-side Google Gemini REST requests (`gemini-2.5-flash`, fallback `gemini-2.0-flash`).
- **Data Persistence:** Cloud Firestore as the single source of truth.

---

## 2. Current Frontend

The frontend is a single-page application built with **React 18 + Vite** in `frontend/`.

- **Routing (`frontend/src/App.jsx`):**
  - `/` ➔ Conditional redirect (`/dashboard` if authenticated, `/login` if not)
  - `/login` ➔ `LoginPage.jsx` (handles tabbed login / signup, demo login)
  - `/onboarding` ➔ `OnboardingPage.jsx` (sport selection, fitness level)
  - `/dashboard` ➔ `DashboardPage.jsx` (athlete stats, streak pill, AI Coach CTA, daily workout)
  - `/workouts` & `/workouts/:planId` ➔ `WorkoutPlanPage.jsx`
  - `/camera/:planId/:exerciseId` ➔ `CameraWorkoutPage.jsx`
  - `/result` ➔ `SessionResultPage.jsx`
  - `/progress` ➔ `ProgressPage.jsx`
  - `/profile` ➔ `ProfilePage.jsx`
  - `/challenges` ➔ `ChallengesPage.jsx`
  - `/ai-coach` ➔ `AICoachPage.jsx`
- **State Management & Services:**
  - `frontend/src/context/AuthContext.jsx`: Session state stored in `localStorage.getItem('sportx_token')`.
  - `frontend/src/services/api.js`: Unified API client making fetch requests to `/api/v1` with Bearer token authentication.
- **Computer Vision & HUD:**
  - `CameraWorkout.jsx`: Captures webcam via `navigator.mediaDevices.getUserMedia()`, calculates joint angles (`poseMath.js`), drives state transitions via `RepCounterFSM.js`, renders skeleton overlay canvas, and speaks voice cues via Web Speech API (`speechSynthesis`).
- **Frontend Deficiencies Identified:**
  - **Missing Firebase SDK:** The React app does NOT have `firebase` installed in `frontend/package.json`.
  - **No Direct Firebase Auth:** Authentication is attempted by posting plaintext credentials to `/api/v1/auth/login` instead of authenticating through the Firebase Auth Client SDK (`signInWithEmailAndPassword`) and retrieving a valid Firebase ID Token.
  - **Simulated Keypoint Wave:** `CameraWorkout.jsx` currently synthesizes landmark keypoint coordinates using a sinusoidal function when webcam stream is active, rather than executing browser-based MediaPipe Pose landmarker detection.
  - **API Contract Gaps:** Missing client bindings for `/vision/results`, `/vision/feedback`, `/ai/generate-workout`, `/progress/summary`, and push notifications.

---

## 3. Current Backend

The primary active backend is located in `backend/functions/src/` (Node.js 18+, TypeScript, Express, Firebase Admin SDK, Firebase Cloud Functions 2nd Gen).

- **Master Router (`backend/functions/src/index.ts`):**
  - Express app mounted at `/api/v1` and `/v1`.
  - Sub-routers:
    - `/auth` ➔ `authRouter.ts` (Signup, Login, Google Auth, Password Reset, FCM Token)
    - `/users` ➔ `users/index.ts` (Profile read/update, stats)
    - `/sports` ➔ `sports/index.ts` (Sports catalog and selection)
    - `/exercises` ➔ `exercises/index.ts` (Exercise catalog)
    - `/workouts` ➔ `workouts/index.ts` (Workout plans, today's workout)
    - `/sessions` ➔ `sessions/index.ts` (Session start, complete, cancel, XP awarding)
    - `/activity` ➔ `activity/index.ts` (Activity log history)
    - `/progress` ➔ `progress/index.ts` (Aggregated user progress summary)
    - `/gamification` ➔ `gamification/index.ts` (Badges, streak status, level progress)
    - `/leaderboard` ➔ `leaderboard/index.ts` (Global & College leaderboards)
    - `/notifications` ➔ `notifications/index.ts` (Notification feed, device token registration)
    - `/ai` ➔ `aiCoach/index.ts` & dedicated handlers (`askCoachHandler`, `generateWorkoutHandler`, `progressAnalysisHandler`, `consistencyInsightHandler`)
    - `/challenges` ➔ `challenges/index.ts` (Create, join, respond, complete challenges)
    - `/lobbies` ➔ `lobbies/index.ts` (Multiplayer workout rooms)
    - `/bugs` ➔ `bugs/index.ts` (Bug reporting)
    - `/vision` ➔ `vision/index.ts` (Vision result ingestion, retrieval, AI form feedback)
- **Cloud Function Exports:**
  - HTTPS Functions: `api`, `healthCheck`, `askCoach`.
  - Background Triggers: `onUserCreated`, `onUserDeleted`, `onWorkoutCompleted`.
  - Scheduled Functions: `checkStreaksDaily` (midnight cron), `weeklySummaryReport` (Sunday cron).
  - 2nd Gen Callables: `verifyWorkoutSession`, `calculateWorkoutXP`, `searchExercises`, `getAICoachRecommendation`.
- **Secondary / Stale Backend (`backend/app/`):**
  - FastAPI / Python app with route stubs (`auth.py`, `challenges.py`, `profile.py`, `progress.py`, `workouts.py`) containing only `pass`. Unused and competing.

---

## 4. Current Database Systems

The repository contains two competing database designs:

1. **Cloud Firestore (Primary & Active):**
   - Configured in `backend/firebase.json` (`firestore.rules`, `firestore.indexes.json`).
   - Managed via `backend/functions/src/config/firebase.ts` (`admin.firestore()`).
   - Schema implemented across repositories (`userRepository`, `exerciseRepository`, `workoutRepository`, `sessionRepository`, `activityRepository`, `streakRepository`, `xpRepository`, `badgeRepository`, `sportRepository`).
2. **SQLite / PostgreSQL via SQLAlchemy (`database/` - Inactive / Conflicting):**
   - Contains `database/db.py` (`sqlite:///./sportx.db`) and `database/schemas/schema.sql`.
   - Conflicts with the requirement: *"Use Cloud Firestore as the primary application database. Do not use SQLite/PostgreSQL as a competing primary application database."*
   - Status: Deprecated artifact from early prototyping; all functionality must be consolidated onto Firestore.

---

## 5. Current Firebase Integration

- **Firebase Project Verification:**
  - `backend/.firebaserc` correctly specifies:
    ```json
    {
      "projects": {
        "default": "sportx-ab5f"
      }
    }
    ```
  - **Critical Issue in `vercel.json`:** Lines 26–27 hardcode:
    ```json
    "FIREBASE_PROJECT_ID": "demo-sportx",
    "GCLOUD_PROJECT": "demo-sportx"
    ```
    This conflicts directly with `sportx-ab5f`.
  - **Fallback Issue in `backend/functions/src/config/firebase.ts`:**
    ```typescript
    const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'demo-sportx';
    ```
    If environment variables are unset, it silently falls back to `'demo-sportx'` instead of `'sportx-ab5f'`.
- **Firebase Services in Use:**
  - **Firebase Authentication:** Configured for Email/Password and Google tokens.
  - **Cloud Firestore:** Collections for users, exercises, sessions, streaks, badges, challenges, lobbies, and vision results.
  - **Firebase Storage:** Security rules defined for avatars (`users/{userId}/avatar/{file}`) and exercise media (`exercises/{exerciseId}/{file}`).
  - **Cloud Functions (2nd Gen):** HTTPS entrypoints and Firestore event listeners.
  - **Cloud Messaging (FCM):** `admin.messaging()` configured for push notifications.

---

## 6. Current Authentication

- **Target Architecture:**
  $$\text{Client (React / Flutter)} \xrightarrow{\text{Firebase Auth Client SDK}} \text{ID Token (JWT)} \xrightarrow{\text{Bearer Header}} \text{Backend} \xrightarrow{\text{verifyIdToken()}} \text{Authorized Request}$$
- **Current Reality & Deficiencies:**
  1. Frontend has no Firebase Auth Client SDK.
  2. Frontend sends raw credentials `{ email, password }` to `POST /api/v1/auth/login`.
  3. Backend `/auth/login` uses `admin.auth().getUserByEmail(email)`. The Firebase Admin SDK **cannot verify passwords**; it only checks if a user with that email exists, and then returns a Custom Token. Anyone knowing an email can "authenticate" without a valid password!
  4. Middleware `backend/functions/src/auth/index.ts` does support `admin.auth().verifyIdToken(token)`, but because the frontend never generates an ID Token, it relies on custom demo token bypasses.
  5. **Resolution Required:** Install `firebase` in the React frontend, initialize `initializeApp` and `getAuth`, execute `signInWithEmailAndPassword` on the client, obtain the JWT ID Token via `user.getIdToken()`, and send it in the `Authorization: Bearer <token>` header to the backend.

---

## 7. Current AI Implementation

The AI architecture is centered around **Google Gemini**:

- **Location:** `backend/functions/src/ai/`
  - `coach.ts`: Secure server-side REST client `callGeminiApi()` calling Generative Language API (`gemini-2.5-flash`, auto-fallback to `gemini-2.0-flash`).
  - System Instructions enforce strict grounding on student context, medical safety, and zero false claims about camera footage unless explicit vision results are provided.
  - `contextBuilder.ts`: Aggregates user profile, fitness goals, past 5 completed workout sessions, recent form scores, streak status, and detected biomechanical errors.
  - `validators.ts`: Validates raw Gemini output against strict JSON schema (`summary`, `strengths`, `recommendations`, `nextFocus`).
  - `workoutGenerator.ts`: Generates structured daily and weekly workout plans tailored to muscle focus, equipment, and difficulty.
  - `insights.ts`: Evaluates weekly volume and consistency patterns.
- **Security Check:** Gemini API keys are accessed **strictly on the server** via `process.env.GEMINI_API_KEY`. No API keys are exposed to the browser or client bundles.
- **Duplicate / Mock Issue:** `backend/functions/src/aiCoach/index.ts` contains a mock `/analyze-form` route that generates random scores (`Math.random() * 28 + 72`) with hardcoded string arrays, conflicting with the real Gemini AI integration in `backend/functions/src/ai/`.

---

## 8. Current Vision Implementation

- **Python Vision (`ai/`):**
  - Files `camera_stream.py`, `processors/squat.py`, `pushup.py`, `bicep_curl.py` contain empty class stubs with `pass`.
- **Browser Vision (`frontend/src/`):**
  - `poseMath.js`: Implements angle calculations (`calculateAngle`), spine alignment (`calculateSpineAngle`), knee valgus checks (`checkKneeValgus`), and camera positioning heuristics (`validateCameraPositioning`).
  - `repCounterFSM.js`: Implements a 3-exercise Finite State Machine (`squat`, `pushup`, `jumping_jacks`) tracking states (`UP`, `DESCENDING`, `BOTTOM`, `INFLECTION`) with rep validation and TTS audio feedback.
  - `CameraWorkout.jsx`: Canvas rendering of skeleton and joint badges, currently using synthetic sinusoidal coordinates for keypoints.
- **Backend Vision Pipeline (`backend/functions/src/vision/`):**
  - `visionResult.ts`: Validates incoming `VisionResultPayload`, associates results with `userId`, and stores records in `visionResults` collection.
  - `validators.ts`: Enforces strict data contracts (reps $\ge$ validFormReps, formScore between 0–100, confidence $\ge$ 0.5, valid detected issues).
  - `coach.ts` (`generateFormFeedbackHandler`): Consumes validated vision telemetry and generates grounded AI coaching advice via Gemini.
- **Gaps:**
  - The prototype supports only 3 exercises in the browser FSM and 5 in the backend repository. It does not meet the 25–30 exercise catalog requirement.
  - No real-time pose detector is currently initialized in `CameraWorkout.jsx` (MediaPipe Pose model bundle is not loaded).

---

## 9. Current Challenge / Multiplayer Implementation

- **Backend Architecture (`backend/functions/src/challenges/` & `lobbies/`):**
  - `challenges`: `createChallenge.ts`, `joinChallenge.ts`, `updateChallenge.ts`, `completeChallenge.ts`.
  - Anti-cheat logic: Challenge winners, completion status, and XP awards are calculated server-side in `completeChallengeInternal`.
  - `lobbies`: Express router supporting room creation, room joining by code, participant ready state, and match start.
- **Duplicate Stub:** `backend/functions/src/lobby/index.ts` contains duplicate 25-line type definitions.
- **Frontend UI:** `ChallengesPage.jsx` and `CompetitiveLobby.jsx` exist and are functional with UI components for joining and tracking peer duels.

---

## 10. Current Notification Implementation

- **Backend Architecture (`backend/functions/src/notifications/`):**
  - Express routes for fetching user notification feed (`GET /notifications`) and registering device push tokens (`POST /notifications/device-token`).
  - Integrated with `admin.messaging()` in `backend/functions/src/config/firebase.ts`.
- **Gaps:**
  - Frontend has no Firebase Cloud Messaging service worker (`firebase-messaging-sw.js`).
  - Client-side token registration flow is not yet wired in the React application.

---

## 11. Existing Tests

- **Backend Tests (`backend/functions/`):**
  - `testBackend.ts`: End-to-end integration test suite for 30+ endpoints.
  - `testCoach.ts`: AI Coach context building, prompt assembly, and validator tests.
  - `testVision.ts`: Vision result ingestion, schema validation, and storage tests.
  - `testPersonalization.ts`: AI workout generator and progress analysis tests.
  - `testChallenges.ts`: Challenge creation, participation, and anti-cheat tests.
- **Current Build/Test Status: BROKEN**
  - Running `npm test` fails with TypeScript error:
    ```
    src/challenges/completeChallenge.ts(13,10): error TS2305: Module '"../gamification"' has no exported member 'updateStreak'.
    ```
- **Frontend Tests:**
  - No automated unit/integration test runner configured in `frontend/package.json` (no Vitest or Jest).

---

## 12. Duplicate Systems

| System | Primary / Active Component | Duplicate / Conflicting Component | Action Required |
|---|---|---|---|
| **Backend API** | `backend/functions/` (Node.js/TypeScript Express/Cloud Functions) | `backend/app/` (FastAPI Python stubs with `pass`) | Deprecate `backend/app/`; consolidate all business logic on Node.js/TypeScript. |
| **Database** | Cloud Firestore (`backend/functions/src/repositories/`) | SQLite / SQLAlchemy (`database/db.py`, `database/schemas/schema.sql`) | Remove/archive SQLite code; ensure all persistent entities live exclusively in Firestore. |
| **AI Form Feedback** | `backend/functions/src/ai/coach.ts` & `vision/` (Grounded Gemini AI) | `backend/functions/src/aiCoach/index.ts` (`Math.random()` simulation) | Eliminate random mock; route `/api/v1/ai/analyze-form` to validated Vision/Gemini service. |
| **Lobby Modules** | `backend/functions/src/lobbies/index.ts` (Active router) | `backend/functions/src/lobby/index.ts` (Orphaned type definition) | Merge type definitions into shared types and remove `backend/functions/src/lobby/`. |
| **Bug Reports** | `backend/functions/src/bugs/index.ts` (Active router) | `backend/functions/src/bugReports/index.ts` (Unmounted duplicate) | Consolidate onto `backend/functions/src/bugs/` and delete duplicate. |

---

## 13. Missing Systems

1. **Client-Side Firebase SDK:** React frontend lacks `firebase` dependency and client initialization (`firebase/auth`, `firebase/firestore`, `firebase/storage`, `firebase/messaging`).
2. **Extensible 25–30 Exercise Registry:** Only 5 exercises in backend repository and 3 in frontend FSM. Registry must expand to 25–30 exercises with comprehensive biomechanical metadata and form rules.
3. **In-Browser MediaPipe Pose Landmarker:** Frontend `CameraWorkout.jsx` needs real pose landmark detection from webcam stream instead of simulated coordinate waves.
4. **Flutter Mobile Client:** Mobile app architecture (`mobile/lib/...`) needs to be scaffolded to connect to the unified backend.
5. **Firestore Security Rule for `visionResults`:** The `visionResults` collection is omitted in `backend/firestore.rules`.
6. **Frontend FCM Service Worker:** Missing `firebase-messaging-sw.js` for web push notifications.

---

## 14. Broken Systems

1. **TypeScript Build Failure:** `completeChallenge.ts` imports non-existent `updateStreak` from `../gamification`, breaking `tsc` build and test runs.
2. **Vercel Project ID Mismatch:** `vercel.json` hardcodes `"FIREBASE_PROJECT_ID": "demo-sportx"` and `"NODE_ENV": "development"`, preventing production deployment to `sportx-ab5f`.
3. **Firebase Admin Config Fallback:** `config/firebase.ts` defaults to `'demo-sportx'` instead of `'sportx-ab5f'`.
4. **Authentication Flow:** Passwords sent to `/api/v1/auth/login` are not validated against Firebase Authentication because the backend uses `getUserByEmail()`.

---

## 15. Security Issues

1. **Authentication Bypass in Backend `/login`:** Because `getUserByEmail()` is used without password verification, any client can request a token for any email address if Firebase client authentication is bypassed.
2. **Hardcoded Demo Secrets in `vercel.json`:** `"FIREBASE_PROJECT_ID": "demo-sportx"` in tracked file.
3. **Missing Collection Rule:** `visionResults` has no explicit rule in `backend/firestore.rules` (defaults to deny for client queries).
4. **Gitignore Completeness:** `.gitignore` should explicitly safeguard Firebase service account keys (`*-adminsdk-*.json`, `serviceAccountKey.json`).

---

## 16. Environment-Variable Issues

- **`vercel.json`:**
  - Stale `FIREBASE_PROJECT_ID: "demo-sportx"` must be updated to `"sportx-ab5f"`.
  - `NODE_ENV` set to `"development"` instead of `"production"`.
- **Server Environment Variables:**
  - `GEMINI_API_KEY`: Required for AI Coach, Workout Generator, and Vision Feedback. Must remain strictly server-side.
  - `FIREBASE_SERVICE_ACCOUNT` or standard Google Application Credentials: Required for production Cloud Functions and serverless deployments to `sportx-ab5f`.
- **Client Environment Variables:**
  - `frontend/.env.example` must contain client-safe `VITE_FIREBASE_*` configuration pointing to `sportx-ab5f`.
  - No secret keys (Gemini, service account) in any `VITE_*` variables.

---

## 17. Recommended Architecture

```
                                  SPORTX PLATFORM
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
         React Web Client                               Flutter Mobile App
         (frontend/ - Vite)                              (mobile/ - Flutter)
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         │
                             Firebase Authentication
                                 (Client SDK)
                                         │
                             Firebase ID Token (JWT)
                                         │
                                         ▼
                             SportX Unified Backend
                             (Firebase Cloud Functions 2nd Gen)
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
           Cloud Firestore        Firebase Storage              FCM
           (sportx-ab5f)           (Media / Avatars)      (Push Notifications)
                 │
        ┌────────┴────────┐
        │                 │
  Gemini AI Engine    Vision Service
  (Server-side Only)  (25-30 Exercise Registry)
```

### Core Architectural Rules:
1. **Single Backend:** All business logic, scoring, XP calculations, streak management, and AI interactions execute exclusively in the Cloud Functions 2nd Gen backend.
2. **Single Database:** Cloud Firestore on project `sportx-ab5f`.
3. **Server-Authoritative Anti-Cheat:** XP, streaks, levels, and challenge results are never modified directly by clients.
4. **Server-Side AI Secrets:** Google Gemini credentials never leave the backend.
5. **Shared Logic:** Web and Mobile clients consume identical REST/Callable endpoints and Firestore data models.

---

## 18. Files That Should Be Changed

### Phase 1 & 2: Configuration & Environment
- [backend/functions/src/config/firebase.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/config/firebase.ts) — Default to `sportx-ab5f`.
- [vercel.json](file:///c:/Users/praya/Desktop/Sportx/sportX/vercel.json) — Update project ID to `sportx-ab5f`, set production environment.
- [.gitignore](file:///c:/Users/praya/Desktop/Sportx/sportX/.gitignore) — Add service account key patterns.
- [.env.example](file:///c:/Users/praya/Desktop/Sportx/sportX/.env.example) & [frontend/.env.example](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/.env.example) — Standardize required variables.

### Phase 3: Authentication Integration
- [frontend/package.json](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/package.json) — Install `firebase`.
- [frontend/src/services/firebase.js](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/services/firebase.js) [NEW] — Initialize Firebase client SDK.
- [frontend/src/context/AuthContext.jsx](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/context/AuthContext.jsx) — Use Firebase Auth (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `onIdTokenChanged`).
- [frontend/src/services/api.js](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/services/api.js) — Attach active Firebase ID Token to requests.
- [backend/functions/src/auth/authRouter.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/auth/authRouter.ts) — Align login with verified ID tokens.

### Phase 4: Firestore Security & Indexes
- [backend/firestore.rules](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/firestore.rules) — Add security rules for `visionResults`.
- [backend/firestore.indexes.json](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/firestore.indexes.json) — Add compound index for `visionResults` by `userId` and `createdAt`.

### Phase 6: Backend Cleanup & Compilation Fixes
- [backend/functions/src/challenges/completeChallenge.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/challenges/completeChallenge.ts) — Fix broken `updateStreak` import using `StreakRepository`.
- [backend/functions/src/index.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/index.ts) — Consolidate AI and bug routes, remove dead mocks.

### Phase 7 & 13–16: Vision & Exercise Registry
- [backend/functions/src/repositories/exerciseRepository.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/repositories/exerciseRepository.ts) — Expand to 25–30 exercise registry with form rules.
- [frontend/src/utils/repCounterFSM.js](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/utils/repCounterFSM.js) — Expand supported exercises and heuristics.
- [frontend/src/components/CameraWorkout.jsx](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/components/CameraWorkout.jsx) — Integrate real-time landmark tracking and post `VisionResultPayload` to `/vision/results`.
- [frontend/src/services/api.js](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/services/api.js) — Add `submitVisionResult` and `getVisionFeedback`.

### Phase 8: Flutter Client Architecture
- Scaffold `mobile/` directory matching standard clean architecture.

---

## 19. Files That Should Remain Unchanged

The following core components represent working, high-value implementations that must be preserved:
- [frontend/src/pages/DashboardPage.jsx](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/pages/DashboardPage.jsx) — Complete student dashboard UI, streaks, and quick action cards.
- [frontend/src/pages/AICoachPage.jsx](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/pages/AICoachPage.jsx) — Interactive AI Coach conversation UI.
- [frontend/src/pages/ChallengesPage.jsx](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/pages/ChallengesPage.jsx) & [CompetitiveLobby.jsx](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/components/CompetitiveLobby.jsx) — Peer challenge and lobby UI.
- [frontend/src/pages/ProfilePage.jsx](file:///c:/Users/praya/Desktop/Sportx/sportX/frontend/src/pages/ProfilePage.jsx) — User profile and preferences interface.
- [backend/functions/src/ai/coach.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/ai/coach.ts) — Core Gemini API communication, system instructions, and schema validators.
- [backend/functions/src/ai/contextBuilder.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/ai/contextBuilder.ts) — Grounded user context construction.
- [backend/functions/src/ai/workoutGenerator.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/ai/workoutGenerator.ts) — AI workout plan generator.
- [backend/functions/src/vision/validators.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/vision/validators.ts) & [visionResult.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/vision/visionResult.ts) — Vision telemetry schema validation and Firestore persistence.
- [backend/functions/src/services/gamificationService.ts](file:///c:/Users/praya/Desktop/Sportx/sportX/backend/functions/src/services/gamificationService.ts) — Authoritative XP, streak, and badge algorithms.

---

## 20. Potentially Destructive Operations

The following commands have potential to overwrite production configuration, delete database records, or corrupt state. They **must never be executed automatically** without explicit user confirmation:

1. `firebase deploy`:
   - *Impact:* Deploys Cloud Functions, Firestore rules, Storage rules, and indexes to the live project `sportx-ab5f`.
   - *Risk:* Overwrites existing production Cloud Functions or Firestore security rules.
   - *Policy:* Prohibited during development; perform local testing and emulator verification only.
2. `vercel deploy` / `vercel --prod`:
   - *Impact:* Publishes the web build to the live Vercel production domain.
   - *Policy:* Only run when explicitly authorized after local build validation.
3. Deletion of collections / Firestore data (`db.collection(...).delete()`):
   - *Impact:* Irreversible data loss.
   - *Policy:* Strict write/merge operations only; no batch deletion scripts against production data.
4. Git force push (`git push --force`):
   - *Impact:* Can destroy commit history on `origin/main`.
   - *Policy:* Never use `--force`.
