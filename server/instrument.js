const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN_SERVER,
  sendDefaultPii: true,
});

module.exports = Sentry;
