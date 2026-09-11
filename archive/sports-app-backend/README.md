# ⚡ SportX Backend — Core Backend + Database + Security (Person 1)

> **Role Responsibility: PERSON 1**  
> Complete, production-grade backend foundation for the SportX student fitness application. Built with **Firebase Authentication**, **Cloud Firestore**, **Firebase Storage**, **Firebase App Check**, **Firestore & Storage Security Rules**, and **Cloud Functions 2nd Gen (TypeScript)**. Designed to connect to Flutter mobile clients and seamlessly hand off to **Person 2** for AI/Computer Vision integration.

---

## 1. Project Overview & Primary Objectives

SportX provides an AI-powered fitness and sports conditioning platform tailored for college students and athletes. This repository contains the complete, authoritative backend foundation:

- **Identity & Authentication**: Firebase Auth (Email/Password, Google Sign-In) with automatic Firestore profile provisioning.
- **Database & Data Modeling**: Strongly-typed schemas for User Profiles, Master Sports, Exercises, Workout Plans, Workout Sessions, Activity Logs, Progress Summaries, and Gamification.
- **Authoritative Security Rules**: Multi-layered Firestore and Storage rules strictly protecting server-calculated fields (`xp`, `currentStreak`, `longestStreak`, `badges`) against direct client tampering.
- **Anti-Cheat Gamification Engine**: Pure, server-controlled calculations for XP awards, rep accuracy scaling, duration caps (60 min maximum bonus), UTC-based daily streak continuations/resets, and idempotent XP transaction ledgers.
- **App Check & Telemetry Protection**: Enforced app attestation via reCAPTCHA Enterprise and Play Integrity with local development bypass support.
- **Media Ingestion**: Structured schema ready for MediaPipe / OpenCV rep counting and joint-angle error arrays without client-side LLM dependencies.

---

## 2. System Architecture

```
                       ┌────────────────────────┐
                       │  Flutter Mobile Client │
                       │    (iOS / Android)     │
                       └───────────┬────────────┘
                                   │
              Bearer ID Token      │   App Check Attestation
              (Firebase Auth)      │   (Play Integrity / reCAPTCHA)
                                   ▼
             ┌────────────────────────────────────────┐
             │       Firebase App Check & Auth        │
             │           (Token Validation)           │
             └─────────────────────┬──────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
  ┌──────────────────────────────┐    ┌──────────────────────────────┐
  │   Cloud Firestore Rules      │    │    Firebase Storage Rules    │
  │ • Owner-guarded user profile │    │ • 5MB Max Profile Images     │
  │ • Admin-only master catalogs │    │ • 50MB Max Exercise Demos    │
  │ • Client write blocked on XP │    │ • Image/Video MIME filtering │
  └──────────────┬───────────────┘    └──────────────────────────────┘
                 │
                 ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │         Firebase Cloud Functions 2nd Gen (TypeScript)            │
  │                                                                  │
  │   /api/v1/auth          → Signup, Login, Google Auth, Logout     │
  │   /api/v1/users         → Profile, Fitness Settings, Stats       │
  │   /api/v1/sports        → Sports Master Catalogue & User Select  │
  │   /api/v1/exercises     → Master Exercise DB (Squat, Pushup...)  │
  │   /api/v1/workouts      → Curated Plans & Today Recommendation   │
  │   /api/v1/sessions      → Start, Pause, Resume, Complete, Cancel │
  │   /api/v1/activity      → MediaPipe/OpenCV Telemetry & History   │
  │   /api/v1/progress      → Server Aggregation, PRs & Trends       │
  │   /api/v1/gamification  → Anti-Cheat XP, Streaks & Badges        │
  └──────────────────────────────────┬───────────────────────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │   Cloud Firestore Database  │
                      │   (ACID & Composite Indexes)│
                      └─────────────────────────────┘
```

---

## 3. Project Directory Structure

