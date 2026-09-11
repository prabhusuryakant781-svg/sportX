/**
 * SportX Master Database Seed Script (Person 1)
 * Safely and idempotently populates:
 * 1. Master Sports (Cricket, Football, Basketball, Running, General Fitness)
 * 2. Master Exercises (Squat, Push-up, Bicep Curl, Plank, Lunges)
 * 3. Master Badges (9 core milestone badges)
 * 4. Master Curated Workout Plans
 */
import { db } from '../functions/src/config/firebase';
import { SportDoc, ExerciseDoc, BadgeDoc, WorkoutPlanDoc } from '../functions/src/types';
import { DEFAULT_EXERCISES } from '../functions/src/exercises/exerciseService';
import { SYSTEM_BADGES } from '../functions/src/gamification/badgeService';
import { CURATED_WORKOUT_PLANS } from '../functions/src/workouts/workoutService';

export const SEED_SPORTS: SportDoc[] = [
  {
    id: 'cricket',
    name: 'Cricket',
    description: 'Fast bowling stamina, rotational batting power, and sprint endurance conditioning.',
    imageUrl: 'https://images.unsplash.com/photo-1531415074868-036b107e775a?w=800',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'football',
    name: 'Football / Soccer',
    description: 'High-intensity interval stamina, lower body deceleration, and directional agility.',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    description: 'Explosive vertical jump mechanics, lateral defensive shuffles, and cardiovascular drive.',
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'running',
    name: 'Running & Track',
    description: 'Aerobic base building, cadence efficiency, stride mechanics, and recovery pacing.',
    imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'general_fitness',
    name: 'General Fitness',
    description: 'Balanced strength, mobility, joint health, and posture correction for campus life.',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export async function runSeed(): Promise<void> {
  console.log('================================================================');
  console.log('🌱 Starting SportX Master Database Seeding (Idempotent)');
  console.log('================================================================\n');

  // 1. Seed Sports
  console.log('1. Seeding Sports Catalogue...');
  for (const sport of SEED_SPORTS) {
    await db.collection('sports').doc(sport.id).set(sport, { merge: true });
    console.log(`   ✓ Sport: ${sport.name} [id: ${sport.id}]`);
  }

  // 2. Seed Exercises
  console.log('\n2. Seeding Master Exercises...');
  for (const exercise of DEFAULT_EXERCISES) {
    await db.collection('exercises').doc(exercise.id).set(exercise, { merge: true });
    console.log(`   ✓ Exercise: ${exercise.name} (${exercise.difficulty}) [id: ${exercise.id}]`);
  }

  // 3. Seed Badges
  console.log('\n3. Seeding Milestone Badges...');
  for (const badge of SYSTEM_BADGES) {
    await db.collection('badges').doc(badge.id).set(badge, { merge: true });
    console.log(`   ✓ Badge: ${badge.icon} ${badge.name} (+${badge.xpReward} XP) [id: ${badge.id}]`);
  }

  // 4. Seed Curated Workout Plans
  console.log('\n4. Seeding Curated Workout Plans...');
  for (const plan of CURATED_WORKOUT_PLANS) {
    await db.collection('workoutPlans').doc(plan.id).set(plan, { merge: true });
    console.log(`   ✓ Plan: ${plan.name} (${plan.duration}m, ${plan.difficulty}) [id: ${plan.id}]`);
  }

  console.log('\n================================================================');
  console.log('🎉 Seeding completed successfully with zero duplicates!');
  console.log('================================================================');
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
