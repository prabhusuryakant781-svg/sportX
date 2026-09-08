# 🛠️ SportX — Technology Stack Specification (31 Core Features)

> **Project:** SportX (AI-Powered Student Fitness & Sports Companion)  
> **Backend Architecture:** Serverless Firebase Ecosystem + Cloud Functions (TypeScript) + On-Device Vision  
> **Core Scope:** Exactly 31 Official Core Features  
> **Version:** 2.1.0  
> **Date:** 2026-09-08

---

## 1. The 31 Features Mapping to the Tech Stack

| # | Core Feature | Component / Service | Implementation Mechanism |
|---|---|---|---|
| **01** | **Signup / Login** | Firebase Auth | Email/password, Google OAuth, JWT tokens |
| **02** | **User Profile** | Cloud Firestore | `users/{userId}`: name, email, age, height, weight |
| **03** | **Sports Selection** | Cloud Firestore | `sports/` catalogue & user selected sports array |
| **04** | **Fitness Level** | Cloud Firestore | Beginner / Intermediate / Advanced difficulty profiles |
| **05** | **Privacy Control** | Cloud Firestore | Incognito leaderboard toggle & on-device processing notice |
| **06** | **Personal Dashboard** | Mobile Client / React | Today's plan, streak status, quick start, daily rings |
| **07** | **Camera Workout in Lobby** | MediaPipe + Firestore | Live camera workout embedded in multiplayer match room |
| **08** | **Pose Detection** | MediaPipe Pose | 33 on-device body landmarks at 30 FPS |
| **09** | **Rep Counting** | Vision Logic | Biomechanical joint angle state machine |
| **10** | **Form Analysis & Error Detection** | Vision Logic | Joint angle deviation flags + real-time audio/visual HUD cues |
| **11** | **Exercise Library** | Cloud Firestore | `exercises/{exerciseId}`: instructions, video demos, form rules |
| **12** | **Personalized Workout Plan** | Cloud Functions | Dynamic routine generator based on goal, level, and time |
| **13** | **Workout Library** | Cloud Firestore | `workoutPlans/`: curated templates (Dorm room, strength) |
| **14** | **Daily Workout Plan** | Cloud Functions | `GET /api/v1/workouts/today`: daily focus routine |
| **15** | **Activity Logging** | Cloud Firestore | `activityLogs/{activityId}`: reps, duration, calories, score |
| **16** | **Workout History** | Cloud Functions | Filterable queries for Today, 7 Days, 30 Days, All Time |
| **17** | **Weekly / Monthly Progress** | Cloud Functions | `GET /api/v1/progress/summary`: consistency metrics |
| **18** | **Goal Progress / Percentage** | Mobile Client | Visual goal completion meters & active day tracking |
| **19** | **Streak Tracking** | Cloud Functions | Server-side consecutive active days counter & freeze logic |
| **20** | **Progress Chart** | Mobile Client | Interactive charts for reps, form score trends, workout volume |
| **21** | **Milestones** | Cloud Firestore | Special athletic achievements and records |
| **22** | **Consistency Insights** | Cloud Functions | Trend analyzer (best workout days, missed days, advice) |
| **23** | **Daily Challenge in Lobby** | Cloud Firestore | Featured time-bound challenge matches |
| **24** | **Point / XP** | Cloud Functions | Server-calculated XP formula preventing client spoofing |
| **25** | **Lobby to Compete (Multiplayer)** | Firestore Listeners | Real-time matchmaking, synchronized countdown, live scores |
| **26** | **Challenge Invite to Friends** | Cloud Functions | 6-digit room codes & shareable deep links |
| **27** | **Badges / Rewards / Leaderboard** | Cloud Functions | College/Department rankings & unlockable achievement badges |
| **28** | **Stop / Pause in Session** | Mobile Client | Session control toggles with pause/resume state handling |
| **29** | **Authentication (Security)** | Firebase Auth & Rules | Token verification, server-only XP rules, App Check |
| **30** | **Bug Reporting** | Cloud Firestore | `bugReports/{reportId}`: in-app CV & UI issue reporting |
| **31** | **Responsive Design** | CSS / Tailwind | Ergonomic mobile layouts (360px-1080px), 48px touch targets |

---

## 2. Cloud Firestore Database Schema

```text
users/{userId}
  ├── name: string
  ├── email: string
  ├── profileImage: string
  ├── age: number
  ├── height: number
  ├── weight: number
  ├── fitnessLevel: "beginner" | "intermediate" | "advanced"
  ├── fitnessGoal: "fitness" | "strength" | "endurance" | "flexibility"
  ├── availableTimeMinutes: 10 | 20 | 30 | 45
  ├── selectedSports: string[]
  ├── totalXp: number
  ├── currentStreak: number
  ├── longestStreak: number
  ├── isIncognito: boolean
  └── createdAt: timestamp

sports/{sportId}
  ├── name: string
  ├── category: string
  └── icon: string

exercises/{exerciseId}
  ├── name: string
  ├── category: string
  ├── difficulty: string
  ├── targetMuscles: string[]
  ├── instructions: string[]
  ├── commonErrors: string[]
  ├── formRules: map
  └── aiSupported: boolean

workoutPlans/{planId}
  ├── title: string
  ├── estimatedDurationMinutes: number
  └── exercises: array of { exerciseId, targetSets, targetReps }

workoutSessions/{sessionId}
  ├── userId: string
  ├── status: "started" | "paused" | "completed" | "cancelled"
  ├── totalReps: number
  ├── averageFormScore: number
  ├── caloriesBurned: number
  ├── xpAwarded: number
  └── completedAt: timestamp

activityLogs/{activityId}
  ├── userId: string
  ├── exerciseId: string
  ├── reps: number
  ├── formScore: number
  ├── durationSeconds: number
  └── timestamp: timestamp

lobbies/{lobbyId}
  ├── roomCode: string
  ├── hostUserId: string
  ├── exerciseId: string
  ├── targetReps: number
  ├── status: "waiting" | "countdown" | "active" | "finished"
  ├── participants: map of { [userId]: { name, reps, formScore, ready } }
  └── createdAt: timestamp

challenges/{challengeId}
  ├── title: string
  ├── targetMetric: "reps" | "streak"
  ├── targetValue: number
  └── participantsCount: number

leaderboards/{leaderboardId}
  ├── scope: "college" | "department" | "global"
  ├── rankings: array of { rank, userId, name, points, streak }
  └── updatedAt: timestamp

bugReports/{reportId}
  ├── userId: string
  ├── category: "ai_detection" | "camera_issue" | "ui_glitch"
  ├── exerciseId: string
  ├── description: string
  ├── deviceModel: string
  └── createdAt: timestamp
```

---

## 3. Multiplayer Lobby Data Flow (Features 7, 23, 25, 26)

$$\text{Create Lobby} \rightarrow \text{Invite Friends (\#Code)} \rightarrow \text{All Ready} \rightarrow \text{Synced Countdown} \rightarrow \text{Camera Match (Live Reps)} \rightarrow \text{Podium Result}$$

- Real-time sync is powered by Firestore snapshot listeners (`onSnapshot`), requiring zero extra WebSocket infrastructure for the prototype.
- High-frequency rep updates (1-2 updates per second) stream directly to `lobbies/{lobbyId}/participants/{userId}/reps`.
