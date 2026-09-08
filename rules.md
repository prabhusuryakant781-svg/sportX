# 📏 SportX — Engineering Rules (31 Core Features)

> **Project:** SportX (AI-Powered Student Fitness & Sports Companion)  
> **Applies to:** Team HACKPACK (Frontend, Backend, AI Engineers)  
> **Scope:** 31 Official Core Features  
> **Version:** 2.1.0  
> **Date:** 2026-09-08

---

## 1. Computer Vision & Camera Rules (Features 7, 8, 9, 10, 28)

1. **Local Frame Processing (Zero Video Egress):**  
   Camera frames must strictly remain in local volatile device memory. No frame or video buffer may ever be uploaded or transmitted.
2. **Confidence Threshold:**  
   Do not count repetitions if MediaPipe pose landmark confidence falls below `0.60`. Display an on-screen hint instead ("Step back into view").
3. **Rep Cadence Guard (Anti-Cheat):**  
   Enforce minimum physiological repetition intervals:
   - Squats: $\ge 1.2\text{s}$ per repetition.
   - Push-ups: $\ge 1.0\text{s}$ per repetition.
   - Bicep Curls: $\ge 1.1\text{s}$ per repetition.
4. **Pause / Resume Handling (Feature 28):**  
   When the student taps Pause:
   - Immediately freeze the timer loop.
   - Do not accept new rep increments until explicitly resumed.
5. **Camera Stream Teardown:**  
   Always explicitly release media streams (`stream.getTracks().forEach(t => t.stop())`) when unmounting the camera screen or exiting a lobby.

---

## 2. Multiplayer Lobby & Real-Time Match Rules (Features 7, 23, 25, 26)

1. **State Synchronization Throttle:**  
   During a live camera match in a lobby, rep count updates must be throttled to **at most 2 updates per second per user** to Firestore to prevent quota exhaustion and race conditions.
2. **Room Concurrency:**  
   Standard lobby rooms are capped at **8 participants** for optimal synchronization on student mobile devices.
3. **Synchronized Countdown:**  
   A match cannot enter the `active` state until all participants have toggled `isReady = true`, followed by a server-verified 5-second countdown.
4. **Podium Settlement:**  
   Match completion and winner determination must be verified server-side via Cloud Functions; clients cannot self-declare as match winners.

---

## 3. Gamification & XP Security Rules (Features 19, 24, 27)

1. **Server-Side Calculations Only:**  
   XP, streaks, and badges must be calculated and awarded strictly within Cloud Functions (`POST /api/v1/sessions/:id/complete`). Clients must never directly write to `totalXp` or `currentStreak`.
2. **Firestore Security Rules:**  
   Direct user writes to `leaderboards` and `challenges` collections are blocked with `allow write: if false;`.
3. **Streak Verification:**  
   Streaks are calculated against UTC midnight timestamps. A student must complete $\ge 1$ verified workout or $\ge 15$ reps to preserve their streak.

---

## 4. Bug Reporting & Telemetry Rules (Feature 30)

1. **Data Sanitization:**  
   Bug reports submitted through Feature 30 must never include video frames, personal passwords, or private biometric coordinates.
2. **Standard Schema:**  
   All bug reports must specify `{ category, exerciseId, description, deviceModel, timestamp }`.

---

## 5. Mobile Ergonomics & Responsive UX (Feature 31)

1. **Touch Targets:**  
   All interactive touchables and buttons must be $\ge 48\text{px} \times 48\text{px}$.
2. **8-Foot Glanceability:**  
   The active rep counter numeral on the workout HUD must be $\ge 48\text{px}$ bold display font readable from across a dorm room.
3. **Ergonomic Zone:**  
   Primary action buttons (Start Workout, Finish Set, Ready Up) must reside in the bottom 40% of the mobile screen.
