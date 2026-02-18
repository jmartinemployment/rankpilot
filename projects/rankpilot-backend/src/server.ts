import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { loadEnvironment } from './config/environment.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import sitesRouter from './routes/sites.js';
import crawlsRouter from './routes/crawls.js';
import reportsRouter from './routes/reports.js';
import analyticsRouter from './routes/analytics.js';

const env = loadEnvironment();
const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use(healthRouter);
app.use(analyticsRouter);
app.use(sitesRouter);
app.use(crawlsRouter);
app.use(reportsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`RankPilot backend running on port ${env.PORT}`, {
    env: env.NODE_ENV,
  });
});

export default app;
