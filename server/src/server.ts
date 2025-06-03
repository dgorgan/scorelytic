require('dotenv').config();
const Sentry = require('@sentry/node');
import { env } from '@/config/env';
import app from '@/app';
import logger from '@/logger';

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

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
