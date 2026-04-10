import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SearchPage } from '../../pages/SearchPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

/**
 * Authenticated workflow tests
 *
 * Risk rationale: The core value of the product lives behind auth.
 * The search → property detail flow is the primary user journey and
 * must work reliably for every logged-in session.
 *
 * These tests require real credentials in .env (TEST_USER_EMAIL / PASSWORD).
 * If credentials are absent, the tests are skipped gracefully to prevent
 * CI failures in environments where secrets haven't been configured.
 *
 * @tag @auth
 */

const EMAIL = process.env.TEST_USER_EMAIL ?? '';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? '';
const SEARCH_ADDRESS = process.env.TEST_SEARCH_ADDRESS ?? '227 W Monroe St, Chicago';

test.describe('Authenticated Workflows', () => {
  // Skip the entire suite if no credentials are available
  test.beforeAll(() => {
    if (!EMAIL || !PASSWORD) {
      console.warn(
        '[SKIP] Authenticated tests require TEST_USER_EMAIL and TEST_USER_PASSWORD in .env'
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Missing TEST_USER_EMAIL / TEST_USER_PASSWORD');

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.loginSuccessfully(EMAIL, PASSWORD);
  });

  test(
    '@auth – authenticated user reaches the app dashboard after login',
    async ({ page }) => {
      // After a successful login we should NOT be on the login page
      await expect(page).not.toHaveURL(/login|signin|auth/i, { timeout: 15_000 });

      // The page should contain something meaningful (heading / nav)
      // The WD logo is visible on every authenticated page — reliable post-login signal
await expect(
  page.locator('[data-test="wd-logo"]')
).toBeVisible({ timeout: 15_000 });
    }
  );

  test(
    '@auth @smoke – search input is accessible post-login',
    async ({ page }) => {
      const searchPage = new SearchPage(page);
      await searchPage.assertSearchInputVisible();
    }
  );

  test(
    '@auth – typing an address shows autocomplete suggestions',
    async ({ page }) => {
      const searchPage = new SearchPage(page);
      await searchPage.typeSearchQuery(SEARCH_ADDRESS);
      await searchPage.assertSuggestionsVisible();
    }
  );

  test(
    '@auth – selecting a search suggestion navigates to a property detail page',
    async ({ page }) => {
      const searchPage = new SearchPage(page);
      const detailPage = new PropertyDetailPage(page);

      await searchPage.typeSearchQuery(SEARCH_ADDRESS);
      await searchPage.assertSuggestionsVisible();
      await searchPage.selectFirstSuggestion();

      // The detail page should load with a property name heading
      await detailPage.assertDetailPageLoaded();
    }
  );

  test(
    '@auth – property detail page contains key data sections',
    async ({ page }) => {
      const searchPage = new SearchPage(page);
      const detailPage = new PropertyDetailPage(page);

      await searchPage.typeSearchQuery(SEARCH_ADDRESS);
      await searchPage.assertSuggestionsVisible();
      await searchPage.selectFirstSuggestion();
      await detailPage.assertDetailPageLoaded();

      // Structural assertion: key data sections must render.
      // We do NOT assert specific values (dynamic data → flaky tests).
      await detailPage.assertKeyDataSectionsPresent();
    }
  );
});
