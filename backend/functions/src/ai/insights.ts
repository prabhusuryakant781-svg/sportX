import { buildAICoachContext } from './contextBuilder';

export interface ConsistencyInsight {
  streakStatus: string;
  consistencyScore: number;
  bestDay: string;
  advice: string;
  formTrend: 'improving' | 'stable' | 'needs_attention';
}

/**
 * Analyzes student consistency, missed workouts, and trends
 */
export async function getConsistencyInsights(userId: string): Promise<ConsistencyInsight> {
  const context = await buildAICoachContext(userId);

  let formTrend: ConsistencyInsight['formTrend'] = 'stable';
  if (context.averageFormScore >= 88) formTrend = 'improving';
  else if (context.averageFormScore < 75) formTrend = 'needs_attention';

  const advice = context.streak >= 5
    ? 'Phenomenal momentum! You have exercised 5 days in a row. Keep hydration up.'
    : 'Consistency is key. Try logging just 10 minutes today to maintain your streak!';

  return {
    streakStatus: `${context.streak} Days Active`,
    consistencyScore: Math.min(100, context.streak * 20 + 20),
    bestDay: 'Tuesday & Thursday evenings',
    advice,
    formTrend
  };
}
