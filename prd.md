# 📋 SportX — Product Requirements Document (PRD)

> **Project:** SportX (AI-Powered Student Fitness & Sports Companion)  
> **Theme / Category:** Student Fitness & Sports / Software  
> **Team:** HACKPACK  
> **Version:** 2.1.0 (Aligned to 31 Official Core Features)  
> **Status:** Approved Core Specification

---

## 1. Executive Summary & The SportX Loop

**SportX** is an AI-powered student fitness and sports companion app built to eliminate inactivity in hostels, college campuses, and dorms. It combines on-device computer vision for real-time rep counting and posture feedback with a **multiplayer lobby competition engine** where students can join rooms, compete in matches with friends, and climb campus leaderboards.

$$\text{ONBOARD} \rightarrow \text{PLAN} \rightarrow \text{WORK OUT / LOBBY MATCH} \rightarrow \text{AI ANALYZE} \rightarrow \text{CORRECT} \rightarrow \text{SCORE} \rightarrow \text{TRACK} \rightarrow \text{MOTIVATE} \rightarrow \text{REPEAT}$$

---

## 2. The 31 Official Core Features

SportX is built strictly around the **31 Core Features** defined in the team blueprint:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        31 CORE SPORTX FEATURES                         │
├────────────────────────────────────────────────────────────────────────┤
│ 01. Signup / Login                     17. Weekly / Monthly Progress   │
│ 02. User Profile                       18. Goal Progress / Percentage  │
│ 03. Sports Selection                   19. Streak Tracking             │
│ 04. Fitness Level                      20. Progress Chart              │
│ 05. Privacy Control                    21. Milestones                  │
│ 06. Personal Dashboard                 22. Consistency Insights        │
│ 07. Camera Workout in Lobby            23. Daily Challenge in Lobby    │
│ 08. Pose Detection                     24. Point / XP                  │
│ 09. Rep Counting                       25. Lobby to Compete (MP)       │
│ 10. Form Analysis & Error Detection    26. Challenge Invite to Friends │
│ 11. Exercise Library                   27. Badges / Rewards / LB       │
│ 12. Personalized Workout Plan          28. Stop / Pause in Session     │
│ 13. Workout Library                    29. Authentication (Security)   │
│ 14. Daily Workout Plan                 30. Bug Reporting               │
│ 15. Activity Logging                   31. Responsive Design           │
│ 16. Workout History                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Functional Specifications (Feature-by-Feature)

### Section A: Account, Onboarding & User Profile (Features 1–6, 29)

#### 01. Signup / Login [Core Feature 1 & 29]
- Secure student authentication supporting Email/Password and Google OAuth.
- JWT and Firebase token verification on all protected endpoints.
- Auto-provisioning of default athlete profile upon first registration.

#### 02. User Profile [Core Feature 2]
- Student profile managing: Full Name, Email, Profile Avatar image, College Name, Department, Age, Height (cm), and Weight (kg).

#### 03. Sports Selection [Core Feature 3]
- Multi-select interface for favorite campus sports: Badminton, Football, Cricket, Basketball, Running, Table Tennis.
- Customizes dashboard feed and activity recommendations based on selected sports.

#### 04. Fitness Level [Core Feature 4]
- 3-tier capability baseline: **Beginner**, **Intermediate**, **Advanced**.
- Dynamically scales exercise rep targets, rest intervals, and camera detection tolerances.

#### 05. Privacy Control [Core Feature 5]
- Student privacy toggles:
  - *Incognito Leaderboard Mode:* Disguise identity as "Anonymous Athlete" on public college rankings.
  - *Data Consent:* Clear confirmation that camera frames are processed 100% locally on-device.

#### 06. Personal Dashboard [Core Feature 6]
- Central student hub displaying:
  - Today's Daily Focus Routine (1-tap launch)
  - Active Streak Flame counter (`🔥 5 Days`)
  - Daily Goal completion ring
  - Quick action buttons: Solo Workout, Multiplayer Lobby Match, Manual Sport Log

---

### Section B: Computer Vision & AI Camera Engine (Features 7–11, 28)

#### 07. Camera Workout in Lobby (To Count Rep & Form) [Core Feature 7]
- Live camera tracking embedded inside a **multiplayer lobby match**.
- Real-time split/card screen showing the student's camera stream with skeleton HUD alongside live competitor rep counts and form scores.

#### 08. Pose Detection [Core Feature 8]
- 33-point body landmark extraction running locally at 30+ FPS (MediaPipe / MoveNet).
- Normalized spatial coordinates $(x, y, z, \text{visibility})$ evaluated in real-time.

#### 09. Automatic Rep Counting [Core Feature 9]
- Deterministic Finite State Machine (FSM):
  - `UP` $\rightarrow$ `DESCENDING` $\rightarrow$ `INFLECTION` $\rightarrow$ `ASCENDING` $\rightarrow$ `REP COMPLETE (+1)`.
  - Joint angle tracking via 3-point vector dot products.
  - Anti-cheat cadence bounds (e.g. minimum 1.2s per squat).

