# ⚡ SportX Backend — Production Firebase Backend Architecture

> **Stack:** Firebase Authentication + Cloud Firestore + Firebase Storage + Cloud Functions 2nd Gen (TypeScript) + Firebase App Check + Firebase Cloud Messaging (FCM)

---

## 1. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Name your project (e.g. `sportx-ab5f`).
3. (Optional) Enable Google Analytics for crashlytics and performance telemetry.
4. Install the Firebase CLI globally on your machine:
   ```bash
   npm install -g firebase-tools
   ```
5. Log in to your Firebase account:
   ```bash
   firebase login
   ```
6. Set your active Firebase project:
   ```bash
   cd backend
   firebase use sportx-ab5f
   ```

---

## 2. Required Firebase Services

Ensure the following services are enabled in your Firebase Console:

| Service | Purpose |
| :--- | :--- |
| **Firebase Authentication** | Email/Password, Google Sign-In, Token verification, lifecycle hooks |
| **Cloud Firestore** | Primary NoSQL database with security rules and composite indexes |
| **Firebase Storage** | Profile pictures, exercise videos, animations, and workout demonstrations |
| **Cloud Functions (2nd Gen)** | HTTP API, Eventarc triggers, daily scheduled crons, and callable RPCs |
| **Firebase App Check** | Protects backend against abuse using reCAPTCHA Enterprise / Play Integrity |
| **Firebase Cloud Messaging** | Automated push notifications for streaks, workout reminders, and badges |

---

## 3. Environment Variables Configuration

In `backend/functions/.env`:

```ini
# Firebase & GCP Settings
FIREBASE_PROJECT_ID=sportx-ab5f
FUNCTION_REGION=us-central1
NODE_ENV=production

# Security & App Check
APP_CHECK_ENFORCED=false # Set to 'true' in production after configuring reCAPTCHA

# AI Intelligence & Coach Integration
GEMINI_API_KEY=your_gemini_api_key_here
AI_COACH_MODEL=gemini-1.5-pro

# Server Port (for local dev server)
PORT=8000
```

---

## 4. Installing Dependencies

To install all dependencies for Cloud Functions:

```bash
cd backend/functions
npm install
```

---

## 5. Running Firebase Emulator Suite

The repository is configured with Firebase Emulator Suite ports:
- **Authentication**: `9099`
- **Cloud Functions**: `5001`
- **Cloud Firestore**: `8080`
- **Firebase Storage**: `9199`
- **Emulator UI**: `4000`

Start all emulators with a single command:
```bash
cd backend
firebase emulators:start
```
Open **`http://localhost:4000`** in your browser to inspect Firestore documents, Auth accounts, and Storage buckets in real time.

For instant Node.js local testing without the full emulator:
```bash
cd backend/functions
npm run dev
# Server boots at http://localhost:8000 with live endpoints
```

---

## 6. Deploying Cloud Functions, Rules & Indexes

### Deploy All Firebase Resources:
```bash
cd backend
firebase deploy
```

### Deploy Individually:
- **Cloud Functions only:**
  ```bash
  firebase deploy --only functions
  ```
- **Firestore Security Rules:**
  ```bash
  firebase deploy --only firestore:rules
  ```
- **Firestore Composite Indexes:**
  ```bash
  firebase deploy --only firestore:indexes
  ```
- **Firebase Storage Rules:**
  ```bash
  firebase deploy --only storage
  ```

---

## 7. App Check Configuration

1. In the Firebase Console, go to **App Check**.
2. Register your frontend web app with **reCAPTCHA Enterprise** or **reCAPTCHA v3**.
3. For mobile apps (Android/iOS), register with **Play Integrity** or **DeviceCheck / App Attest**.
4. In your frontend client, initialize App Check before calling the API:
   ```javascript
   import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
   
   const appCheck = initializeAppCheck(app, {
     provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
     isTokenAutoRefreshEnabled: true
   });
   ```
