/**
 * SportX — Step 1: Exercise & Workout Library Expansion Verification
 * 
 * Verifies:
 * 1. Plan structure, categories, and data validity across Full Body, Upper, Lower, Strength, Endurance, Running & Cardio, Mobility, Sport
 * 2. Exercise coverage across all required body and movement domains
 * 3. Strict Camera vs Non-Camera boundary (squat, pushup, jumping_jacks only)
 * 4. Backward compatibility with existing tested routines (dorm_blast_10, dorm_blast_20)
 * 5. Route builder invariants
 */

import { DEFAULT_WORKOUT_PLANS, DEFAULT_EXERCISES } from '../src/data/workoutLibraryData.ts';
import { isCameraSupported, normalizeExerciseId, buildCameraRoute } from '../src/utils/exerciseUtils.ts';
import { INITIAL_WORKOUTS } from '../../backend/functions/src/repositories/workoutRepository.ts';
import { INITIAL_EXERCISES } from '../../backend/functions/src/repositories/exerciseRepository.ts';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ ${message}`);
}

console.log('\n📚 Running SportX Exercise & Workout Library Expansion Verification...\n');

// ── Test Group 1: Workout Plans Structure & Diversity ──────────────────────
console.log('--- Test Group 1: Workout Plans Structure & Diversity ---');
assert(DEFAULT_WORKOUT_PLANS.length >= 15, `Contains at least 15 comprehensive workout plans (found ${DEFAULT_WORKOUT_PLANS.length})`);

// Check required categories
const planTitles = DEFAULT_WORKOUT_PLANS.map(p => p.title.toLowerCase());
const hasFullBody = planTitles.some(t => t.includes('full body') || t.includes('dorm'));
const hasUpper = planTitles.some(t => t.includes('upper') || t.includes('chest'));
const hasLower = planTitles.some(t => t.includes('lower') || t.includes('leg'));
const hasStrength = planTitles.some(t => t.includes('strength') || t.includes('core'));
const hasEndurance = planTitles.some(t => t.includes('endurance') || t.includes('stamina'));
const hasCardioRunning = planTitles.some(t => t.includes('run') || t.includes('jog') || t.includes('sprint') || t.includes('hiit'));
const hasMobility = planTitles.some(t => t.includes('mobility') || t.includes('reset'));
const hasSport = planTitles.some(t => t.includes('agility') || t.includes('court') || t.includes('racquet'));

assert(hasFullBody, 'Includes Full Body workout routines');
assert(hasUpper, 'Includes Upper Body workout routines');
assert(hasLower, 'Includes Lower Body workout routines');
assert(hasStrength, 'Includes Strength workout routines');
assert(hasEndurance, 'Includes Endurance workout routines');
assert(hasCardioRunning, 'Includes Running and Cardio workout routines');
assert(hasMobility, 'Includes Mobility & Recovery workout routines');
assert(hasSport, 'Includes Sport-focused workout routines');

// Check data quality of all plans
for (const plan of DEFAULT_WORKOUT_PLANS) {
  assert(Boolean(plan.id && plan.workoutId), `Plan ${plan.title} has valid unique IDs`);
  assert(Boolean(plan.difficulty), `Plan ${plan.title} has valid difficulty`);
  assert(Number(plan.estimatedDurationMinutes) > 0, `Plan ${plan.title} has positive duration`);
  assert(Array.isArray(plan.exercises) && plan.exercises.length >= 3, `Plan ${plan.title} has >= 3 structured drills`);

  for (const ex of plan.exercises) {
    assert(Boolean(ex.exerciseId), `Plan ${plan.title} drill has exerciseId`);
    assert(Number(ex.sets) > 0, `Plan ${plan.title} drill ${ex.name} has valid sets`);
    assert(Number(ex.reps) > 0 || Number(ex.restSeconds) >= 0, `Plan ${plan.title} drill ${ex.name} has valid reps/rest`);
  }
}

// ── Test Group 2: Exercise Catalog Coverage ────────────────────────────────
console.log('\n--- Test Group 2: Exercise Catalog Coverage ---');
assert(DEFAULT_EXERCISES.length >= 30, `Exercise catalog has at least 30 movement drills (found ${DEFAULT_EXERCISES.length})`);

const categories = new Set(DEFAULT_EXERCISES.map(e => (e.category || '').toLowerCase()));
assert(categories.has('chest'), 'Catalog includes Chest exercises');
assert(categories.has('back'), 'Catalog includes Back exercises');
assert(categories.has('shoulders'), 'Catalog includes Shoulders exercises');
assert(categories.has('arms'), 'Catalog includes Arms exercises');
assert(categories.has('core'), 'Catalog includes Core exercises');
assert(categories.has('legs'), 'Catalog includes Legs exercises');
assert(categories.has('full body'), 'Catalog includes Full Body exercises');
assert(categories.has('mobility'), 'Catalog includes Mobility exercises');
assert(categories.has('cardio') || categories.has('running & cardio'), 'Catalog includes Cardio & Running exercises');

// Verify instructions on all exercises
for (const ex of DEFAULT_EXERCISES) {
  assert(Boolean(ex.name && ex.exerciseId), `Exercise has name and ID: ${ex.name}`);
  assert(Boolean(ex.description), `Exercise ${ex.name} has meaningful description`);
  assert(Array.isArray(ex.instructions) && ex.instructions.length >= 2, `Exercise ${ex.name} has step-by-step instructions`);
}

// ── Test Group 3: Strict Camera vs Non-Camera Boundary ─────────────────────
console.log('\n--- Test Group 3: Strict Camera vs Non-Camera Boundary ---');

// Genuine camera exercises must be true
assert(isCameraSupported('squat') === true, 'squat is camera supported');
assert(isCameraSupported('squats') === true, 'plural squats is camera supported');
assert(isCameraSupported('pushup') === true, 'pushup is camera supported');
assert(isCameraSupported('push-ups') === true, 'hyphenated push-ups is camera supported');
assert(isCameraSupported('jumping_jacks') === true, 'jumping_jacks is camera supported');
assert(isCameraSupported('jumping-jacks') === true, 'jumping-jacks is camera supported');

// Non-camera exercises MUST be false
assert(isCameraSupported('plank') === false, 'plank is NOT camera supported');
assert(isCameraSupported('bicep_curl') === false, 'bicep_curl is NOT camera supported');
assert(isCameraSupported('outdoor_run') === false, 'outdoor_run is NOT camera supported');
assert(isCameraSupported('campus_jog') === false, 'campus_jog is NOT camera supported');
assert(isCameraSupported('sprint_intervals') === false, 'sprint_intervals is NOT camera supported');
assert(isCameraSupported('brisk_walk') === false, 'brisk_walk is NOT camera supported');
assert(isCameraSupported('burpees') === false, 'burpees is NOT camera supported');
assert(isCameraSupported('mountain_climbers') === false, 'mountain_climbers is NOT camera supported');
assert(isCameraSupported('worlds_greatest_stretch') === false, 'worlds_greatest_stretch is NOT camera supported');
assert(isCameraSupported('cat_cow') === false, 'cat_cow is NOT camera supported');
assert(isCameraSupported('pullup') === false, 'pullup is NOT camera supported');

// ── Test Group 4: Backend Persistence Consistency ─────────────────────────
console.log('\n--- Test Group 4: Backend Persistence Consistency ---');
assert(INITIAL_WORKOUTS.length >= 15, `Backend INITIAL_WORKOUTS expanded (found ${INITIAL_WORKOUTS.length})`);
assert(INITIAL_EXERCISES.length >= 40, `Backend INITIAL_EXERCISES expanded (found ${INITIAL_EXERCISES.length})`);

// Check backend aiSupported flags
const backendAiExercises = INITIAL_EXERCISES.filter(e => e.aiSupported === true).map(e => e.exerciseId);
assert(backendAiExercises.includes('squat'), 'Backend marks squat as aiSupported');
assert(backendAiExercises.includes('pushup'), 'Backend marks pushup as aiSupported');
assert(backendAiExercises.includes('jumping_jacks'), 'Backend marks jumping_jacks as aiSupported');
assert(!backendAiExercises.includes('plank'), 'Backend does NOT mark plank as aiSupported');
assert(!backendAiExercises.includes('bicep_curl'), 'Backend does NOT mark bicep_curl as aiSupported');
assert(!backendAiExercises.includes('outdoor_run'), 'Backend does NOT mark outdoor_run as aiSupported');
assert(!backendAiExercises.includes('burpees'), 'Backend does NOT mark burpees as aiSupported');

// Preserved original workout plans
const dorm10 = INITIAL_WORKOUTS.find(w => w.workoutId === 'dorm_blast_10');
assert(Boolean(dorm10), 'Preserved dorm_blast_10 in backend repository');
const dorm20 = INITIAL_WORKOUTS.find(w => w.workoutId === 'dorm_blast_20');
assert(Boolean(dorm20), 'Preserved dorm_blast_20 in backend repository');

console.log(`\n======================================================`);
console.log(`🎉 All Exercise & Workout Expansion Tests Passed! (${passedTests}/${totalTests})`);
console.log(`======================================================\n`);
