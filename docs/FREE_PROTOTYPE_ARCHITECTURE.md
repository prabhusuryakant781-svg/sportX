# SportX Free Prototype Architecture (No Blaze Plan)

## Overview & Purpose
This document outlines the prototype architecture for **SportX** designed to operate within **applicable free-tier quotas** without requiring the **Firebase Blaze (pay-as-you-go)** plan.

The prototype is designed to operate within the applicable free-tier quotas. Usage must remain monitored because quotas and platform policies can change. Zero payment method or billing activation is configured for this deployment.

---

## 1. Services Used
- **Frontend Hosting:** Vercel Hobby Tier (Applicable free tier quotas, static deployments).
- **Backend API & AI Gateway:** Vercel Serverless Functions (`api/index.js` running the SportX Express engine).
- **Authentication:** Firebase Authentication (Spark Plan — 50,000 Monthly Active Users free).
- **Database:** Google Cloud Firestore (Spark Plan — 1 GiB storage, 50,000 reads/day, 20,000 writes/day free).
- **Computer Vision:** MediaPipe Pose Landmark Engine (Runs 100% client-side in the browser / device).
- **AI Intelligence:** Google Gemini API (`gemini-3.5-flash` via Google AI Studio Free Tier).

---

## 2. Services Deferred / Not Used (Postponed to Production)
- **Firebase Cloud Functions 2nd Gen:** Deferred (Cloud Functions requires Blaze due to Google Cloud Build / Artifact Registry requirements).
- **Firebase Storage (Raw Media):** Deferred (MediaPipe processes video locally; raw camera frames and workout videos are never transmitted or stored).
- **Firebase App Check / Enterprise Attestation:** Deferred to Priority 4+.
- **Firebase Cloud Messaging (FCM Web Push):** Deferred to Priority 4+.
- **Background Scheduled Cloud Tasks (Cloud Scheduler):** Replaced in prototype with on-session streak checks and client-triggered syncs.

---

## 3. Firebase Spark Compatibility Matrix

| Firebase Feature | Spark Free Tier Limit | SportX Prototype Consumption | Status |
|---|---|---|---|
| **Authentication** | 50,000 MAUs | ~50–500 test student athletes | 🟢 Included in Spark |
| **Cloud Firestore Storage** | 1 GiB total | ~10–50 MB for prototype data | 🟢 Included in Spark |
| **Firestore Document Reads** | 50,000 reads / day | ~2,000–5,000 reads / day | 🟢 Included in Spark |
| **Firestore Document Writes** | 20,000 writes / day | ~500–1,500 writes / day | 🟢 Included in Spark |
| **Firestore Document Deletes** | 20,000 deletes / day | Minimal | 🟢 Included in Spark |
| **Security Rules** | Included with Firestore | Strict rules enforced | 🟢 Included in Spark |
| **Firebase Hosting (Optional)** | 10 GB transfer / month | Bypassed in favor of Vercel | 🟢 Included in Spark |

---

## 4. Google Gemini Usage Limitations & Protection

- **Provider:** Google AI Studio (Free API Key).
- **Model:** `gemini-3.5-flash` (Primary) with dynamic fallback to `gemini-3.6-flash`.
- **Free Quota Constraints:**
  - **15 RPM** (Requests Per Minute).
  - **1,500 RPD** (Requests Per Day).
  - **1,000,000 TPM** (Tokens Per Minute).
- **Server-Side Protection:**
  - `GEMINI_API_KEY` is strictly server-side in backend environment variables.
  - Zero exposure to React or Flutter client bundles.
  - Idempotency cache: Repeated calls for the same session ID return cached insights from Firestore without re-invoking Gemini.
  - Client rate-limiting and validation bounds input to max 500 characters.

---

## 5. Backend Deployment Choice: Vercel Serverless Functions

Instead of paying for Cloud Functions 2nd Gen, the existing SportX Express backend is wrapped via `api/index.js` and deployed directly to **Vercel Serverless Functions**:
- **Cost:** Free (Hobby Tier).
- **Allocations:** 100 GB-Hours execution, 1,000,000 serverless function invocations per month.
- **Unified Domain:** Both React Web and the Express API run under `https://<app>.vercel.app`, completely eliminating cross-origin CORS barriers for web users.
- **Zero Architectural Rewrite:** `api/index.js` exports the exact same Express `app` compiled in `backend/functions/lib/index.js`.

---

## 6. Expected Prototype Traffic Assumptions

For a typical pilot testing phase:
- **Active Testers:** 50 – 100 student athletes.
- **Workouts per Day:** 100 – 300 completed sessions.
- **Firestore Writes per Workout:** 3 writes (1 session record, 1 progress update, 1 activity log) = ~900 writes/day (out of 20,000 allowed).
- **AI Coach Questions per Day:** ~100 – 300 queries = ~300 Gemini requests (out of 1,500 allowed).
- **Result:** Well within all free-tier quotas.

---

## 7. What Happens If Quotas Are Exceeded?

The prototype is designed to operate within the applicable free-tier quotas. Usage must remain monitored because quotas and platform policies can change. Because paid billing is not activated on Firebase:
- **No Automatic Paid Overage:** Without an activated Blaze plan, platform operations that exceed quotas are rejected by the provider rather than silently billed.
- **Firestore Quota Exceeded:** Firestore will return `RESOURCE_EXHAUSTED` for operations until the daily quota resets at midnight Pacific Time (00:00 UTC-8).
- **Gemini Quota Exceeded (15 RPM or 1,500 RPD):** Gemini returns HTTP 429. The backend catches this and provides structured fallback coaching tips with `status: 429` rather than crashing.
- **Vercel Function Quota Exceeded:** Serverless functions are subject to platform execution limits until the monthly cycle resets.

---

## 8. Security Model

1. **Camera Privacy:** MediaPipe Pose landmarks are computed inside client memory. Raw webcam pixels never leave the client device.
2. **Server-Side AI Secrets:** `GEMINI_API_KEY` is loaded exclusively into Vercel/backend process environment variables.
3. **No Hardcoded Service Accounts:** Production runtime utilizes Google Application Default Credentials or standard Firebase Auth tokens.
4. **Firestore Security Invariants:**
   - Client cannot modify `xp`, `totalXp`, `level`, `currentStreak`, or `badges`.
   - User A cannot access or modify User B's private sessions or telemetry.
   - Telemetry logs and XP transactions are strictly immutable (`allow write: if false`).

---

## 9. Upgrade Path for Future Production (Blaze Plan)

When the project transitions from prototype to commercial production:
1. Upgrade Firebase project to Blaze plan in Firebase Console (Pay as you go).
2. Deploy Cloud Functions: `firebase deploy --only functions`.
3. Enable Cloud Scheduler for daily background streak maintenance.
4. Enable Firebase Storage for user profile avatar uploads.
5. Zero code rewrites required: The Express routes, controllers, repositories, and AI services remain 100% identical.
