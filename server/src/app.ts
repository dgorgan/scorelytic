import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { errorHandler } from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';

import biasReportRoutes from './routes/biasReport';
import sentimentRoutes from './routes/sentiment';
import reviewRoutes from './routes/review';
import gameRoutes from './routes/game';
import youtubeRoutes from './routes/youtube';
import creatorRoutes from './routes/creator';

dotenv.config();

const app: express.Application = express();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [Sentry.expressIntegration()],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Test route
app.get('/', (_req, res) => res.send('Scorelytic API'));

// API routes
app.use('/api/bias-report', biasReportRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/creator', creatorRoutes);

// Debug/test route for Sentry
app.get('/debug-sentry', (_req, _res) => {
  throw new Error('My first Sentry error!');
});

// Sentry error handler after routes
app.use(Sentry.expressErrorHandler());

// Custom error handler
app.use(errorHandler);

// Fallback error handler to return Sentry event ID
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.statusCode = 500;
  const sentryId = (res as any).sentry;
  res.end(sentryId ? `Sentry Event ID: ${sentryId}` : 'Internal Server Error');
});

export default app;
