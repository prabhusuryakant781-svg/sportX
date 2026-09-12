/**
 * SportX Computer Vision — Result Processing & Storage Service (Phase 3)
 * Handles receiving, validating, persisting, and querying Computer Vision outputs.
 * 
 * Rules:
 * 1. Store useful vision results in Firestore (reps, score, detected errors, confidence, sessionId).
 * 2. Associate results with authenticated user UID.
 * 3. Never trust client-supplied data without validation.
 * 4. Gracefully fall back to demoStore in offline/local environments.
 */

import { db, hasFirebaseCredentials } from '../config/firebase';
import { demoVisionResults, sessions as demoSessions, nextId, DemoVisionResult } from '../config/demoStore';
import { validateVisionResult, ValidatedVisionResult, VisionResultPayload } from './validators';
import { assertProductionSafe } from '../config/productionSafety';
import * as logger from 'firebase-functions/logger';

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore vision operation timeout')), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export interface StoredVisionRecord extends ValidatedVisionResult {
  id: string;
  userId: string;
  createdAt: string;
}

/**
 * Persists a validated Vision result to Firestore and links to workout session.
 */
export async function storeVisionResult(
  userId: string,
  data: ValidatedVisionResult
): Promise<StoredVisionRecord> {
  const recordId = `vis_${data.sessionId}_${Date.now()}`;
  const record: StoredVisionRecord = {
    id: recordId,
    userId,
    ...data,
    createdAt: new Date().toISOString()
  };

  if (hasFirebaseCredentials) {
    try {
      // 1. Store in visionResults collection
      await withTimeout(
        db.collection('visionResults').doc(recordId).set(record),
        2500
      );

      // 2. Link/update workoutSessions if matching session exists
      try {
        const sessionRef = db.collection('workoutSessions').doc(data.sessionId);
        const sessionDoc = await withTimeout(sessionRef.get(), 1500);
        if (sessionDoc.exists) {
          await sessionRef.set(
            {
              visionResultId: recordId,
              totalReps: data.reps,
              averageFormScore: data.formScore,
              confidence: data.confidence,
              formErrors: data.errors.map(e => e.code),
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        }
      } catch (sessionUpdateErr) {
        // Non-fatal: session linking is an enrichment
        logger.warn('[Vision] Could not link vision result to sessionDoc:', sessionUpdateErr);
      }

      logger.info(`[Vision] Stored vision result ${recordId} in Firestore for user ${userId}`);
      return record;
    } catch (err) {
      assertProductionSafe('storeVisionResult', err);
      logger.warn('[Vision] Firestore unavailable, writing to demoStore fallback:', err);
    }
  } else {
    assertProductionSafe('storeVisionResult without Firebase credentials');
  }

  // Demo store fallback
  const demoRecord: DemoVisionResult = {
    id: recordId,
    userId,
    sessionId: data.sessionId,
    exerciseId: data.exerciseId,
    reps: data.reps,
    formScore: data.formScore,
    confidence: data.confidence,
    errors: data.errors,
    timestamp: data.timestamp || new Date().toISOString(),
    validatedAt: data.validatedAt
  };
  demoVisionResults.unshift(demoRecord);

  // Link to demo session if exists
  const matchingDemoSession = demoSessions.find(s => s.id === data.sessionId);
  if (matchingDemoSession) {
    matchingDemoSession.totalReps = data.reps;
    matchingDemoSession.averageFormScore = data.formScore;
  }

  return record;
}

/**
 * Validates, processes, and stores a raw vision result payload.
 */
export async function processVisionResult(
  userId: string,
  rawPayload: unknown
): Promise<StoredVisionRecord> {
  const validation = validateVisionResult(rawPayload);

  if (!validation.isValid || !validation.data) {
    const errorMsg = `Invalid vision result payload: ${validation.errors.join('; ')}`;
    logger.warn('[Vision] Validation rejected payload:', errorMsg);
    const err: any = new Error(errorMsg);
    err.statusCode = 400;
    err.validationErrors = validation.errors;
    throw err;
  }

  return await storeVisionResult(userId, validation.data);
}

/**
 * Retrieves recent vision results for an authenticated user.
 */
export async function getVisionResults(
  userId: string,
  limitCount = 10
): Promise<StoredVisionRecord[]> {
  if (hasFirebaseCredentials) {
    try {
      const snapshot = await withTimeout(
        db.collection('visionResults')
          .where('userId', '==', userId)
          .limit(limitCount)
          .get(),
        2000
      );

      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => doc.data() as StoredVisionRecord);
        return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      }
    } catch (err) {
      assertProductionSafe('getVisionResults', err);
      logger.warn('[Vision] Firestore retrieval failed, checking demo store:', err);
    }
  }

  // Demo store fallback
  const results = demoVisionResults
    .filter(r => r.userId === userId)
    .slice(0, limitCount)
    .map(r => ({
      ...r,
      createdAt: r.validatedAt
    }));

  return results;
}

/**
 * Retrieves a vision result by sessionId.
 */
export async function getVisionResultBySession(
  sessionId: string
): Promise<StoredVisionRecord | null> {
  if (!sessionId) return null;

  if (hasFirebaseCredentials) {
    try {
      const snapshot = await withTimeout(
        db.collection('visionResults')
          .where('sessionId', '==', sessionId)
          .limit(1)
          .get(),
        2000
      );

      if (!snapshot.empty) {
        return snapshot.docs[0].data() as StoredVisionRecord;
      }
    } catch (err) {
      assertProductionSafe('getVisionResultBySession', err);
      logger.warn('[Vision] Firestore query by sessionId failed:', err);
    }
  }

  const demoMatch = demoVisionResults.find(r => r.sessionId === sessionId);
  if (demoMatch) {
    return {
      ...demoMatch,
      createdAt: demoMatch.validatedAt
    };
  }

  return null;
}
