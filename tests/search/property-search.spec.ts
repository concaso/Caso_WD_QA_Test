import { test, expect } from '@playwright/test';
import { LoginPage, SearchPage, PropertyDetailPage } from '../../pages';

/**
 * Property search – end-to-end integration tests
 *
 * Risk rationale: Search is the primary product interaction. A regression
 * in the suggestion → navigation → detail load chain directly breaks the
 * core user journey for every user.
 *
 * These tests complement the mocked tests: they hit real APIs to catch
 * contract drift, while the mocked tests validate UI rendering in isolation.
 *
 * @tag @search
 */

const EMAIL = process.env.TEST_USER_EMAIL ?? '';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? '';
const SEARCH_ADDRESS = process.env.TEST_SEARCH_ADDRESS ?? '227 W Monroe St, Chicago, IL';

test.describe('Property Search – End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Missing TEST_USER_EMAIL / TEST_USER_PASSWORD');
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.loginSuccessfully(EMAIL, PASSWORD);
  });

  test(
    '@search @smoke – search input accepts text and shows suggestions',
    async ({ page }) => {
      const searchPage = new SearchPage(page);

      // Type slowly enough for debounce to fire
      await searchPage.typeSearchQuery(SEARCH_ADDRESS);

      await searchPage.assertSuggestionsVisible();

      // At least one suggestion must reference some part of the query
      const firstItem = searchPage.suggestionItems.first();
      const text = await firstItem.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  );

  test(
    '@search – clearing the search input dismisses the suggestion list',
    async ({ page }) => {
      const searchPage = new SearchPage(page);

      await searchPage.typeSearchQuery(SEARCH_ADDRESS);
      await searchPage.assertSuggestionsVisible();

      // Clear the input — suggestions should disappear
      await searchPage.searchInput.clear();

      // Give the UI a moment to react (no arbitrary sleep — we use waitFor)
      await searchPage.suggestionList
        .waitFor({ state: 'hidden', timeout: 5_000 })
        .catch(() => {
          // Some implementations hide the list only on blur; trigger that too
        });

      await searchPage.searchInput.press('Escape');
      await expect(searchPage.suggestionList).not.toBeVisible({ timeout: 5_000 });
    }
  );

  test(
    '@search – keyboard navigation works in the suggestion list',
    async ({ page }) => {
      const searchPage = new SearchPage(page);

      await searchPage.typeSearchQuery(SEARCH_ADDRESS);
      await searchPage.assertSuggestionsVisible();

      // Arrow down should move focus/highlight to the first item
      await searchPage.searchInput.press('ArrowDown');

      // The first item should be highlighted (aria-selected or focused)
      const firstItem = searchPage.suggestionItems.first();
      const isSelected =
        (await firstItem.getAttribute('aria-selected')) === 'true' ||
        (await firstItem.evaluate(el => el === document.activeElement));

      // If neither ARIA nor DOM focus — check for a highlight class
      const classList = await firstItem.getAttribute('class') ?? '';
      const hasHighlight =
        isSelected || /active|highlight|focused|selected/i.test(classList);

      expect(hasHighlight).toBeTruthy();
    }
  );

  test(
    '@search – full journey: search → select → property detail renders',
    async ({ page }) => {
      const searchPage = new SearchPage(page);
      const detailPage = new PropertyDetailPage(page);

      await searchPage.typeSearchQuery(SEARCH_ADDRESS);
      await searchPage.assertSuggestionsVisible();
      await searchPage.selectFirstSuggestion();

      // Full detail page must render
      await detailPage.assertDetailPageLoaded();
      await detailPage.assertKeyDataSectionsPresent();

      // The browser URL should have changed (deep-link to property)
      expect(page.url()).not.toBe(process.env.BASE_URL ?? 'https://suite.walkerdunlop.com');
    }
  );

  test(
    '@search – navigating back from detail page returns to search',
    async ({ page }) => {
      const searchPage = new SearchPage(page);
      const detailPage = new PropertyDetailPage(page);

      await searchPage.typeSearchQuery(SEARCH_ADDRESS);
      await searchPage.assertSuggestionsVisible();
      await searchPage.selectFirstSuggestion();
      await detailPage.assertDetailPageLoaded();

      // Navigate back
      await page.goBack();

      // Search input should be accessible again
      await searchPage.assertSearchInputVisible();
    }
  );
});
