/**
 * SportX Sports Repository
 * Firestore Data Access for sports/{sportId}
 */
import { db } from '../config/firebase';
import { SportDoc } from '../types';
import * as logger from 'firebase-functions/logger';

const COLLECTION = 'sports';

export const INITIAL_SPORTS: SportDoc[] = [
  {
    sportId: 'badminton',
    name: 'Badminton',
    category: 'Racquet Sport',
    iconUrl: '🏸',
    description: 'High-agility racquet game emphasizing rapid footwork, lunges, and forearm explosive reflexes.',
    popular: true,
    difficultyLevels: ['beginner', 'intermediate', 'advanced'],
    exercisesCount: 12,
    caloriePerHour: 450,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    sportId: 'football',
    name: 'Football / Soccer',
    category: 'Team Sport',
    iconUrl: '⚽',
    description: 'Dynamic field sport combining interval sprinting, deceleration, core stability, and lower body strength.',
    popular: true,
    difficultyLevels: ['beginner', 'intermediate', 'advanced'],
    exercisesCount: 18,
    caloriePerHour: 580,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    sportId: 'cricket',
    name: 'Cricket',
    category: 'Team Sport',
    iconUrl: '🏏',
    description: 'Precision sport requiring shoulder rotational mobility, sprint bursts, and lumbar stability.',
    popular: true,
    difficultyLevels: ['beginner', 'intermediate', 'advanced'],
    exercisesCount: 14,
    caloriePerHour: 380,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    sportId: 'basketball',
    name: 'Basketball',
    category: 'Team Sport',
    iconUrl: '🏀',
    description: 'High-intensity court game focusing on vertical jumping power, lateral agility, and cardiovascular endurance.',
    popular: true,
    difficultyLevels: ['beginner', 'intermediate', 'advanced'],
    exercisesCount: 15,
    caloriePerHour: 620,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    sportId: 'running',
    name: 'Campus Athletics & Running',
    category: 'Athletics',
    iconUrl: '🏃',
    description: 'Pure cardiovascular conditioning focusing on running economy, stride mechanics, and aerobic capacity.',
    popular: true,
    difficultyLevels: ['beginner', 'intermediate', 'advanced'],
    exercisesCount: 10,
    caloriePerHour: 520,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    sportId: 'table_tennis',
    name: 'Table Tennis',
    category: 'Racquet Sport',
    iconUrl: '🏓',
    description: 'Fast-paced table sport emphasizing forearm rotation, rapid stance switching, and reaction time.',
    popular: false,
    difficultyLevels: ['beginner', 'intermediate'],
    exercisesCount: 8,
    caloriePerHour: 320,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export class SportRepository {
  static async getAll(): Promise<SportDoc[]> {
    try {
      const snapshot = await db.collection(COLLECTION).get();
      if (snapshot.empty) {
        return INITIAL_SPORTS;
      }
      return snapshot.docs.map((doc) => doc.data() as SportDoc);
    } catch (err) {
      logger.error('Error fetching sports collection:', err);
      return INITIAL_SPORTS;
    }
  }

  static async getById(sportId: string): Promise<SportDoc | null> {
    try {
      const doc = await db.collection(COLLECTION).doc(sportId).get();
      if (doc.exists) {
        return doc.data() as SportDoc;
      }
      return INITIAL_SPORTS.find((s) => s.sportId === sportId) || null;
    } catch (err) {
      return INITIAL_SPORTS.find((s) => s.sportId === sportId) || null;
    }
  }

  static async seedInitialSports(): Promise<number> {
    const batch = db.batch();
    for (const sport of INITIAL_SPORTS) {
      const docRef = db.collection(COLLECTION).doc(sport.sportId);
      batch.set(docRef, sport, { merge: true });
    }
    await batch.commit();
    return INITIAL_SPORTS.length;
  }
}
