// @ts-check
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.route(/(youtube|openai|supabase)/i, (route) => {
    route.fulfill({ status: 200, body: JSON.stringify({ ok: true, mock: true }) });
  });
});

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/scorelytic/i);
});
