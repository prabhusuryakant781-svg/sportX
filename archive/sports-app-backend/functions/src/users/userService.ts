import { db } from '../config/firebase';
import { UserDoc } from '../types';
import { sanitizeUserProfileUpdate, validateFitnessProfile } from '../middleware/validation';

export class UserService {
  /**
   * Retrieves user profile by userId.
   */
  static async getProfile(userId: string): Promise<UserDoc | null> {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as UserDoc;
  }

  /**
   * Updates user profile while strictly stripping protected fields.
   */
  static async updateProfile(userId: string, data: Record<string, unknown>): Promise<UserDoc> {
    // 1. Validate fitness fields if provided
    const fitnessValidation = validateFitnessProfile(data);
    if (!fitnessValidation.isValid) {
      throw new Error(fitnessValidation.error || 'Invalid fitness profile data');
    }

    // 2. Sanitize and remove all server-authoritative fields (xp, streak, badges, etc.)
    const cleanData = sanitizeUserProfileUpdate(data);
    cleanData.updatedAt = new Date().toISOString();

    const userRef = db.collection('users').doc(userId);
    await userRef.set(cleanData, { merge: true });

    const updatedDoc = await userRef.get();
    return updatedDoc.data() as UserDoc;
  }

  /**
   * Retrieves aggregated user statistics.
   */
  static async getUserStats(userId: string): Promise<Record<string, unknown>> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('User not found');

    return {
      userId: profile.userId,
      name: profile.name,
      xp: profile.xp,
      level: profile.level,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      lastWorkoutDate: profile.lastWorkoutDate,
      totalWorkouts: profile.totalWorkouts || 0,
      totalMinutes: profile.totalMinutes || 0,
      totalCalories: profile.totalCalories || 0,
      selectedSports: profile.selectedSports || [],
      fitnessLevel: profile.fitnessLevel,
    };
  }
}
