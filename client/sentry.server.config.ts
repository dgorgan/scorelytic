// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

if (!process.env.SENTRY_AUTH_TOKEN) {
  console.warn('No Sentry auth token, skipping release upload');
} else {
  Sentry.init({
    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
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
}
