import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Locators ──────────────────────────────────────────────────────────────

  get loginButton() {
    return this.page.locator('[data-test="login-button"]');
  }

  get emailInput() {
    return this.page.locator('[data-test="userEmail"]');
  }

  get passwordInput() {
    return this.page.locator('[data-test="userPassword"]');
  }

  get submitButton() {
    return this.page.locator('[data-test="signInButton"]');
  }

  get errorMessage() {
  return this.page.getByRole('alert');
}

  // ── Actions ───────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.goto('/');
  }

  async login(email: string, password: string): Promise<void> {
  // Only click the login button if the modal isn't already open
  const emailAlreadyVisible = await this.emailInput
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (!emailAlreadyVisible) {
    await this.loginButton.click();
    await this.emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  }

  await this.emailInput.fill(email);
  await this.passwordInput.fill(password);
  await this.submitButton.click();

  await Promise.race([
    this.page.waitForURL(url => !url.href.includes('login'), { timeout: 20_000 }),
    this.errorMessage.waitFor({ state: 'visible', timeout: 10_000 }),
  ]).catch(() => {});
}

  async loginSuccessfully(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await expect(this.page).not.toHaveURL(/login|signin/, { timeout: 20_000 });
  }

async assertLoginPageVisible(): Promise<void> {
  const emailAlreadyVisible = await this.emailInput
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (!emailAlreadyVisible) {
    await this.loginButton.waitFor({ state: 'visible' });
    await this.loginButton.click();
  }

  await expect(this.emailInput).toBeVisible();
  await expect(this.passwordInput).toBeVisible();
  await expect(this.submitButton).toBeVisible();
}
async assertLoginError(): Promise<void> {
  await expect(this.errorMessage).toBeVisible({ timeout: 8_000 });
}
}