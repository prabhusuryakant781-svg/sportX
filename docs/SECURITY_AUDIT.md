# 🔒 SportX — Security Audit & Defense Architecture

**Application:** SportX (Web & Mobile)  
**Target Firebase Project:** `sportx-ab5f`  
**Audit Scope:** Authentication, Authorization, Anti-Cheat, API Security, Environment Secrets, Firestore & Storage Rules  
**Date:** September 2026  
**Status:** PASS — Verified  

---

## 1. Security Overview & Threat Model

SportX enforces a **Zero-Trust Client** security model:
1. **Clients are Untrusted:** All scores, XP gains, level calculations, challenge winners, and streak updates are computed strictly within server-side Cloud Functions.
2. **Identity Verification:** All private and protected operations require a cryptographically verified Firebase ID Token (JWT).
3. **Secret Encapsulation:** Private API keys (Google Gemini) and cloud service credentials never leave backend execution environments.

---

## 2. Authentication & Token Verification

| Vector | Requirement | Implementation Status |
|---|---|---|
| **Identity Provider** | Firebase Authentication | Primary auth system for Email/Password and Google tokens. |
| **Token Handling** | JWT Bearer ID Token | Clients pass `Authorization: Bearer <token>`; backend executes `admin.auth().verifyIdToken(token)`. |
| **Password Transport** | No homemade login APIs | Client SDK authenticates directly against Firebase Identity Platform; passwords are not routed through backend application code. |
| **Session Persistence** | Automatic refresh | Frontend listens to `onIdTokenChanged()` to refresh JWTs before expiration. |

---

## 3. Firestore Rules & Data Partitioning

Rules defined in `backend/firestore.rules`:

| Collection | Read Policy | Write Policy | Tamper Protection |
|---|---|---|---|
| `users/{userId}` | Authenticated read | Owner update restricted to non-sensitive profile fields | Direct modification of `xp`, `level`, `currentStreak`, `badges` is blocked. |
| `exercises/{id}` | Authenticated read | Admin write only | Standardized exercise catalog protected from user tampering. |
| `workoutSessions/{id}` | Owner read only | Owner create / update | Scoped to authenticated user UID (`resource.data.userId == request.auth.uid`). |
| `visionResults/{id}` | Owner read only | Server write only (`allow write: if false`) | Ingested and stored strictly via Cloud Functions backend. |
| `streaks/{userId}` | Owner read only | Server write only (`allow write: if false`) | Anti-cheat protected daily consistency tracker. |
| `xpTransactions/{txId}` | Owner read only | Server write only (`allow write: if false`) | Immutable financial-grade XP audit ledger. |
| `challenges/{id}` | Authenticated read | Server write only (`allow write: if false`) | Winner and XP calculation protected from participant spoofing. |
| `leaderboards/{id}` | Authenticated read | Server write only (`allow write: if false`) | Prevents score injection (`score = 999999`). |

---

## 4. Storage Rules

Rules defined in `backend/storage.rules`:
- **Avatars (`users/{userId}/avatar/{file}`):** Max size 5MB, MIME type restricted to `image/*`, write restricted to matching UID.
- **Exercise Assets (`exercises/{id}/{file}`):** Max size 50MB, read authenticated, write restricted to Admin.
- **Media (`media/{file}`):** Max size 25MB, write restricted to Admin.

---

## 5. API Gateway & Middleware Security

Implemented in `backend/functions/src/`:
- **CORS:** Controlled origins enabled with credential handling.
- **Payload Limits:** Strict `express.json({ limit: '2mb' })` preventing memory exhaustion denial-of-service.
- **Firebase App Check:** Integrated via `verifyAppCheck` middleware in `backend/functions/src/middleware/appCheck.ts`, verifying requests originate from legitimate SportX apps.
- **Input Validation:** Every endpoint validates types, ranges, and required fields before processing (e.g. rep count $> 0$, valid enum difficulty levels).
- **Error Sanitization:** Internal stack traces and backend details are captured in server logs (`logger.error`) and never leaked to client HTTP responses.

---

## 6. Secret Management & GitHub Safety

- **No Secrets in Source Control:**
  - `.gitignore` rigorously configured to ignore `.env`, `.env.*`, `serviceAccountKey.json`, `*-adminsdk-*.json`, `*.pem`, `*.key`.
  - All tracked files audited: **0 exposed secrets found**.
- **Client Bundles:**
  - `VITE_*` variables inspected: contain only public client configuration (`VITE_FIREBASE_PROJECT_ID: "sportx-ab5f"`, public API URL).
  - Gemini API key (`GEMINI_API_KEY`) is stored exclusively in server environment variables.
