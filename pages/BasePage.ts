import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage – shared helpers used across all page objects.
 * Centralises waiting logic so individual POMs stay lean.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for the SPA to finish its initial JS hydration.
   * WD Suite is a JS-heavy SPA; we wait for network idle + no spinner.
   */
  async waitForAppReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    // Dismiss any cookie / consent banners that could block interactions
    const consentBtn = this.page.getByRole('button', { name: /accept|agree|ok/i });
    if (await consentBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await consentBtn.click();
    }
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    await this.waitForAppReady();
  }
}
