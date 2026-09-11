# 📦 ARCHIVE NOTICE: sports-app-backend (Deprecated & Superseded)

> **Status:** ARCHIVED / DEPRECATED  
> **Superseded By:** `backend/functions` (Canonical Cloud Functions 2nd Gen backend)  
> **Canonical Firebase Project:** `sportx-ab5f` (superseding `sportx-fitness-app`)  
> **Archive Date:** September 2026

---

## 1. Context & Purpose of Archive

This directory (`sports-app-backend`) was an earlier prototype backend targeting the deprecated Firebase project `sportx-fitness-app`. 

It has been safely archived rather than silently deleted to preserve development history and reference materials.

## 2. Why it was Superseded

1. **Active Deployment Path:**
   - The production deployment pipeline defined in `vercel.json` builds and serves `backend/functions`.
   - Root `package.json` scripts (`npm run dev`, `npm run dev:backend`, `npm run build`, `npm run vercel-build`) target `backend/functions`.
   - Vercel serverless entrypoint `api/index.ts` delegates requests directly to `backend/functions/src/index`.

2. **Firebase Project Discrepancy:**
   - `sports-app-backend` targeted `sportx-fitness-app`.
   - The active canonical Firebase project is **`sportx-ab5f`** (configured in `backend/.firebaserc`, `backend/firebase.json`, `vercel.json`, and `frontend/src/services/firebase.js`).

3. **Security Invariants & Advanced Architecture:**
   - `sports-app-backend` lacked:
     - Biomechanical cadence validation and mutex locking for workout completions.
     - Server-authoritative idempotency in Firestore triggers.
     - Hardened Firestore security rules with owner-only write protections and client write denials on critical stats.
     - Storage security rules guarding private user session recordings.
     - AI Vision integration (MediaPipe telemetry ingestion, session analysis, and coaching tip generators).
     - Full 28-exercise library and peer challenge multiplayer lobbies.

## 3. Useful Code Migrated to Canonical Backend

All useful and relevant utilities from this prototype were extracted, enhanced, and migrated into `backend/functions`:

| Source in `sports-app-backend` | Migrated Target in `backend/functions` |
| :--- | :--- |
| `functions/src/middleware/validation.ts` (`validateFitnessProfile`, `sanitizeUserProfileUpdate`, `validateWorkoutPlan`, `validateActivityLog`) | `backend/functions/src/middleware/validation.ts` |
| `functions/src/middleware/errorHandler.ts` (`sendSuccess`, `sendError`) | `backend/functions/src/middleware/errorHandler.ts` |
| `tests/person1.test.ts` (Domain validation unit test suite) | `backend/functions/src/testValidation.ts` (integrated into master `npm test`) |
| `scripts/seed.ts` (Database seed logic) | `backend/functions/src/scripts/seed.ts` & `npm run seed` |

## 4. Do NOT Deploy or Modify

- Do NOT execute `firebase deploy` from inside this directory.
- For all backend development, API additions, database changes, or deployments, work exclusively in:
  - **`backend/functions/`** (TypeScript source in `backend/functions/src/`)
  - Rules in `backend/firestore.rules` and `backend/storage.rules`
  - Firebase config in `backend/firebase.json` and `backend/.firebaserc`
