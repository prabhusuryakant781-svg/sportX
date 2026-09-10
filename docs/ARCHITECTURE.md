# 🏛️ SportX — System Architecture & Integration Guide

**Platform:** SportX  
**Primary Database:** Cloud Firestore (`sportx-ab5f`)  
**AI Intelligence:** Google Gemini (`gemini-2.5-flash`)  
**Backend Framework:** Firebase Cloud Functions 2nd Gen / Node.js / TypeScript  
**Web Application:** React 18 + Vite (Deployed via Vercel)  
**Mobile Application:** Flutter (`mobile/`)  

---

## 1. Unified Architecture Diagram

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
                            (Email/Password, Google)
                                        │
                            Firebase ID Token (JWT)
                                        │
                                        ▼
                            SportX Unified Backend
                       (Cloud Functions 2nd Gen API)
                                        │
                ┌───────────────────────┼───────────────────────┐
                │                       │                       │
          Cloud Firestore        Firebase Storage              FCM
          (sportx-ab5f)           (Avatars/Media)      (Push Notifications)
                │
       ┌────────┴────────┐
       │                 │
 Google Gemini      Edge Vision
 (Server-side)   (28 Exercise Registry)
```

---

## 2. Platform Subsystems

### 2.1 Identity & Access
- Managed via Firebase Authentication.
- JWT verification executed server-side via `admin.auth().verifyIdToken()`.
- Client bypasses prohibited; passwords never processed by custom server APIs.

### 2.2 Core Persistence (Cloud Firestore)
- Firestore is the single primary application database.
- Legacy SQLite / SQLAlchemy systems are archived.
- Server-authoritative rules safeguard XP, streaks, levels, and challenge scoring.

### 2.3 Edge Vision System
- 28 supported exercises with detailed biomechanical rules (inflection angles, cadence constraints, posture checks).
- Client-side pose estimation; raw video is never sent over the network.
- Standardized `VisionResultPayload` ingested at `POST /api/v1/vision/results`.

### 2.4 Grounded AI Coach
- Google Gemini accessed strictly server-side.
- Context builder pulls live user workouts, streaks, and vision error logs.
- Strict JSON schema validation before returning responses to clients.

### 2.5 Multiplayer & Challenges
- Server-authoritative peer challenges and multiplayer workout rooms (`/lobbies`).
- Winner determination, progress tracking, and XP awards calculated server-side.

---

## 3. Directory Layout

```
sportX/
├── api/                    # Vercel serverless entrypoint
├── backend/
│   ├── functions/          # Express app & Cloud Functions 2nd Gen
│   ├── .firebaserc         # Target project: sportx-ab5f
│   ├── firebase.json       # Firebase suite configuration
│   ├── firestore.rules     # Firestore security rules
│   ├── firestore.indexes.json # Composite indexes
│   └── storage.rules       # Storage security rules
├── docs/                   # Complete architectural documentation
├── frontend/               # React 18 + Vite web client
├── mobile/                 # Flutter mobile client
└── vercel.json             # Vercel deployment orchestration
```
