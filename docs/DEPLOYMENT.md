# 🚀 SportX — Production Deployment Specification

**Target Firebase Project:** `sportx-ab5f`  
**Web Platform:** Vercel (`frontend/dist`)  
**Backend API & Cloud Functions:** Firebase Cloud Functions 2nd Gen (`backend/functions/`)  
**Mobile Client:** Flutter (`mobile/`)  
**Vision Runtime:** In-Browser Edge WebAssembly / Mobile MediaPipe  

---

## 1. Vercel Web Deployment (`frontend/`)

### Configuration Overview (`vercel.json`)
The root `vercel.json` coordinates building both the Express serverless backend and the React Vite client into a single coherent deployment:

```json
{
  "version": 2,
  "buildCommand": "npm install && cd backend/functions && npm install && npm run build && cd ../../frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "functions": {
    "api/index.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/health", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": {
    "FIREBASE_PROJECT_ID": "sportx-ab5f",
    "GCLOUD_PROJECT": "sportx-ab5f",
    "NODE_ENV": "production"
  }
}
```

### Build Details
- **Build Command:** `npm install && cd backend/functions && npm install && npm run build && cd ../../frontend && npm install && npm run build`
- **Output Directory:** `frontend/dist`
- **Framework Preset:** Vite

### Required Production Environment Variables (Vercel Dashboard)
| Variable | Description | Exposure |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for server-side AI Coach | Server Only (Encrypted) |
| `FIREBASE_PROJECT_ID` | `sportx-ab5f` | Server & Client |
| `FIREBASE_SERVICE_ACCOUNT` | Optional service account JSON for serverless admin rights | Server Only (Encrypted) |
| `VITE_FIREBASE_API_KEY` | Firebase Client Web API Key | Public Client |
| `VITE_FIREBASE_AUTH_DOMAIN` | `sportx-ab5f.firebaseapp.com` | Public Client |
| `VITE_FIREBASE_PROJECT_ID` | `sportx-ab5f` | Public Client |
| `VITE_FIREBASE_STORAGE_BUCKET` | `sportx-ab5f.appspot.com` | Public Client |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM project sender ID | Public Client |
| `VITE_FIREBASE_APP_ID` | Firebase web application ID | Public Client |

> [!CAUTION]
> Never add `GEMINI_API_KEY` or Firebase private keys to any variable starting with `VITE_`.

---

## 2. Firebase Cloud Functions 2nd Gen Deployment

Deploying the standalone backend to Google Cloud / Firebase:

```bash
cd backend
firebase use sportx-ab5f
firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```

### Exported Functions
- `api`: Master Express HTTP gateway handling all `/api/v1` routes.
- `healthCheck`: Dedicated low-latency connectivity health ping.
- `askCoach`: Dedicated HTTPS endpoint for the AI Coach.
- `onUserCreated` / `onUserDeleted`: Auth lifecycle Firestore initialization.
- `onWorkoutCompleted`: Real-time Firestore trigger awarding badges and logging streaks.
- `checkStreaksDaily`: Midnight cron job evaluating athlete streaks.
- `weeklySummaryReport`: Weekly Sunday cron summarizing athletic volume.

---

## 3. Computer Vision Deployment Strategy

1. **Client-Side Edge Execution:** Pose landmark tracking and FSM rep counting execute entirely on the user's device (browser MediaPipe WebAssembly or native mobile GPU acceleration).
2. **Zero Video Ingestion Burden:** Raw video frames are **never streamed to Vercel or Cloud Functions**, eliminating high server compute costs, bandwidth saturation, and user privacy risks.
3. **Structured Telemetry Transmission:** Only the parsed `VisionResultPayload` (reps, form score, timestamped error logs) is transmitted to `POST /api/v1/vision/results`.

---

## 4. Pre-Deployment Verification Checklist

Before publishing to production, execute this sequence:

```bash
# 1. Verify backend TypeScript compilation
cd backend/functions && npm run build

# 2. Run complete backend automated test suite
npm test

# 3. Run domain verification tests
npm run test:coach
npm run test:vision
npm run test:personalization
npm run test:challenges

# 4. Verify frontend production bundle
cd ../../frontend && npm run build
```
