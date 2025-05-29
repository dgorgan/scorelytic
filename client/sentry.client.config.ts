import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Sentry] Would send event:', event);
      return null;
    }
    return event;
  },
});
