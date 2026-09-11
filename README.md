# ⚡ SportX — AI-Powered Student Fitness & Sports Companion

> **Product:** AI-Powered Student Fitness & Sports Companion  
> **Team:** HACKPACK (6 Members • 3 Groups)  
> **Core Loop:** LOGIN → PERSONALIZE → WORKOUT / LOBBY MATCH → AI ANALYZE → CORRECT → SCORE → SAVE → PROGRESS → REWARD → CHALLENGE

---

## 📋 The 31 Official Core Features

| Category | Features Included |
|---|---|
| **Account & Profile** | **01.** Signup / Login • **02.** User Profile • **03.** Sports Selection • **04.** Fitness Level • **05.** Privacy Control • **06.** Personal Dashboard |
| **AI Computer Vision** | **07.** Camera Workout in Lobby • **08.** Pose Detection • **09.** Rep Counting • **10.** Form Analysis & Error Detection • **11.** Exercise Library • **28.** Stop / Pause in Session |
| **Workout Planning** | **12.** Personalized Workout Plan • **13.** Workout Library • **14.** Daily Workout Plan • **15.** Activity Logging • **16.** Workout History (Today, 7d, 30d, All) |
| **Progress & Insights** | **17.** Weekly / Monthly Progress • **18.** Goal Progress / % • **19.** Streak Tracking • **20.** Progress Chart • **21.** Milestones • **22.** Consistency Insights |
| **Multiplayer & Social** | **23.** Daily Challenge in Lobby • **24.** Point / XP • **25.** Lobby to Compete (Multiplayer) • **26.** Challenge Invite to Friends • **27.** Badges / Rewards / Leaderboard |
| **System & Quality** | **29.** Secure Authentication • **30.** Bug Reporting • **31.** Responsive Design |

---

## 📁 Repository Layout

```text
SPORTX/
├── frontend/             # React 18 + Vite, Tailwind CSS, Firebase Auth integration
├── backend/              # CANONICAL BACKEND (Project: sportx-ab5f)
│   ├── firebase.json     # Firebase emulator & deployment configuration
│   ├── .firebaserc       # Target project: sportx-ab5f
│   ├── firestore.rules   # Server-authoritative rules with strict write denials
│   ├── storage.rules     # Storage security rules (avatars, private session recordings)
│   └── functions/        # Cloud Functions 2nd Gen (TypeScript API & Eventarc triggers)
│       └── src/          # Unified routes, services, repositories, AI coach & vision
├── api/                  # Vercel serverless entrypoint proxying to backend/functions
├── archive/              # Preserved archives of deprecated prototypes
│   └── sports-app-backend/ # Superseded prototype (formerly targeting sportx-fitness-app)
├── ai/                   # MediaPipe Pose, OpenCV, Rep Counter, CV Telemetry
├── docs/                 # Architecture, Deployment, Security & API Documentation
├── package.json          # Unified monorepo scripts (dev, build, vercel-build)
└── vercel.json           # Production deployment configuration
```

---

## 🚀 Quick Start (Local Backend & Testing)

```bash
# 1. Start Both Frontend & Backend Concurrently
npm run dev

# Or run backend independently:
npm run dev:backend

# 2. Run Complete CI Pipeline (Typecheck + Full Master Test Suite)
npm run ci

# 3. Run Frontend Typecheck & Backend Build
npm run typecheck

# 4. Run Comprehensive Master Backend Test Suite (220+ Tests)
npm run test

# 5. Run Dedicated Firebase Emulator Integration Tests (48 Tests)
npm run test:emulator

# 6. Seed Master Database (Sports, Exercises, Badges, Workouts)
npm --prefix backend/functions run seed
```

---

## 🔒 Security, Privacy & Account Lifecycle Architecture

The SportX backend implements a server-authoritative security model:

1. **Cascading & Retry-Safe Account Deletion**:
   - `DELETE /api/v1/auth/account` completely removes the user from Firebase Authentication, Firestore (`users`, `workoutSessions`, `activityLogs`, `userProgress`, `userBadges`, `notifications`, `deviceTokens`, `streaks`, `xpTransactions`), Firebase Storage (`avatars/{userId}/`, `recordings/{userId}/`), and in-memory caches.
   - Idempotent and retry-safe: Partial failures can be safely retried without orphaned data or 500 errors.
   - Also automatically invoked via Firebase Auth `onUserDeleted` background trigger.

