import type { WorkoutPlan, Exercise } from '../types';

/**
 * Master Default Workout Plans
 * Covers Full Body, Upper Body, Lower Body, Strength, Endurance,
 * Cardio & Running, Mobility, and Sport-Specific training.
 */
export const DEFAULT_WORKOUT_PLANS: WorkoutPlan[] = [
  // ── 1. PRESERVED ORIGINAL PLANS (TEST & BACKWARD COMPATIBILITY) ────────────
  {
    id: 'dorm_blast_10',
    workoutId: 'dorm_blast_10',
    planId: 'dorm_blast_10',
    title: '10-Min Express Dorm Blast',
    difficulty: 'beginner',
    estimatedDurationMinutes: 10,
    estimatedDuration: 10,
    recommendationReason: 'Quick high-cadence bodyweight routine designed for tight dorm rooms without equipment.',
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', sets: 2, reps: 20, restSeconds: 20 },
      { exerciseId: 'squat', name: 'Bodyweight Squats', sets: 2, reps: 10, restSeconds: 20 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', sets: 2, reps: 8, restSeconds: 20 },
    ],
  },
  {
    id: 'dorm_blast_20',
    workoutId: 'dorm_blast_20',
    planId: 'dorm_blast_20',
    title: '20-Min Dorm Room Blast',
    difficulty: 'beginner',
    estimatedDurationMinutes: 20,
    estimatedDuration: 20,
    recommendationReason: 'Balanced full-body routine targeting core stability, lower power, and upper chest strength.',
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 30 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', sets: 3, reps: 10, restSeconds: 30 },
      { exerciseId: 'plank', name: 'Core Plank', sets: 3, reps: 45, restSeconds: 30 },
    ],
  },
  {
    id: 'strength_30',
    workoutId: 'strength_30',
    planId: 'strength_30',
    title: '30-Min Strength Builder',
    difficulty: 'intermediate',
    estimatedDurationMinutes: 30,
    estimatedDuration: 30,
    recommendationReason: 'Progressive overload training to develop foundational strength in chest, legs, and biceps.',
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', sets: 4, reps: 15, restSeconds: 45 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', sets: 4, reps: 12, restSeconds: 45 },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', sets: 3, reps: 12, restSeconds: 30 },
      { exerciseId: 'plank', name: 'Core Plank', sets: 3, reps: 60, restSeconds: 30 },
    ],
  },
  {
    id: 'endurance_45',
    workoutId: 'endurance_45',
    planId: 'endurance_45',
    title: '45-Min Athletic Endurance Circuit',
    difficulty: 'advanced',
    estimatedDurationMinutes: 45,
    estimatedDuration: 45,
    recommendationReason: 'High volume conditioning circuit built to amplify aerobic stamina and muscular endurance.',
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', sets: 4, reps: 30, restSeconds: 20 },
      { exerciseId: 'squat', name: 'Bodyweight Squats', sets: 4, reps: 20, restSeconds: 30 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', sets: 4, reps: 15, restSeconds: 30 },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', sets: 3, reps: 15, restSeconds: 30 },
      { exerciseId: 'plank', name: 'Core Plank', sets: 3, reps: 90, restSeconds: 30 },
    ],
  },

  // ── 2. FULL BODY EXPANDED PLANS ──────────────────────────────────────────
  {
    id: 'full_body_starter_15',
    workoutId: 'full_body_starter_15',
    planId: 'full_body_starter_15',
    title: '15-Min Foundation Full Body',
    difficulty: 'beginner',
    estimatedDurationMinutes: 15,
    estimatedDuration: 15,
    recommendationReason: 'Introductory full-body routine emphasizing clean movement posture and steady breathing.',
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', sets: 3, reps: 10, restSeconds: 30 },
      { exerciseId: 'incline_pushup', name: 'Incline Push-ups', sets: 3, reps: 8, restSeconds: 30 },
      { exerciseId: 'glute_bridge', name: 'Floor Glute Bridges', sets: 3, reps: 12, restSeconds: 25 },
      { exerciseId: 'dead_bug', name: 'Dead Bug Holds', sets: 2, reps: 10, restSeconds: 25 },
    ],
  },
  {
    id: 'full_body_power_35',
    workoutId: 'full_body_power_35',
    planId: 'full_body_power_35',
    title: '35-Min Total Body Ignition',
    difficulty: 'advanced',
    estimatedDurationMinutes: 35,
    estimatedDuration: 35,
    recommendationReason: 'Demanding full-body circuit combining explosive jumps, chest presses, and core resistance.',
    exercises: [
      { exerciseId: 'jump_squats', name: 'Explosive Jump Squats', sets: 4, reps: 12, restSeconds: 40 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', sets: 4, reps: 16, restSeconds: 35 },
      { exerciseId: 'burpees', name: 'Athletic Burpees', sets: 3, reps: 10, restSeconds: 45 },
      { exerciseId: 'bent_over_row', name: 'Bent-Over Rows', sets: 4, reps: 12, restSeconds: 30 },
      { exerciseId: 'bicycle_crunches', name: 'Bicycle Crunches', sets: 3, reps: 20, restSeconds: 30 },
    ],
  },

  // ── 3. UPPER BODY EXPANDED PLANS ─────────────────────────────────────────
  {
    id: 'upper_body_sculpt_20',
    workoutId: 'upper_body_sculpt_20',
    planId: 'upper_body_sculpt_20',
    title: '20-Min Upper Body Primer',
    difficulty: 'beginner',
    estimatedDurationMinutes: 20,
    estimatedDuration: 20,
    recommendationReason: 'Targeted upper body routine building chest, shoulder, and arm strength with low joint impact.',
    exercises: [
      { exerciseId: 'pushup', name: 'Standard Push-ups', sets: 3, reps: 10, restSeconds: 30 },
      { exerciseId: 'bent_over_row', name: 'Bent-Over Rows', sets: 3, reps: 12, restSeconds: 30 },
      { exerciseId: 'lateral_raise', name: 'Dumbbell Lateral Raises', sets: 3, reps: 12, restSeconds: 25 },
      { exerciseId: 'tricep_dips', name: 'Bench Tricep Dips', sets: 3, reps: 10, restSeconds: 30 },
    ],
  },
  {
    id: 'upper_push_pull_30',
    workoutId: 'upper_push_pull_30',
    planId: 'upper_push_pull_30',
    title: '30-Min Chest & Back Hypertrophy',
    difficulty: 'intermediate',
    estimatedDurationMinutes: 30,
    estimatedDuration: 30,
    recommendationReason: 'Antagonist push-pull supersets to maximize posture alignment, back density, and chest volume.',
    exercises: [
      { exerciseId: 'chest_press', name: 'Floor Dumbbell Chest Press', sets: 4, reps: 12, restSeconds: 45 },
      { exerciseId: 'pullup', name: 'Bodyweight Pull-ups', sets: 3, reps: 6, restSeconds: 60 },
      { exerciseId: 'diamond_pushup', name: 'Diamond Push-ups', sets: 3, reps: 10, restSeconds: 40 },
      { exerciseId: 'bicep_curl', name: 'Bicep Curls', sets: 3, reps: 12, restSeconds: 30 },
      { exerciseId: 'tricep_extension', name: 'Overhead Tricep Extension', sets: 3, reps: 12, restSeconds: 30 },
    ],
  },

  // ── 4. LOWER BODY EXPANDED PLANS ─────────────────────────────────────────
  {
    id: 'lower_body_mobility_legs_20',
    workoutId: 'lower_body_mobility_legs_20',
    planId: 'lower_body_mobility_legs_20',
    title: '20-Min Lower Body & Glute Foundation',
    difficulty: 'beginner',
    estimatedDurationMinutes: 20,
    estimatedDuration: 20,
    recommendationReason: 'Joint-friendly quad and glute activation routine protecting knees and improving hip mobility.',
    exercises: [
      { exerciseId: 'squat', name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 30 },
      { exerciseId: 'reverse_lunges', name: 'Reverse Lunges', sets: 3, reps: 10, restSeconds: 30 },
      { exerciseId: 'glute_bridge', name: 'Floor Glute Bridges', sets: 3, reps: 15, restSeconds: 25 },
      { exerciseId: 'calf_raise', name: 'Standing Calf Raises', sets: 3, reps: 20, restSeconds: 20 },
    ],
  },
  {
    id: 'lower_body_power_30',
    workoutId: 'lower_body_power_30',
    planId: 'lower_body_power_30',
    title: '30-Min Leg Drive & Posterior Power',
    difficulty: 'advanced',
    estimatedDurationMinutes: 30,
    estimatedDuration: 30,
    recommendationReason: 'Heavy unilateral leg overload developing sprint acceleration and vertical jump drive.',
    exercises: [
      { exerciseId: 'bulgarian_split_squat', name: 'Bulgarian Split Squats', sets: 4, reps: 10, restSeconds: 45 },
      { exerciseId: 'deadlift_bodyweight', name: 'Single-Leg Romanian Deadlift', sets: 3, reps: 10, restSeconds: 40 },
      { exerciseId: 'squat', name: 'Deep Bodyweight Squats', sets: 4, reps: 15, restSeconds: 35 },
      { exerciseId: 'side_lunge', name: 'Lateral Side Lunges', sets: 3, reps: 12, restSeconds: 30 },
      { exerciseId: 'wall_sit', name: 'Isometric Wall Sit', sets: 3, reps: 45, restSeconds: 30 },
    ],
  },

  // ── 5. STRENGTH & CORE PLANS ─────────────────────────────────────────────
  {
    id: 'core_armor_15',
    workoutId: 'core_armor_15',
    planId: 'core_armor_15',
    title: '15-Min Core Armor & Anti-Rotation',
    difficulty: 'intermediate',
    estimatedDurationMinutes: 15,
    estimatedDuration: 15,
    recommendationReason: 'Bulletproof rotational and anti-extension core routine for collegiate athlete stability.',
    exercises: [
      { exerciseId: 'plank', name: 'Forearm Core Plank', sets: 3, reps: 60, restSeconds: 30 },
      { exerciseId: 'russian_twist', name: 'Seated Russian Twists', sets: 3, reps: 24, restSeconds: 25 },
      { exerciseId: 'leg_raises', name: 'Lying Straight Leg Raises', sets: 3, reps: 12, restSeconds: 30 },
      { exerciseId: 'side_plank', name: 'Lateral Side Plank Hold', sets: 2, reps: 30, restSeconds: 25 },
    ],
  },
  {
    id: 'dorm_strength_40',
    workoutId: 'dorm_strength_40',
    planId: 'dorm_strength_40',
    title: '40-Min High-Volume Bodyweight Strength',
    difficulty: 'advanced',
    estimatedDurationMinutes: 40,
    estimatedDuration: 40,
    recommendationReason: 'High mechanical volume routine taxing major muscle groups to near-failure without weights.',
    exercises: [
      { exerciseId: 'pushup', name: 'Standard Push-ups', sets: 5, reps: 15, restSeconds: 45 },
      { exerciseId: 'squat', name: 'Bodyweight Squats', sets: 5, reps: 20, restSeconds: 40 },
      { exerciseId: 'tricep_dips', name: 'Bench Tricep Dips', sets: 4, reps: 14, restSeconds: 35 },
      { exerciseId: 'lunges', name: 'Forward Walking Lunges', sets: 4, reps: 12, restSeconds: 35 },
      { exerciseId: 'superman_hold', name: 'Superman Hold', sets: 3, reps: 30, restSeconds: 30 },
      { exerciseId: 'plank', name: 'Forearm Core Plank', sets: 3, reps: 75, restSeconds: 30 },
    ],
  },

  // ── 6. ENDURANCE CIRCUITS ────────────────────────────────────────────────
  {
    id: 'athletic_stamina_25',
    workoutId: 'athletic_stamina_25',
    planId: 'athletic_stamina_25',
    title: '25-Min High-Cadence Stamina Circuit',
    difficulty: 'intermediate',
    estimatedDurationMinutes: 25,
    estimatedDuration: 25,
    recommendationReason: 'Cardiovascular muscular endurance circuit utilizing rapid drill transitions.',
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', sets: 4, reps: 35, restSeconds: 20 },
      { exerciseId: 'high_knees', name: 'High Knees Running', sets: 4, reps: 30, restSeconds: 20 },
      { exerciseId: 'mountain_climbers', name: 'Mountain Climbers', sets: 4, reps: 25, restSeconds: 20 },
      { exerciseId: 'squat', name: 'Bodyweight Squats', sets: 4, reps: 15, restSeconds: 25 },
      { exerciseId: 'pushup', name: 'Standard Push-ups', sets: 3, reps: 12, restSeconds: 30 },
    ],
  },

  // ── 7. CARDIO & RUNNING PLANS ────────────────────────────────────────────
  {
    id: 'hiit_cardio_blitz_15',
    workoutId: 'hiit_cardio_blitz_15',
    planId: 'hiit_cardio_blitz_15',
    title: '15-Min HIIT Cardio Blast',
    difficulty: 'intermediate',
    estimatedDurationMinutes: 15,
    estimatedDuration: 15,
    recommendationReason: 'Tabata-style intervals (40s work, 20s recovery) maximizing VO2 max and calorie afterburn.',
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks', sets: 3, reps: 40, restSeconds: 20 },
      { exerciseId: 'high_knees', name: 'High Knees Running', sets: 3, reps: 30, restSeconds: 20 },
      { exerciseId: 'burpees', name: 'Athletic Burpees', sets: 3, reps: 10, restSeconds: 30 },
      { exerciseId: 'mountain_climbers', name: 'Mountain Climbers', sets: 3, reps: 30, restSeconds: 20 },
      { exerciseId: 'skater_jumps', name: 'Lateral Skater Jumps', sets: 3, reps: 20, restSeconds: 20 },
    ],
  },
  {
    id: 'couch_to_5k_jog_25',
    workoutId: 'couch_to_5k_jog_25',
    planId: 'couch_to_5k_jog_25',
    title: '25-Min Aerobic Base Jog & Walk',
    difficulty: 'beginner',
    estimatedDurationMinutes: 25,
    estimatedDuration: 25,
    recommendationReason: 'Alternating 2-minute light jogging and 1-minute brisk walking blocks for aerobic foundation.',
    exercises: [
      { exerciseId: 'brisk_walk', name: 'Brisk Warm-Up Walk', sets: 1, reps: 300, restSeconds: 0 },
      { exerciseId: 'campus_jog', name: 'Steady Campus Jogging', sets: 5, reps: 120, restSeconds: 60 },
      { exerciseId: 'brisk_walk', name: 'Cool-Down Walk', sets: 1, reps: 300, restSeconds: 0 },
    ],
  },
  {
    id: 'outdoor_interval_run_30',
    workoutId: 'outdoor_interval_run_30',
    planId: 'outdoor_interval_run_30',
    title: '30-Min Campus Interval Run',
    difficulty: 'intermediate',
    estimatedDurationMinutes: 30,
    estimatedDuration: 30,
    recommendationReason: 'Outdoor running session combining structured 90-second tempo intervals with jogging recoveries.',
    exercises: [
      { exerciseId: 'campus_jog', name: 'Warm-up Easy Jog', sets: 1, reps: 300, restSeconds: 30 },
      { exerciseId: 'outdoor_run', name: 'Tempo Running Intervals', sets: 6, reps: 90, restSeconds: 60 },
      { exerciseId: 'campus_jog', name: 'Cool-down Flush Jog', sets: 1, reps: 300, restSeconds: 0 },
    ],
  },
  {
    id: 'sprint_conditioning_20',
    workoutId: 'sprint_conditioning_20',
    planId: 'sprint_conditioning_20',
    title: '20-Min Track & Turf Sprint Intervals',
    difficulty: 'advanced',
    estimatedDurationMinutes: 20,
    estimatedDuration: 20,
    recommendationReason: 'Anaerobic power development featuring all-out sprint repeats with full active walking recoveries.',
    exercises: [
      { exerciseId: 'high_knees', name: 'Dynamic High Knees Warm-up', sets: 2, reps: 30, restSeconds: 30 },
      { exerciseId: 'butt_kicks', name: 'Butt Kicks Cadence Drill', sets: 2, reps: 30, restSeconds: 30 },
      { exerciseId: 'sprint_intervals', name: 'All-Out 30s Sprints', sets: 8, reps: 30, restSeconds: 75 },
      { exerciseId: 'brisk_walk', name: 'Recovery Walk', sets: 1, reps: 300, restSeconds: 0 },
    ],
  },

  // ── 8. MOBILITY & RECOVERY PLANS ─────────────────────────────────────────
  {
    id: 'mobility_recovery_15',
    workoutId: 'mobility_recovery_15',
    planId: 'mobility_recovery_15',
    title: '15-Min Post-Training Reset & Hip Flow',
    difficulty: 'beginner',
    estimatedDurationMinutes: 15,
    estimatedDuration: 15,
    recommendationReason: 'Essential post-game and study-break flow relieving hip flexor tension and lumbar stiffness.',
    exercises: [
      { exerciseId: 'worlds_greatest_stretch', name: "World's Greatest Stretch", sets: 2, reps: 6, restSeconds: 15 },
      { exerciseId: 'cat_cow', name: 'Cat-Cow Spinal Waves', sets: 3, reps: 10, restSeconds: 15 },
      { exerciseId: 'hip_flexor_stretch', name: 'Half-Kneeling Hip Flexor Stretch', sets: 2, reps: 40, restSeconds: 15 },
      { exerciseId: 'downward_dog', name: 'Downward Dog to Cobra Flow', sets: 2, reps: 8, restSeconds: 15 },
    ],
  },
  {
    id: 'thoracic_shoulder_mobility_20',
    workoutId: 'thoracic_shoulder_mobility_20',
    planId: 'thoracic_shoulder_mobility_20',
    title: '20-Min Thoracic & Shoulder Unlock',
    difficulty: 'intermediate',
    estimatedDurationMinutes: 20,
    estimatedDuration: 20,
    recommendationReason: 'Restores scapular rhythm, thoracic spine rotation, and overhead reach for throwing and court athletes.',
    exercises: [
      { exerciseId: 'thoracic_rotation', name: 'Side-Lying Thoracic Windmills', sets: 3, reps: 8, restSeconds: 20 },
      { exerciseId: 'superman_hold', name: 'Prone Scapular Superman Hold', sets: 3, reps: 30, restSeconds: 25 },
      { exerciseId: 'cat_cow', name: 'Cat-Cow Spinal Waves', sets: 3, reps: 10, restSeconds: 15 },
      { exerciseId: 'bird_dog', name: 'Bird Dog Stability', sets: 3, reps: 10, restSeconds: 20 },
    ],
  },

  // ── 9. SPORT-FOCUSED WORKOUTS ────────────────────────────────────────────
  {
    id: 'basketball_agility_circuit_25',
    workoutId: 'basketball_agility_circuit_25',
    planId: 'basketball_agility_circuit_25',
    title: '25-Min Court Agility & Vertical Power',
    difficulty: 'intermediate',
    estimatedDurationMinutes: 25,
    estimatedDuration: 25,
    recommendationReason: 'Sport-specific conditioning targeting rapid lateral cuts, defensive slides, and vertical elevation.',
    exercises: [
      { exerciseId: 'jump_squats', name: 'Explosive Jump Squats', sets: 3, reps: 12, restSeconds: 40 },
      { exerciseId: 'side_lunge', name: 'Lateral Side Lunges', sets: 3, reps: 12, restSeconds: 30 },
      { exerciseId: 'high_knees', name: 'High Knees Sprint Drill', sets: 3, reps: 30, restSeconds: 25 },
      { exerciseId: 'calf_raise', name: 'Standing Calf Raises', sets: 3, reps: 20, restSeconds: 20 },
      { exerciseId: 'plank', name: 'Forearm Core Plank', sets: 3, reps: 45, restSeconds: 30 },
    ],
  },
  {
    id: 'badminton_quickstep_20',
    workoutId: 'badminton_quickstep_20',
    planId: 'badminton_quickstep_20',
    title: '20-Min Racquet Quick-Step & Reaction',
    difficulty: 'intermediate',
    estimatedDurationMinutes: 20,
    estimatedDuration: 20,
    recommendationReason: 'Fast-twitch deceleration and lunging circuit tailored for quick change-of-direction on court.',
    exercises: [
      { exerciseId: 'jumping_jacks', name: 'Jumping Jacks Warm-up', sets: 2, reps: 30, restSeconds: 20 },
      { exerciseId: 'reverse_lunges', name: 'Reverse Lunges', sets: 3, reps: 12, restSeconds: 30 },
      { exerciseId: 'skater_jumps', name: 'Lateral Skater Jumps', sets: 3, reps: 16, restSeconds: 30 },
      { exerciseId: 'jump_rope', name: 'Jump Rope Calisthenics', sets: 3, reps: 45, restSeconds: 20 },
    ],
  },
];

