# 🏗️ SportX — System Architecture (31 Core Features)

> **Project:** SportX (AI-Powered Student Fitness & Sports Companion)  
> **Architecture Pattern:** Edge AI Vision + Serverless Firebase + Real-Time Multiplayer Lobby  
> **Version:** 2.1.0  
> **Date:** 2026-09-08

---

## 1. End-to-End System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SPORTX MOBILE CLIENT                          │
│                                                                         │
│  ┌──────────────────────┐              ┌─────────────────────────────┐  │
│  │   UI & Presentation  │              │   On-Device Vision Engine   │  │
│  │  - Dashboard (F6)    │              │   (Features 8, 9, 10, 28)   │  │
│  │  - Workouts (F12-14) │              │                             │  │
│  │  - Lobby Match (F7,25)              │  ┌───────────────────────┐  │  │
│  │  - Progress (F17-20) │◄─────────────┤  │ Camera Frame Stream   │  │  │
│  │  - Bug Report (F30)  │              │  └───────────┬───────────┘  │  │
│  └──────────┬───────────┘              │              ▼              │  │
│             │                          │  ┌───────────────────────┐  │  │
│             ▼                          │  │ MediaPipe Pose 33     │  │  │
│  ┌──────────────────────┐              │  │ Landmark Detection    │  │  │
│  │ State & Offline Sync │              │  └───────────┬───────────┘  │  │
│  │  - Realtime Lobby    │◄─────────────┤              ▼              │  │
│  │    Listener (F25)    │  Local Rep   │  ┌───────────────────────┐  │  │
│  │  - Local Cache       │  & Form Data │  │ Biomechanical Angle   │  │  │
│  └──────────┬───────────┘  (No Video)  │  │ State Machine (F9,10) │  │  │
│             │                          │  └───────────────────────┘  │  │
│             │ HTTPS / Firestore Realtime                              │  │
└─────────────┼───────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FIREBASE CLOUD BACKEND (SERVERLESS)                  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 Cloud Functions 2nd Gen (TypeScript)              │  │
│  │  - Auth & Profile Verification (F1, F2, F29)                      │  │
│  │  - Sessions & History Manager (F15, F16)                          │  │
│  │  - Server-Side XP & Streak Calculation (F19, F24, F27)            │  │
│  │  - Multiplayer Lobby Engine & Match Settlement (F7, F23, F25, F26)│  │
│  │  - AI Coach & Consistency Insights (F22)                          │  │
│  │  - Bug Reporting Ingestion (F30)                                  │  │
│  └───────────────────────────────────┬───────────────────────────────┘  │
│                                      │                                  │
│         ┌────────────────────────────┼────────────────────────────┐     │
│         ▼                            ▼                            ▼     │
│  ┌──────────────┐             ┌──────────────┐             ┌──────────┐ │
│  │ Firebase     │             │ Cloud        │             │ Firebase │ │
│  │ Auth (F1,29) │             │ Firestore    │             │ Storage  │ │
│  └──────────────┘             └──────┬───────┘             └──────────┘ │
│                                      │                                  │
│         ┌────────────────────────────┼────────────────────────────┐     │
│         ▼                            ▼                            ▼     │
│  users/{userId}               lobbies/{lobbyId}           bugReports    │
│  exercises/ (F11)             workoutSessions/ (F15)      leaderboards  │
│  workoutPlans/ (F12,14)       activityLogs/ (F16)         (F27)         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multiplayer Workout Lobby Architecture (Features 7, 23, 25, 26)

The **Multiplayer Workout Lobby** enables students to compete in real-time matches (similar to multiplayer gaming lobbies):

```
Step 1: Host creates lobby (Code: #SPX-88)
   │
Step 2: Friends join using invite link or 6-digit code (F26)
   │
Step 3: Lobby status: "WAITING" ──► All players toggle "READY"
   │
Step 4: Host taps "START MATCH" ──► 5-second synchronized countdown
   │
Step 5: Status: "ACTIVE" ──► Camera Workout launches for all players (F7)
   │
   ├── Player A's device counts reps locally via MediaPipe (F8, F9)
   ├── Dispatches lightweight doc update to Firestore: `participants.playerA.reps = 14`
   └── Realtime listener updates the shared live leaderboard HUD on all screens (F25)
   │
Step 6: Time expires or target reached ──► Status: "FINISHED"
   │
Step 7: Cloud Function calculates match winner, awards XP & updates Leaderboard (F24, F27)
```

### Lobby Document Model (`lobbies/{lobbyId}`)
```typescript
interface LobbyDocument {
  id: string;
  hostUserId: string;
  roomCode: string; // e.g. "SPX-420"
  matchType: 'daily_challenge' | 'custom_match';
  exerciseId: 'squat' | 'pushup' | 'bicep_curl';
  targetReps: number;
  durationSeconds: number;
  status: 'waiting' | 'countdown' | 'active' | 'finished';
  countdownStartedAt?: string;
  participants: {
    [userId: string]: {
      name: string;
      college: string;
      isReady: boolean;
      currentReps: number;
      currentFormScore: number;
      finishedAt?: string;
    };
  };
  winnerUserId?: string;
  createdAt: string;
}
```

---

## 3. On-Device AI Vision Engine (Features 8, 9, 10, 28)

- **33 Keypoint Skeleton Extraction:** Runs locally via MediaPipe Pose at 30 FPS.
- **Angle Calculation:** Deterministic vector dot products across joint triplets (e.g., Hip-Knee-Ankle for squats).
- **Rep State Machine:**
  - Enforces physiological limits: minimum rep time $\ge 1.2\text{s}$ (squats) / $1.0\text{s}$ (pushups).
  - Joint inflection point triggers: Knee flexion $< 90^\circ$ and extension $> 160^\circ$.
- **Session Control (Feature 28):** Real-time pause/resume flags immediately halt camera processing and freeze timer loops.

---

## 4. Anti-Cheat & Gamification Engine (Features 19, 24, 27)

To ensure fair competition across campus and department leaderboards:
1. **Server-Calculated XP:**
   $$\text{XP} = (\text{Verified Reps} \times 10) + (\text{Workout Completion} \times 100) + (\text{Form Score} \ge 80\% \times 50)$$
2. **Server-Side Streak Integrity:** A workout counts toward streaks only if verified by the session manager within a 24-hour UTC window.
3. **Firestore Security Rules:** Direct client mutations to `totalXp`, `currentStreak`, and `leaderboards` are rejected with `PERMISSION_DENIED`.

---

## 5. Bug Reporting Architecture (Feature 30)

Students can report false detections (e.g., missed squat reps, camera lighting glitches) directly in-app:
- **Collection:** `bugReports/{reportId}`
- **Payload:** `{ userId, category, exerciseId, description, deviceModel, appVersion, timestamp }`
- Allows developers and CV engineers to adjust landmark tolerances and confidence thresholds.

---

*Author: Team HACKPACK | Smart India Hackathon 2026 | PS 26196*
