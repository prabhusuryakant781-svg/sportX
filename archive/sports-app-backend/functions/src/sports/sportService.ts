import { db } from '../config/firebase';
import { SportDoc } from '../types';

export class SportService {
  /**
   * List all active sports
   */
  static async getActiveSports(): Promise<SportDoc[]> {
    const snap = await db
      .collection('sports')
      .where('isActive', '==', true)
      .get();

    return snap.docs.map((doc) => doc.data() as SportDoc);
  }

  /**
   * Get a sport by ID
   */
  static async getSportById(id: string): Promise<SportDoc | null> {
    const doc = await db.collection('sports').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as SportDoc;
  }

  /**
   * Create or update a sport (Admin operation)
   */
  static async upsertSport(sport: Partial<SportDoc> & { name: string }): Promise<SportDoc> {
    const id = sport.id || sport.name.toLowerCase().replace(/\s+/g, '_');
    const sportRef = db.collection('sports').doc(id);

    const now = new Date().toISOString();
    const doc: SportDoc = {
      id,
      name: sport.name,
      description: sport.description || '',
      imageUrl: sport.imageUrl || '',
      isActive: sport.isActive !== undefined ? sport.isActive : true,
      createdAt: sport.createdAt || now,
      updatedAt: now,
    };

    await sportRef.set(doc, { merge: true });
    return doc;
  }

  /**
   * Disable a sport (Admin operation)
   */
  static async disableSport(id: string): Promise<boolean> {
    const sportRef = db.collection('sports').doc(id);
    const doc = await sportRef.get();
    if (!doc.exists) return false;

    await sportRef.update({
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Select sports for a user
   */
  static async selectSportsForUser(userId: string, sports: string[]): Promise<string[]> {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      selectedSports: sports,
      updatedAt: new Date().toISOString(),
    });
    return sports;
  }
}
