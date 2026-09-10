# 🧠 SportX — AI Intelligence Layer & Gemini Integration Architecture

**AI Provider:** Google Gemini  
**Primary Execution Model:** `gemini-2.5-flash`  
**Candidate Fallbacks:** `gemini-2.0-flash`, `gemini-1.5-flash-latest`, `gemini-1.5-flash`  
**Security Boundary:** 100% Server-Side Execution (`backend/functions/src/ai/`)  
**Client Access:** Never exposed; zero client-side Gemini API keys  

---

## 1. Architectural Principles

1. **Strict Server-Side Isolation:** Google Gemini credentials (`GEMINI_API_KEY`) reside exclusively within server environment variables. Neither React (`frontend/`) nor Flutter (`mobile/`) ever access or receive AI API keys.
2. **Deterministic Context Grounding:** The AI Coach never invents facts about user performance, completed workouts, or vision errors. All claims must be grounded in the context payload built by `contextBuilder.ts`.
3. **Medical Safety Safeguard:** System instructions strictly prohibit medical diagnosis or injury management; users inquiring about pain or symptoms are warmly directed to consult medical professionals.
4. **Structured JSON Validation:** Raw model outputs are required to be pure JSON and must pass schema validation through `validateCoachResponse` and `validateWorkoutPlan` before reaching clients.

---

## 2. Intelligence Request Flow

```
                      React Web / Flutter Mobile
                                 │
                                 ▼ (POST /api/v1/ai/ask-coach { message })
                        SportX Express Gateway
                                 │
                                 ▼ (Bearer Token Verification)
                       verifyAuth Middleware
                                 │
                                 ▼ (UID extracted)
                      Coach Context Builder
            (Aggregates Profile, Workouts, Streaks, Vision)
                                 │
                                 ▼
                     System Prompt Assembler
         (Strict Grounding, JSON Schema, Zero False CV Claims)
                                 │
                                 ▼ (Server-Side HTTPS REST)
                   Google Gemini API (v1beta)
             (gemini-2.5-flash ➔ gemini-2.0-flash)
                                 │
                                 ▼ (Raw Response String)
                       JSON Schema Validator
              (Validates summary, strengths, recommendations)
                                 │
                                 ▼
                    Structured Client Response
```

---

## 3. Core AI Modules

### 3.1 AI Coach (`backend/functions/src/ai/coach.ts`)
- **Primary Endpoint:** `POST /api/v1/ai/ask-coach`
- **Model Fallback Logic:** Automatically cascades across candidate models if Google returns HTTP 404 or deprecation errors.
- **System Instruction Highlights:**
  - Strict JSON-only responses (no markdown backticks, no conversational fluff).
  - Distinguishes user context from general fitness principles.
  - Never claims camera analysis unless explicit telemetry is present in context.

### 3.2 Context Builder (`backend/functions/src/ai/contextBuilder.ts`)
Aggregates a student athlete's full training history into a structured context object:
```json
{
  "user": {
    "fitnessLevel": "intermediate",
    "goal": "endurance",
    "sport": "badminton",
    "availableTimeMinutes": 20
  },
  "performance": {
    "recentWorkouts": 5,
    "currentStreak": 4,
    "averagePerformance": 88
  },
  "recentIssues": ["error_knees_inward"],
  "latestSessionFeedback": {
    "exercise": "squat",
    "reps": 18,
    "formScore": 74,
    "errors": ["knees_inward"]
  }
}
```

### 3.3 AI Workout Generator (`backend/functions/src/ai/workoutGenerator.ts`)
- **Primary Endpoint:** `POST /api/v1/ai/generate-workout`
- **Output Schema:** Structured workout routine including exercise IDs, sets, reps, duration, and instructions.
- **Constraints Applied:** Target muscle group, student fitness tier, available equipment (bodyweight, dumbbells, resistance bands), and previous fatigue indicators.

### 3.4 Biomechanical Form Feedback (`backend/functions/src/ai/coach.ts`)
- **Primary Endpoint:** `POST /api/v1/vision/feedback`
- Consumes validated `VisionResultPayload` and generates specific, grounded technical corrections directly addressing detected posture errors (e.g., knee valgus, elbow flaring, incomplete depth).

### 3.5 Post-Workout AI Session Analysis (`backend/functions/src/ai/coach.ts`)
- **Primary Endpoint:** `POST /api/v1/ai/session-analysis`
- **Payload:** `{ sessionId: string }`
- **Flow:**
  1. Authoritatively loads `workoutSessions/{sessionId}` and associated `visionResults` from Firestore.
  2. Checks `coachInsights` repository for existing analysis to guarantee **idempotency** (avoids redundant Gemini invocations).
  3. Uses `buildSessionAnalysisContext(userId, sessionId)` to construct biomechanically grounded prompt.
  4. Invokes Google Gemini 1.5 Flash server-side.
  5. Validates structured JSON schema (`summary`, `doneWell`, `areasToImprove`, `actionableCues`, `nextFocus`).
  6. Persists authoritative insight document in Firestore `coachInsights/{insightId}` collection.
  7. Returns structured debrief to client.

---

## 4. Response Schemas

### Coach Consultation Response
```json
{
  "summary": "Your consistency is solid with 4 consecutive workout days. Focusing on knee alignment will elevate your squat efficiency.",
  "strengths": [
    "High consistency with a 4-day active streak.",
    "Strong stamina during badminton conditioning sessions."
  ],
  "recommendations": [
    "Drive knees outward tracking over your toes during squat descent.",
    "Incorporate 2 sets of glute bridges to activate hip stabilizers.",
    "Maintain adequate hydration between high-intensity intervals."
  ],
  "nextFocus": "knee alignment"
}
```

### Workout Generation Response
```json
{
  "workoutId": "gen_1725984000",
  "title": "Badminton Lower Body & Agility Blast",
  "goal": "endurance",
  "difficulty": "intermediate",
  "duration": 20,
  "exercises": [
    {
      "exerciseId": "squat",
      "name": "Bodyweight Squats",
      "sets": 3,
      "reps": 15,
      "duration": 60,
      "rest": 45,
      "instructions": "Maintain upright posture and track knees over toes."
    }
  ]
}
```
