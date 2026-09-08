# 🚀 SportX — Implementation Phases (31 Core Features)

> **Project:** SportX (AI-Powered Student Fitness & Sports Companion)  
> **Target:** SIH 2026 (PS 26196) Prototype & Production Roadmap  
> **Scope:** Organized strictly around the 31 Official Core Features  
> **Version:** 2.1.0  
> **Date:** 2026-09-08

---

## The 31 Features Phased Roadmap

```
Phase 1: Solo AI Core (P0 Must-Haves)       ──►  Phase 2: Multiplayer Lobby & Polish (P1)
• 01. Signup / Login                             • 07. Camera Workout in Lobby (Multiplayer)
• 02. User Profile                               • 23. Daily Challenge in Lobby
• 03. Sports Selection                           • 25. Lobby to Compete (Gaming-Style Match)
• 04. Fitness Level                              • 26. Challenge Invite to Friends
• 05. Privacy Control                            • 21. Milestones Tracking
• 06. Personal Dashboard                         • 22. Consistency Insights
• 08. Pose Detection                             • 30. Bug Reporting System
• 09. Rep Counting (Squat, Push-up, Curl)
• 10. Form Analysis & Error Detection
• 11. Exercise Library
• 12. Personalized Workout Plan
• 13. Workout Library
• 14. Daily Workout Plan
• 15. Activity Logging
• 16. Workout History (Today, 7d, 30d, All)
• 17. Weekly / Monthly Progress
• 18. Goal Progress / Percentage
• 19. Streak Tracking
• 20. Progress Chart
• 24. Point / XP System
• 27. Badges / Rewards / Leaderboard
• 28. Stop / Pause in Session
• 29. Secure Authentication
• 31. Responsive Design
```

---

## Phase 1 — Solo AI Fitness Loop (SIH P0 Target)
*Objective: Build the core personal fitness loop where a student can onboard, get an adaptive plan, work out with the camera, get reps/form tracked, and maintain their streak.*

### Deliverables:
- [x] **Auth & Onboarding (F1, F2, F3, F4, F5, F29):** Student registers, enters height/weight, selects sports, chooses fitness level.
- [x] **Personal Dashboard (F6, F14, F18, F19):** View today's workout, streak flame, and daily goal progress.
- [x] **Workout Engine (F11, F12, F13):** Dynamic 15/20/30-minute plans from exercise library.
- [x] **AI Camera Session (F8, F9, F10, F28):** MediaPipe pose detection, automatic rep counter for Squats, Push-ups, and Curls with form error alerts and pause/stop controls.
- [x] **Session Result & Rewards (F15, F24, F27):** Save completed reps, award XP, update level, and celebrate.
- [x] **Progress & History (F16, F17, F20):** Filterable workout history (today, 7d, 30d) and progress charts.
- [x] **Responsive Mobile Experience (F31):** 48px touch targets, OLED dark mode, glanceable 8ft HUD.

---

## Phase 2 — Multiplayer Workout Lobby & Social Competition (SIH P1 Target)
*Objective: Bring the excitement of multiplayer gaming into campus workouts.*

### Deliverables:
- [x] **Multiplayer Matchmaking Lobby (F25):** Create room, generate 6-character room codes (`#SPX-77`), and join lobby.
- [x] **Friend & Group Invites (F26):** Deep links and shareable invites for hostel mates.
- [x] **Camera Workout in Lobby (F7):** Live split-screen camera match where players see their own skeleton overlay alongside opponents' live rep counts.
- [x] **Daily Challenge in Lobby (F23):** Scheduled daily featured match with bonus XP multiplier.
- [x] **Podium Settlement (F27):** Real-time winner determination, match stats, and leaderboard updates.
- [x] **Consistency Insights (F22):** Intelligent recommendations and trend alerts.
- [x] **In-App Bug Reporting (F30):** 1-tap modal to report camera lighting or detection issues.

---

## 🎬 Updated 3-Minute SIH Demonstration Flow

1. **Minute 1 — Personalization:** Student logs in (F1, F29), shows hostel room profile, picks 20 mins (F2, F4), and views today's plan (F6, F14).
2. **Minute 2 — AI Camera Workout:** Student performs squats on camera (F7, F8). App counts reps out loud (F9), flags a shallow squat with "Squat lower!" (F10), tests pause/resume (F28), and completes the set.
3. **Minute 3 — Multiplayer Lobby & Leaderboard:** Student creates a "Dorm Showdown" lobby (F25), invites a teammate (F26), runs a 30-second live match with simultaneous rep tracking (F7), checks the updated leaderboard (F27), and reviews progress charts (F20).
