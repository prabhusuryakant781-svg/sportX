import { app } from './index';

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log('======================================================');
  console.log(`🚀 SportX Backend Server is RUNNING on http://localhost:${PORT}`);
  console.log('⚡ All 31 Core Features Active | Cloud Functions 2nd Gen');
  console.log(`👉 Health check:        http://localhost:${PORT}/health`);
  console.log(`👉 Exercises (F11):     http://localhost:${PORT}/api/v1/exercises`);
  console.log(`👉 Daily Workout (F14): http://localhost:${PORT}/api/v1/workouts/today`);
  console.log(`👉 Multiplayer Lobbies (F7, 23, 25): http://localhost:${PORT}/api/v1/challenges`);
  console.log(`👉 Leaderboard (F27):   http://localhost:${PORT}/api/v1/leaderboard`);
  console.log(`👉 Bug Reporting (F30): POST http://localhost:${PORT}/api/v1/bugs/report`);
  console.log(`👉 AI Vision Ingest:    POST http://localhost:${PORT}/api/v1/ai/vision-result`);
  console.log('======================================================');
});
