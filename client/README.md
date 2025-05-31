# Scorelytic Client

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_SENTRY_DSN
- NEXT_PUBLIC_SENTRY_ENVIRONMENT
- NEXT_PUBLIC_SENTRY_RELEASE

## Setup

1. Install dependencies: `pnpm install`
2. Start dev server: `pnpm --filter client dev`

This is a [Next.js](https://nextjs.org) project in a pnpm monorepo. Use pnpm workspace commands for all operations.

## Getting Started

First, run the development server:

```bash
pnpm --filter client dev
```

Open [http://localhost:4000](http://localhost:4000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Sentry Error Tracking

This project uses [Sentry](https://sentry.io/) for error and performance monitoring.

### Environment Variables

- `SENTRY_DSN` (required)
- `SENTRY_ENVIRONMENT` (optional, e.g. development, production)
- `SENTRY_RELEASE` (optional, e.g. git SHA)
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (optional, for source maps)

### Manual Error Logging Example

```
import * as Sentry from '@sentry/nextjs';

try {
  throw new Error('Manual test error');
} catch (err) {
  Sentry.captureException(err);
  Sentry.addBreadcrumb({
    category: 'custom',
    message: 'Manual error thrown in layout',
    level: 'error',
  });
}
```

### Notes

- In development, Sentry logs are console-only.
- In production, errors and performance data are sent to Sentry.
- Sentry is initialized in both `sentry.client.config.ts` and `sentry.server.config.ts`.
