import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SearchPage } from '../../pages/SearchPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

/**
 * Map component – lightweight presence & behaviour tests
 *
 * Risk rationale: The map is a core UI differentiator for a CRE platform.
 * However, deep map interaction testing (dragging, tile loading, marker
 * accuracy) is fragile and offers low signal relative to cost.
 *
 * Strategy:
 *   - Assert the map container renders and is not hidden (high value)
 *   - Assert the map doesn't block other UI (z-index / overlay trap)
 *   - Skip asserting specific tile content or marker pixel positions
 *
 * @tag @map
 */

const EMAIL = process.env.TEST_USER_EMAIL ?? '';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? '';
const SEARCH_ADDRESS = process.env.TEST_SEARCH_ADDRESS ?? '227 W Monroe St, Chicago';

test.describe('Map Component', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Missing TEST_USER_EMAIL / TEST_USER_PASSWORD');

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.loginSuccessfully(EMAIL, PASSWORD);
  });

 test(
  '@map – map container is visible after navigating to a property',
  async ({ page }) => {
    const searchPage = new SearchPage(page);
    const detailPage = new PropertyDetailPage(page);

    await searchPage.typeSearchQuery(SEARCH_ADDRESS);
    await searchPage.assertSuggestionsVisible();
    await searchPage.selectFirstSuggestion();
    await detailPage.assertDetailPageLoaded();
    await detailPage.assertMapPresent();
  }
);

  test(
    '@map – map renders on the property detail page',
    async ({ page }) => {
      const searchPage = new SearchPage(page);
      const detailPage = new PropertyDetailPage(page);

      await searchPage.typeSearchQuery(SEARCH_ADDRESS);
      await searchPage.assertSuggestionsVisible();
      await searchPage.selectFirstSuggestion();
      await detailPage.assertDetailPageLoaded();

      // A property detail map provides geographic context — it must be present
      await detailPage.assertMapPresent();
    }
  );

  test(
    '@map – map does not capture pointer events and block other UI elements',
    async ({ page }) => {
      const searchPage = new SearchPage(page);
      await searchPage.typeSearchQuery(SEARCH_ADDRESS);
      await searchPage.assertSuggestionsVisible();

      // The search input must still be focusable / interactable while map is visible
      // This catches z-index overlay issues where the map canvas traps clicks
      await expect(searchPage.searchInput).toBeEnabled();
      await searchPage.searchInput.click(); // must not throw
      await searchPage.searchInput.fill('test click through');
    }
  );
});
