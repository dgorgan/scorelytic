import app from '@/app';
import logger from '@/logger';
import * as Sentry from '@sentry/node';

const PORT = process.env.PORT || 3001;

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
