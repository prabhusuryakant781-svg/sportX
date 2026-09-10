# 👁️ SportX — Computer Vision & Biomechanical Motion Architecture

**System:** SportX Edge Vision & Biomechanical Form Analyzer  
**Catalog Capacity:** 28 Core Supported Exercises  
**AI Bridge:** Google Gemini Grounded Technique Coach  
**Ingestion Route:** `POST /api/v1/vision/results`  
**Storage Collection:** `visionResults/{resultId}`  

---

## 1. End-to-End Pipeline Overview

The SportX Computer Vision engine captures real-time video frames, extracts human skeletal landmarks, tracks angular kinematics through a Finite State Machine (FSM), verifies form fidelity, and packages the telemetry for backend persistence and AI coaching:

```
    Camera Video Feed (Webcam / Mobile Camera)
                       │
                       ▼
             Pose Landmark Extractor
        (33 MediaPipe 3D Landmark Keypoints)
                       │
                       ▼
          Joint Angle & Kinematic Calculus
      (Knees, Elbows, Hip-Shoulder-Spine vectors)
                       │
                       ▼
       Finite State Machine (FSM) Rep Counter
      (UP ➔ DESCENDING ➔ INFLECTION ➔ RECOVERY)
                       │
                       ▼
         Biomechanical Form Evaluation
     (Knee Valgus, Spine Neutrality, Depth Pacing)
                       │
                       ▼
            VisionResultPayload Contract
                       │
                       ▼
              SportX Backend API
           (POST /api/v1/vision/results)
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
     Cloud Firestore       AI Coach Loop
  (visionResults record)  (POST /vision/feedback)
```

---

## 2. Standardized Vision Result Contract

Every completed or tracked movement set produces a strictly validated JSON payload matching the domain interface:

```typescript
export interface VisionResultPayload {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  reps: number;
  validFormReps: number;
  formScore: number;          // 0 to 100
  confidence: number;         // 0.0 to 1.0 (min 0.5)
  detectedIssues: string[];   // Specific error codes e.g. ["knees_inward", "shallow_depth"]
  feedbackLog: Array<{
    timestamp: number;
    text: string;
    delta?: number;
  }>;
  tempoPacing: string;        // Average seconds per rep
  durationSeconds: number;
}
```

---

## 3. 28-Exercise Prototype Registry

The movement registry (`backend/functions/src/repositories/exerciseRepository.ts`) defines biomechanical thresholds and form rules for 28 exercises:

| # | Exercise ID | Name | Category | Primary Target | Key Angle Monitored | Form Faults Checked |
|---|---|---|---|---|---|---|
| 1 | `squat` | Bodyweight Squats | Lower Body | Quads, Glutes | Hip-Knee-Ankle (85°–165°) | Knee valgus, heel lift, spine rounding |
| 2 | `pushup` | Standard Push-ups | Upper Body | Chest, Triceps | Shoulder-Elbow-Wrist (85°–165°) | Sagging hips, elbow flare >75°, partial depth |
| 3 | `bicep_curl` | Bicep Curls | Upper Body | Biceps Brachii | Shoulder-Elbow-Wrist (40°–155°) | Torso swing momentum, elbow drift |
| 4 | `plank` | Forearm Core Plank | Core | Transverse Abdominis | Shoulder-Hip-Ankle (170°–180°) | Hip pike, lumbar sag, head tilt |
| 5 | `jumping_jacks` | Jumping Jacks | Cardio | Full Body | Shoulder-Arm abduction (30°–150°) | Incomplete overhead reach, heavy impact |
| 6 | `lunges` | Walking / Forward Lunges | Lower Body | Quads, Glutes | Front Knee & Rear Knee (85°–165°) | Front knee over-travel, forward torso collapse |
| 7 | `reverse_lunges` | Reverse Lunges | Lower Body | Glutes, Hamstrings | Front Knee & Rear Knee (85°–165°) | Front heel lift, knee caving |
| 8 | `glute_bridge` | Floor Glute Bridges | Lower Body | Gluteus Maximus | Hip-Knee-Shoulder (110°–165°) | Hyperextension, incomplete hip drive |
| 9 | `calf_raise` | Standing Calf Raises | Lower Body | Gastrocnemius | Ankle Plantarflexion (90°–150°) | Ankle inversion, momentum bouncing |
| 10 | `high_knees` | High Knees Running | Cardio | Hip Flexors, Quads | Hip flexion (Knee $\ge$ 90°) | Inadequate knee height, backward torso lean |
| 11 | `mountain_climbers` | Mountain Climbers | Cardio / Core | Core, Hip Flexors | Knee-to-Chest Drive (<80°) | Hip piking, bouncing torso |
| 12 | `shoulder_press` | Overhead Shoulder Press | Upper Body | Deltoids, Triceps | Shoulder-Elbow-Wrist (75°–170°) | Lumbar arching, pressing forward |
| 13 | `lateral_raise` | Dumbbell Lateral Raises | Upper Body | Lateral Deltoids | Torso-Shoulder-Elbow (25°–90°) | Trapezius shrugging, body swing |
| 14 | `front_raise` | Front Deltoid Raises | Upper Body | Anterior Deltoids | Torso-Shoulder-Wrist (20°–90°) | Torso leaning back, swinging weights |
| 15 | `hammer_curl` | Neutral Grip Hammer Curls | Upper Body | Brachialis, Forearms | Shoulder-Elbow-Wrist (40°–155°) | Torso rocking, elbow flare |
| 16 | `tricep_extension` | Overhead Tricep Extension | Upper Body | Triceps Long Head | Shoulder-Elbow-Wrist (60°–165°) | Elbow flare outward, ribcage flare |
| 17 | `tricep_kickback` | Bent-Over Tricep Kickback | Upper Body | Triceps Lateral Head | Shoulder-Elbow-Wrist (85°–170°) | Upper arm dropping from horizontal |
| 18 | `tricep_dips` | Bench Tricep Dips | Upper Body | Triceps, Chest | Shoulder-Elbow-Wrist (85°–165°) | Hips drifting away from bench |
| 19 | `bent_over_row` | Bent-Over Dumbbell Rows | Upper Body | Latissimus Dorsi | Torso-Shoulder-Elbow (50°–155°) | Spine rounding, jerking weights |
| 20 | `chest_press` | Floor Dumbbell Chest Press | Upper Body | Pectorals, Triceps | Shoulder-Elbow-Wrist (85°–165°) | Bouncing elbows, lifting hips |
| 21 | `situps` | Full Sit-ups | Core | Rectus Abdominis | Hip-Torso Flexion (80°–160°) | Neck pulling, feet lifting |
| 22 | `crunches` | Abdominal Crunches | Core | Upper Abdominals | Upper Thoracic Flexion (0°–30°) | Pulling head with hands |
| 23 | `leg_raises` | Lying Straight Leg Raises | Core | Lower Abdominals | Hip Flexion (15°–90°) | Lumbar arching off floor, bent knees |
| 24 | `bicycle_crunches` | Alternating Bicycle Crunches | Core | Obliques, Abs | Elbow-to-Opposite-Knee Rotation | Half-reps without full thoracic rotation |
| 25 | `side_lunge` | Lateral Side Lunges | Lower Body | Adductors, Glutes | Lead Knee (85°–165°) | Trailing leg bending, foot lifting |
| 26 | `side_plank` | Lateral Side Plank Hold | Core | Obliques | Lateral Shoulder-Hip-Ankle line | Dropping hips toward floor |
| 27 | `russian_twist` | Seated Russian Twists | Core | Obliques | Thoracic Spine Twist (0°–45°) | Arm-only movement without core turn |
| 28 | `deadlift_bodyweight` | Single-Leg Romanian Deadlift | Lower Body | Hamstrings, Glutes | Hip Hinge Angle (90°–170°) | Rounding lower back, rotated hips |

---

## 4. Vision ➔ AI Coach Closed Loop

Vision results are never isolated. The complete intelligence loop functions as follows:

1. **Rep & Form Capture:** User performs set with active camera.
2. **Telemetry Dispatch:** Frontend sends `VisionResultPayload` to `POST /api/v1/vision/results`.
3. **Session Linkage:** Result is linked to active `workoutSessions/{sessionId}` document in Firestore.
4. **Context Injection:** `contextBuilder.ts` loads the latest validated vision result into student history:
   ```json
   "latestSessionFeedback": {
     "exercise": "squat",
     "reps": 15,
     "formScore": 78,
     "errors": ["knees_inward"]
   }
   ```
5. **Grounded AI Coaching:** Gemini analyzes the specific biomechanical error and responds with concrete technique cues (e.g., *"Drive your knees outward in line with your second toe on both descent and ascent"*).
