/**
 * SportX Workout Repository
 * Firestore Data Access for workouts/{workoutId}
 */
import { db } from '../config/firebase';
import { WorkoutPlanDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'workouts';

export const INITIAL_WORKOUTS: WorkoutPlanDoc[] = [
  // ── 1. CORE PRESERVED ROUTINES (TEST INVARIANTS) ──────────────────────────
  {
    workoutId: 'dorm_blast_10',
    title: '10-Min Express Dorm Blast',
    description: 'A high-cadence bodyweight routine designed for tight dorm spaces without any equipment.',
    creatorId: 'system',
    sport: 'fitness',
    difficulty: 'beginner',
    targetGoal: 'fitness',
    estimatedDuration: 10,
    estimatedCalories: 85,
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', targetSets: 2, targetReps: 20, restInterval: 20, order: 1, aiSupported: true },
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 2, targetReps: 10, restInterval: 20, order: 2, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 2, targetReps: 8, restInterval: 20, order: 3, aiSupported: true },
    ],
    tags: ['quick', 'dorm', 'no-equipment', 'cardio'],
    isCustom: false,
    isPublic: true,
    likesCount: 142,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'dorm_blast_20',
    title: '20-Min Dorm Room Blast',
    description: 'Balanced full-body routine targeting core stability, lower power, and upper chest strength.',
    creatorId: 'system',
    sport: 'fitness',
    difficulty: 'beginner',
    targetGoal: 'fitness',
    estimatedDuration: 20,
    estimatedCalories: 170,
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 3, targetReps: 12, restInterval: 30, order: 1, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 3, targetReps: 10, restInterval: 30, order: 2, aiSupported: true },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetHoldSeconds: 45, restInterval: 30, order: 3, aiSupported: false },
    ],
    tags: ['full-body', 'dorm', 'core', 'daily-essential'],
    isCustom: false,
    isPublic: true,
    likesCount: 389,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'strength_30',
    title: '30-Min Strength Builder',
    description: 'Progressive overload training to develop foundational strength in chest, legs, and biceps.',
    creatorId: 'system',
    sport: 'strength',
    difficulty: 'intermediate',
    targetGoal: 'strength',
    estimatedDuration: 30,
    estimatedCalories: 260,
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 4, targetReps: 15, restInterval: 45, order: 1, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 4, targetReps: 12, restInterval: 45, order: 2, aiSupported: true },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', targetSets: 3, targetReps: 12, restInterval: 30, order: 3, aiSupported: false },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetHoldSeconds: 60, restInterval: 30, order: 4, aiSupported: false },
    ],
    tags: ['hypertrophy', 'muscle', 'intermediate'],
    isCustom: false,
    isPublic: true,
    likesCount: 512,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'endurance_45',
    title: '45-Min Athletic Endurance Circuit',
    description: 'High volume conditioning circuit built to amplify aerobic stamina and muscular endurance.',
    creatorId: 'system',
    sport: 'athletics',
    difficulty: 'advanced',
    targetGoal: 'endurance',
    estimatedDuration: 45,
    estimatedCalories: 420,
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', targetSets: 4, targetReps: 30, restInterval: 20, order: 1, aiSupported: true },
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 4, targetReps: 20, restInterval: 30, order: 2, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 4, targetReps: 15, restInterval: 30, order: 3, aiSupported: true },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', targetSets: 3, targetReps: 15, restInterval: 30, order: 4, aiSupported: false },
      { exerciseId: 'plank', name: 'Core Plank', targetSets: 3, targetHoldSeconds: 90, restInterval: 30, order: 5, aiSupported: false },
    ],
    tags: ['endurance', 'cardio', 'advanced', 'sweat'],
    isCustom: false,
    isPublic: true,
    likesCount: 275,
    createdAt: new Date().toISOString(),
  },

  // ── 2. FULL BODY EXPANDED ROUTINES ────────────────────────────────────────
  {
    workoutId: 'full_body_starter_15',
    title: '15-Min Foundation Full Body',
    description: 'Introductory full-body routine emphasizing clean movement posture and steady breathing.',
    creatorId: 'system',
    sport: 'fitness',
    difficulty: 'beginner',
    targetGoal: 'fitness',
    estimatedDuration: 15,
    estimatedCalories: 120,
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 3, targetReps: 10, restInterval: 30, order: 1, aiSupported: true },
      { exerciseId: 'incline_pushup', name: 'Incline Push-ups', targetSets: 3, targetReps: 8, restInterval: 30, order: 2, aiSupported: false },
      { exerciseId: 'glute_bridge', name: 'Floor Glute Bridges', targetSets: 3, targetReps: 12, restInterval: 25, order: 3, aiSupported: false },
      { exerciseId: 'dead_bug', name: 'Dead Bug Holds', targetSets: 2, targetReps: 10, restInterval: 25, order: 4, aiSupported: false },
    ],
    tags: ['full-body', 'beginner', 'foundation'],
    isCustom: false,
    isPublic: true,
    likesCount: 210,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'full_body_power_35',
    title: '35-Min Total Body Ignition',
    description: 'Demanding full-body circuit combining explosive jumps, chest presses, and core resistance.',
    creatorId: 'system',
    sport: 'strength',
    difficulty: 'advanced',
    targetGoal: 'strength',
    estimatedDuration: 35,
    estimatedCalories: 330,
    exercises: [
      { exerciseId: 'jump_squats', name: 'Explosive Jump Squats', targetSets: 4, targetReps: 12, restInterval: 40, order: 1, aiSupported: false },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 4, targetReps: 16, restInterval: 35, order: 2, aiSupported: true },
      { exerciseId: 'burpees', name: 'Athletic Burpees', targetSets: 3, targetReps: 10, restInterval: 45, order: 3, aiSupported: false },
      { exerciseId: 'bent_over_row', name: 'Bent-Over Rows', targetSets: 4, targetReps: 12, restInterval: 30, order: 4, aiSupported: false },
      { exerciseId: 'bicycle_crunches', name: 'Bicycle Crunches', targetSets: 3, targetReps: 20, restInterval: 30, order: 5, aiSupported: false },
    ],
    tags: ['full-body', 'power', 'advanced'],
    isCustom: false,
    isPublic: true,
    likesCount: 345,
    createdAt: new Date().toISOString(),
  },

  // ── 3. UPPER BODY ROUTINES ────────────────────────────────────────────────
  {
    workoutId: 'upper_body_sculpt_20',
    title: '20-Min Upper Body Primer',
    description: 'Targeted upper body routine building chest, shoulder, and arm strength with low joint impact.',
    creatorId: 'system',
    sport: 'strength',
    difficulty: 'beginner',
    targetGoal: 'strength',
    estimatedDuration: 20,
    estimatedCalories: 160,
    exercises: [
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 3, targetReps: 10, restInterval: 30, order: 1, aiSupported: true },
      { exerciseId: 'bent_over_row', name: 'Bent-Over Rows', targetSets: 3, targetReps: 12, restInterval: 30, order: 2, aiSupported: false },
      { exerciseId: 'lateral_raise', name: 'Dumbbell Lateral Raises', targetSets: 3, targetReps: 12, restInterval: 25, order: 3, aiSupported: false },
      { exerciseId: 'tricep_dips', name: 'Bench Tricep Dips', targetSets: 3, targetReps: 10, restInterval: 30, order: 4, aiSupported: false },
    ],
    tags: ['upper-body', 'chest', 'back', 'beginner'],
    isCustom: false,
    isPublic: true,
    likesCount: 198,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'upper_push_pull_30',
    title: '30-Min Chest & Back Hypertrophy',
    description: 'Antagonist push-pull supersets to maximize posture alignment, back density, and chest volume.',
    creatorId: 'system',
    sport: 'strength',
    difficulty: 'intermediate',
    targetGoal: 'strength',
    estimatedDuration: 30,
    estimatedCalories: 270,
    exercises: [
      { exerciseId: 'chest_press', name: 'Floor Dumbbell Chest Press', targetSets: 4, targetReps: 12, restInterval: 45, order: 1, aiSupported: false },
      { exerciseId: 'pullup', name: 'Bodyweight Pull-ups', targetSets: 3, targetReps: 6, restInterval: 60, order: 2, aiSupported: false },
      { exerciseId: 'diamond_pushup', name: 'Diamond Push-ups', targetSets: 3, targetReps: 10, restInterval: 40, order: 3, aiSupported: false },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', targetSets: 3, targetReps: 12, restInterval: 30, order: 4, aiSupported: false },
      { exerciseId: 'tricep_extension', name: 'Overhead Tricep Extension', targetSets: 3, targetReps: 12, restInterval: 30, order: 5, aiSupported: false },
    ],
    tags: ['upper-body', 'hypertrophy', 'strength'],
    isCustom: false,
    isPublic: true,
    likesCount: 420,
    createdAt: new Date().toISOString(),
  },

  // ── 4. LOWER BODY ROUTINES ────────────────────────────────────────────────
  {
    workoutId: 'lower_body_mobility_legs_20',
    title: '20-Min Lower Body & Glute Foundation',
    description: 'Joint-friendly quad and glute activation routine protecting knees and improving hip mobility.',
    creatorId: 'system',
    sport: 'fitness',
    difficulty: 'beginner',
    targetGoal: 'fitness',
    estimatedDuration: 20,
    estimatedCalories: 165,
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 3, targetReps: 12, restInterval: 30, order: 1, aiSupported: true },
      { exerciseId: 'reverse_lunges', name: 'Reverse Lunges', targetSets: 3, targetReps: 10, restInterval: 30, order: 2, aiSupported: false },
      { exerciseId: 'glute_bridge', name: 'Floor Glute Bridges', targetSets: 3, targetReps: 15, restInterval: 25, order: 3, aiSupported: false },
      { exerciseId: 'calf_raise', name: 'Standing Calf Raises', targetSets: 3, targetReps: 20, restInterval: 20, order: 4, aiSupported: false },
    ],
    tags: ['lower-body', 'glutes', 'knees', 'beginner'],
    isCustom: false,
    isPublic: true,
    likesCount: 310,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'lower_body_power_30',
    title: '30-Min Leg Drive & Posterior Power',
    description: 'Heavy unilateral leg overload developing sprint acceleration and vertical jump drive.',
    creatorId: 'system',
    sport: 'strength',
    difficulty: 'advanced',
    targetGoal: 'strength',
    estimatedDuration: 30,
    estimatedCalories: 290,
    exercises: [
      { exerciseId: 'bulgarian_split_squat', name: 'Bulgarian Split Squats', targetSets: 4, targetReps: 10, restInterval: 45, order: 1, aiSupported: false },
      { exerciseId: 'deadlift_bodyweight', name: 'Single-Leg Romanian Deadlift', targetSets: 3, targetReps: 10, restInterval: 40, order: 2, aiSupported: false },
      { exerciseId: 'squat', name: 'Deep Bodyweight Squats', targetSets: 4, targetReps: 15, restInterval: 35, order: 3, aiSupported: true },
      { exerciseId: 'side_lunge', name: 'Lateral Side Lunges', targetSets: 3, targetReps: 12, restInterval: 30, order: 4, aiSupported: false },
      { exerciseId: 'wall_sit', name: 'Isometric Wall Sit', targetSets: 3, targetHoldSeconds: 45, restInterval: 30, order: 5, aiSupported: false },
    ],
    tags: ['lower-body', 'power', 'advanced'],
    isCustom: false,
    isPublic: true,
    likesCount: 280,
    createdAt: new Date().toISOString(),
  },

  // ── 5. CORE & STRENGTH ROUTINES ───────────────────────────────────────────
  {
    workoutId: 'core_armor_15',
    title: '15-Min Core Armor & Anti-Rotation',
    description: 'Bulletproof rotational and anti-extension core routine for collegiate athlete stability.',
    creatorId: 'system',
    sport: 'fitness',
    difficulty: 'intermediate',
    targetGoal: 'fitness',
    estimatedDuration: 15,
    estimatedCalories: 130,
    exercises: [
      { exerciseId: 'plank', name: 'Forearm Core Plank', targetSets: 3, targetHoldSeconds: 60, restInterval: 30, order: 1, aiSupported: false },
      { exerciseId: 'russian_twist', name: 'Seated Russian Twists', targetSets: 3, targetReps: 24, restInterval: 25, order: 2, aiSupported: false },
      { exerciseId: 'leg_raises', name: 'Lying Straight Leg Raises', targetSets: 3, targetReps: 12, restInterval: 30, order: 3, aiSupported: false },
      { exerciseId: 'side_plank', name: 'Lateral Side Plank Hold', targetSets: 2, targetHoldSeconds: 30, restInterval: 25, order: 4, aiSupported: false },
    ],
    tags: ['core', 'abs', 'stability'],
    isCustom: false,
    isPublic: true,
    likesCount: 460,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'dorm_strength_40',
    title: '40-Min High-Volume Bodyweight Strength',
    description: 'High mechanical volume routine taxing major muscle groups to near-failure without weights.',
    creatorId: 'system',
    sport: 'strength',
    difficulty: 'advanced',
    targetGoal: 'strength',
    estimatedDuration: 40,
    estimatedCalories: 360,
    exercises: [
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 5, targetReps: 15, restInterval: 45, order: 1, aiSupported: true },
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 5, targetReps: 20, restInterval: 40, order: 2, aiSupported: true },
      { exerciseId: 'tricep_dips', name: 'Bench Tricep Dips', targetSets: 4, targetReps: 14, restInterval: 35, order: 3, aiSupported: false },
      { exerciseId: 'lunges', name: 'Forward Walking Lunges', targetSets: 4, targetReps: 12, restInterval: 35, order: 4, aiSupported: false },
      { exerciseId: 'superman_hold', name: 'Superman Hold', targetSets: 3, targetHoldSeconds: 30, restInterval: 30, order: 5, aiSupported: false },
      { exerciseId: 'plank', name: 'Forearm Core Plank', targetSets: 3, targetHoldSeconds: 75, restInterval: 30, order: 6, aiSupported: false },
    ],
    tags: ['strength', 'volume', 'dorm'],
    isCustom: false,
    isPublic: true,
    likesCount: 395,
    createdAt: new Date().toISOString(),
  },

  // ── 6. ENDURANCE & CARDIO ROUTINES ────────────────────────────────────────
  {
    workoutId: 'athletic_stamina_25',
    title: '25-Min High-Cadence Stamina Circuit',
    description: 'Cardiovascular muscular endurance circuit utilizing rapid drill transitions.',
    creatorId: 'system',
    sport: 'athletics',
    difficulty: 'intermediate',
    targetGoal: 'endurance',
    estimatedDuration: 25,
    estimatedCalories: 260,
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', targetSets: 4, targetReps: 35, restInterval: 20, order: 1, aiSupported: true },
      { exerciseId: 'high_knees', name: 'High Knees Running', targetSets: 4, targetReps: 30, restInterval: 20, order: 2, aiSupported: false },
      { exerciseId: 'mountain_climbers', name: 'Mountain Climbers', targetSets: 4, targetReps: 25, restInterval: 20, order: 3, aiSupported: false },
      { exerciseId: 'squat', name: 'Bodyweight Squats', targetSets: 4, targetReps: 15, restInterval: 25, order: 4, aiSupported: true },
      { exerciseId: 'pushup', name: 'Standard Push-ups', targetSets: 3, targetReps: 12, restInterval: 30, order: 5, aiSupported: true },
    ],
    tags: ['endurance', 'cardio', 'stamina'],
    isCustom: false,
    isPublic: true,
    likesCount: 330,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'hiit_cardio_blitz_15',
    title: '15-Min HIIT Cardio Blast',
    description: 'Tabata-style intervals (40s work, 20s recovery) maximizing VO2 max and calorie afterburn.',
    creatorId: 'system',
    sport: 'athletics',
    difficulty: 'intermediate',
    targetGoal: 'endurance',
    estimatedDuration: 15,
    estimatedCalories: 175,
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', targetSets: 3, targetReps: 40, restInterval: 20, order: 1, aiSupported: true },
      { exerciseId: 'high_knees', name: 'High Knees Running', targetSets: 3, targetReps: 30, restInterval: 20, order: 2, aiSupported: false },
      { exerciseId: 'burpees', name: 'Athletic Burpees', targetSets: 3, targetReps: 10, restInterval: 30, order: 3, aiSupported: false },
      { exerciseId: 'mountain_climbers', name: 'Mountain Climbers', targetSets: 3, targetReps: 30, restInterval: 20, order: 4, aiSupported: false },
      { exerciseId: 'skater_jumps', name: 'Lateral Skater Jumps', targetSets: 3, targetReps: 20, restInterval: 20, order: 5, aiSupported: false },
    ],
    tags: ['hiit', 'cardio', 'intervals'],
    isCustom: false,
    isPublic: true,
    likesCount: 520,
    createdAt: new Date().toISOString(),
  },

  // ── 7. RUNNING & CONDITIONING ROUTINES ─────────────────────────────────────
  {
    workoutId: 'couch_to_5k_jog_25',
    title: '25-Min Aerobic Base Jog & Walk',
    description: 'Alternating 2-minute light jogging and 1-minute brisk walking blocks for aerobic foundation.',
    creatorId: 'system',
    sport: 'athletics',
    difficulty: 'beginner',
    targetGoal: 'endurance',
    estimatedDuration: 25,
    estimatedCalories: 210,
    exercises: [
      { exerciseId: 'brisk_walk', name: 'Brisk Warm-Up Walk', targetSets: 1, targetHoldSeconds: 300, restInterval: 0, order: 1, aiSupported: false },
      { exerciseId: 'campus_jog', name: 'Steady Campus Jogging', targetSets: 5, targetHoldSeconds: 120, restInterval: 60, order: 2, aiSupported: false },
      { exerciseId: 'brisk_walk', name: 'Cool-Down Walk', targetSets: 1, targetHoldSeconds: 300, restInterval: 0, order: 3, aiSupported: false },
    ],
    tags: ['running', 'jogging', 'aerobic', 'beginner'],
    isCustom: false,
    isPublic: true,
    likesCount: 380,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'outdoor_interval_run_30',
    title: '30-Min Campus Interval Run',
    description: 'Outdoor running session combining structured 90-second tempo intervals with jogging recoveries.',
    creatorId: 'system',
    sport: 'athletics',
    difficulty: 'intermediate',
    targetGoal: 'endurance',
    estimatedDuration: 30,
    estimatedCalories: 310,
    exercises: [
      { exerciseId: 'campus_jog', name: 'Warm-up Easy Jog', targetSets: 1, targetHoldSeconds: 300, restInterval: 30, order: 1, aiSupported: false },
      { exerciseId: 'outdoor_run', name: 'Tempo Running Intervals', targetSets: 6, targetHoldSeconds: 90, restInterval: 60, order: 2, aiSupported: false },
      { exerciseId: 'campus_jog', name: 'Cool-down Flush Jog', targetSets: 1, targetHoldSeconds: 300, restInterval: 0, order: 3, aiSupported: false },
    ],
    tags: ['running', 'intervals', 'tempo'],
    isCustom: false,
    isPublic: true,
    likesCount: 410,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'sprint_conditioning_20',
    title: '20-Min Track & Turf Sprint Intervals',
    description: 'Anaerobic power development featuring all-out sprint repeats with full active walking recoveries.',
    creatorId: 'system',
    sport: 'athletics',
    difficulty: 'advanced',
    targetGoal: 'endurance',
    estimatedDuration: 20,
    estimatedCalories: 240,
    exercises: [
      { exerciseId: 'high_knees', name: 'Dynamic High Knees Warm-up', targetSets: 2, targetReps: 30, restInterval: 30, order: 1, aiSupported: false },
      { exerciseId: 'butt_kicks', name: 'Butt Kicks Cadence Drill', targetSets: 2, targetReps: 30, restInterval: 30, order: 2, aiSupported: false },
      { exerciseId: 'sprint_intervals', name: 'All-Out 30s Sprints', targetSets: 8, targetHoldSeconds: 30, restInterval: 75, order: 3, aiSupported: false },
      { exerciseId: 'brisk_walk', name: 'Recovery Walk', targetSets: 1, targetHoldSeconds: 300, restInterval: 0, order: 4, aiSupported: false },
    ],
    tags: ['running', 'sprints', 'speed', 'advanced'],
    isCustom: false,
    isPublic: true,
    likesCount: 295,
    createdAt: new Date().toISOString(),
  },

  // ── 8. MOBILITY & RECOVERY ROUTINES ───────────────────────────────────────
  {
    workoutId: 'mobility_recovery_15',
    title: '15-Min Post-Training Reset & Hip Flow',
    description: 'Essential post-game and study-break flow relieving hip flexor tension and lumbar stiffness.',
    creatorId: 'system',
    sport: 'fitness',
    difficulty: 'beginner',
    targetGoal: 'fitness',
    estimatedDuration: 15,
    estimatedCalories: 75,
    exercises: [
      { exerciseId: 'worlds_greatest_stretch', name: "World's Greatest Stretch", targetSets: 2, targetReps: 6, restInterval: 15, order: 1, aiSupported: false },
      { exerciseId: 'cat_cow', name: 'Cat-Cow Spinal Waves', targetSets: 3, targetReps: 10, restInterval: 15, order: 2, aiSupported: false },
      { exerciseId: 'hip_flexor_stretch', name: 'Half-Kneeling Hip Flexor Stretch', targetSets: 2, targetHoldSeconds: 40, restInterval: 15, order: 3, aiSupported: false },
      { exerciseId: 'downward_dog', name: 'Downward Dog to Cobra Flow', targetSets: 2, targetReps: 8, restInterval: 15, order: 4, aiSupported: false },
    ],
    tags: ['mobility', 'recovery', 'hips', 'flow'],
    isCustom: false,
    isPublic: true,
    likesCount: 375,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'thoracic_shoulder_mobility_20',
    title: '20-Min Thoracic & Shoulder Unlock',
    description: 'Restores scapular rhythm, thoracic spine rotation, and overhead reach for throwing and court athletes.',
    creatorId: 'system',
    sport: 'fitness',
    difficulty: 'intermediate',
    targetGoal: 'fitness',
    estimatedDuration: 20,
    estimatedCalories: 90,
    exercises: [
      { exerciseId: 'thoracic_rotation', name: 'Side-Lying Thoracic Windmills', targetSets: 3, targetReps: 8, restInterval: 20, order: 1, aiSupported: false },
      { exerciseId: 'superman_hold', name: 'Prone Scapular Superman Hold', targetSets: 3, targetHoldSeconds: 30, restInterval: 25, order: 2, aiSupported: false },
      { exerciseId: 'cat_cow', name: 'Cat-Cow Spinal Waves', targetSets: 3, targetReps: 10, restInterval: 15, order: 3, aiSupported: false },
      { exerciseId: 'bird_dog', name: 'Bird Dog Stability', targetSets: 3, targetReps: 10, restInterval: 20, order: 4, aiSupported: false },
    ],
    tags: ['mobility', 'shoulders', 'thoracic'],
    isCustom: false,
    isPublic: true,
    likesCount: 260,
    createdAt: new Date().toISOString(),
  },

  // ── 9. SPORT-FOCUSED ROUTINES ─────────────────────────────────────────────
  {
    workoutId: 'basketball_agility_circuit_25',
    title: '25-Min Court Agility & Vertical Power',
    description: 'Sport-specific conditioning targeting rapid lateral cuts, defensive slides, and vertical elevation.',
    creatorId: 'system',
    sport: 'athletics',
    difficulty: 'intermediate',
    targetGoal: 'endurance',
    estimatedDuration: 25,
    estimatedCalories: 265,
    exercises: [
      { exerciseId: 'jump_squats', name: 'Explosive Jump Squats', targetSets: 3, targetReps: 12, restInterval: 40, order: 1, aiSupported: false },
      { exerciseId: 'side_lunge', name: 'Lateral Side Lunges', targetSets: 3, targetReps: 12, restInterval: 30, order: 2, aiSupported: false },
      { exerciseId: 'high_knees', name: 'High Knees Sprint Drill', targetSets: 3, targetReps: 30, restInterval: 25, order: 3, aiSupported: false },
      { exerciseId: 'calf_raise', name: 'Standing Calf Raises', targetSets: 3, targetReps: 20, restInterval: 20, order: 4, aiSupported: false },
      { exerciseId: 'plank', name: 'Forearm Core Plank', targetSets: 3, targetHoldSeconds: 45, restInterval: 30, order: 5, aiSupported: false },
    ],
    tags: ['basketball', 'agility', 'jumping', 'court'],
    isCustom: false,
    isPublic: true,
    likesCount: 315,
    createdAt: new Date().toISOString(),
  },
  {
    workoutId: 'badminton_quickstep_20',
    title: '20-Min Racquet Quick-Step & Reaction',
    description: 'Fast-twitch deceleration and lunging circuit tailored for quick change-of-direction on court.',
    creatorId: 'system',
    sport: 'athletics',
    difficulty: 'intermediate',
    targetGoal: 'endurance',
    estimatedDuration: 20,
    estimatedCalories: 205,
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks Warm-up', targetSets: 2, targetReps: 30, restInterval: 20, order: 1, aiSupported: true },
      { exerciseId: 'reverse_lunges', name: 'Reverse Lunges', targetSets: 3, targetReps: 12, restInterval: 30, order: 2, aiSupported: false },
      { exerciseId: 'skater_jumps', name: 'Lateral Skater Jumps', targetSets: 3, targetReps: 16, restInterval: 30, order: 3, aiSupported: false },
      { exerciseId: 'jump_rope', name: 'Jump Rope Calisthenics', targetSets: 3, targetHoldSeconds: 45, restInterval: 20, order: 4, aiSupported: false },
    ],
    tags: ['badminton', 'footwork', 'reaction', 'racquet'],
    isCustom: false,
    isPublic: true,
    likesCount: 240,
    createdAt: new Date().toISOString(),
  },
];