5. When `APP_CHECK_ENFORCED=true` is set in the backend environment, all requests to Cloud Functions must include the `X-Firebase-AppCheck` header.

---

## 8. Firebase Cloud Messaging (FCM) Setup

1. In the Firebase Console, navigate to **Project Settings > Cloud Messaging**.
2. Generate a Web Push Certificate (VAPID key pair).
3. The frontend registers its FCM token upon login:
   ```javascript
   import { getMessaging, getToken } from 'firebase/messaging';
   
   const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
   await api.post('/auth/fcm-token', { token });
   ```
4. Cloud Functions will automatically dispatch push notifications for:
   - **Daily streak preservation reminders** (at 00:00 UTC if inactive)
   - **Trophy & Badge unlocks** (instant upon milestone completion)
   - **Weekly summary reports** (Sundays at 20:00 UTC)

---

## 9. Administrator Setup & Custom Claims

To grant administrator rights to an account:

```typescript
import * as admin from 'firebase-admin';

async function grantAdmin(uid: string) {
  await admin.auth().setCustomUserClaims(uid, {
    admin: true,
    role: 'admin'
  });
  console.log(`User ${uid} successfully granted administrator privileges.`);
}
```
Users with the `admin: true` claim can bypass ownership rules, modify master exercises, seed catalog items, and view bug reports.

---

## 10. Frontend Integration Guide

The backend exposes RESTful endpoints under `/api/v1` as well as Cloud Function 2nd Gen callable functions.

### Base URL:
- **Local Dev Server:** `http://localhost:8000/api/v1`
- **Firebase Emulator:** `http://127.0.0.1:5001/<project-id>/us-central1/api/api/v1`
- **Production Cloud Function:** `https://us-central1-<project-id>.cloudfunctions.net/api/api/v1`

### Authentication Flow:
Send the Firebase ID token or Custom Token in the `Authorization` header:
```http
Authorization: Bearer <ID_TOKEN>
```

### Key Endpoints:

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register email/password & initialize `users/{uid}` |
| `POST` | `/auth/login` | Login with credentials or Firebase ID token |
| `POST` | `/auth/google` | Sign in with Google ID token |
| `GET` | `/users/profile` | Retrieve authenticated user profile |
| `PUT` | `/users/profile` | Update profile, fitness goals & workout preferences |
| `GET` | `/sports` | Get active sports catalogue |
| `GET` | `/exercises` | Get exercises with muscle/difficulty filters |
| `GET` | `/workouts` | Retrieve curated & adaptive workout plans |
| `POST` | `/sessions/start` | Start an AI-monitored workout session |
| `POST` | `/sessions/:id/pause` | Pause workout session |
| `POST` | `/sessions/:id/resume` | Resume workout session |
| `POST` | `/sessions/:id/complete`| Authoritative server-side completion & XP award |
| `POST` | `/sessions/:id/cancel` | Cancel / abandon session |
| `GET` | `/activity/history` | Query activity history (`today`, `7d`, `30d`, `all`) |
| `POST` | `/activity/log` | Telemetry log for pose detection / computer vision |
| `GET` | `/progress/summary` | Aggregated weekly/monthly stats, PRs & trends |
| `GET` | `/gamification/status` | Current level, streak, XP progress, and badges |
| `GET` | `/gamification/badges` | Complete trophy room with unlock status |
| `GET` | `/leaderboard/global` | Global XP & streak rankings |
| `POST` | `/ai/ask-coach` | Dynamic AI Coach Q&A with user context |

---

## 11. Testing & Validation

The backend includes a comprehensive automated test suite testing:
- Anti-cheat XP calculation formulas & cadence bounds
- Streak progression & missed-day reset logic
- Idempotency & duplicate XP replay protection
- Dynamic badge unlocking rules
- User ownership & security invariants
- Progress aggregation & personal records (PRs)
- Master data integrity

Run the test suite:
```bash
cd backend/functions
npm test
```
All 36 tests run and validate synchronously without requiring live network calls.
