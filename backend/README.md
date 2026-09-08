# ⚡ SportX Backend — Cloud Functions & Firebase Architecture

> **Stack:** Firebase Auth + Cloud Firestore + Firebase Storage + Cloud Functions 2nd Gen (TypeScript) + FCM  
> **Team:** 2 People (Person 1: Core Backend + Database + Security | Person 2: Logic + AI Coach + Realtime)

---

## 📁 Backend Directory Layout

```text
backend/
├── firebase.json              # Firebase tools & emulator configuration
├── firestore.rules            # Firestore security rules (anti-cheat XP/streak guards)
├── firestore.indexes.json     # Composite query indexes
├── storage.rules              # Profile picture & media upload permissions
├── functions/
│   ├── package.json           # Node.js dependencies
│   ├── tsconfig.json          # TypeScript build configuration
│   └── src/
│       ├── index.ts           # Cloud Function 2nd Gen API master router
│       ├── localServer.ts     # Instant local development server (port 8000)
│       ├── config/
│       │   └── firebase.ts    # Firebase Admin SDK initialization
│       ├── auth/              # Auth middleware & token validation
│       ├── users/             # Profile CRUD & fitness preferences
│       ├── sports/            # Sports catalogue (Badminton, Football, Cricket...)
│       ├── exercises/         # Exercise database (Squats, Push-ups, Curls, Planks)
│       ├── workouts/          # Workout plans & adaptive daily routines
│       ├── sessions/          # Session lifecycle (start, complete, cancel)
│       ├── activity/          # Activity logs & history queries (today, 7d, 30d, all)
│       ├── gamification/      # Server-side XP calculation, streaks, badges
│       ├── challenges/        # Campus challenges & multiplayer lobby
│       ├── leaderboard/       # Real-time leaderboard aggregation
│       ├── notifications/     # FCM push notifications
│       └── ai/
│           ├── contextBuilder.ts   # Assembles AI Coach context
│           ├── coach.ts            # Vision result ingestion & AI Q&A
│           ├── workoutGenerator.ts # Generates & validates adaptive workouts
│           └── insights.ts         # Consistency & trend analytics
```

---

## 👥 Person-by-Person Division

### 🛡️ Person 1 — Core Backend, Database & Security
- **Firebase Setup:** Emulators, Auth, and Firestore instance.
- **Authentication:** `auth/` (Token verification, sign-up provisioning).
- **Users & Fitness Profile:** `users/` (Profile CRUD, time budget, goal settings).
- **Exercises & Workouts:** `exercises/` & `workouts/` (Definitions, sets, reps, form rules).
- **Sessions & Activity Logs:** `sessions/` & `activity/` (History queries: today, 7d, 30d, all).
- **Gamification Rules:** `gamification/` (Server-side XP awards, streak calculation, badges).
- **Security:** `firestore.rules` & `storage.rules`.

### 🧠 Person 2 — Backend Logic, AI Coach Integration & Real-time
- **AI Coach Context:** `ai/contextBuilder.ts` (Builds rich student context).
- **AI Workout Generator:** `ai/workoutGenerator.ts` (Validates and saves routines).
- **AI Feedback & Questions:** `ai/coach.ts` (Coaching Q&A, advice).
- **Vision ➔ Backend Ingestion:** `POST /api/v1/ai/vision-result` (Ingests structured MediaPipe outputs).
- **Challenges & Lobbies:** `challenges/` (Real-time Firestore listeners for group workouts).
- **Leaderboards & Notifications:** `leaderboard/` & `notifications/` (Rankings & FCM alerts).

---

## 🚀 How to Run Locally

### Option A: Fast Local TypeScript Server (Recommended for Immediate Testing)
```bash
cd backend/functions
npm install
npm run dev
```
Server runs on **`http://localhost:8000`** with live endpoints:
- Health Check: `GET http://localhost:8000/health`
- Exercises: `GET http://localhost:8000/api/v1/exercises`
- Workouts: `GET http://localhost:8000/api/v1/workouts`
- Today's Recommendation: `GET http://localhost:8000/api/v1/workouts/today`
- Leaderboard: `GET http://localhost:8000/api/v1/leaderboard`
- Challenges: `GET http://localhost:8000/api/v1/challenges`
- Ingest Vision Result: `POST http://localhost:8000/api/v1/ai/vision-result`

### Option B: Firebase Emulators
```bash
cd backend
npm --prefix functions install
npm --prefix functions run build
firebase emulators:start
```
