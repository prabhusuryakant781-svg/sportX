# 📡 SportX — Complete API Reference (v1)

**Base URL:** `/api/v1`  
**Authentication:** Header `Authorization: Bearer <FIREBASE_ID_TOKEN>`  
**Serverless Functions:** Express Gateway on Firebase Cloud Functions 2nd Gen / Vercel  

---

## 1. Authentication Endpoints (`/auth`)

| Endpoint | Method | Auth Required | Description | Request Body | Response |
|---|---|---|---|---|---|
| `/auth/signup` | `POST` | No | Creates a user in Firebase Auth and initial Firestore document | `{ email, password, name, collegeName, department, fitnessLevel, selectedSports }` | `{ success: true, data: { token, user } }` |
| `/auth/login` | `POST` | No | Authenticates user (accepts `idToken` or credentials) | `{ email, password, idToken? }` | `{ success: true, data: { token, user } }` |
| `/auth/reset-password` | `POST` | No | Triggers password reset email | `{ email }` | `{ success: true, message }` |
| `/auth/logout` | `POST` | Yes | Terminates session | None | `{ success: true }` |

---

## 2. User & Profile Endpoints (`/users`)

| Endpoint | Method | Auth Required | Description | Request Body | Response |
|---|---|---|---|---|---|
| `/users/profile` | `GET` | Yes | Retrieves current user profile | None | `{ success: true, data: UserDoc }` |
| `/users/profile` | `PUT` | Yes | Updates profile fields | `{ name?, collegeName?, department?, fitnessGoal?, fitnessLevel? }` | `{ success: true, data: UserDoc }` |
| `/users/stats` | `GET` | Yes | Returns high-level statistics | None | `{ success: true, data: { totalWorkouts, totalMinutes, totalCalories, xp, streak } }` |

---

## 3. Exercise Library Endpoints (`/exercises`)

| Endpoint | Method | Auth Required | Description | Request Body / Query | Response |
|---|---|---|---|---|---|
| `/exercises` | `GET` | Yes | Lists supported exercises | `?sportId=&difficulty=&targetMuscle=` | `{ success: true, count, data: ExerciseDoc[] }` |
| `/exercises/:id` | `GET` | Yes | Gets single exercise details | None | `{ success: true, data: ExerciseDoc }` |
| `/exercises/search` | `POST` | Yes | Searches exercises by query and filters | `{ query, targetMuscle, difficulty }` | `{ success: true, data: ExerciseDoc[] }` |

---

## 4. Workout & Session Endpoints (`/workouts`, `/sessions`)

| Endpoint | Method | Auth Required | Description | Request Body / Query | Response |
|---|---|---|---|---|---|
| `/workouts` | `GET` | Yes | Lists workout plans | `?difficulty=&goal=` | `{ success: true, data: WorkoutDoc[] }` |
| `/workouts/today` | `GET` | Yes | Gets personalized daily workout | None | `{ success: true, data: WorkoutDoc }` |
| `/workouts/:id` | `GET` | Yes | Gets single workout plan | None | `{ success: true, data: WorkoutDoc }` |
| `/sessions` | `GET` | Yes | Retrieves user workout history | `?limit=20&status=completed` | `{ success: true, count, data: WorkoutSessionDoc[] }` |
| `/sessions/:id` | `GET` | Yes | Retrieves single workout session details | None | `{ success: true, data: WorkoutSessionDoc }` |
| `/sessions/start` | `POST` | Yes | Begins an active workout session | `{ workoutId, exerciseId }` | `{ success: true, data: { sessionId, startedAt } }` |
| `/sessions/:id/complete` | `POST` | Yes | Finalizes session, calculates XP, updates streak & progress | `{ exerciseId, exerciseName, totalReps, averageFormScore, durationSeconds }` | `{ success: true, data: { xpEarned, newLevel, currentStreak, badgesUnlocked } }` |
| `/sessions/:id/cancel` | `POST` | Yes | Cancels active session | None | `{ success: true }` |

---

## 4.1. Progress & Aggregation Endpoints (`/progress`, `/activity`)

