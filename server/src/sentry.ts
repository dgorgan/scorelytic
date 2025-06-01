import * as Sentry from '@sentry/node';
import { env } from './config/env';

export const initSentry = () => {
  if (env.SENTRY_DSN_SERVER) {
    Sentry.init({
      dsn: env.SENTRY_DSN_SERVER,
      tracesSampleRate: 1.0,
      environment: env.SENTRY_ENVIRONMENT,
    });
  }
};

export default Sentry;
