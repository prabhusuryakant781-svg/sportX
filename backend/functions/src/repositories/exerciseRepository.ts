/**
 * SportX Exercise Repository & Master Movement Catalog
 * Firestore Data Access for exercises/{exerciseId}
 * Extensible 28-Movement Registry with Biomechanical Form Rules & AI Metadata
 */
import { db } from '../config/firebase';
import { ExerciseDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'exercises';

export const INITIAL_EXERCISES: ExerciseDoc[] = [
  // 1. SQUATS
  {
    exerciseId: 'squat',
    name: 'Bodyweight Squats',
    sportId: 'general',
    description: 'Fundamental lower-body compound movement training quads, glutes, and core stability.',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    secondaryMuscles: ['Core', 'Calves'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Stand with feet shoulder-width apart, toes pointing slightly outwards.',
      'Hinge your hips backwards and bend your knees as if sitting into a chair.',
      'Descend until thighs are parallel to the floor, maintaining an upright chest.',
      'Drive upwards through your heels back to the starting position.'
    ],
    commonErrors: ['Knees caving inwards (valgus collapse)', 'Heels lifting off the floor', 'Rounding the lumbar spine'],
    videoUrl: 'https://assets.sportx.app/exercises/squat.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/squat.json',
    thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500',
    formRules: {
      minKneeAngle: 85,
      maxKneeAngle: 165,
      cadenceSecondsMin: 1.2,
      postureRules: ['Keep spine neutral', 'Knees tracking over toes', 'Do not let heels lift'],
      repConditions: { inflectionPoint: 'bottom', thresholdAngle: 95, completionAngle: 160 }
    },
    calorieFactor: 0.35,
    baseRepXP: 10,
    aiSupported: true,
    category: 'lower_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 2. PUSHUPS
  {
    exerciseId: 'pushup',
    name: 'Standard Push-ups',
    sportId: 'general',
    description: 'Classic horizontal pushing bodyweight exercise targeting chest, triceps, and anterior delts.',
    targetMuscles: ['Chest', 'Anterior Deltoids', 'Triceps'],
    secondaryMuscles: ['Core', 'Serratus Anterior'],
    equipmentNeeded: ['none'],
    difficulty: 'intermediate',
    instructions: [
      'Begin in a high plank position with hands slightly wider than shoulder-width.',
      'Engage your glutes and core to keep your body in a rigid straight line.',
      'Lower your chest until your elbows reach approximately 90 degrees.',
      'Firmly press the ground away and return to the high plank.'
    ],
    commonErrors: ['Sagging hips / anterior pelvic tilt', 'Flaring elbows 90 degrees out', 'Incomplete range of motion'],
    videoUrl: 'https://assets.sportx.app/exercises/pushup.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/pushup.json',
    thumbnail: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=500',
    formRules: {
      minElbowAngle: 85,
      maxElbowAngle: 165,
      cadenceSecondsMin: 1.0,
      postureRules: ['Maintain straight line from head to heels', 'Elbows at 45 degree angle to torso', 'Avoid sagging hips'],
      repConditions: { inflectionPoint: 'bottom', thresholdAngle: 90, completionAngle: 155 }
    },
    calorieFactor: 0.4,
    baseRepXP: 12,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 3. BICEP CURLS
  {
    exerciseId: 'bicep_curl',
    name: 'Bicep Curls',
    sportId: 'general',
    description: 'Isolation pulling exercise designed to strengthen elbow flexors and forearms.',
    targetMuscles: ['Biceps Brachii', 'Brachialis'],
    secondaryMuscles: ['Forearms'],
    equipmentNeeded: ['dumbbells', 'resistance_bands'],
    difficulty: 'beginner',
    instructions: [
      'Stand tall with dumbbells at your sides, palms facing forward.',
      'Keep your elbows pinned close to your torso.',
      'Curl the weights upward towards shoulder level while contracting biceps.',
      'Lower under steady control back to the starting hang.'
    ],
    commonErrors: ['Using momentum / swinging torso', 'Moving elbows forward during flexion', 'Dropping weight without control'],
    videoUrl: 'https://assets.sportx.app/exercises/bicep_curl.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/bicep_curl.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minAngle: 40,
      maxAngle: 155,
      cadenceSecondsMin: 1.5,
      postureRules: ['Do not swing your back', 'Keep elbows stationary at sides'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 50, completionAngle: 145 }
    },
    calorieFactor: 0.25,
    baseRepXP: 8,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 4. PLANK
  {
    exerciseId: 'plank',
    name: 'Forearm Core Plank',
    sportId: 'general',
    description: 'Isometric anti-extension core hold strengthening transverse abdominis and lower back.',
    targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis'],
    secondaryMuscles: ['Lower Back', 'Shoulders', 'Glutes'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Plant forearms on the floor with elbows aligned directly under shoulders.',
      'Extend legs straight behind on toes, creating a straight line from crown to heels.',
      'Brace your core tightly, squeeze glutes, and hold steady.'
    ],
    commonErrors: ['Hips sagging towards the floor', 'Piking hips into a teepee shape', 'Holding breath'],
    videoUrl: 'https://assets.sportx.app/exercises/plank.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/plank.json',
    thumbnail: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?w=500',
    formRules: {
      postureRules: ['Do not allow lower back to arch or hips to pike upwards', 'Keep neck in neutral alignment']
    },
    calorieFactor: 0.15,
    baseRepXP: 15,
    aiSupported: true,
    category: 'core',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 5. JUMPING JACKS
  {
    exerciseId: 'jumping_jacks',
    name: 'Jumping Jacks',
    sportId: 'athletics',
    description: 'Full-body cardiovascular calisthenic movement improving aerobic capacity and coordination.',
    targetMuscles: ['Full Body', 'Cardiovascular'],
    secondaryMuscles: ['Calves', 'Deltoids', 'Glutes'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Stand upright with your feet together and arms at your sides.',
      'Jump slightly into the air, spreading your feet wide while clapping arms overhead.',
      'Jump back to the initial starting posture smoothly.'
    ],
    commonErrors: ['Landing flat-footed with heavy impact', 'Arms not reaching overhead', 'Inconsistent pacing'],
    videoUrl: 'https://assets.sportx.app/exercises/jumping_jacks.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/jumping_jacks.json',
    thumbnail: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=500',
    formRules: {
      minAngle: 140,
      cadenceSecondsMin: 0.8,
      postureRules: ['Land softly on balls of feet', 'Maintain steady rhythm'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 150, completionAngle: 30 }
    },
    calorieFactor: 0.2,
    baseRepXP: 5,
    aiSupported: true,
    category: 'cardio',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 6. FORWARD LUNGES
  {
    exerciseId: 'lunges',
    name: 'Forward Walking Lunges',
    sportId: 'general',
    description: 'Unilateral lower-body exercise developing single-leg stability, quadriceps, and glutes.',
    targetMuscles: ['Quadriceps', 'Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Calves', 'Core'],
    equipmentNeeded: ['none'],
    difficulty: 'intermediate',
    instructions: [
      'Stand tall with feet hip-width apart.',
      'Take a controlled step forward with your right leg.',
      'Lower hips until both front and rear knees bend to approximately 90 degrees.',
      'Push through the front heel to step back to starting position and switch legs.'
    ],
    commonErrors: ['Front knee shooting excessively past toes', 'Torso leaning forward', 'Rear knee slamming into floor'],
    videoUrl: 'https://assets.sportx.app/exercises/lunges.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/lunges.json',
    thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500',
    formRules: {
      minKneeAngle: 85,
      maxKneeAngle: 165,
      cadenceSecondsMin: 1.5,
      postureRules: ['Maintain upright posture', 'Front shin nearly vertical', 'Keep hips level'],
      repConditions: { inflectionPoint: 'bottom', thresholdAngle: 95, completionAngle: 160 }
    },
    calorieFactor: 0.38,
    baseRepXP: 10,
    aiSupported: true,
    category: 'lower_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 7. REVERSE LUNGES
  {
    exerciseId: 'reverse_lunges',
    name: 'Reverse Lunges',
    sportId: 'general',
    description: 'Knee-friendly unilateral lunge emphasizing glute and hamstring deceleration.',
    targetMuscles: ['Gluteus Maximus', 'Hamstrings', 'Quadriceps'],
    secondaryMuscles: ['Core', 'Calves'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Stand upright with feet hip-width apart.',
      'Step backwards with one leg and lower hips until both knees form 90-degree angles.',
      'Drive through front heel to return to starting stand.'
    ],
    commonErrors: ['Torso collapsing forward', 'Front knee caving inward', 'Lack of depth'],
    videoUrl: 'https://assets.sportx.app/exercises/reverse_lunges.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/reverse_lunges.json',
    thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500',
    formRules: {
      minKneeAngle: 85,
      maxKneeAngle: 165,
      cadenceSecondsMin: 1.4,
      postureRules: ['Keep front heel glued to floor', 'Maintain chest height'],
      repConditions: { inflectionPoint: 'bottom', thresholdAngle: 95, completionAngle: 160 }
    },
    calorieFactor: 0.35,
    baseRepXP: 10,
    aiSupported: true,
    category: 'lower_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 8. GLUTE BRIDGE
  {
    exerciseId: 'glute_bridge',
    name: 'Floor Glute Bridges',
    sportId: 'general',
    description: 'Posterior chain isolation movement building glutes and lower back endurance.',
    targetMuscles: ['Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Lower Back', 'Core'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Lie face up on the floor with knees bent and feet flat on the ground hip-width apart.',
      'Press through heels to raise hips towards ceiling until thighs and torso align.',
      'Squeeze glutes at top lockout for 1 second, then lower with control.'
    ],
    commonErrors: ['Hyperextending lumbar spine at the top', 'Pushing off toes instead of heels'],
    videoUrl: 'https://assets.sportx.app/exercises/glute_bridge.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/glute_bridge.json',
    thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500',
    formRules: {
      minAngle: 160,
      cadenceSecondsMin: 1.5,
      postureRules: ['Avoid arching lower back', 'Squeeze glutes fully at lockout'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 165, completionAngle: 110 }
    },
    calorieFactor: 0.3,
    baseRepXP: 8,
    aiSupported: true,
    category: 'lower_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 9. CALF RAISES
  {
    exerciseId: 'calf_raise',
    name: 'Standing Calf Raises',
    sportId: 'athletics',
    description: 'Ankle plantarflexion exercise developing gastrocnemius and soleus power.',
    targetMuscles: ['Gastrocnemius', 'Soleus'],
    secondaryMuscles: ['Tibialis Posterior'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Stand upright with feet hip-width apart.',
      'Press through balls of feet to elevate heels as high as possible.',
      'Hold the peak contraction briefly, then lower slowly.'
    ],
    commonErrors: ['Bouncing through reps without control', 'Ankles rolling outward (inversion)'],
    videoUrl: 'https://assets.sportx.app/exercises/calf_raise.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/calf_raise.json',
    thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500',
    formRules: {
      cadenceSecondsMin: 1.0,
      postureRules: ['Keep knees straight but unhyperextended', 'Even pressure across big toe and second toe'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 150, completionAngle: 90 }
    },
    calorieFactor: 0.2,
    baseRepXP: 6,
    aiSupported: true,
    category: 'lower_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 10. HIGH KNEES
  {
    exerciseId: 'high_knees',
    name: 'High Knees Running',
    sportId: 'athletics',
    description: 'Dynamic sprinting drill driving hip flexion, rapid cadence, and cardiovascular output.',
    targetMuscles: ['Hip Flexors', 'Quadriceps', 'Cardiovascular'],
    secondaryMuscles: ['Calves', 'Core'],
    equipmentNeeded: ['none'],
    difficulty: 'intermediate',
    instructions: [
      'Stand tall and run in place with an aggressive, rapid tempo.',
      'Drive knees upward until thighs reach parallel with the ground.',
      'Pump arms rhythmically with opposite leg movement.'
    ],
    commonErrors: ['Leaning backwards', 'Knees failing to reach hip level'],
    videoUrl: 'https://assets.sportx.app/exercises/high_knees.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/high_knees.json',
    thumbnail: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=500',
    formRules: {
      minKneeAngle: 85,
      cadenceSecondsMin: 0.5,
      postureRules: ['Drive knee above hip crease', 'Land on forefoot'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 90, completionAngle: 160 }
    },
    calorieFactor: 0.25,
    baseRepXP: 5,
    aiSupported: true,
    category: 'cardio',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 11. MOUNTAIN CLIMBERS
  {
    exerciseId: 'mountain_climbers',
    name: 'Mountain Climbers',
    sportId: 'athletics',
    description: 'High-plank calisthenic driving explosive core engagement and aerobic stamina.',
    targetMuscles: ['Rectus Abdominis', 'Hip Flexors', 'Cardiovascular'],
    secondaryMuscles: ['Shoulders', 'Triceps', 'Quadriceps'],
    equipmentNeeded: ['none'],
    difficulty: 'intermediate',
    instructions: [
      'Assume a solid push-up plank position with hands planted under shoulders.',
      'Drive one knee toward your chest without letting hips pike.',
      'Quickly switch legs in an athletic alternating driving motion.'
    ],
    commonErrors: ['Piking hips up toward the ceiling', 'Bouncing shoulders out of alignment'],
    videoUrl: 'https://assets.sportx.app/exercises/mountain_climbers.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/mountain_climbers.json',
    thumbnail: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=500',
    formRules: {
      cadenceSecondsMin: 0.6,
      postureRules: ['Keep back flat and hips down', 'Wrists stacked directly below shoulders'],
      repConditions: { inflectionPoint: 'tuck', thresholdAngle: 80, completionAngle: 160 }
    },
    calorieFactor: 0.28,
    baseRepXP: 6,
    aiSupported: true,
    category: 'cardio',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 12. OVERHEAD SHOULDER PRESS
  {
    exerciseId: 'shoulder_press',
    name: 'Overhead Shoulder Press',
    sportId: 'general',
    description: 'Vertical pushing movement building anterior and medial deltoid strength.',
    targetMuscles: ['Anterior Deltoids', 'Lateral Deltoids', 'Triceps'],
    secondaryMuscles: ['Upper Traps', 'Core'],
    equipmentNeeded: ['dumbbells', 'resistance_bands'],
    difficulty: 'intermediate',
    instructions: [
      'Stand or sit upright with dumbbells held at shoulder level, palms facing forward.',
      'Press the weights vertically overhead until arms are extended straight.',
      'Lower the weights steadily back to ear level with controlled pacing.'
    ],
    commonErrors: ['Arching lower back excessively', 'Pressing forward rather than overhead'],
    videoUrl: 'https://assets.sportx.app/exercises/shoulder_press.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/shoulder_press.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minElbowAngle: 75,
      maxElbowAngle: 170,
      cadenceSecondsMin: 1.5,
      postureRules: ['Avoid lumbar hyperextension', 'Lock out directly overhead'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 165, completionAngle: 85 }
    },
    calorieFactor: 0.35,
    baseRepXP: 10,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 13. LATERAL RAISES
  {
    exerciseId: 'lateral_raise',
    name: 'Dumbbell Lateral Raises',
    sportId: 'general',
    description: 'Isolation shoulder abduction movement building width and side deltoid capped shape.',
    targetMuscles: ['Lateral Deltoids'],
    secondaryMuscles: ['Anterior Deltoids', 'Trapezius'],
    equipmentNeeded: ['dumbbells', 'resistance_bands'],
    difficulty: 'beginner',
    instructions: [
      'Stand with dumbbells at sides with a slight bend in elbows.',
      'Raise weights out to sides in an arc until arms reach parallel to floor.',
      'Lower under control without swinging hips.'
    ],
    commonErrors: ['Using torso swing momentum', 'Shrugging shoulders towards ears', 'Raising above shoulder plane'],
    videoUrl: 'https://assets.sportx.app/exercises/lateral_raise.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/lateral_raise.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minAngle: 25,
      maxAngle: 90,
      cadenceSecondsMin: 1.5,
      postureRules: ['Do not shrug traps', 'Maintain soft elbow bend'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 85, completionAngle: 30 }
    },
    calorieFactor: 0.25,
    baseRepXP: 8,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 14. FRONT RAISES
  {
    exerciseId: 'front_raise',
    name: 'Front Deltoid Raises',
    sportId: 'general',
    description: 'Shoulder flexion movement targeting anterior deltoids and clavicular pectoralis.',
    targetMuscles: ['Anterior Deltoids'],
    secondaryMuscles: ['Upper Chest', 'Serratus Anterior'],
    equipmentNeeded: ['dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Hold dumbbells across front of thighs.',
      'Raise weights directly forward to shoulder height with straight arms.',
      'Lower steadily with control.'
    ],
    commonErrors: ['Leaning back during the lift', 'Swinging dumbbells up'],
    videoUrl: 'https://assets.sportx.app/exercises/front_raise.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/front_raise.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minAngle: 20,
      maxAngle: 90,
      cadenceSecondsMin: 1.5,
      postureRules: ['Keep core braced', 'Lift strictly to eye level'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 85, completionAngle: 25 }
    },
    calorieFactor: 0.25,
    baseRepXP: 8,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 15. HAMMER CURLS
  {
    exerciseId: 'hammer_curl',
    name: 'Neutral Grip Hammer Curls',
    sportId: 'general',
    description: 'Bicep variation targeting brachialis and brachioradialis for forearm thickness.',
    targetMuscles: ['Brachialis', 'Brachioradialis', 'Biceps Brachii'],
    secondaryMuscles: ['Forearms'],
    equipmentNeeded: ['dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Hold dumbbells with palms facing each other (neutral grip).',
      'Keep upper arms stationary and curl weights upward.',
      'Squeeze at the top, then lower with full control.'
    ],
    commonErrors: ['Elbow drift forward', 'Using leg drive or torso rocking'],
    videoUrl: 'https://assets.sportx.app/exercises/hammer_curl.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/hammer_curl.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minAngle: 40,
      maxAngle: 155,
      cadenceSecondsMin: 1.5,
      postureRules: ['Maintain neutral wrist posture', 'Elbows pinned to sides'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 50, completionAngle: 145 }
    },
    calorieFactor: 0.25,
    baseRepXP: 8,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 16. OVERHEAD TRICEP EXTENSION
  {
    exerciseId: 'tricep_extension',
    name: 'Overhead Tricep Extension',
    sportId: 'general',
    description: 'Elbow extension movement placing maximum stretch on the triceps long head.',
    targetMuscles: ['Triceps Brachii (Long Head)'],
    secondaryMuscles: ['Forearms', 'Core'],
    equipmentNeeded: ['dumbbells', 'resistance_bands'],
    difficulty: 'intermediate',
    instructions: [
      'Hold a dumbbell with both hands overhead with arms fully extended.',
      'Bend elbows behind head while keeping upper arms vertical.',
      'Contract triceps to extend weight back up to overhead lockout.'
    ],
    commonErrors: ['Flaring elbows wide to the sides', 'Arching lower back'],
    videoUrl: 'https://assets.sportx.app/exercises/tricep_extension.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/tricep_extension.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minElbowAngle: 60,
      maxElbowAngle: 165,
      cadenceSecondsMin: 1.5,
      postureRules: ['Keep elbows tucked forward', 'Maintain ribcage down'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 160, completionAngle: 75 }
    },
    calorieFactor: 0.3,
    baseRepXP: 9,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 17. TRICEP KICKBACK
  {
    exerciseId: 'tricep_kickback',
    name: 'Bent-Over Tricep Kickbacks',
    sportId: 'general',
    description: 'Peak contraction exercise emphasizing lateral and medial tricep heads.',
    targetMuscles: ['Triceps Brachii (Lateral/Medial Heads)'],
    secondaryMuscles: ['Rear Deltoids', 'Rhomboids'],
    equipmentNeeded: ['dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Hinge at hips with flat back, pulling upper arms parallel to torso.',
      'Keeping upper arm motionless, extend forearm backward until arm is straight.',
      'Squeeze tricep firmly at peak extension, then return to 90 degrees.'
    ],
    commonErrors: ['Dropping elbow between reps', 'Swinging dumbbell back and forth'],
    videoUrl: 'https://assets.sportx.app/exercises/tricep_kickback.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/tricep_kickback.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minElbowAngle: 85,
      maxElbowAngle: 170,
      cadenceSecondsMin: 1.4,
      postureRules: ['Lock upper arm horizontal to floor', 'Full elbow extension at rear'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 165, completionAngle: 90 }
    },
    calorieFactor: 0.28,
    baseRepXP: 8,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 18. TRICEP DIPS
  {
    exerciseId: 'tricep_dips',
    name: 'Bench Tricep Dips',
    sportId: 'general',
    description: 'Compound bodyweight pushing exercise overloading triceps and anterior deltoids.',
    targetMuscles: ['Triceps Brachii', 'Anterior Deltoids'],
    secondaryMuscles: ['Chest', 'Core'],
    equipmentNeeded: ['chair', 'bench'],
    difficulty: 'intermediate',
    instructions: [
      'Sit on edge of a stable bench or chair, placing hands beside hips.',
      'Slide hips off edge, keeping back close to bench.',
      'Lower torso until elbows reach 90 degrees, then press firmly back up.'
    ],
    commonErrors: ['Drifting hips too far from bench', 'Shoulders rolling forward under tension'],
    videoUrl: 'https://assets.sportx.app/exercises/tricep_dips.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/tricep_dips.json',
    thumbnail: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=500',
    formRules: {
      minElbowAngle: 85,
      maxElbowAngle: 165,
      cadenceSecondsMin: 1.2,
      postureRules: ['Keep torso vertical', 'Do not shrug shoulders'],
      repConditions: { inflectionPoint: 'bottom', thresholdAngle: 90, completionAngle: 160 }
    },
    calorieFactor: 0.35,
    baseRepXP: 10,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 19. BENT OVER ROW
  {
    exerciseId: 'bent_over_row',
    name: 'Bent-Over Dumbbell Rows',
    sportId: 'general',
    description: 'Horizontal pulling compound movement building latissimus dorsi and upper back.',
    targetMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Middle Traps'],
    secondaryMuscles: ['Biceps Brachii', 'Posterior Deltoids', 'Lower Back'],
    equipmentNeeded: ['dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Hinge at hips with knees slightly bent and spine flat at 45 degrees.',
      'Pull dumbbells towards hips, driving elbows back past your torso.',
      'Squeeze shoulder blades together, then lower weights with control.'
    ],
    commonErrors: ['Rounding the lower back', 'Using jerking body movement to lift weights'],
    videoUrl: 'https://assets.sportx.app/exercises/bent_over_row.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/bent_over_row.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minAngle: 50,
      maxAngle: 155,
      cadenceSecondsMin: 1.5,
      postureRules: ['Maintain rigid spine angle', 'Pull with back, not arms'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 60, completionAngle: 150 }
    },
    calorieFactor: 0.38,
    baseRepXP: 11,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 20. FLOOR CHEST PRESS
  {
    exerciseId: 'chest_press',
    name: 'Floor Dumbbell Chest Press',
    sportId: 'general',
    description: 'Shoulder-safe horizontal pressing movement building pectorals and triceps.',
    targetMuscles: ['Pectoralis Major', 'Triceps Brachii'],
    secondaryMuscles: ['Anterior Deltoids'],
    equipmentNeeded: ['dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Lie flat on back with knees bent and feet planted.',
      'Hold dumbbells at sides of chest with upper arms resting on the floor.',
      'Press dumbbells up until arms are extended above chest.',
      'Lower slowly until triceps tap the floor lightly.'
    ],
    commonErrors: ['Bouncing elbows off floor', 'Lifting hips off floor'],
    videoUrl: 'https://assets.sportx.app/exercises/chest_press.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/chest_press.json',
    thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
    formRules: {
      minElbowAngle: 85,
      maxElbowAngle: 165,
      cadenceSecondsMin: 1.3,
      postureRules: ['Controlled descent', 'Wrists stacked directly over elbows'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 160, completionAngle: 90 }
    },
    calorieFactor: 0.35,
    baseRepXP: 10,
    aiSupported: true,
    category: 'upper_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 21. FULL SIT-UPS
  {
    exerciseId: 'situps',
    name: 'Full Sit-ups',
    sportId: 'general',
    description: 'Dynamic core flexion exercise strengthening rectus abdominis through full range of motion.',
    targetMuscles: ['Rectus Abdominis', 'Hip Flexors'],
    secondaryMuscles: ['Obliques'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Lie on your back with knees bent and feet flat on the floor.',
      'Cross arms over chest or place fingertips gently beside ears.',
      'Flex your abdomen to lift torso all the way up until chest meets knees.',
      'Lower torso back down under controlled deceleration.'
    ],
    commonErrors: ['Pulling on the neck with hands', 'Using momentum to throw body upward'],
    videoUrl: 'https://assets.sportx.app/exercises/situps.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/situps.json',
    thumbnail: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?w=500',
    formRules: {
      cadenceSecondsMin: 1.2,
      postureRules: ['Do not pull neck forward', 'Maintain feet contact with floor'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 80, completionAngle: 160 }
    },
    calorieFactor: 0.3,
    baseRepXP: 8,
    aiSupported: true,
    category: 'core',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 22. ABDOMINAL CRUNCHES
  {
    exerciseId: 'crunches',
    name: 'Abdominal Crunches',
    sportId: 'general',
    description: 'Targeted upper abdominal isolation movement minimizing hip flexor recruitment.',
    targetMuscles: ['Upper Rectus Abdominis'],
    secondaryMuscles: ['Transverse Abdominis'],
    equipmentNeeded: ['none'],
    difficulty: 'beginner',
    instructions: [
      'Lie supine with knees bent and feet flat on floor.',
      'Curl shoulders off floor while pulling ribs towards pelvis.',
      'Hold the peak contraction, then lower shoulder blades lightly back down.'
    ],
    commonErrors: ['Tucking chin forcefully into chest', 'Lifting lower back off the floor'],
    videoUrl: 'https://assets.sportx.app/exercises/crunches.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/crunches.json',
    thumbnail: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?w=500',
    formRules: {
      cadenceSecondsMin: 1.0,
      postureRules: ['Keep lower back glued to floor', 'Initiate curl with core muscles'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 30, completionAngle: 0 }
    },
    calorieFactor: 0.25,
    baseRepXP: 7,
    aiSupported: true,
    category: 'core',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 23. LEG RAISES
  {
    exerciseId: 'leg_raises',
    name: 'Lying Straight Leg Raises',
    sportId: 'general',
    description: 'Lower abdominal anti-extension movement challenging hip flexors and core bracing.',
    targetMuscles: ['Lower Rectus Abdominis', 'Hip Flexors'],
    secondaryMuscles: ['Obliques'],
    equipmentNeeded: ['none'],
    difficulty: 'intermediate',
    instructions: [
      'Lie flat on back with legs extended straight and hands placed under glutes for support.',
      'Raise legs together towards ceiling until perpendicular to floor.',
      'Lower legs steadily until just above the ground without allowing lower back to arch.'
    ],
    commonErrors: ['Lower back arching off the floor', 'Bending knees to cheat difficulty'],
    videoUrl: 'https://assets.sportx.app/exercises/leg_raises.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/leg_raises.json',
    thumbnail: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?w=500',
    formRules: {
      minAngle: 85,
      maxAngle: 170,
      cadenceSecondsMin: 1.5,
      postureRules: ['Maintain lumbar contact with ground', 'Legs kept rigid and straight'],
      repConditions: { inflectionPoint: 'top', thresholdAngle: 90, completionAngle: 15 }
    },
    calorieFactor: 0.32,
    baseRepXP: 9,
    aiSupported: true,
    category: 'core',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 24. BICYCLE CRUNCHES
  {
    exerciseId: 'bicycle_crunches',
    name: 'Alternating Bicycle Crunches',
    sportId: 'general',
    description: 'Rotational core movement recruiting rectus abdominis and internal/external obliques.',
    targetMuscles: ['Obliques', 'Rectus Abdominis'],
    secondaryMuscles: ['Hip Flexors'],
    equipmentNeeded: ['none'],
    difficulty: 'intermediate',
    instructions: [
      'Lie on your back with hands behind head and legs elevated with knees bent at 90 degrees.',
      'Rotate torso to bring right elbow towards left knee while extending right leg straight.',
      'Smoothly alternate sides in a continuous cycling motion.'
    ],
    commonErrors: ['Yanking neck with hands', 'Speeding through reps without full rotation'],
    videoUrl: 'https://assets.sportx.app/exercises/bicycle_crunches.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/bicycle_crunches.json',
    thumbnail: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?w=500',
    formRules: {
      cadenceSecondsMin: 0.8,
      postureRules: ['Rotate through thoracic spine', 'Fully extend opposite leg'],
      repConditions: { inflectionPoint: 'twist', thresholdAngle: 45, completionAngle: 0 }
    },
    calorieFactor: 0.3,
    baseRepXP: 7,
    aiSupported: true,
    category: 'core',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 25. SIDE LUNGES
  {
    exerciseId: 'side_lunge',
    name: 'Lateral Side Lunges',
    sportId: 'athletics',
    description: 'Frontal-plane lower body movement training adductors, abductors, and lateral athleticism.',
    targetMuscles: ['Gluteus Medius', 'Quadriceps', 'Adductors'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipmentNeeded: ['none'],
    difficulty: 'intermediate',
    instructions: [
      'Stand tall with feet together.',
      'Take a large step out to the side with right leg, hinging hips back and bending right knee.',
      'Keep left leg completely straight and both feet flat on floor.',
      'Push off right foot to return to standing center.'
    ],
    commonErrors: ['Trailing foot lifting off floor', 'Knee collapsing inward'],
    videoUrl: 'https://assets.sportx.app/exercises/side_lunge.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/side_lunge.json',
    thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500',
    formRules: {
      minKneeAngle: 85,
      maxKneeAngle: 165,
      cadenceSecondsMin: 1.5,
      postureRules: ['Keep trailing leg straight', 'Chest up with neutral spine'],
      repConditions: { inflectionPoint: 'bottom', thresholdAngle: 95, completionAngle: 160 }
    },
    calorieFactor: 0.36,
    baseRepXP: 10,
    aiSupported: true,
    category: 'lower_body',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 26. SIDE PLANK
  {
    exerciseId: 'side_plank',
    name: 'Lateral Side Plank Hold',
    sportId: 'general',
    description: 'Isometric anti-lateral flexion exercise building obliques and quadratus lumborum.',
    targetMuscles: ['Obliques', 'Transverse Abdominis'],
    secondaryMuscles: ['Gluteus Medius', 'Shoulders'],
    equipmentNeeded: ['none'],
    difficulty: 'intermediate',
    instructions: [
      'Lie on your side with legs extended and feet stacked.',
      'Prop upper body up on elbow, stacking elbow directly below shoulder.',
      'Lift hips off floor until body forms a straight diagonal line from head to feet.'
    ],
    commonErrors: ['Hips dropping toward floor', 'Top shoulder rolling forward'],
    videoUrl: 'https://assets.sportx.app/exercises/side_plank.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/side_plank.json',
    thumbnail: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?w=500',
    formRules: {
      postureRules: ['Maintain straight line along lateral chain', 'Keep neck in line with spine']
    },
    calorieFactor: 0.18,
    baseRepXP: 12,
    aiSupported: true,
    category: 'core',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 27. RUSSIAN TWISTS
  {
    exerciseId: 'russian_twist',
    name: 'Seated Russian Twists',
    sportId: 'athletics',
    description: 'Rotational core endurance movement developing rotational power and oblique strength.',
    targetMuscles: ['Internal Obliques', 'External Obliques'],
    secondaryMuscles: ['Rectus Abdominis', 'Hip Flexors'],
    equipmentNeeded: ['none', 'dumbbell'],
    difficulty: 'beginner',
    instructions: [
      'Sit on floor with knees bent and feet elevated slightly off floor.',
      'Lean back at a 45-degree angle, balancing on sit bones.',
      'Rotate torso from side to side, lightly touching ground beside hips on each turn.'
    ],
    commonErrors: ['Moving only arms instead of rotating through torso', 'Rounding the lower back'],
    videoUrl: 'https://assets.sportx.app/exercises/russian_twist.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/russian_twist.json',
    thumbnail: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?w=500',
    formRules: {
      cadenceSecondsMin: 0.8,
      postureRules: ['Keep chest open and spine tall', 'Rotate whole ribcage'],
      repConditions: { inflectionPoint: 'twist', thresholdAngle: 45, completionAngle: 0 }
    },
    calorieFactor: 0.28,
    baseRepXP: 7,
    aiSupported: true,
    category: 'core',
    isActive: true,
    createdAt: new Date().toISOString()
  },

  // 28. BODYWEIGHT ROMANIAN DEADLIFT / HINGE
  {
    exerciseId: 'deadlift_bodyweight',
    name: 'Single-Leg Romanian Deadlift',
    sportId: 'athletics',
    description: 'Unilateral hip hinge movement training hamstring flexibility, glute strength, and balance.',
    targetMuscles: ['Hamstrings', 'Gluteus Maximus'],
    secondaryMuscles: ['Core', 'Calves', 'Spinal Erectors'],
    equipmentNeeded: ['none'],
    difficulty: 'advanced',
    instructions: [
      'Stand on one leg with a soft bend in the knee.',
      'Hinge at hips, extending non-supporting leg straight behind you.',
      'Lower torso until parallel with floor while maintaining a flat back.',
      'Drive through supporting heel to return to standing.'
    ],
    commonErrors: ['Rounding the spine', 'Opening hips up toward the ceiling instead of keeping them square'],
    videoUrl: 'https://assets.sportx.app/exercises/deadlift_bodyweight.mp4',
    animationUrl: 'https://assets.sportx.app/exercises/deadlift_bodyweight.json',
    thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500',
    formRules: {
      minAngle: 85,
      maxAngle: 175,
      cadenceSecondsMin: 2.0,
      postureRules: ['Keep hips square to the floor', 'Maintain flat lumbar spine'],
      repConditions: { inflectionPoint: 'hinge', thresholdAngle: 90, completionAngle: 170 }
    },
    calorieFactor: 0.38,
    baseRepXP: 12,
    aiSupported: true,
    category: 'lower_body',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export class ExerciseRepository {
  /**
   * List all exercises with optional query/filters
   */
  static async getAll(filters?: {
    sportId?: string;
    difficulty?: string;
    targetMuscle?: string;
  }): Promise<ExerciseDoc[]> {
    try {
      let query: FirebaseFirestore.Query = db.collection(COLLECTION);

      if (filters?.sportId) {
        query = query.where('sportId', '==', filters.sportId);
      }
      if (filters?.difficulty) {
        query = query.where('difficulty', '==', filters.difficulty);
      }

      const snapshot = await query.get();
      if (snapshot.empty) {
        let list = INITIAL_EXERCISES;
        if (filters?.sportId) list = list.filter((e) => e.sportId === filters.sportId);
        if (filters?.difficulty) list = list.filter((e) => e.difficulty === filters.difficulty);
        return list;
      }

      return snapshot.docs.map((doc) => doc.data() as ExerciseDoc);
    } catch (err) {
      logger.error('Error fetching exercises:', err);
      return INITIAL_EXERCISES;
    }
  }

  /**
   * Get exercise by ID
   */
  static async getById(exerciseId: string): Promise<ExerciseDoc | null> {
    try {
      const docSnap = await db.collection(COLLECTION).doc(exerciseId).get();
      if (docSnap.exists) {
        return docSnap.data() as ExerciseDoc;
      }
      const initial = INITIAL_EXERCISES.find((e) => e.exerciseId === exerciseId);
      return initial || null;
    } catch (err) {
      logger.error(`Error fetching exercise ${exerciseId}:`, err);
      return INITIAL_EXERCISES.find((e) => e.exerciseId === exerciseId) || null;
    }
  }

  /**
   * Seed or insert exercise
   */
  static async set(exercise: ExerciseDoc): Promise<void> {
    await db.collection(COLLECTION).doc(exercise.exerciseId).set(exercise, { merge: true });
  }

  /**
   * Seed all initial exercises into Firestore if empty
   */
  static async seedInitialExercises(): Promise<number> {
    const batch = db.batch();
    for (const ex of INITIAL_EXERCISES) {
      const docRef = db.collection(COLLECTION).doc(ex.exerciseId);
      batch.set(docRef, ex, { merge: true });
    }
    await batch.commit();
    return INITIAL_EXERCISES.length;
  }
}
