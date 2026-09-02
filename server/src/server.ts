require('dotenv').config();
import express from 'express';
import path from 'path';
import { env } from '@/config/env';
import app from '@/app';
import logger from '@/logger';
const Sentry = require('@sentry/node');
import fs from 'fs';
// const cookiesPath = path.join(process.cwd(), 'cookies.txt');
// console.log('[startup] cookies.txt exists:', fs.existsSync(cookiesPath));
// console.log('[startup] process.cwd():', process.cwd());
// console.log('[startup] __dirname:', __dirname);
// if (fs.existsSync(cookiesPath)) {
//   const stat = fs.statSync(cookiesPath);
//   console.log('[startup] cookies.txt size:', stat.size);
// }

// Use the port from env (Render injects it); fallback for local if needed
const PORT = env.PORT;

if (!PORT) {
  logger.error({ env: process.env }, 'PORT is not defined in the environment');
  process.exit(1);
}

// Serve static demo assets
app.use('/demos', express.static(path.join(__dirname, '../demos')));

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, '✅ Server running');
});

// Graceful error handling
process.on('uncaughtException', (err) => {
  logger.error({ message: err.message, stack: err.stack }, '❌ Uncaught Exception');
  Sentry.captureException(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const errorObj = reason as any;
  logger.error({ message: errorObj?.message, stack: errorObj?.stack }, '❌ Unhandled Rejection');
  Sentry.captureException(reason);
  process.exit(1);
});
