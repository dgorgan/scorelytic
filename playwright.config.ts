import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'client/test/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30000,
  retries: 0,
  use: {
    headless: true,
    baseURL: 'http://localhost:4000',
  },
});
