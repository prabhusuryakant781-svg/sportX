# ⚡ SportX — AI-Powered Student Fitness & Sports Companion

> **SIH 2026 Problem Statement:** PS 26196 — Student Innovation: Ideas that can boost fitness activities and assist in keeping fit  
> **Team:** HACKPACK (6 Members • 3 Groups)  
> **Scope:** Exactly 31 Official Core Features  
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
├── frontend/             # Group 1: React + Vite, 10 Screens, Camera HUD & Multiplayer Lobby
├── backend/              # Group 2: Cloud Functions 2nd Gen, Firebase Auth, Firestore, APIs
│   ├── firebase.json     # Emulators & configuration
│   ├── firestore.rules   # Security rules (anti-cheat XP & streak guards)
│   ├── functions/src/    # 15 TypeScript modules (auth, users, lobbies, ai, bugReports...)
│   └── README.md
├── ai/                   # Group 3: MediaPipe Pose, OpenCV, Rep Counter, Squats/Pushups/Curls
├── database/             # Schemas, seed data & migrations
├── docs/                 # Detailed documentation & API contracts
├── prd.md                # 31 Core Features Product Requirements Document
├── architecture.md       # Edge AI + Multiplayer Lobby System Architecture
├── techstack.md          # 31 Features Tech Stack Mapping
├── design.md             # UI/UX Design System & Screen Wireframes
├── rules.md              # Engineering & Anti-Cheat Rules
├── phases.md             # Phased Rollout Plan & 3-Minute SIH Pitch
└── memory.md             # Continuous Project State
```

---

## 🚀 Quick Start (Local Backend & Testing)

```bash
# 1. Start Backend API Server (Port 8000)
cd backend/functions
npm install
npm run dev

# 2. Test Endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/exercises
curl http://localhost:8000/api/v1/challenges/lobbies
```
