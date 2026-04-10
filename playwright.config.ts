import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

/**
 * AUTH_STATE_FILE – written by utils/global-setup.ts when
 * ENABLE_GLOBAL_SETUP=true. When present, authenticated projects
 * reuse this session instead of logging in on every test.
 */
const AUTH_STATE_FILE = path.join(__dirname, 'tests/fixtures/auth-state.json');
const USE_GLOBAL_SETUP = process.env.ENABLE_GLOBAL_SETUP === 'true';

export default defineConfig({
  testDir: './tests',

  // Sequential avoids rate-limiting from the shared staging environment.
  // Increase workers once you have a dedicated test tenant.
  fullyParallel: false,
  workers: 1,

  // Hard-fail on test.only left in code on CI
  forbidOnly: !!process.env.CI,

  // One retry on CI gives flaky network tests a second chance without masking bugs
  retries: process.env.CI ? 1 : 0,

  timeout: 45_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'],
  ],

  // Global setup writes auth state to disk; opt-in via ENABLE_GLOBAL_SETUP=true
  ...(USE_GLOBAL_SETUP && {
    globalSetup: './utils/global-setup.ts',
  }),

  use: {
    baseURL: process.env.BASE_URL ?? 'https://suite.walkerdunlop.com',

    // Artifacts captured on failure/retry for easier debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',

    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // ── Public / unauthenticated ──────────────────────────────────────────
    {
      name: 'public',
      testMatch: '**/auth/public-flows.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Authenticated ─────────────────────────────────────────────────────
    {
      name: 'authenticated',
      testMatch: [
        '**/auth/authenticated-flows.spec.ts',
        '**/search/map-component.spec.ts',
        '**/search/property-search.spec.ts',
        '**/mocks/search-mocked.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        ...(USE_GLOBAL_SETUP && { storageState: AUTH_STATE_FILE }),
      },
    },

    // ── Accessibility ─────────────────────────────────────────────────────
    {
      name: 'accessibility',
      testMatch: '**/accessibility/a11y-smoke.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
