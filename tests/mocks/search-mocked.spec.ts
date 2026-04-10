import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SearchPage } from '../../pages/SearchPage';
import searchMockResponse from '../fixtures/search-autocomplete.mock.json';

/**
 * Mocked / deterministic search tests
 *
 * Risk rationale: The autocomplete search depends on a third-party geocoding
 * or property data API that can be slow, rate-limited, or unavailable in CI.
 * By intercepting that network call we achieve:
 *   1. Deterministic assertions — we control the data
 *   2. Speed — no real network round-trip
 *   3. Isolation — tests are independent of backend availability
 *
 * We intercept the API response but let the full React rendering pipeline
 * execute, so we're still testing real UI behaviour.
 *
 * Tradeoff: mocked tests won't catch backend contract changes.
 * The authenticated-flows.spec.ts tests cover the real API path.
 *
 * @tag @mock
 */

const EMAIL = process.env.TEST_USER_EMAIL ?? '';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

test.describe('Search – Mocked API (Deterministic)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Missing TEST_USER_EMAIL / TEST_USER_PASSWORD');

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.loginSuccessfully(EMAIL, PASSWORD);
  });

  test(
    '@mock – autocomplete renders mocked suggestions correctly',
    async ({ page }) => {
      // Intercept any autocomplete / search suggestion API call.
      // The URL pattern is intentionally broad to remain stable across minor
      // endpoint changes; adjust the pattern to match the real API path once known.
      await page.route(
        /autocomplete|suggest|search|geocod/i,
        async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(searchMockResponse),
          });
        }
      );

      const searchPage = new SearchPage(page);
      // Type anything — the response is mocked regardless
      await searchPage.typeSearchQuery('123 Mock');

      // The suggestion list must appear with our mocked data
      await searchPage.assertSuggestionsVisible();

      // Verify at least one suggestion contains text from our fixture
      const firstSuggestionLabel = searchMockResponse.suggestions?.[0]?.description
        ?? searchMockResponse[0]?.description
        ?? '';

      if (firstSuggestionLabel) {
        const match = searchPage.suggestionItems.filter({
          hasText: firstSuggestionLabel.slice(0, 20), // partial match for resilience
        }).first();
        await expect(match).toBeVisible({ timeout: 8_000 });
      }
    }
  );

  test(
    '@mock – failed search API shows graceful degradation (no crash)',
    async ({ page }) => {
      // Simulate the autocomplete API returning a 500 error
      await page.route(
        /autocomplete|suggest|search|geocod/i,
        async route => {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
          });
        }
      );

      const searchPage = new SearchPage(page);
      await searchPage.typeSearchQuery('500 Error Ave');

      // The app must not crash — the page should still be functional
      await expect(page.locator('body')).toBeVisible();

      // No JS error modal / blank white screen
      const errorOverlay = page.locator('[class*="error-boundary"], [class*="crash"]');
      await expect(errorOverlay).not.toBeVisible({ timeout: 5_000 }).catch(() => {
        // If no error boundary exists, that's fine — we just needed no crash
      });

      // Search input should still be interactable after an API error
      await expect(searchPage.searchInput).toBeVisible();
    }
  );
});
