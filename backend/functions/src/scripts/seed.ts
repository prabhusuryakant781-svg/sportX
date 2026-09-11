/**
 * SportX Master Database Seeder Script
 * Programmatically and idempotently seeds:
 * 1. Master Sports (Cricket, Football, Basketball, Running, General Fitness)
 * 2. Master Exercises (28 core exercises across all supported sports and calisthenics)
 * 3. Master Badges (9 milestone achievement badges)
 * 4. Master Curated Workout Plans
 */
import { ExerciseRepository } from '../repositories/exerciseRepository';
import { SportRepository } from '../repositories/sportRepository';
import { WorkoutRepository } from '../repositories/workoutRepository';
import { BadgeRepository } from '../repositories/badgeRepository';

export async function runMasterSeed(): Promise<void> {
  console.log('================================================================');
  console.log('🌱 Seeding SportX Master Firestore Database (sportx-ab5f)...');
  console.log('================================================================\n');

  try {
    console.log('1. Seeding Sports catalogue...');
    const sportsCount = await SportRepository.seedInitialSports();
    console.log(`   ✓ Successfully seeded/verified ${sportsCount} master sports.`);

    console.log('2. Seeding Exercises database...');
    const exercisesCount = await ExerciseRepository.seedInitialExercises();
    console.log(`   ✓ Successfully seeded/verified ${exercisesCount} master exercises.`);

    console.log('3. Seeding Badges & Milestones...');
    await BadgeRepository.seedSystemBadges();
    const badgesCount = (await BadgeRepository.getAllBadges()).length;
    console.log(`   ✓ Successfully seeded/verified ${badgesCount} master badges.`);

    console.log('4. Seeding Curated Workout Plans...');
    const workoutsCount = await WorkoutRepository.seedInitialWorkouts();
    console.log(`   ✓ Successfully seeded/verified ${workoutsCount} curated workout plans.`);

    console.log('\n🎉 SportX Firestore Master Seeding Complete!');
  } catch (error: any) {
    if (error?.message?.includes('default credentials')) {
      console.warn('\n⚠️ Note: Firebase Admin credentials not found. To seed live or emulated Firestore:');
      console.warn('   1. Emulators: Start with "firebase emulators:start" then run "npm run seed"');
      console.warn('   2. Production: Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT');
    } else {
      console.error('✗ Master seed encountered an error:', error);
    }
  }
}

if (require.main === module) {
  runMasterSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal seed failure:', err);
      process.exit(1);
    });
}
