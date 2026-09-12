/**
 * Idempotent Seed Script for SportX Competitive Mode
 * Seeds the three athlete-development demo challenges:
 * 1. Cricket Catch Challenge ("Rapid Catch Arena")
 * 2. Football Agility Challenge ("Dribble Dash")
 * 3. Athletic Conditioning Challenge ("Shuttle Sprint Clash")
 */

import { CompetitiveRepository } from '../repositories/competitiveRepository';
import { SEED_CHALLENGES } from '../services/competitiveMatchmakingService';

export async function seedCompetitiveChallenges(): Promise<number> {
  console.log('⚔️  Seeding SportX Athlete-Development Competitive Challenges...\n');

  let count = 0;
  for (const challenge of SEED_CHALLENGES) {
    await CompetitiveRepository.seedChallenge(challenge);
    console.log(`  ✓ Seeded [${challenge.sportId.toUpperCase()}]: "${challenge.title}"`);
    console.log(`    Activity: ${challenge.activityId} (${challenge.activityType})`);
    console.log(`    Duration: ${challenge.durationSeconds}s | Players: ${challenge.minPlayers}`);
    console.log(`    Rank Range: ${challenge.minRank} - ${challenge.maxRank}`);
    console.log(`    Formula: ${challenge.scoringFormula}\n`);
    count++;
  }

  console.log(`🎉 Successfully seeded ${count} competitive demo challenges.`);
  return count;
}

if (require.main === module) {
  seedCompetitiveChallenges()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Failed to seed competitive challenges:', err);
      process.exit(1);
    });
}