2. **Re-Authentication Enforced for Credentials**:
   - `POST /api/v1/auth/update-password` requires `currentPassword` verified via Firebase Auth before updating to a new password (min 6 characters).
   - `POST /api/v1/auth/update-email` requires `currentPassword` verification before re-binding to a new email address.

3. **Cross-User Privacy & Data Sanitization**:
   - `GET /api/v1/users/:userId` provides a sanitized public profile displaying only public gamification information (`displayName`, `avatarUrl`, `selectedSport`, `totalXp`, `level`, `currentStreak`, `badges`).
   - Sensitive PII (`email`, `age`, `height`, `weight`, `fitnessLevel`, `preferences`) is strictly redacted from public endpoints.
   - Access to private statistics (`GET /api/v1/users/stats`) or marking notifications as read (`PATCH /api/v1/notifications/:id/read`) enforces strict ownership checks, returning `403 Forbidden` for cross-user attempts.

4. **Rate Limiting & Safe Audit Logging**:
   - Sliding-window rate limiters protect sensitive endpoints:
     - `authRateLimiter`: 10 req/min for authentication attempts.
     - `securityRateLimiter`: 5 req/15min for credential and account modifications.
     - `mediaRateLimiter`: 15 req/10min for profile avatar uploads.
     - `workoutCompletionRateLimiter`: 30 req/min for workout completions.
   - Structured JSON audit logging (`AuditLogger`) logs all security and account events with automated recursive redaction of sensitive fields (`password`, `currentPassword`, `token`, `apiKey`, `credential`, `authHeader`).

5. **Production Persistence Safety**:
   - Production mode (`NODE_ENV === 'production'`) strictly forbids synthetic test tokens (`test_user_*`) and demo tokens.
   - In-memory mock fallbacks are disabled; all persistent operations must run against real Firestore and Cloud Storage.

---

## 🧪 Testing & Verification Matrix

| Test Suite | File | Test Count | Scope |
|---|---|---|---|
| **Emulator Integration** | `src/testEmulatorIntegration.ts` | 48 | Auth lifecycle, rules invariants, session completion, XP idempotency, cross-user privacy, account deletion, rate limiting, production safety |
| **Authentication E2E** | `src/testAuthIntegration.ts` | 14 | Firebase ID token verification, system endpoint protection, credential reset |
| **Server-Authoritative Sessions** | `src/testSessionCompletionIntegration.ts` | 21 | Anti-cheat telemetry validation, atomic XP awards, duplicate completion rejection |
| **Security Rules Invariants** | `src/testSecurityRules.ts` | 14 | Firestore & Storage rules invariants (write denials on client-controlled metrics) |
| **Historical Aggregations** | `src/testProgressCalculations.ts` | 25 | Date boundaries, same-day workouts, multi-day streaks, form score trends |
| **Priority 2 Flow** | `src/testPriority2.ts` | 25 | End-to-end user journey, lobby matchmaking, challenge completion |
| **Coach & AI Intelligence** | `src/testCoach.ts` | 15 | AI coach plan generation, exercise progression |
| **Vision Pipeline** | `src/testVision.ts` | 12 | Pose detection telemetry ingestion and rep verification |
| **Personalization Engine** | `src/testPersonalization.ts` | 12 | Adaptive difficulty and workout recommendations |
| **Challenge Engine** | `src/testChallenges.ts` | 13 | Multiplayer challenge creation, friend invitations, rewards |
| **Domain Unit Tests** | `src/testLocal.ts` | 24 | Repositories, data models, validation helpers |
| **Total Automated Tests** | `src/testBackend.ts` | **223** | **100% Passed • 0 Failed** |

---

## 🛠️ Local Firebase Emulator Setup

To run tests against the live Firebase Emulator suite:

```bash
# 1. Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# 2. Start Firebase Emulators (Firestore, Auth, Storage, Functions)
cd backend
firebase emulators:start --only firestore,auth,storage,functions

# 3. In another terminal, run emulator test suite
npm run test:emulator
```

---

## 🚢 Deployment Guide

### Backend (Firebase Cloud Functions 2nd Gen)
```bash
cd backend
# Deploy Firestore & Storage security rules
firebase deploy --only firestore:rules,storage

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy 2nd-gen Cloud Functions
npm --prefix functions run build
firebase deploy --only functions
```

### Frontend & API Proxy (Vercel)
```bash
# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod
```

