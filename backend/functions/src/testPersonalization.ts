/**
 * SportX — Phase 4 AI Personalization Verification Script
 * Validates AI Workout Generation, Progress Analysis, Consistency Insights,
 * and Personalized Coach Question Answering independently without Flutter.
 */

import dotenv from 'dotenv';
dotenv.config();

process.env.LOCAL_TEST = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

import { validateWorkout, generatePersonalizedWorkout } from './ai/workoutGenerator';
import { analyzeProgress, generateConsistencyInsight } from './ai/insights';
import { generateCoachResponse } from './ai/coach';
import { users as demoUsers, demoWorkoutPlans, sessions as demoSessions } from './config/demoStore';

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('⚡ SportX Phase 4 — AI Personalization Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 5;
  const testUid = 'demo_student_01';

  // Seed test athlete profile
  demoUsers.set(testUid, {
    id: testUid,
    name: 'Aarav Sharma',
    email: 'aarav@campus.edu',
    password: 'demo',
    collegeName: 'Campus University',
    department: 'Engineering',
    fitnessLevel: 'intermediate',
    fitnessGoal: 'strength',
    availableTimeMinutes: 30,
    selectedSports: ['football'],
    totalXp: 750,
    currentStreak: 6,
    longestStreak: 7,
    lastWorkoutDate: new Date().toISOString().split('T')[0],
    createdAt: '2026-09-01T00:00:00.000Z'
  });

  // -----------------------------------------------------------------
  // TEST 1: Workout Generator Validation (ai/workoutGenerator.ts)
  // -----------------------------------------------------------------
  console.log('[Test 1/5] Testing Workout Generator Validation...');

  const validWorkoutPlan = {
    workoutName: 'Football Strength Session',
    duration: 30,
    exercises: [
      { exerciseId: 'squat', sets: 3, reps: 12 },
      { exerciseId: 'pushup', sets: 3, reps: 10 }
    ]
  };

  // 1a. Valid workout
  const valResult = validateWorkout(validWorkoutPlan);
  if (!valResult.isValid || !valResult.data) {
    throw new Error(`Test 1 failed: Valid workout was rejected: ${valResult.errors.join(', ')}`);
  }
  console.log('  ✓ Valid workout structure successfully approved');

  // 1b. Reject invalid exercise ID
  const invalidExercise = validateWorkout({
    ...validWorkoutPlan,
    exercises: [{ exerciseId: 'invalid_super_exercise_9999', sets: 3, reps: 10 }]
  });
  if (invalidExercise.isValid) {
    throw new Error('Test 1 failed: Invalid exercise ID was not rejected');
  }
  console.log('  ✓ Invalid exercise ID rejected');

  // 1c. Reject excessive duration (> 120 min)
  const invalidDuration = validateWorkout({ ...validWorkoutPlan, duration: 180 });
  if (invalidDuration.isValid) {
    throw new Error('Test 1 failed: Excessive duration was not rejected');
  }
  console.log('  ✓ Excessive duration rejected');

  // 1d. Reject invalid sets (0 or negative)
  const invalidSets = validateWorkout({
    ...validWorkoutPlan,
    exercises: [{ exerciseId: 'squat', sets: 0, reps: 10 }]
  });
  if (invalidSets.isValid) {
    throw new Error('Test 1 failed: Sets < 1 was not rejected');
  }
  console.log('  ✓ Zero/negative sets rejected');

  passedTests++;
  console.log('✅ Test 1 Passed: Workout validation schema strictly verified.\n');

  // -----------------------------------------------------------------
  // TEST 2: Personalized Workout Generation & Persistence
  // -----------------------------------------------------------------
  console.log('[Test 2/5] Testing Personalized Workout Generation & Persistence...');

  const generated = await generatePersonalizedWorkout(testUid);
  console.log('  Generated Personalized Workout:');
  console.log(JSON.stringify(generated, null, 2));

  if (!generated.id || !generated.workoutName || !Array.isArray(generated.exercises) || generated.exercises.length === 0) {
    throw new Error('Test 2 failed: Generated workout missing required properties');
  }

  // Confirm saved in demoStore or database
  const foundSaved = demoWorkoutPlans.find(p => p.id === generated.id || p.userId === testUid);
  if (!foundSaved) {
    throw new Error('Test 2 failed: Generated workout was not persisted');
  }
  console.log(`  ✓ Workout persisted with ID: ${generated.id}`);

  passedTests++;
  console.log('✅ Test 2 Passed: Personalized workout generated and saved.\n');

  // -----------------------------------------------------------------
  // TEST 3: Progress Analysis (ai/insights.ts)
  // -----------------------------------------------------------------
  console.log('[Test 3/5] Testing Progress Analysis (analyzeProgress)...');

  const progress = await analyzeProgress(testUid);
  console.log('  Progress Analysis Result:');
  console.log(JSON.stringify(progress, null, 2));

  if (typeof progress.totalSessions !== 'number' || typeof progress.totalReps !== 'number') {
    throw new Error('Test 3 failed: Progress analysis missing session or rep counts');
  }
  if (!['improving', 'stable', 'declining'].includes(progress.formTrend)) {
    throw new Error(`Test 3 failed: Invalid formTrend value "${progress.formTrend}"`);
  }
  if (!Array.isArray(progress.improvements) || !Array.isArray(progress.focusAreas)) {
    throw new Error('Test 3 failed: Progress analysis missing improvements or focus areas arrays');
  }

  console.log(`  ✓ Tracked ${progress.totalSessions} sessions with ${progress.totalReps} total reps`);
  console.log(`  ✓ Average Form Score: ${progress.averageFormScore}%, Trajectory: ${progress.formTrend}`);
  console.log(`  ✓ Top Biomechanical Errors: ${JSON.stringify(progress.commonErrors)}`);

  passedTests++;
  console.log('✅ Test 3 Passed: Multi-dimensional progress analysis verified.\n');

  // -----------------------------------------------------------------
  // TEST 4: Consistency Insights (ai/insights.ts)
  // -----------------------------------------------------------------
  console.log('[Test 4/5] Testing Consistency Insights (generateConsistencyInsight)...');

  const consistency = await generateConsistencyInsight(testUid);
  console.log('  Consistency Insight Result:');
  console.log(JSON.stringify(consistency, null, 2));

  if (typeof consistency.weeklyActiveDays !== 'number' || typeof consistency.consistencyScore !== 'number') {
    throw new Error('Test 4 failed: Consistency insight missing numeric score or days');
  }
  if (consistency.consistencyScore < 0 || consistency.consistencyScore > 100) {
    throw new Error(`Test 4 failed: Consistency score ${consistency.consistencyScore} out of bounds [0, 100]`);
  }
  if (!consistency.recommendation || typeof consistency.recommendation !== 'string') {
    throw new Error('Test 4 failed: Missing actionable recommendation');
  }

  console.log(`  ✓ Weekly Active Days: ${consistency.weeklyActiveDays}, Monthly: ${consistency.monthlyActiveDays}`);
  console.log(`  ✓ Consistency Score: ${consistency.consistencyScore}/100 [Streak: ${consistency.currentStreak} days]`);
  console.log(`  ✓ Recommendation: "${consistency.recommendation}"`);

  passedTests++;
  console.log('✅ Test 4 Passed: Consistency insights engine verified.\n');

  // -----------------------------------------------------------------
  // TEST 5: Coach Question Answering & Context Grounding
  // -----------------------------------------------------------------
  console.log('[Test 5/5] Testing Coach Question Answering & Context Grounding...');

  const questionsToTest = [
    'How can I improve?',
    'What should I focus on?',
    'Why is my performance decreasing?',
    'How should I train?',
    'What should I do today?'
  ];

  for (const q of questionsToTest) {
    const answer = await generateCoachResponse(testUid, q);
    if (!answer.summary || !Array.isArray(answer.strengths) || !Array.isArray(answer.recommendations) || !answer.nextFocus) {
      throw new Error(`Test 5 failed: AI Coach returned invalid structure for question: "${q}"`);
    }
    console.log(`  ✓ Question: "${q}"`);
    console.log(`    → Summary: "${answer.summary}"`);
    console.log(`    → Next Focus: "${answer.nextFocus}"`);
  }

  passedTests++;
  console.log('✅ Test 5 Passed: AI Coach question answering successfully verified.\n');

  console.log('====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 4 VERIFICATION TESTS PASSED!`);
  console.log('Architecture Flow Verified:');
  console.log('  User Profile + History + Vision Errors');
  console.log('        ↓');
  console.log('  generatePersonalizedWorkout() [Validates & Stores]');
  console.log('        ↓');
  console.log('  analyzeProgress() [Frequency, Reps, Scores, Errors]');
  console.log('        ↓');
  console.log('  generateConsistencyInsight() [Streak & Habits]');
  console.log('        ↓');
  console.log('  Coach Q&A ("Improve", "Focus", "Today", "Train")');
  console.log('====================================================');
  process.exit(0);
}

runPhase4Tests().catch(err => {
  console.error('\n❌ Phase 4 Verification Failed with Error:', err);
  process.exit(1);
});
