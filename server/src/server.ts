require('dotenv').config();
import express from 'express';
import path from 'path';
import { env } from '@/config/env';
import app from '@/app';
import logger from '@/logger';
const Sentry = require('@sentry/node');
import fs from 'fs';
const cookiesPath = path.resolve(__dirname, '../../../cookies.txt');
console.log('[startup] cookies.txt exists:', fs.existsSync(cookiesPath));
if (fs.existsSync(cookiesPath)) {
  const stat = fs.statSync(cookiesPath);
  console.log('[startup] cookies.txt size:', stat.size);
}

// Use the port from env (Render injects it); fallback for local if needed
const PORT = env.PORT;

if (!PORT) {
  logger.error('PORT is not defined in the environment');
  process.exit(1);
}

// Serve static demo assets
app.use('/demos', express.static(path.join(__dirname, '../demos')));

// Start server
app.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT}`);
});

// Graceful error handling
process.on('uncaughtException', (err) => {
  logger.error(err, '❌ Uncaught Exception');
  Sentry.captureException(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(reason, '❌ Unhandled Rejection');
  Sentry.captureException(reason);
  process.exit(1);
});