| Endpoint | Method | Auth Required | Description | Response |
|---|---|---|---|---|
| `/progress` | `GET` | Yes | Returns pre-aggregated user progress doc (PRs, trends, totals) | `{ success: true, data: ProgressDoc }` |
| `/progress/summary` | `GET` | Yes | Compact progress overview for mobile dashboards | `{ success: true, data: { totalWorkouts, totalReps, personalRecords } }` |
| `/activity/history` | `GET` | Yes | Activity feed over time range (`?period=7d\|30d`) | `{ success: true, data: ActivityLogDoc[] }` |

---

## 5. Computer Vision Endpoints (`/vision`)

| Endpoint | Method | Auth Required | Description | Request Body | Response |
|---|---|---|---|---|---|
| `/vision/results` | `POST` | Yes | Ingests, validates, and stores movement telemetry | `VisionResultPayload` | `{ success: true, data: StoredVisionRecord }` |
| `/vision/results` | `GET` | Yes | Retrieves user's recent vision results | `?limit=10` | `{ success: true, count, data: StoredVisionRecord[] }` |
| `/vision/results/:sessionId` | `GET` | Yes | Retrieves vision result for a specific session | None | `{ success: true, data: StoredVisionRecord }` |
| `/vision/feedback` | `POST` | Yes | Generates grounded AI biomechanical form feedback | `{ sessionId?, visionResult? }` | `{ success: true, data: AIFormFeedbackResponse }` |

---

## 6. AI Coach & Intelligence Endpoints (`/ai`)

| Endpoint | Method | Auth Required | Description | Request Body | Response |
|---|---|---|---|---|---|
| `/ai/ask-coach` | `POST` | Yes | Consults the AI Coach with grounded user context | `{ message: string }` | `{ success: true, data: { summary, strengths, recommendations, nextFocus } }` |
| `/ai/session-analysis` | `POST` | Yes | Deep post-workout debrief based on authoritative session & vision results | `{ sessionId: string }` | `{ success: true, data: CoachInsightDoc }` |
| `/ai/generate-workout` | `POST` | Yes | Generates tailored daily/weekly workout routine | `{ focusMuscle?, durationMinutes?, difficulty? }` | `{ success: true, data: GeneratedWorkoutPlan }` |
| `/ai/progress` | `GET` | Yes | Analyzes multi-week progression trends | None | `{ success: true, data: AIProgressAnalysis }` |
| `/ai/consistency` | `GET` | Yes | Returns streak habits and workout adherence insight | None | `{ success: true, data: AIConsistencyInsight }` |

---

## 7. Gamification & Leaderboard Endpoints (`/gamification`, `/leaderboard`)

| Endpoint | Method | Auth Required | Description | Response |
|---|---|---|---|---|
| `/gamification/badges` | `GET` | Yes | Returns master badge list with user unlocked status | `{ success: true, data: BadgeWithStatus[] }` |
| `/gamification/status` | `GET` | Yes | Returns current level, XP, next tier threshold | `{ success: true, data: { level, xp, xpForNext, progressPercent } }` |
| `/leaderboard/global` | `GET` | Yes | Global student athlete rankings | `{ success: true, data: LeaderboardEntry[] }` |
| `/leaderboard/college` | `GET` | Yes | Campus/College-specific rankings | `{ success: true, data: LeaderboardEntry[] }` |

---

## 8. Challenges & Multiplayer Endpoints (`/challenges`, `/lobbies`)

| Endpoint | Method | Auth Required | Description | Request Body | Response |
|---|---|---|---|---|---|
| `/challenges` | `POST` | Yes | Creates peer challenge | `{ title, targetReps, exerciseId, opponentId, durationDays }` | `{ success: true, data: Challenge }` |
| `/challenges` | `GET` | Yes | Lists active and past challenges | None | `{ success: true, data: Challenge[] }` |
| `/challenges/:id/respond`| `PATCH`| Yes | Accepts or declines challenge | `{ action: 'accept' \| 'decline' }` | `{ success: true, data: Challenge }` |
| `/lobbies` | `POST` | Yes | Creates multiplayer workout room | `{ exerciseId, targetReps }` | `{ success: true, data: { lobbyId, roomCode } }` |
| `/lobbies/:id/join` | `POST` | Yes | Joins lobby with room code | None | `{ success: true, data: LobbyRoom }` |
| `/lobbies/:id` | `GET` | Yes | Gets live lobby telemetry & state | None | `{ success: true, data: LobbyRoom }` |
