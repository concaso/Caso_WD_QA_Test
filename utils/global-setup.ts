import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const AUTH_FILE = path.join(__dirname, '../fixtures/auth-state.json');

/**
 * Global setup: log in once and save the auth state to disk.
 *
 * Benefits:
 *   - Each test file doesn't need to re-authenticate, saving ~3-5s per test
 *   - The saved state (cookies + localStorage) is reused via storageState
 *   - A single login failure is obvious rather than N parallel failures
 *
 * To use this, uncomment `globalSetup` in playwright.config.ts and add
 * `storageState: AUTH_FILE` to the project use block.
 *
 * NOTE: Not activated by default in this submission because it requires
 * credentials. Enabled by setting ENABLE_GLOBAL_SETUP=true in .env.
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.log('[globalSetup] No credentials found – skipping auth state setup.');
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const baseURL = process.env.BASE_URL ?? 'https://suite.walkerdunlop.com';
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');

    // Fill login form
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    await page.getByRole('textbox', { name: /password/i }).fill(password);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
    await page.waitForURL(url => !url.href.includes('login'), { timeout: 20_000 });

    // Persist auth state for reuse
    await page.context().storageState({ path: AUTH_FILE });
    console.log(`[globalSetup] Auth state saved to ${AUTH_FILE}`);
  } catch (err) {
    console.error('[globalSetup] Login failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
