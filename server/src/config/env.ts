import { cleanEnv, str, bool, port, url } from 'envalid';

const isTest = process.env.NODE_ENV === 'test';

export const env = cleanEnv(
  process.env,
  isTest
    ? {
        SUPABASE_URL: url({ default: 'http://localhost' }),
        SUPABASE_SERVICE_ROLE_KEY: str({ default: 'dummy' }),
        SENTRY_DSN: str({ default: 'dummy' }),
        SENTRY_DSN_SERVER: str({ default: 'dummy' }),
        SENTRY_ENVIRONMENT: str({ default: 'development' }),
        SENTRY_RELEASE: str({ default: 'test-release' }),
        SENTRY_ORG: str({ default: 'dummy-org' }),
        SENTRY_PROJECT: str({ default: 'dummy-project' }),
        SENTRY_AUTH_TOKEN: str({ default: 'dummy-token' }),
        LOGTAIL_SOURCE_TOKEN: str({ default: 'dummy' }),
        OPENAI_API_KEY: str({ default: 'dummy-key' }),
        DISABLE_OPENAI: bool({ default: false }),
        LLM_PROMPT_STYLE: str({ default: 'DEFAULT' }),
        LOG_LLM_OUTPUT: bool({ default: false }),
        PORT: port({ default: 3001 }),
        YOUTUBE_API_KEY: str({ default: 'test-api-key' }),
        NODE_ENV: str({ default: 'test' }),
      }
    : {
        SUPABASE_URL: url(),
        SUPABASE_SERVICE_ROLE_KEY: str(),
        SENTRY_DSN: str(),
        SENTRY_DSN_SERVER: str(),
        SENTRY_ENVIRONMENT: str(),
        SENTRY_RELEASE: str(),
        SENTRY_ORG: str(),
        SENTRY_PROJECT: str(),
        SENTRY_AUTH_TOKEN: str(),
        LOGTAIL_SOURCE_TOKEN: str(),
        OPENAI_API_KEY: str(),
        DISABLE_OPENAI: bool(),
        LLM_PROMPT_STYLE: str(),
        LOG_LLM_OUTPUT: bool(),
        PORT: port(),
        YOUTUBE_API_KEY: str(),
        NODE_ENV: str(),
      },
);
