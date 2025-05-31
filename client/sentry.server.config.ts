// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  dsn: process.env.SENTRY_DSN_CLIENT,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      // Don't send events in dev, just log
      // eslint-disable-next-line no-console
      console.warn('[Sentry] Would send event:', event);
      return null;
    }
    return event;
  },
});