#### 10. Form Analysis & Error Detection [Core Feature 10]
- Biomechanical joint validation:
  - **Squats:** Flags shallow depth (knee $> 90^\circ$), knees caving inward (valgus), or excessive forward lean.
  - **Push-ups:** Flags elbow flare and hip sagging.
  - **Bicep Curls:** Flags elbow momentum swing.
- Instant visual HUD alerts (🟢 "Great Depth", 🔴 "Squat deeper!") and audio coaching cues.

#### 11. Exercise Library [Core Feature 11]
- Visual catalog of all supported exercises with video/GIF demonstrations, step-by-step instructions, target muscle groups, and common error checklists.

#### 28. Stop / Pause in Between Session [Core Feature 28]
- Physical and touch-safe controls to pause the camera session, rest timer, or safely terminate a workout with partial progress saved.

---

### Section C: Workout Planning & Activity Logging (Features 12–16)

#### 12. Personalized Workout Plan [Core Feature 12]
- Algorithmic routine generator taking: Goal + Fitness Level + Available Time (10/20/30/45 min) + Equipment.
- Calibrates rep volumes and rest periods to student schedule.

#### 13. Workout Library [Core Feature 13]
- Categorized collection of curated routines: "15-Min Dorm Blast", "Core Stability", "Campus Sprint Conditioning", "Upper Body Power".

#### 14. Daily Workout Plan [Core Feature 14]
- Daily scheduled routine dynamically updated each morning based on student recovery and consistency.

#### 15. Activity Logging [Core Feature 15]
- Automatic logging of AI camera sessions (reps, score, duration, calories).
- Manual logging interface for campus sports: Football match (mins, intensity), Badminton session, Running laps.

#### 16. Workout History [Core Feature 16]
- Filterable chronological feed of all past sessions:
  - **Today**
  - **Last 7 Days**
  - **Last 30 Days**
  - **All Time**

---

### Section D: Progress, Goals & Consistency Insights (Features 17–22)

#### 17. Weekly / Monthly Progress [Core Feature 17]
- Summary cards showing total sessions completed, active minutes logged, and frequency compliance.

#### 18. Goal Progress / Percentage [Core Feature 18]
- Dynamic progress meters (e.g., "Weekly Target: 4 of 5 workouts completed — 80%").

#### 19. Streak Tracking [Core Feature 19]
- Consecutive active days counter with timezone-safe UTC daily verification and streak freeze protection.

#### 20. Progress Chart [Core Feature 20]
- Interactive visual charts tracking reps progression, average form accuracy trends, and weekly active minutes.

#### 21. Milestones [Core Feature 21]
- Major athletic markers recorded: "First 100 Reps", "30-Day Streak", "Perfect 100% Form Session".

#### 22. Consistency Insights [Core Feature 22]
- Intelligent feedback module identifying patterns: "You work out most consistently on Tuesday and Thursday evenings; weekend activity drops 25%."

---

### Section E: Gamification, Multiplayer Lobby & Social Match (Features 23–27)

#### 23. Daily Challenge in Lobby for Match [Core Feature 23]
- Time-bound daily featured lobby matches (e.g., "12:00 PM Dorm Squat Showdown — 50 Reps").
- Direct 1-tap entry into the matchmaking queue.

#### 24. Point / XP Engine [Core Feature 24]
- Server-side anti-cheat reward formula:
  $$\text{XP} = (\text{Verified Reps} \times 10) + (\text{Workout Completion} \times 100) + (\text{Form Score} \ge 80\% \times 50)$$

#### 25. Lobby to Compete (Similar to Multiplayer Games) [Core Feature 25]
- **Multiplayer Matchmaking & Room Engine:**
  - Host creates a room (Room Code / Pin).
  - Up to 8 students join the same lobby.
  - Real-time synchronized countdown ("3... 2... 1... GO!").
  - Live in-game scoreboard showing each participant's rep count and form score updating in real time.
  - Match winner podium celebration at match conclusion.

#### 26. Challenge Invite to Friends / Group [Core Feature 26]
- Shareable lobby link / 6-character room code.
- Direct in-app invites to campus friends and hostel WhatsApp groups.

#### 27. Badges / Rewards / Leaderboard [Core Feature 27]
- **Leaderboards:** Filterable by College, Department, and Global scope.
- **Badges:** Unlockable digital medals ("Campus Spartan", "Form Master", "Week Warrior").

---

### Section F: System Quality, Security & UX (Features 28–31)

#### 29. Secure Authentication [Core Feature 29]
- Firebase Auth token verification, protected API endpoints, and zero client-side privilege escalation.

#### 30. Bug Reporting [Core Feature 30]
- In-app feedback and bug report modal:
  - Submit detection inaccuracies (e.g., "Rep not counted on squat depth").
  - Camera freeze or UI issues reporting with automatic device OS diagnostics.

#### 31. Responsive Design [Core Feature 31]
- Adaptive mobile-first layouts optimized for 360px to 1080px screens, tablets, and propped-up phone workout modes.

---

*Author: Team HACKPACK | SportX Engineering*