export class WorkoutRepository {
  static async getAll(filters?: {
    difficulty?: string;
    goal?: string;
    maxDuration?: number;
    sport?: string;
  }): Promise<WorkoutPlanDoc[]> {
    try {
      let query: FirebaseFirestore.Query = db.collection(COLLECTION);
      if (filters?.goal) query = query.where('targetGoal', '==', filters.goal);
      if (filters?.difficulty) query = query.where('difficulty', '==', filters.difficulty);

      const snapshot = await query.get();
      let results: WorkoutPlanDoc[] = [];

      if (snapshot.empty) {
        results = [...INITIAL_WORKOUTS];
      } else {
        results = snapshot.docs.map((doc) => doc.data() as WorkoutPlanDoc);
        const existingIds = new Set(results.map((p) => p.workoutId));
        for (const initial of INITIAL_WORKOUTS) {
          if (!existingIds.has(initial.workoutId)) {
            results.push(initial);
          }
        }
      }

      if (filters?.maxDuration) {
        results = results.filter((p) => p.estimatedDuration <= Number(filters.maxDuration));
      }
      if (filters?.goal) {
        results = results.filter((p) => p.targetGoal === filters.goal);
      }

      return results.length > 0 ? results : INITIAL_WORKOUTS;
    } catch (err) {
      logger.error('Error fetching workouts:', err);
      return INITIAL_WORKOUTS;
    }
  }

  static async getById(workoutId: string): Promise<WorkoutPlanDoc | null> {
    try {
      const doc = await db.collection(COLLECTION).doc(workoutId).get();
      if (doc.exists) {
        return doc.data() as WorkoutPlanDoc;
      }
      return INITIAL_WORKOUTS.find((w) => w.workoutId === workoutId) || null;
    } catch (err) {
      return INITIAL_WORKOUTS.find((w) => w.workoutId === workoutId) || null;
    }
  }

  static async create(workout: WorkoutPlanDoc): Promise<WorkoutPlanDoc> {
    await db.collection(COLLECTION).doc(workout.workoutId).set(workout);
    return workout;
  }

  static async seedInitialWorkouts(): Promise<number> {
    const batch = db.batch();
    for (const plan of INITIAL_WORKOUTS) {
      const docRef = db.collection(COLLECTION).doc(plan.workoutId);
      batch.set(docRef, plan, { merge: true });
    }
    await batch.commit();
    return INITIAL_WORKOUTS.length;
  }
}
