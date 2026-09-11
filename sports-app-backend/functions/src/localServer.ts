import { app } from './index';
import { config } from './config/environment';

const port = config.port || 8000;

app.listen(port, () => {
  console.log('================================================================');
  console.log(`⚡ SportX Core Backend running locally on http://localhost:${port}`);
  console.log(`📡 Base API Endpoint: http://localhost:${port}/api/v1`);
  console.log(`🛡️  App Check Enforced: ${config.appCheckEnforced}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log('================================================================');
});
