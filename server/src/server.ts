require('dotenv').config();
const Sentry = require('@sentry/node');
import { env } from '@/config/env';
import app from '@/app';
import logger from '@/logger';
import express from 'express';
import path from 'path';

const PORT = env.PORT;

app.use('/demos', express.static(path.join(__dirname, '../demos')));

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