/**
 * Master Movement Catalog
 * Categorized strictly:
 * - Genuine camera-supported: ONLY squat, pushup, jumping_jacks (aiSupported: true)
 * - Non-camera drills: all other drills (aiSupported: false)
 */
export const DEFAULT_EXERCISES: Exercise[] = [
  // ── A. CAMERA-SUPPORTED MOVEMENTS (MEDIA PIPE FSM VERIFIED) ──────────────
  {
    id: 'squat',
    exerciseId: 'squat',
    name: 'Bodyweight Squats',
    category: 'Legs',
    difficulty: 'beginner',
    description: 'Fundamental lower-body compound movement training quads, glutes, and core stability.',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    icon: '🏋️',
    aiSupported: true,
    instructions: [
      'Stand with feet shoulder-width apart, toes pointing slightly outwards.',
      'Hinge hips backwards and bend knees as if sitting into a chair.',
      'Descend until thighs are parallel to the floor, maintaining an upright chest.',
      'Drive upwards through your heels back to the starting stand.'
    ],
  },
  {
    id: 'pushup',
    exerciseId: 'pushup',
    name: 'Standard Push-ups',
    category: 'Chest',
    difficulty: 'intermediate',
    description: 'Classic horizontal pushing bodyweight exercise targeting chest, triceps, and anterior delts.',
    targetMuscles: ['Chest', 'Triceps', 'Anterior Deltoids', 'Core'],
    icon: '💪',
    aiSupported: true,
    instructions: [
      'Begin in a high plank position with hands slightly wider than shoulder-width.',
      'Engage glutes and core to keep body in a rigid straight line.',
      'Lower chest until elbows bend to approximately 90 degrees.',
      'Firmly press the ground away and lock out at the top.'
    ],
  },
  {
    id: 'jumping_jacks',
    exerciseId: 'jumping_jacks',
    name: 'Jumping Jacks',
    category: 'Cardio',
    difficulty: 'beginner',
    description: 'Full-body cardiovascular calisthenic movement improving aerobic capacity and coordination.',
    targetMuscles: ['Cardiovascular', 'Calves', 'Deltoids', 'Glutes'],
    icon: '⚡',
    aiSupported: true,
    instructions: [
      'Stand upright with feet together and arms at your sides.',
      'Jump lightly into the air, spreading feet wide while clapping arms overhead.',
      'Jump back to the initial starting posture in a smooth, springy rhythm.'
    ],
  },

  // ── B. CHEST DRILLS (GUIDED / MANUAL) ────────────────────────────────────
  {
    id: 'wide_pushup',
    exerciseId: 'wide_pushup',
    name: 'Wide-Grip Push-ups',
    category: 'Chest',
    difficulty: 'intermediate',
    description: 'Push-up variation with wider hand placement maximizing horizontal pectoral recruitment.',
    targetMuscles: ['Pectoralis Major', 'Anterior Deltoids', 'Core'],
    icon: '💪',
    aiSupported: false,
    instructions: [
      'Place hands 1.5 times shoulder-width apart in plank position.',
      'Lower chest smoothly towards the ground while maintaining core tension.',
      'Press through palms to return to full extension.'
    ],
  },
  {
    id: 'diamond_pushup',
    exerciseId: 'diamond_pushup',
    name: 'Diamond Push-ups',
    category: 'Chest',
    difficulty: 'advanced',
    description: 'Close-hand pushup isolating inner chest fibers and overloading tricep extension.',
    targetMuscles: ['Inner Chest', 'Triceps Brachii', 'Core'],
    icon: '💎',
    aiSupported: false,
    instructions: [
      'Position hands close together directly beneath chest, thumbs and index fingers touching in diamond shape.',
      'Keep elbows tucked close to sides as you descend.',
      'Press firmly upwards to complete lockout.'
    ],
  },
  {
    id: 'incline_pushup',
    exerciseId: 'incline_pushup',
    name: 'Incline Push-ups',
    category: 'Chest',
    difficulty: 'beginner',
    description: 'Regressed push-up on a bench or elevated surface reducing load for beginners.',
    targetMuscles: ['Lower Chest', 'Triceps', 'Shoulders'],
    icon: '📐',
    aiSupported: false,
    instructions: [
      'Place hands shoulder-width on a secure bench, desk, or elevated platform.',
      'Maintain straight spine from head to heels.',
      'Lower chest to edge of surface, then press back up.'
    ],
  },
  {
    id: 'chest_press',
    exerciseId: 'chest_press',
    name: 'Floor Dumbbell Chest Press',
    category: 'Chest',
    difficulty: 'intermediate',
    description: 'Shoulder-safe horizontal dumbbell press building chest and tricep power.',
    targetMuscles: ['Pectoralis Major', 'Triceps', 'Anterior Deltoids'],
    icon: '🏋️',
    aiSupported: false,
    instructions: [
      'Lie flat on back with knees bent and dumbbells held above chest.',
      'Lower weights until upper arms lightly touch the floor at 45-degree angle.',
      'Press dumbbells back up smoothly.'
    ],
  },
  {
    id: 'chest_dips',
    exerciseId: 'chest_dips',
    name: 'Parallel Bar / Chair Dips',
    category: 'Chest',
    difficulty: 'advanced',
    description: 'Compound pushing exercise overloading lower pectorals and anterior deltoids.',
    targetMuscles: ['Lower Chest', 'Triceps', 'Anterior Deltoids'],
    icon: '⚡',
    aiSupported: false,
    instructions: [
      'Grip sturdy dip bars or parallel surfaces, leaning torso slightly forward.',
      'Lower body until elbows reach 90 degrees.',
      'Drive through palms to return to locked out extension.'
    ],
  },

  // ── C. BACK DRILLS (GUIDED / MANUAL) ─────────────────────────────────────
  {
    id: 'pullup',
    exerciseId: 'pullup',
    name: 'Bodyweight Pull-ups',
    category: 'Back',
    difficulty: 'advanced',
    description: 'King of upper-body pulling exercises developing lat width, rhomboids, and biceps.',
    targetMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Biceps', 'Forearms'],
    icon: '🧗',
    aiSupported: false,
    instructions: [
      'Grip pull-up bar with overhand grip slightly wider than shoulders.',
      'Pull elbows down toward ribs until chin clears the bar.',
      'Lower with control back to a full dead hang.'
    ],
  },
  {
    id: 'bent_over_row',
    exerciseId: 'bent_over_row',
    name: 'Bent-Over Dumbbell Rows',
    category: 'Back',
    difficulty: 'intermediate',
    description: 'Horizontal pulling movement building latissimus dorsi, middle traps, and spinal erectors.',
    targetMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Middle Traps', 'Biceps'],
    icon: '🚣',
    aiSupported: false,
    instructions: [
      'Hinge hips back with knees softly bent and torso at 45-degree angle.',
      'Drive elbows past ribs, squeezing shoulder blades tightly at top.',
      'Lower weights steadily with neutral spine.'
    ],
  },
  {
    id: 'superman_hold',
    exerciseId: 'superman_hold',
    name: 'Prone Superman Hold',
    category: 'Back',
    difficulty: 'beginner',
    description: 'Posterior chain isometric movement strengthening spinal erectors and glutes.',
    targetMuscles: ['Lower Back', 'Spinal Erectors', 'Glutes', 'Rear Delts'],
    icon: '🦸',
    aiSupported: false,
    instructions: [
      'Lie face down on the floor with arms extended overhead.',
      'Simultaneously lift chest, arms, and thighs 3-4 inches off the floor.',
      'Hold the contraction firmly while breathing steadily.'
    ],
  },
  {
    id: 'doorway_row',
    exerciseId: 'doorway_row',
    name: 'Doorway / Towel Bodyweight Rows',
    category: 'Back',
    difficulty: 'beginner',
    description: 'Dorm-friendly horizontal pulling movement targeting rhomboids and upper lats.',
    targetMuscles: ['Rhomboids', 'Lats', 'Rear Deltoids', 'Biceps'],
    icon: '🚪',
    aiSupported: false,
    instructions: [
      'Grip the frame of an open door or wrap a towel securely around a door handle.',
      'Lean back with arms straight and heels planted.',
      'Pull your chest towards the frame, squeezing shoulder blades together.'
    ],
  },
  {
    id: 'deadlift_bodyweight',
    exerciseId: 'deadlift_bodyweight',
    name: 'Single-Leg Romanian Deadlift',
    category: 'Back',
    difficulty: 'advanced',
    description: 'Unilateral hip hinge movement training hamstring flexibility, glute strength, and balance.',
    targetMuscles: ['Hamstrings', 'Gluteus Maximus', 'Spinal Erectors', 'Core'],
    icon: '⚖️',
    aiSupported: false,
    instructions: [
      'Stand on one leg with a soft knee bend.',
      'Hinge at hips, extending non-supporting leg straight back behind you.',
      'Descend until torso is nearly parallel with floor with flat back.',
      'Squeeze glutes to return to standing.'
    ],
  },

  // ── D. SHOULDERS (GUIDED / MANUAL) ───────────────────────────────────────
  {
    id: 'shoulder_press',
    exerciseId: 'shoulder_press',
    name: 'Overhead Shoulder Press',
    category: 'Shoulders',
    difficulty: 'intermediate',
    description: 'Vertical pushing movement building anterior and medial deltoid strength.',
    targetMuscles: ['Anterior Deltoids', 'Lateral Deltoids', 'Triceps'],
    icon: '🏋️',
    aiSupported: false,
    instructions: [
      'Hold dumbbells at shoulder height with palms facing forward.',
      'Press weights overhead in a slight inward arc until arms are locked.',
      'Lower under control back to ear level.'
    ],
  },
  {
    id: 'pike_pushup',
    exerciseId: 'pike_pushup',
    name: 'Pike Push-ups',
    category: 'Shoulders',
    difficulty: 'intermediate',
    description: 'Bodyweight overhead pressing progression targeting anterior and lateral deltoids.',
    targetMuscles: ['Anterior Deltoids', 'Triceps', 'Upper Chest'],
    icon: '📐',
    aiSupported: false,
    instructions: [
      'From a pushup position, walk feet toward hands until body forms an inverted V shape.',
      'Bend elbows to lower top of head towards floor between hands.',
      'Press firmly back up through shoulders to starting pike.'
    ],
  },
  {
    id: 'lateral_raise',
    exerciseId: 'lateral_raise',
    name: 'Dumbbell Lateral Raises',
    category: 'Shoulders',
    difficulty: 'beginner',
    description: 'Isolation shoulder abduction movement building width and capped side deltoids.',
    targetMuscles: ['Lateral Deltoids', 'Trapezius'],
    icon: '🦅',
    aiSupported: false,
    instructions: [
      'Stand tall with dumbbells resting at your sides.',
      'Raise weights out to sides until arms are parallel to the floor.',
      'Lower smoothly without swinging hips.'
    ],
  },
  {
    id: 'front_raise',
    exerciseId: 'front_raise',
    name: 'Front Deltoid Raises',
    category: 'Shoulders',
    difficulty: 'beginner',
    description: 'Targeted anterior deltoid flexion building front shoulder definition.',
    targetMuscles: ['Anterior Deltoids', 'Upper Chest'],
    icon: '🎯',
    aiSupported: false,
    instructions: [
      'Hold dumbbells against front of thighs.',
      'Raise arms straight forward up to eye level.',
      'Lower back down under strict muscular control.'
    ],
  },

  // ── E. ARMS (GUIDED / MANUAL) ────────────────────────────────────────────
  {
    id: 'bicep_curl',
    exerciseId: 'bicep_curl',
    name: 'Bicep Curls',
    category: 'Arms',
    difficulty: 'beginner',
    description: 'Isolation elbow flexion movement building biceps brachii peak and grip strength.',
    targetMuscles: ['Biceps Brachii', 'Brachialis', 'Forearms'],
    icon: '💪',
    aiSupported: false,
    instructions: [
      'Stand with weights at sides, palms facing forward.',
      'Keep elbows stationary beside ribs and curl weights upward.',
      'Contract biceps firmly at peak, then lower slowly.'
    ],
  },
  {
    id: 'hammer_curl',
    exerciseId: 'hammer_curl',
    name: 'Neutral Grip Hammer Curls',
    category: 'Arms',
    difficulty: 'beginner',
    description: 'Hammer grip bicep variation targeting brachialis and brachioradialis for forearm thickness.',
    targetMuscles: ['Brachialis', 'Brachioradialis', 'Biceps'],
    icon: '🔨',
    aiSupported: false,
    instructions: [
      'Hold dumbbells with palms facing each other throughout the lift.',
      'Curl weights upward without swinging torso.',
      'Lower with steady resistance.'
    ],
  },
  {
    id: 'chin_up',
    exerciseId: 'chin_up',
    name: 'Underhand Chin-ups',
    category: 'Arms',
    difficulty: 'advanced',
    description: 'Compound pulling exercise with underhand supinated grip emphasizing bicep overload.',
    targetMuscles: ['Biceps Brachii', 'Latissimus Dorsi', 'Forearms'],
    icon: '🧗',
    aiSupported: false,
    instructions: [
      'Grip bar with palms facing toward you at shoulder width.',
      'Pull chest up until chin clears the bar.',
      'Lower smoothly to a full arm extension.'
    ],
  },
  {
    id: 'tricep_dips',
    exerciseId: 'tricep_dips',
    name: 'Bench Tricep Dips',
    category: 'Arms',
    difficulty: 'beginner',
    description: 'Bodyweight pushing movement targeting triceps using a chair or bench.',
    targetMuscles: ['Triceps Brachii', 'Anterior Deltoids', 'Chest'],
    icon: '🪑',
    aiSupported: false,
    instructions: [
      'Sit on edge of a stable bench or chair with hands next to hips.',
      'Slide hips off edge and lower torso by bending elbows to 90 degrees.',
      'Press through palms to return to top lockout.'
    ],
  },
  {
    id: 'tricep_extension',
    exerciseId: 'tricep_extension',
    name: 'Overhead Tricep Extension',
    category: 'Arms',
    difficulty: 'intermediate',
    description: 'Elbow extension movement placing maximum stretch on the triceps long head.',
    targetMuscles: ['Triceps Brachii (Long Head)'],
    icon: '🏋️',
    aiSupported: false,
    instructions: [
      'Hold dumbbell overhead with both hands, arms extended.',
      'Lower weight behind head while keeping elbows pointing forward.',
      'Contract triceps to extend arms back to overhead lockout.'
    ],
  },
  {
    id: 'tricep_kickback',
    exerciseId: 'tricep_kickback',
    name: 'Bent-Over Tricep Kickbacks',
    category: 'Arms',
    difficulty: 'beginner',
    description: 'Peak contraction isolation movement for lateral and medial triceps heads.',
    targetMuscles: ['Triceps Brachii (Lateral/Medial Heads)'],
    icon: '⚡',
    aiSupported: false,
    instructions: [
      'Hinge at hips with flat back, bringing upper arm parallel to torso.',
      'Extend forearm straight back until arm is fully extended.',
      'Squeeze tricep for 1 second, then return to 90 degrees.'
    ],
  },
  {
    id: 'close_grip_pushup',
    exerciseId: 'close_grip_pushup',
    name: 'Close-Grip Tricep Push-ups',
    category: 'Arms',
    difficulty: 'intermediate',
    description: 'Push-up variation with narrow hand placement shifting primary load to triceps.',
    targetMuscles: ['Triceps Brachii', 'Anterior Deltoids', 'Inner Chest'],
    icon: '💪',
    aiSupported: false,
    instructions: [
      'Place hands directly underneath shoulders in high plank position.',
      'Lower chest while grazing elbows against ribcage.',
      'Drive through palms to return to full extension.'
    ],
  },

  // ── F. CORE (GUIDED / MANUAL) ────────────────────────────────────────────
  {
    id: 'plank',
    exerciseId: 'plank',
    name: 'Forearm Core Plank',
    category: 'Core',
    difficulty: 'beginner',
    description: 'Isometric anti-extension core hold strengthening transverse abdominis and lower back.',
    targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis', 'Glutes'],
    icon: '🧱',
    aiSupported: false,
    instructions: [
      'Plant forearms on the floor with elbows aligned directly beneath shoulders.',
      'Keep body in a rigid straight line from crown of head to heels.',
      'Brace core tightly and squeeze glutes without letting hips sag or pike.'
    ],
  },
  {
    id: 'side_plank',
    exerciseId: 'side_plank',
    name: 'Lateral Side Plank Hold',
    category: 'Core',
    difficulty: 'intermediate',
    description: 'Isometric anti-lateral flexion exercise building obliques and quadratus lumborum.',
    targetMuscles: ['Obliques', 'Transverse Abdominis', 'Gluteus Medius'],
    icon: '📐',
    aiSupported: false,
    instructions: [
      'Lie on side with elbow directly beneath shoulder and feet stacked.',
      'Lift hips until body forms a straight diagonal line from head to heels.',
      'Hold position while breathing steadily.'
    ],
  },
  {
    id: 'russian_twist',
    exerciseId: 'russian_twist',
    name: 'Seated Russian Twists',
    category: 'Core',
    difficulty: 'beginner',
    description: 'Rotational core endurance movement developing rotational power and oblique strength.',
    targetMuscles: ['Internal Obliques', 'External Obliques', 'Rectus Abdominis'],
    icon: '🔄',
    aiSupported: false,
    instructions: [
      'Sit on floor with knees bent and feet elevated slightly.',
      'Lean back at a 45-degree angle, balancing on sit bones.',
      'Rotate torso from side to side, lightly touching floor beside hips.'
    ],
  },
  {
    id: 'leg_raises',
    exerciseId: 'leg_raises',
    name: 'Lying Straight Leg Raises',
    category: 'Core',
    difficulty: 'intermediate',
    description: 'Lower abdominal anti-extension movement challenging hip flexors and core bracing.',
    targetMuscles: ['Lower Rectus Abdominis', 'Hip Flexors'],
    icon: '⬆️',
    aiSupported: false,
    instructions: [
      'Lie flat on back with hands underneath glutes for lumbar support.',
      'Raise straight legs together up to 90 degrees.',
      'Lower legs under control until just above the floor without arching back.'
    ],
  },
  {
    id: 'bicycle_crunches',
    exerciseId: 'bicycle_crunches',
    name: 'Alternating Bicycle Crunches',
    category: 'Core',
    difficulty: 'intermediate',
    description: 'Dynamic rotational movement engaging upper and lower abdominals simultaneously.',
    targetMuscles: ['Obliques', 'Rectus Abdominis', 'Hip Flexors'],
    icon: '🚴',
    aiSupported: false,
    instructions: [
      'Lie on back with fingertips behind ears and knees at 90 degrees.',
      'Rotate torso to bring right elbow to left knee while extending right leg.',
      'Alternate sides smoothly in continuous cycling motion.'
    ],
  },
  {
    id: 'situps',
    exerciseId: 'situps',
    name: 'Full Sit-ups',
    category: 'Core',
    difficulty: 'beginner',
    description: 'Full-range spinal flexion drill strengthening rectus abdominis and hip flexors.',
    targetMuscles: ['Rectus Abdominis', 'Hip Flexors'],
    icon: '🧘',
    aiSupported: false,
    instructions: [
      'Lie on back with knees bent and feet planted flat.',
      'Flex abdominals to raise torso until chest reaches knees.',
      'Lower torso back down under controlled deceleration.'
    ],
  },
  {
    id: 'crunches',
    exerciseId: 'crunches',
    name: 'Abdominal Crunches',
    category: 'Core',
    difficulty: 'beginner',
    description: 'Targeted upper abdominal isolation movement minimizing hip flexor recruitment.',
    targetMuscles: ['Upper Rectus Abdominis'],
    icon: '⚡',
    aiSupported: false,
    instructions: [
      'Lie on back with knees bent and feet flat on floor.',
      'Curl shoulder blades off floor while pulling ribs towards pelvis.',
      'Pause briefly at peak contraction, then lower shoulder blades.'
    ],
  },
  {
    id: 'dead_bug',
    exerciseId: 'dead_bug',
    name: 'Dead Bug Anti-Extension Hold',
    category: 'Core',
    difficulty: 'beginner',
    description: 'Deep core stability drill teaching pelvis and ribcage alignment without spinal stress.',
    targetMuscles: ['Transverse Abdominis', 'Lower Back', 'Hip Flexors'],
    icon: '🐞',
    aiSupported: false,
    instructions: [
      'Lie on back with arms straight up and knees bent at 90 degrees.',
      'Slowly extend opposite arm and leg away while keeping lower back pinned to floor.',
      'Return to center and switch sides.'
    ],
  },
  {
    id: 'hollow_body_hold',
    exerciseId: 'hollow_body_hold',
    name: 'Gymnastic Hollow Body Hold',
    category: 'Core',
    difficulty: 'advanced',
    description: 'Elite gymnastic isometric position maximizing total anterior core compression.',
    targetMuscles: ['Full Abdominal Wall', 'Hip Flexors', 'Serratus'],
    icon: '🍌',
    aiSupported: false,
    instructions: [
      'Lie supine and press lower back completely flat against floor.',
      'Extend arms overhead and legs straight, hovering both 6 inches off ground.',
      'Hold banana-shaped curvature while maintaining continuous abdominal tension.'
    ],
  },
  {
    id: 'bird_dog',
    exerciseId: 'bird_dog',
    name: 'Bird Dog Stability',
    category: 'Core',
    difficulty: 'beginner',
    description: 'Quadrupedal core and lumbar stabilization drill promoting spinal health.',
    targetMuscles: ['Spinal Erectors', 'Glutes', 'Deltoids', 'Core'],
    icon: '🐕',
    aiSupported: false,
    instructions: [
      'Start on hands and knees with wrists under shoulders and knees under hips.',
      'Extend right arm forward and left leg backward until parallel to floor.',
      'Hold for 2 seconds, return smoothly, and alternate sides.'
    ],
  },

  // ── G. LEGS (GUIDED / MANUAL) ────────────────────────────────────────────
  {
    id: 'lunges',
    exerciseId: 'lunges',
    name: 'Forward Walking Lunges',
    category: 'Legs',
    difficulty: 'intermediate',
    description: 'Unilateral lower-body exercise developing single-leg stability, quadriceps, and glutes.',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Calves'],
    icon: '🚶',
    aiSupported: false,
    instructions: [
      'Step forward with right leg, lowering hips until both knees form 90-degree angles.',
      'Keep torso upright and front knee stacked over ankle.',
      'Push through front heel to step forward into next lunge.'
    ],
  },
  {
    id: 'reverse_lunges',
    exerciseId: 'reverse_lunges',
    name: 'Reverse Lunges',
    category: 'Legs',
    difficulty: 'beginner',
    description: 'Knee-friendly unilateral lunge emphasizing glute and hamstring deceleration.',
    targetMuscles: ['Glutes', 'Hamstrings', 'Quadriceps'],
    icon: '🔙',
    aiSupported: false,
    instructions: [
      'Step backwards with one leg and lower rear knee until just above floor.',
      'Drive through front heel to return to standing upright.'
    ],
  },
  {
    id: 'bulgarian_split_squat',
    exerciseId: 'bulgarian_split_squat',
    name: 'Bulgarian Split Squats',
    category: 'Legs',
    difficulty: 'advanced',
    description: 'Rear-foot elevated single-leg squat challenging quad power, glute drive, and balance.',
    targetMuscles: ['Quadriceps', 'Gluteus Maximus', 'Hamstrings'],
    icon: '🦵',
    aiSupported: false,
    instructions: [
      'Rest top of rear foot on a bench or chair behind you.',
      'Lower hips until front thigh is parallel to floor.',
      'Drive through front heel to return to standing.'
    ],
  },
  {
    id: 'side_lunge',
    exerciseId: 'side_lunge',
    name: 'Lateral Side Lunges',
    category: 'Legs',
    difficulty: 'intermediate',
    description: 'Frontal-plane lower body movement training adductors, abductors, and lateral athleticism.',
    targetMuscles: ['Gluteus Medius', 'Quadriceps', 'Adductors'],
    icon: '↔️',
    aiSupported: false,
    instructions: [
      'Take a wide step to side, hinging hips back and bending knee while keeping other leg straight.',
      'Keep both feet flat on floor.',
      'Push off bent leg to return to standing.'
    ],
  },
  {
    id: 'jump_squats',
    exerciseId: 'jump_squats',
    name: 'Explosive Jump Squats',
    category: 'Legs',
    difficulty: 'intermediate',
    description: 'Plyometric power drill converting leg strength into explosive vertical force.',
    targetMuscles: ['Quadriceps', 'Glutes', 'Calves'],
    icon: '🚀',
    aiSupported: false,
    instructions: [
      'Lower into standard squat depth.',
      'Explode upwards through balls of feet, jumping as high as possible.',
      'Land softly with bent knees and absorb impact immediately into next rep.'
    ],
  },
  {
    id: 'glute_bridge',
    exerciseId: 'glute_bridge',
    name: 'Floor Glute Bridges',
    category: 'Legs',
    difficulty: 'beginner',
    description: 'Posterior chain isolation movement building glutes and lower back endurance.',
    targetMuscles: ['Gluteus Maximus', 'Hamstrings', 'Lower Back'],
    icon: '🍑',
    aiSupported: false,
    instructions: [
      'Lie on back with knees bent and feet flat on floor hip-width apart.',
      'Press through heels to raise hips towards ceiling until thighs and torso align.',
      'Squeeze glutes at peak for 1 second, then lower slowly.'
    ],
  },
  {
    id: 'calf_raise',
    exerciseId: 'calf_raise',
    name: 'Standing Calf Raises',
    category: 'Legs',
    difficulty: 'beginner',
    description: 'Ankle plantarflexion exercise developing gastrocnemius and soleus power.',
    targetMuscles: ['Gastrocnemius', 'Soleus', 'Achilles Tendon'],
    icon: '🩰',
    aiSupported: false,
    instructions: [
      'Stand upright with feet hip-width apart.',
      'Press through balls of feet to elevate heels as high as possible.',
      'Hold peak contraction briefly, then lower slowly.'
    ],
  },
  {
    id: 'wall_sit',
    exerciseId: 'wall_sit',
    name: 'Isometric Wall Sit',
    category: 'Legs',
    difficulty: 'intermediate',
    description: 'Quadriceps isometric hold strengthening knee tendon resilience and mental grit.',
    targetMuscles: ['Quadriceps', 'Glutes', 'Calves'],
    icon: '🧱',
    aiSupported: false,
    instructions: [
      'Slide back down a wall until thighs are parallel to floor with knees at 90 degrees.',
      'Keep back flat against wall and arms resting at sides.',
      'Hold position while maintaining steady, calm breathing.'
    ],
  },

  // ── H. FULL BODY (GUIDED / MANUAL) ───────────────────────────────────────
  {
    id: 'burpees',
    exerciseId: 'burpees',
    name: 'Athletic Burpees',
    category: 'Full Body',
    difficulty: 'intermediate',
    description: 'Total body calisthenic combining squat, kick-out plank, pushup, and jump.',
    targetMuscles: ['Full Body', 'Cardiovascular', 'Chest', 'Quadriceps'],
    icon: '💥',
    aiSupported: false,
    instructions: [
      'From standing, drop hands to floor and kick feet back into a high plank.',
      'Perform a controlled push-up (optional or standard).',
      'Jump feet forward outside hands, then explode upward into a vertical jump with hands overhead.'
    ],
  },
  {
    id: 'bear_crawl',
    exerciseId: 'bear_crawl',
    name: 'Quadrupedal Bear Crawls',
    category: 'Full Body',
    difficulty: 'intermediate',
    description: 'Multi-planar locomotion movement enhancing shoulder stability, core bracing, and coordination.',
    targetMuscles: ['Core', 'Shoulders', 'Quadriceps', 'Wrist Extensors'],
    icon: '🐻',
    aiSupported: false,
    instructions: [
      'Start on all fours with knees hovering 2 inches off ground.',
      'Crawl forward by moving opposite hand and foot in synchronization.',
      'Keep back flat and hips level throughout movement.'
    ],
  },

  // ── I. CARDIO & RUNNING / CONDITIONING ───────────────────────────────────
  {
    id: 'outdoor_run',
    exerciseId: 'outdoor_run',
    name: 'Outdoor Distance Running',
    category: 'Running & Cardio',
    difficulty: 'intermediate',
    description: 'Continuous aerobic running developing VO2 max, cardiovascular capacity, and mental endurance.',
    targetMuscles: ['Cardiovascular System', 'Calves', 'Quadriceps', 'Hamstrings'],
    icon: '🏃',
    aiSupported: false,
    instructions: [
      'Maintain an upright posture with a slight forward lean from the ankles.',
      'Land with midfoot underneath your hips at a cadence of ~160-180 steps per minute.',
      'Keep shoulders relaxed and breathe rhythmically.'
    ],
  },
  {
    id: 'campus_jog',
    exerciseId: 'campus_jog',
    name: 'Campus Recovery Jogging',
    category: 'Running & Cardio',
    difficulty: 'beginner',
    description: 'Easy conversational-pace jogging promoting recovery, blood flow, and base aerobic capacity.',
    targetMuscles: ['Cardiovascular', 'Calves', 'Glutes'],
    icon: '👟',
    aiSupported: false,
    instructions: [
      'Jog at an easy conversational pace where you can comfortably speak full sentences.',
      'Keep arms swinging gently at 90-degree angles.',
      'Focus on relaxed, consistent breathing.'
    ],
  },
  {
    id: 'sprint_intervals',
    exerciseId: 'sprint_intervals',
    name: 'Track & Turf Sprint Intervals',
    category: 'Running & Cardio',
    difficulty: 'advanced',
    description: 'Maximum velocity sprinting drills training phosphagen and glycolytic energy systems.',
    targetMuscles: ['Hamstrings', 'Glutes', 'Hip Flexors', 'Calves'],
    icon: '⚡',
    aiSupported: false,
    instructions: [
      'Accelerate with aggressive forward body lean and powerful arm drive.',
      'Transition to upright sprinting posture at top speed with high knee drive.',
      'Decelerate gradually and walk back for full recovery.'
    ],
  },
  {
    id: 'brisk_walk',
    exerciseId: 'brisk_walk',
    name: 'Brisk Power Walking',
    category: 'Running & Cardio',
    difficulty: 'beginner',
    description: 'Low-impact cardiovascular conditioning for warm-ups, cool-downs, and recovery days.',
    targetMuscles: ['Cardiovascular', 'Calves', 'Shins'],
    icon: '🚶',
    aiSupported: false,
    instructions: [
      'Walk at an energetic, brisk pace faster than a stroll.',
      'Engage core and pump arms rhythmically with each step.',
      'Maintain tall posture with gaze forward.'
    ],
  },
  {
    id: 'high_knees',
    exerciseId: 'high_knees',
    name: 'High Knees Running',
    category: 'Running & Cardio',
    difficulty: 'intermediate',
    description: 'Dynamic in-place running drill driving hip flexion, rapid cadence, and cardiovascular output.',
    targetMuscles: ['Hip Flexors', 'Quadriceps', 'Cardiovascular', 'Calves'],
    icon: '🏃',
    aiSupported: false,
    instructions: [
      'Run in place with aggressive cadence and upright posture.',
      'Drive knees upward until thighs reach parallel to ground.',
      'Pump arms rhythmically in opposition to leg drive.'
    ],
  },
  {
    id: 'mountain_climbers',
    exerciseId: 'mountain_climbers',
    name: 'Mountain Climbers',
    category: 'Running & Cardio',
    difficulty: 'intermediate',
    description: 'High-plank calisthenic driving explosive core engagement and aerobic stamina.',
    targetMuscles: ['Rectus Abdominis', 'Hip Flexors', 'Shoulders', 'Cardiovascular'],
    icon: '🧗',
    aiSupported: false,
    instructions: [
      'Hold high plank position with hands planted firmly under shoulders.',
      'Drive one knee rapidly toward chest without letting hips pike.',
      'Quickly switch legs in an alternating sprinting motion.'
    ],
  },
  {
    id: 'butt_kicks',
    exerciseId: 'butt_kicks',
    name: 'Butt Kicks Running Drill',
    category: 'Running & Cardio',
    difficulty: 'beginner',
    description: 'Running form mechanic drill training hamstring recruitment and rapid heel recovery.',
    targetMuscles: ['Hamstrings', 'Quadriceps', 'Calves'],
    icon: '👟',
    aiSupported: false,
    instructions: [
      'Jog in place while kicking heels up towards glutes with quick foot turnover.',
      'Keep torso upright and land lightly on balls of feet.'
    ],
  },
  {
    id: 'jump_rope',
    exerciseId: 'jump_rope',
    name: 'Jump Rope Calisthenics',
    category: 'Running & Cardio',
    difficulty: 'beginner',
    description: 'Classic boxer calisthenic conditioning footwork, ankle stiffness, and aerobic rhythm.',
    targetMuscles: ['Calves', 'Forearms', 'Cardiovascular System'],
    icon: '🪢',
    aiSupported: false,
    instructions: [
      'Hold rope handles at hip height with elbows tucked close.',
      'Jump just high enough (1-2 inches) for rope to clear feet.',
      'Rotate rope using wrists rather than whole arm swings.'
    ],
  },
  {
    id: 'skater_jumps',
    exerciseId: 'skater_jumps',
    name: 'Lateral Skater Jumps',
    category: 'Running & Cardio',
    difficulty: 'intermediate',
    description: 'Lateral plyometric bounding movement training frontal plane power and court deceleration.',
    targetMuscles: ['Gluteus Medius', 'Quadriceps', 'Calves', 'Cardiovascular'],
    icon: '⛸️',
    aiSupported: false,
    instructions: [
      'Push laterally off right leg, leaping sideways to land on left foot with knee softly bent.',
      'Sweep right leg behind left in a skating posture.',
      'Immediately explode back to right side in a fluid bounding cadence.'
    ],
  },

  // ── J. MOBILITY & FLEXIBILITY (GUIDED / MANUAL) ──────────────────────────
  {
    id: 'worlds_greatest_stretch',
    exerciseId: 'worlds_greatest_stretch',
    name: "The World's Greatest Stretch",
    category: 'Mobility',
    difficulty: 'beginner',
    description: 'Full-body dynamic mobility movement hitting hip flexors, thoracic spine, hamstrings, and ankles.',
    targetMuscles: ['Hip Flexors', 'Thoracic Spine', 'Hamstrings', 'Groin'],
    icon: '🌍',
    aiSupported: false,
    instructions: [
      'Step forward into a deep lunge with back leg straight.',
      'Place inside hand on floor and rotate opposite arm toward ceiling, opening chest.',
      'Return hand to floor and push hips back to stretch front hamstring, then switch sides.'
    ],
  },
  {
    id: 'cat_cow',
    exerciseId: 'cat_cow',
    name: 'Cat-Cow Spinal Waves',
    category: 'Mobility',
    difficulty: 'beginner',
    description: 'Gentle spinal flexion and extension flow lubricating vertebrae and relieving back stiffness.',
    targetMuscles: ['Spinal Column', 'Neck', 'Abdominals'],
    icon: '🐈',
    aiSupported: false,
    instructions: [
      'Start on hands and knees with neutral spine.',
      'Inhale: drop belly toward floor and look upward (Cow).',
      'Exhale: arch spine toward ceiling, tucking chin to chest (Cat).',
      'Flow smoothly between postures with deep breaths.'
    ],
  },
  {
    id: 'hip_flexor_stretch',
    exerciseId: 'hip_flexor_stretch',
    name: 'Half-Kneeling Hip Flexor Stretch',
    category: 'Mobility',
    difficulty: 'beginner',
    description: 'Essential posture corrective opening psoas and rectus femoris from long hours of study.',
    targetMuscles: ['Iliopsoas', 'Rectus Femoris', 'Lower Back'],
    icon: '🧘',
    aiSupported: false,
    instructions: [
      'Kneel on one knee with other foot planted forward at 90 degrees.',
      'Tuck pelvis under (posterior tilt) and gently squeeze glute on kneeling side.',
      'Shift weight slightly forward until stretch is felt in front of hip.'
    ],
  },
  {
    id: 'thoracic_rotation',
    exerciseId: 'thoracic_rotation',
    name: 'Side-Lying Thoracic Windmill',
    category: 'Mobility',
    difficulty: 'beginner',
    description: 'Rotational mobility exercise opening thoracic spine and chest while stabilizing lumbar spine.',
    targetMuscles: ['Thoracic Spine', 'Pectoralis Minor', 'Shoulders'],
    icon: '🌪️',
    aiSupported: false,
    instructions: [
      'Lie on side with hips and knees bent at 90 degrees and arms extended forward.',
      'Sweep top arm in a slow arc overhead and across body, rotating chest toward ceiling.',
      'Follow hand with eyes and return to start.'
    ],
  },
  {
    id: 'downward_dog',
    exerciseId: 'downward_dog',
    name: 'Downward Dog to Cobra Flow',
    category: 'Mobility',
    difficulty: 'beginner',
    description: 'Dynamic yoga flow decompressing posterior chain and extending anterior abdominal wall.',
    targetMuscles: ['Hamstrings', 'Calves', 'Shoulders', 'Abdominals'],
    icon: '🐕',
    aiSupported: false,
    instructions: [
      'Start in downward dog, pressing heels toward floor and chest toward thighs.',
      'Rippling through spine, shift forward and lower hips into an upward dog/cobra posture.',
      'Press back to downward dog smoothly.'
    ],
  },
];