```
sports-app-backend/
├── firebase/
│   ├── firestore.rules          # Strict security rules protecting user data, master catalogues & XP
│   ├── firestore.indexes.json    # Composite indexes for history, sessions, activities, and rankings
│   └── storage.rules            # File size and MIME-type restricted storage rules
│
├── functions/
│   ├── src/
│   │   ├── index.ts             # Master 2nd Gen Cloud Functions router & Express API app
│   │   ├── localServer.ts       # Local development runner (http://localhost:8000)
│   │   ├── config/
│   │   │   ├── firebase.ts      # Admin SDK initialization & Firestore/Auth/Storage instances
│   │   │   └── environment.ts   # Validated env vars & config constants
│   │   ├── middleware/
│   │   │   ├── auth.ts          # Bearer ID token verification & user context attachment
│   │   │   ├── appCheck.ts      # App Check enforcement & debug token handling
│   │   │   ├── validation.ts    # Centralized schema validation helpers
│   │   │   └── errorHandler.ts  # Standardized error response formatter
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces for all domain entities
│   │   ├── auth/
│   │   │   ├── authRouter.ts    # POST /signup, /login, /google, /reset-password, /logout
│   │   │   └── authService.ts   # Auth business logic & Firestore profile initialization
│   │   ├── users/
│   │   │   ├── usersRouter.ts   # GET /profile, PUT /profile, GET /stats
│   │   │   └── userService.ts   # Profile updates, fitness profile validation, protected field filters
│   │   ├── sports/
│   │   │   ├── sportsRouter.ts  # GET /sports, POST /sports (admin), PUT /sports/:id (admin)
│   │   │   └── sportService.ts  # Sport catalogue management
│   │   ├── exercises/
│   │   │   ├── exercisesRouter.ts # GET /exercises, GET /exercises/:id, POST /exercises/search
│   │   │   └── exerciseService.ts # Master exercises (Squat, Push-up, Bicep Curl, Plank, Lunges)
│   │   ├── workouts/
│   │   │   ├── workoutsRouter.ts  # GET /workouts, GET /workouts/:id, GET /workouts/today, POST /workouts
│   │   │   └── workoutService.ts  # Workout plan builder and validation
│   │   ├── sessions/
│   │   │   ├── sessionsRouter.ts  # POST /start, /pause, /resume, /complete, /cancel, GET /:id
│   │   │   └── sessionService.ts  # Session state machine, ownership guard, XP trigger integration
│   │   ├── activity/
│   │   │   ├── activityRouter.ts  # POST /log (CV/MediaPipe ingest), GET /history (today, 7d, 30d, all)
│   │   │   └── activityService.ts # Activity telemetry persistence & history pagination
│   │   ├── progress/
│   │   │   ├── progressRouter.ts  # GET /summary
│   │   │   └── progressService.ts # Weekly/monthly stats, PR tracking, goal percentages
│   │   └── gamification/
│   │       ├── gamificationRouter.ts # GET /status, GET /badges
│   │       ├── xpService.ts          # Server-side XP calculation, anti-cheat & idempotency transactions
│   │       ├── streakService.ts      # Daily streak progression, missed-day reset & UTC handling
│   │       └── badgeService.ts       # Dynamic badge unlocking engine
│   │
│   ├── package.json             # Function dependencies & test scripts
│   ├── tsconfig.json            # Strict TypeScript configuration
│   └── .env.example             # Documented environment variables template
│
├── scripts/
│   └── seed.ts                  # Idempotent master seed script (Sports, Exercises, Badges, Plans)
│
├── tests/
│   └── person1.test.ts          # Automated test suite (55 tests validating business logic & invariants)
│
├── firebase.json                # Firebase configuration for rules, functions & emulators
├── .firebaserc                  # Firebase project selector
├── .gitignore                   # Safe Git ignore patterns
└── README.md                    # Complete backend architecture & integration documentation
```

---

## 4. Setup & Installation

### Prerequisites
- Node.js >= 18 (`node -v`)
- npm >= 9 (`npm -v`)
- Firebase CLI (`npm install -g firebase-tools`)

### Step 1: Firebase Project Creation
1. Open the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Name your project (e.g. `sportx-fitness-app`).
3. Set your active project in the terminal:
   ```bash
   cd sports-app-backend
   firebase use <your-project-id>
   ```

### Step 2: Enable Required Firebase Services
In the Firebase Console, configure the following:
- **Authentication**: Enable **Email/Password** and **Google** sign-in providers under *Build > Authentication > Sign-in method*.
- **Cloud Firestore**: Click *Build > Firestore Database > Create Database*. Select production mode and choose your primary region (e.g., `us-central1`).
- **Firebase Storage**: Click *Build > Storage > Get Started*.
- **Firebase App Check**: Enable App Check with **reCAPTCHA Enterprise** (for web) and **Play Integrity** (for Android).

### Step 3: Configure Environment Variables
Copy `.env.example` in `functions/`:
```bash
cd functions
cp .env.example .env
```
Populate `.env` with your project details:
```ini
FIREBASE_PROJECT_ID=sportx-fitness-app
FUNCTION_REGION=us-central1
NODE_ENV=development
FIREBASE_STORAGE_BUCKET=sportx-fitness-app.appspot.com
APP_CHECK_ENFORCED=false
PORT=8000
```

### Step 4: Install Dependencies & Build
```bash
cd functions
npm install
npm run build
```

---

## 5. Local Development & Emulator Suite

