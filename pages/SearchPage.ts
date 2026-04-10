import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * SearchPage – encapsulates the property address-search experience.
 *
 * The search bar is the primary entry point for the core user journey,
 * so it warrants its own POM with clear, stable selectors.
 */
export class SearchPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Locators ──────────────────────────────────────────────────────────────

  /**
   * The main search input. We prefer a role+placeholder/label match over
   * a CSS class that can be minified away on the next build.
   */
  get searchInput() {
    return this.page.getByRole('combobox').or(
      this.page.getByPlaceholder(/search|address|property/i)
    ).first();
  }

  /** Autocomplete suggestion list */
  get suggestionList() {
    return this.page.getByRole('listbox').or(
      this.page.locator('[class*="suggestion"], [class*="autocomplete"], [class*="dropdown"]').first()
    );
  }

  /** Individual suggestion items */
  get suggestionItems() {
    return this.suggestionList.getByRole('option').or(
      this.suggestionList.locator('li, [class*="item"], [class*="result"]')
    );
  }

  /** Map container – present on the main search results view */
  get mapContainer() {
  return this.page.locator('canvas.mapboxgl-canvas').first();
}

  /** Property cards / result list items */
  get propertyCards() {
    return this.page.locator(
      '[class*="property-card"], [class*="result-card"], [data-testid*="property"]'
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.goto('/');
  }

  /**
   * Type a query and wait for the autocomplete list to appear.
   * Uses a small debounce-aware delay – no arbitrary sleep; we wait for
   * the list to become visible, which is the real readiness signal.
   */
  async typeSearchQuery(query: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(query);
    await this.suggestionList.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /** Select the first suggestion that matches the given text (partial match). */
  async selectSuggestion(text: string): Promise<void> {
    const match = this.suggestionItems.filter({ hasText: text }).first();
    await match.waitFor({ state: 'visible', timeout: 8_000 });
    await match.click();
  }

  /** Select the first suggestion unconditionally. */
  async selectFirstSuggestion(): Promise<void> {
    const first = this.suggestionItems.first();
    await first.waitFor({ state: 'visible', timeout: 8_000 });
    await first.click();
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async assertSearchInputVisible(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
  }

  async assertSuggestionsVisible(): Promise<void> {
    await expect(this.suggestionList).toBeVisible();
    await expect(this.suggestionItems.first()).toBeVisible();
  }

  async assertMapVisible(): Promise<void> {
    await expect(this.mapContainer).toBeVisible({ timeout: 15_000 });
  }
}
