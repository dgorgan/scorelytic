import dotenv from 'dotenv';
dotenv.config();

import { cleanEnv, str, bool, port } from 'envalid';
cleanEnv(process.env, {
  SUPABASE_URL: str(),
  SUPABASE_SERVICE_ROLE_KEY: str(),
  SENTRY_DSN: str(),
  SENTRY_ENVIRONMENT: str(),
  SENTRY_RELEASE: str(),
  SENTRY_ORG: str(),
  SENTRY_PROJECT: str(),
  SENTRY_AUTH_TOKEN: str(),
  LOGTAIL_SOURCE_TOKEN: str(),
  OPENAI_API_KEY: str(),
  DISABLE_OPENAI: bool(),
  LLM_PROMPT_STYLE: str(),
  PORT: port(),
  YOUTUBE_API_KEY: str(),
});

import app from '@/app';
import logger from '@/logger';
import * as Sentry from '@sentry/node';

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  // Only require module-alias in production
  require('module-alias/register');
}

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
