import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PropertyDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Locators ──────────────────────────────────────────────────────────────

  get propertyName() {
    return this.page.locator('[data-test="propertyName"]');
  }

  get metricsSection() {
    return this.page.locator('[data-test="neighborhoodNationalPercentileCard"]');
  }

  get mapComponent() {
  return this.page.locator('canvas.mapboxgl-canvas').first();
}

  // ── Assertions ────────────────────────────────────────────────────────────

  async assertDetailPageLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL('/', { timeout: 15_000 });
    await expect(this.propertyName).toBeVisible({ timeout: 15_000 });
  }

  async assertKeyDataSectionsPresent(): Promise<void> {
    await expect(this.metricsSection).toBeVisible({ timeout: 12_000 });
  }

  async assertMapPresent(): Promise<void> {
    await expect(this.mapComponent).toBeVisible({ timeout: 15_000 });
  }

  async assertAddressContains(partial: string): Promise<void> {
    await expect(this.propertyName).toContainText(partial, { timeout: 10_000 });
  }
}