### Option A: Fast Node.js Local Development Server (Recommended for API testing)
Runs the complete Express API on port `8000` with hot-reload or instant restart:
```bash
cd sports-app-backend/functions
npm run dev
```
Endpoints are immediately accessible at `http://localhost:8000/api/v1`.

### Option B: Full Firebase Emulator Suite
Simulates Firestore, Authentication, Cloud Functions, and Firebase Storage locally:
```bash
cd sports-app-backend
firebase emulators:start
```
- **Emulator UI**: `http://localhost:4000`
- **Firestore Emulator**: `localhost:8080`
- **Auth Emulator**: `localhost:9099`
- **Functions Emulator**: `http://127.0.0.1:5001/sportx-fitness-app/us-central1/api`
- **Storage Emulator**: `localhost:9199`

---

## 6. Master Database Seeding

The seed script (`scripts/seed.ts`) idempotently seeds:
1. **Sports**: Cricket, Football, Basketball, Running, General Fitness.
2. **Exercises**: Bodyweight Squat, Push-up, Bicep Curl, Forearm Plank, Walking Lunges with full form rules and cadence limits.
3. **Badges**: 9 core badges (First Step, On Fire, Week Warrior, Iron Will, Form Perfectionist, 500 Rep Club, Century Reps, Rising Athlete, Grandmaster).
4. **Workout Plans**: Dorm Express (15m), Campus Power Circuit (20m), Athletic Core & Lower Body (25m).

Run seeding:
```bash
cd sports-app-backend/functions
npm run seed
```
*(The seed script is safe to rerun multiple times without creating duplicate records).*

---

## 7. Automated Testing

The automated test suite (`tests/person1.test.ts`) verifies 55 distinct test vectors:
- Default user state initialization (0 XP, Level 1, 0 streak).
- Input validation & rejection of negative sets, negative reps, negative durations, and invalid fitness levels.
- Client tampering prevention on protected fields (`xp`, `totalXp`, `level`, `currentStreak`, `longestStreak`, `badges`).
- Session ownership guards (User B cannot complete or read User A's session).
- Session state machine transitions (`started` → `paused` → `resumed` → `completed`).
- Server-side XP calculation accuracy & form accuracy scaling.
- Anti-cheat 60-minute duration cap (300 XP maximum bonus).
- Level progression formula ($Level = \lfloor\sqrt{XP/100}\rfloor + 1$).
- Idempotent transaction recording (duplicate XP replay rejection).
- Streak calculation (consecutive days increment, same-day duplicate preserved, missed day reset to 1, longest streak tracking).
- Milestone badge unlocking and duplicate unlock suppression.
- Master catalogue metadata verification.

Execute tests:
```bash
cd sports-app-backend/functions
npm test
```
**Output**: `📊 Test Results: 55 passed, 0 failed. 🎉 ALL PERSON 1 BACKEND BUSINESS LOGIC & SECURITY INVARIANTS PASSED!`

---

## 8. Deployment Commands

Deploy individual components or the full backend directly through the Firebase CLI:

```bash
cd sports-app-backend

# 1. Deploy Firestore Security Rules
firebase deploy --only firestore:rules

# 2. Deploy Firestore Composite Indexes
firebase deploy --only firestore:indexes

# 3. Deploy Storage Security Rules
firebase deploy --only storage

# 4. Deploy Cloud Functions (2nd Gen)
firebase deploy --only functions

# Or full project deployment:
firebase deploy
```

---

## 9. Flutter Frontend Integration Guide

All endpoints return a standardized JSON response:
- Success: `{ "success": true, "message": "...", "data": { ... } }`
- Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`

### 1. Base URL Configuration
```dart
class SportXConfig {
  static const String localApiBase = 'http://10.0.2.2:8000/api/v1'; // Android Emulator
  static const String prodApiBase = 'https://us-central1-sportx-fitness-app.cloudfunctions.net/api/api/v1';
}
```

### 2. Authentication & Header Setup
Send the Firebase ID Token in the HTTP `Authorization` header:
```dart
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class SportXApiClient {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final String baseUrl = SportXConfig.prodApiBase;

  Future<Map<String, String>> _getHeaders() async {
    final token = await _auth.currentUser?.getIdToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ── Signup ─────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> signup({
    required String name,
    required String email,
    required String password,
    String fitnessLevel = 'beginner',
    List<String> selectedSports = const ['General Fitness'],
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
        'fitnessLevel': fitnessLevel,
        'selectedSports': selectedSports,
      }),
    );
    return jsonDecode(res.body);
  }

  // ── Start Workout Session ──────────────────────────────────────────────
  Future<Map<String, dynamic>> startSession({required String exerciseId, String? workoutPlanId}) async {
    final headers = await _getHeaders();
    final res = await http.post(
      Uri.parse('$baseUrl/sessions/start'),
      headers: headers,
      body: jsonEncode({
        'exerciseId': exerciseId,
        if (workoutPlanId != null) 'workoutPlanId': workoutPlanId,
      }),
    );
    return jsonDecode(res.body);
  }

  // ── Complete Workout Session (Authoritative Server Award) ─────────────
  Future<Map<String, dynamic>> completeSession({
    required String sessionId,
    required int totalReps,
    required double averageFormScore,
    required int durationSeconds,
  }) async {
    final headers = await _getHeaders();
    final res = await http.post(
      Uri.parse('$baseUrl/sessions/$sessionId/complete'),
      headers: headers,
      body: jsonEncode({
        'totalReps': totalReps,
        'averageFormScore': averageFormScore,
        'durationSeconds': durationSeconds,
      }),
    );
    return jsonDecode(res.body);
  }

  // ── Log CV Telemetry (MediaPipe Rep Event) ─────────────────────────────
  Future<void> logTelemetry({
    required String sessionId,
    required String exerciseId,
    required int reps,
    required double duration,
    required double formScore,
    List<String> errors = const [],
  }) async {
    final headers = await _getHeaders();
    await http.post(
      Uri.parse('$baseUrl/activity/log'),
      headers: headers,
      body: jsonEncode({
        'sessionId': sessionId,
        'exerciseId': exerciseId,
        'reps': reps,
        'duration': duration,
        'formScore': formScore,
        'errors': errors,
      }),
    );
  }
}
```

### 3. Profile Image Upload (Firebase Storage)
Upload avatar directly to the user's secured path:
```dart
import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_auth/firebase_auth.dart';

