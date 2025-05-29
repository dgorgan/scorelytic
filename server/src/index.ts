import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';
import logger from './logger';
import { initSentry } from './sentry';
import Sentry from './sentry';

// Import routes
import biasReportRoutes from './routes/biasReport';
import sentimentRoutes from './routes/sentiment';
import reviewRoutes from './routes/review';
import gameRoutes from './routes/game';
import youtubeRoutes from './routes/youtube';
import creatorRoutes from './routes/creator';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/bias-report', biasReportRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/creator', creatorRoutes);

// Error handling
app.use(errorHandler);

initSentry();

process.on('uncaughtException', (err) => {
  logger.error(err, 'Uncaught Exception');
  Sentry.captureException(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(reason, 'Unhandled Rejection');
  Sentry.captureException(reason);
  process.exit(1);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
