# Scorelytic Server

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SENTRY_DSN
- SENTRY_ENVIRONMENT
- SENTRY_RELEASE
- SENTRY_ORG
- SENTRY_PROJECT
- SENTRY_AUTH_TOKEN
- LOGTAIL_SOURCE_TOKEN
- OPENAI_API_KEY
- DISABLE_OPENAI
- LLM_PROMPT_STYLE
- PORT
- YOUTUBE_API_KEY

## Setup

1. Install dependencies: `pnpm install`
2. Start dev server: `pnpm --filter server dev`

# Supabase Schema Setup

## Seeding the Database

1. Set your Supabase credentials in a `.env` file:

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Run the seed script (add a script or run via ts-node):
   ```sh
   npx ts-node utils/seedSupabase.ts
   ```

## Running Tests

```sh
pnpm --filter server test
```

# Server Workspace

## Start the Server

### Development

```
pnpm --filter server dev
```

- Starts the server using `src/index.ts` as the entrypoint
- Loads and validates environment variables at startup

### Production

```
pnpm --filter server build
pnpm --filter server start
```

- Builds TypeScript to `dist/`
- Runs the server from `dist/index.js`

## Entrypoint

- The only entrypoint is `src/index.ts` (do not use `server.ts` or duplicate entry files)
- All environment variables are loaded and validated at the top of `src/index.ts`
- All shared code must be imported from `@scorelytic/shared` (root only, no subpath imports)
