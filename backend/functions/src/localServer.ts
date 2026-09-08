/**
 * SportX Local Demo Server
 * Run: npx ts-node src/localServer.ts
 */
import { app } from './index';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║          ⚡  S P O R T X   A P I  ⚡             ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  🟢  Server   : http://localhost:${PORT}`);
  console.log(`  📖  API Docs : http://localhost:${PORT}/api/v1`);
  console.log(`  ❤️  Health   : http://localhost:${PORT}/health`);
  console.log('');
  console.log('  Demo Quick-start:');
  console.log('  ─────────────────────────────────────────────────');
  console.log(`  POST /api/v1/auth/login   body: { email: "demo@sportx.app", password: "demo" }`);
  console.log(`  GET  /api/v1/workouts/today  (use the returned token as Bearer)`);
  console.log('');
  console.log('  Mode: IN-MEMORY DEMO (no Firebase credentials needed)');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down SportX API...');
  server.close(() => process.exit(0));
});
