# 🚀 SportX — Firebase Setup & Infrastructure Guide

**Firebase Project Name:** SportX  
**Firebase Project ID:** `sportx-ab5f`  
**Configuration File:** `backend/.firebaserc`  
**Hosting / Web Client:** Vercel (`frontend/`)  
**Mobile Client:** Flutter (`mobile/`)  
**Serverless Functions:** Firebase Cloud Functions 2nd Gen (`backend/functions/`)  

---

## 1. Firebase Project Identity

> [!IMPORTANT]
> The **ONLY** authorized Firebase project for SportX is:
> ```
> sportx-ab5f
> ```
> Never connect this application to `sportx-app`, `demo-sportx`, or any unauthorized project.

### Verification in Codebase
- **Firebase CLI Targets:** `backend/.firebaserc`
  ```json
  {
    "projects": {
      "default": "sportx-ab5f"
    }
  }
  ```
- **Vercel Production Environment:** `vercel.json`
  ```json
  "env": {
    "FIREBASE_PROJECT_ID": "sportx-ab5f",
    "GCLOUD_PROJECT": "sportx-ab5f",
    "NODE_ENV": "production"
  }
  ```
- **Admin SDK Initialization:** `backend/functions/src/config/firebase.ts`
  ```typescript
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'sportx-ab5f';
  ```

---

## 2. Required Firebase Services & Rationales

Only services directly supporting SportX core functionality are provisioned:

| Firebase Service | Purpose in SportX | Client / Server | Rationale |
|---|---|---|---|
| **Firebase Authentication** | User Identity, Signup, Login, Password Reset, Google Auth | React & Flutter (Client SDK) + Admin SDK | Secure, industry-standard identity management. Clients obtain JWT ID tokens; backend verifies them via `auth.verifyIdToken()`. |
| **Cloud Firestore** | Primary Application Database | Server (Admin SDK) & Clients (Realtime listeners) | Low-latency, scalable NoSQL document store supporting rich real-time workout synchronization, leaderboard querying, streaks, and challenges. |
| **Firebase Storage** | Media Storage (Avatars, Exercise Assets) | Server & Clients | Secure cloud blob storage with granular size and MIME-type restrictions. Private user uploads restricted to owners. |
| **Cloud Functions (2nd Gen)** | Backend API Gateway, Background Triggers, Scheduled Crons | Server-Side | Concurrency-safe, serverless Node.js/TypeScript compute hosting the master API, Gemini AI Coach context builder, and automated daily streak checks. |
| **Firebase Cloud Messaging (FCM)** | Push Notifications | Server (`admin.messaging()`) ➔ Clients | Cross-platform delivery of workout reminders, peer challenge invites, and streak preservation alerts. |
| **Firebase Analytics** | Engagement & Telemetry | React & Flutter Clients | Tracking workout completion rates, drop-off points, and feature engagement. |
| **Firebase App Check** | API Protection & Abuse Prevention | Clients & Server Middleware | Verifies requests originate from legitimate SportX web and mobile apps, rejecting malicious scrapers and bots. |
| **Firebase Crashlytics** | Mobile Crash Monitoring | Flutter Mobile Client | Real-time crash diagnostics and performance monitoring for iOS/Android builds. |

---

## 3. Architecture & Authentication Flow

```
                      React Web / Flutter Mobile
                                 │
                                 ▼ (Email + Password / Google)
                      Firebase Authentication
                                 │
                                 ▼ (Returns JWT ID Token)
                        Client Application
                                 │
                                 ▼ (Header: Authorization: Bearer <ID_TOKEN>)
                      SportX Express Backend Gateway
                      (Firebase Cloud Functions 2nd Gen)
                                 │
                     admin.auth().verifyIdToken()
                                 │
                     ┌───────────┴───────────┐
                     ▼                       ▼
           Authenticated Request    User Profile & DB Access
           (req.user populated)     (Firestore: sportx-ab5f)
```

### Security Directives
1. **No Homemade Password Validation:** The backend must never accept or handle raw passwords over custom endpoints. Authentication must occur via the Firebase Auth Client SDK.
2. **Server-Side Token Verification:** All protected routes require a valid `Bearer <idToken>` verified with `admin.auth().verifyIdToken(token)`.
3. **Protected Admin Roles:** Custom claims (`admin: true`) or verified role attributes manage administrative access.

---

## 4. Firestore Database Structure

- **`users/{userId}`:** User profile, college, department, level, total XP, current streak.
- **`exercises/{exerciseId}`:** Master exercise registry with biomechanical form rules and instructions.
- **`workoutPlans/{planId}`:** Personalized and pre-set workout routines.
- **`workoutSessions/{sessionId}`:** Detailed workout session history, duration, total reps, form score.
- **`visionResults/{resultId}`:** Validated Computer Vision telemetry and detected posture faults.
- **`challenges/{challengeId}`:** Active and historical peer duels and milestone targets.
- **`lobbies/{lobbyId}`:** Multiplayer real-time workout rooms.
- **`streaks/{userId}`:** Server-authoritative daily workout consistency tracking.
- **`xpTransactions/{txId}`:** Immutable audit trail for all awarded XP.
- **`notifications/{notificationId}`:** User in-app notification feed.

---

## 5. Security Rules Overview

### Firestore (`backend/firestore.rules`)
- Read access strictly authenticated for application collections.
- User profile updates restricted to owners, with immutable server-managed fields (`xp`, `level`, `currentStreak`, `badges`).
- Client direct manipulation of XP, leaderboard scores, and streak documents is **strictly prohibited** (`allow write: if false`).

### Storage (`backend/storage.rules`)
- `users/{userId}/avatar/{file}`: Max 5MB, MIME `image/*`, owner write only.
- `exercises/{exerciseId}/{file}`: Max 50MB, read authenticated, admin write only.
- `media/{file}`: Max 25MB, admin write only.

---

## 6. Local Development & Emulator Configuration

Emulators are configured in `backend/firebase.json` for risk-free offline testing:

```json
"emulators": {
  "auth": { "port": 9099 },
  "functions": { "port": 5001 },
  "firestore": { "port": 8080 },
  "storage": { "port": 9199 },
  "ui": { "enabled": true, "port": 4000 }
}
```

- **Run Emulators:** `cd backend && firebase emulators:start`
- **Emulator UI:** Accessible at `http://localhost:4000`

---

## 7. Operational Safeguards

> [!CAUTION]
> **Strict Non-Destructive Policy:**
> - Never execute `firebase deploy` without prior approval.
> - Never execute destructive database deletion commands against production.
> - Never commit Firebase Service Account credentials (`*-adminsdk-*.json`, `serviceAccountKey.json`).