Future<String> uploadProfileImage(File imageFile) async {
  final uid = FirebaseAuth.instance.currentUser!.uid;
  final ref = FirebaseStorage.instance.ref().child('users/$uid/profile/avatar.jpg');

  final uploadTask = await ref.putFile(
    imageFile,
    SettableMetadata(contentType: 'image/jpeg'),
  );

  return await uploadTask.ref.getDownloadURL();
}
```

---

## 10. Security Model & Anti-Cheat Invariants

### 1. Server-Authoritative Fields
The client is **strictly prohibited** from directly writing or modifying the following fields on `users/{userId}` via Firestore Security Rules:
```javascript
// firestore.rules
allow update: if isOwner(userId) &&
  !request.resource.data.diff(resource.data).affectedKeys().hasAny([
    'xp', 'XP', 'totalXp', 'level', 'currentStreak', 'longestStreak',
    'lastWorkoutDate', 'badges', 'totalWorkouts', 'totalMinutes', 'totalCalories',
    'createdAt'
  ]);
```
Any attempt by a modified client or script to award itself XP or increment streaks results in immediate rejection (`PERMISSION_DENIED`).

### 2. XP Calculation Formula
- Rep XP: $\text{Reps} \times 10 \times (\text{FormScore} / 100)$
- Duration Bonus: $\min(\text{DurationMinutes}, 60) \times 5$ (capped at 60 mins to prevent bot idle farming)
- Completion Bonus: $+50\text{ XP}$
- Form Excellence Bonus: $+25\text{ XP}$ if $\text{FormScore} \ge 90\%$

### 3. Idempotent Transaction Ledger
All XP awards are committed to `xpTransactions/tx_{sessionId}_{reason}` within an ACID Firestore transaction. Network retries or replayed requests will detect the existing transaction ID and return without double-awarding XP.

### 4. Storage Protections
- Profile images: Restricted to authenticated owner, image MIME type only, maximum 5MB.
- Exercise media: Restricted to administrators for write operations, maximum 50MB.

---

## 11. Person 2 Integration Guide (Handoff)

### Responsibility Division
- **Person 1 (Completed Here)**: Core Backend + Database Models + Security Rules + Auth + Sessions + Telemetry + XP + Streak + Badges.
- **Person 2 (Next Developer)**: AI Coach (Gemini integration), Dynamic AI Workout Generation, Camera/Vision Local Pipeline, Multiplayer Lobbies, Challenges, and Notifications.

### Computer Vision Telemetry Contract
Person 2's local MediaPipe/OpenCV camera loop can send real-time rep completion results directly to `POST /api/v1/activity/log` using this exact contract:
```json
{
  "sessionId": "sess_1726059281_abcde",
  "exerciseId": "squat",
  "reps": 15,
  "duration": 65,
  "formScore": 78,
  "errors": ["knees_inward", "shallow_depth"],
  "calories": 6
}
```

### Server-Side AI Secret Guard
Person 2's AI API keys (e.g. `GEMINI_API_KEY`) must be configured in `functions/.env` and accessed through Cloud Functions. **Never place AI API keys or service account credentials in the Flutter application.**
