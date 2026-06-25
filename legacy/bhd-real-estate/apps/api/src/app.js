import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { buildingsRouter } from './routes/buildings.js';
import { unitsRouter } from './routes/units.js';
import { companyDataRouter } from './routes/company-data.js';
import { partiesRouter } from './routes/parties.js';
import { saasRouter } from './routes/saas.js';
import { companiesRouter } from './routes/companies.js';
import { contractsRouter } from './routes/contracts.js';
import { filesRouter } from './routes/files.js';

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '50mb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const v1 = express.Router();
  v1.use('/health', healthRouter);
  v1.use('/auth', authLimiter, authRouter);
  v1.use('/saas', saasRouter);
  v1.use('/companies', companiesRouter);
  v1.use('/buildings', buildingsRouter);
  v1.use('/units', unitsRouter);
  v1.use('/contracts', contractsRouter);
  v1.use('/company-data', companyDataRouter);
  v1.use('/parties', partiesRouter);
  v1.use('/files', filesRouter);

  app.use('/api/v1', v1);

  app.use(errorHandler);
  return app;
}
