import { auth, db } from '../config/firebase';
import { UserDoc } from '../types';

export class AuthService {
  /**
   * Initializes a user profile in Firestore after authentication.
   * Enforces default values: XP = 0, level = 1, currentStreak = 0, longestStreak = 0.
   */
  static async initializeUserProfile(
    userId: string,
    data: {
      name: string;
      email: string;
      fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
      goals?: string[];
      selectedSports?: string[];
      collegeName?: string;
      department?: string;
    }
  ): Promise<UserDoc> {
    const userRef = db.collection('users').doc(userId);
    const existing = await userRef.get();

    if (existing.exists) {
      return existing.data() as UserDoc;
    }

    const now = new Date().toISOString();
    const newUser: UserDoc = {
      userId,
      name: data.name || 'Student Athlete',
      email: data.email,
      fitnessLevel: data.fitnessLevel || 'beginner',
      goals: data.goals || ['general_fitness'],
      experience: 'beginner',
      preferences: {},
      availableWorkoutTime: 20,
      selectedSports: data.selectedSports || ['General Fitness'],
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      totalWorkouts: 0,
      totalMinutes: 0,
      totalCalories: 0,
      collegeName: data.collegeName || '',
      department: data.department || '',
      createdAt: now,
      updatedAt: now,
    };

    await userRef.set(newUser);
    return newUser;
  }

  /**
   * Creates a custom token for the client after successful login/signup.
   */
  static async createSessionToken(userId: string): Promise<string> {
    return await auth.createCustomToken(userId);
  }

  /**
   * Generates a password reset link using Firebase Auth.
   */
  static async generatePasswordResetLink(email: string): Promise<string> {
    return await auth.generatePasswordResetLink(email);
  }

  /**
   * Revokes refresh tokens for a user upon logout.
   */
  static async revokeUserSessions(userId: string): Promise<void> {
    await auth.revokeRefreshTokens(userId);
  }
}
