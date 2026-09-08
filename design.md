# 🎨 SportX — UI/UX Design System (31 Core Features)

> **Project:** SportX (AI-Powered Student Fitness & Sports Companion)  
> **Theme:** *Cyber-Athletic Dark Mode* (`#090D16` Obsidian, `#10B981` Neon Lime, `#06B6D4` Cyan)  
> **Scope:** 31 Official Core Features  
> **Version:** 2.1.0  
> **Date:** 2026-09-08

---

## 1. Design System & Design Tokens

- **Background Obsidian:** `#090D16` (Deep OLED power-saving dark mode)
- **Surface Cards & Sheets:** `#131B2E`
- **Primary Athletic Accent:** `#10B981` (Valid reps, completion rings, streak fire)
- **AI Telemetry Cyan:** `#06B6D4` (Skeleton lines, lobby room indicators)
- **Warning Amber:** `#F59E0B` (Form alerts, 5-second countdowns)
- **Alert Crimson:** `#EF4444` (Stop/pause session, form error glow)
- **Typography:** `Outfit` / `Inter` with bold tabular figures for jitter-free counters

---

## 2. Screen & Component Architecture (Mapped to 31 Features)

### Screen 1: Login / Sign Up (Features 1, 29)
- Email/password, Google OAuth, and secure session credentials.
- Security badge & disclaimer.

### Screen 2: Onboarding & Fitness Profile (Features 2, 3, 4, 5)
- Name, age, height, weight inputs (Feature 2).
- Sports selection pills: Badminton, Football, Cricket, etc. (Feature 3).
- Fitness level selector: Beginner / Intermediate / Advanced (Feature 4).
- Privacy controls: Incognito toggle & camera privacy agreement (Feature 5).

### Screen 3: Personal Dashboard (Features 6, 14, 18, 19)
- Today's Daily Workout card with 1-tap start button (Features 6, 14).
- Streak flame counter with current consecutive days (Feature 19).
- Daily Goal percentage ring (Feature 18).
- Action shortcuts: "Solo Workout", "Multiplayer Lobby", "Log Sport".

### Screen 4: Workout & Exercise Library (Features 11, 12, 13)
- Categorized Workout Library routines (Feature 13).
- Personalized Workout Plan generator button (Feature 12).
- Exercise demonstration cards with form checklists and muscle targets (Feature 11).

### Screen 5: Solo AI Camera Workout (Features 8, 9, 10, 28)
- Full-screen mirrored camera view with 33-point pose landmark skeleton (Feature 8).
- Giant rep counter numeral (Feature 9).
- Dynamic form analysis HUD pill: 🟢 "Good Depth", 🔴 "Keep chest high" (Feature 10).
- Pause / Stop controls (Feature 28) with freeze overlay.

### Screen 6: Multiplayer Workout Lobby & Match (Features 7, 23, 25, 26)
- **Lobby Room Screen (Feature 25):**
  - Room Code banner (`#SPX-420`) with "Copy Invite Link" (Feature 26).
  - Player slots (up to 8): shows avatar, name, college, and "READY" badge.
  - Daily Featured Challenge banner for quick match finding (Feature 23).
  - Host "START MATCH" button.
- **In-Match Camera HUD (Feature 7):**
  - Left/Top: Student's live camera feed with real-time skeleton overlay & personal rep counter.
  - Right/Bottom: Live competitor scoreboard streaming opponent rep counts in real time.
  - Synced countdown clock.
  - Match winner victory podium.

### Screen 7: Session Result & Gamification (Features 15, 24, 27)
- Confetti celebration, total verified reps, active duration, calories burned.
- Automated Activity Logging entry (Feature 15).
- Points & XP awarded breakdown (Feature 24).
- Badges and milestone progress updates (Features 21, 27).

### Screen 8: Progress, History & Charts (Features 16, 17, 20, 21, 22)
- Filterable Workout History list: Today / 7 Days / 30 Days / All Time (Feature 16).
- Weekly & Monthly summary cards (Feature 17).
- Interactive volume and form accuracy charts (Feature 20).
- Milestones shelf: "Century Reps", "First 7-Day Streak" (Feature 21).
- Consistency Insights card with personalized AI coaching advice (Feature 22).

### Screen 9: Campus Leaderboard (Feature 27)
- Filter tabs: `[My College]` | `[Department]` | `[Global]`.
- Top 3 podium with gold, silver, bronze medals and student point cards.

### Screen 10: Settings & In-App Bug Reporting (Features 5, 30, 31)
- Privacy toggles (Feature 5).
- **Bug Reporting Modal (Feature 30):**
  - Report Form: Category dropdown (`AI Detection`, `Camera Issue`, `UI Glitch`).
  - Exercise dropdown (Squats, Push-ups, Curls).
  - Description textarea + "Submit Report" button.
- Responsive mobile & tablet layout guarantees (Feature 31).

---

*Author: Team HACKPACK | SportX Design System*
