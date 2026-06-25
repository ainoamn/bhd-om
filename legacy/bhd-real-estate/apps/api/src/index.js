import 'dotenv/config';
import { config } from './config.js';
import { createApp } from './app.js';
import { startTrialExpiryJob } from './jobs/trial-expiry.js';

const app = createApp();

if (process.env.TRIAL_EXPIRY_JOB !== '0') {
  startTrialExpiryJob();
}

app.listen(config.port, config.host, () => {
  console.log(`BHD Cloud API: http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}/`);
  console.log(`Health: http://localhost:${config.port}/api/v1/health`);
});
