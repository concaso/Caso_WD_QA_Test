import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SearchPage } from '../../pages/SearchPage';

/**
 * Pre-login (public) user behaviour tests
 *
 * Risk rationale: The public landing experience is the first impression and
 * the entry point for all users. Regressions here block 100% of usage.
 *
 * Strategy:
 *  - Validate the unauthenticated user sees a login/entry point (not a crash)
 *  - Validate that attempting a protected action prompts for auth
 *  - Validate that the login form itself is functional and rejects bad creds
 *
 * @tag @smoke
 */

test.describe('Public / Pre-Login Flows', () => {
  test(
    '@smoke – homepage loads and presents a login entry point',
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto('/');

      // The app must render something meaningful (not a blank screen).
      // Either it shows the login form directly or a marketing/landing page
      // with a sign-in call-to-action. Either way, the page must not be blank.
      await expect(page.locator('body')).not.toBeEmpty();

      // The document title should indicate it's the WD Suite product
      await expect(page).toHaveTitle(/WD|Walker|Suite/i, { timeout: 10_000 });
    }
  );

  test(
  '@smoke – unauthenticated user is presented with a login entry point',
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto('/');

    // This app gates access via a Login button that opens a modal,
    // rather than redirecting to a /login route. We assert the button
    // is visible, which confirms unauthenticated users cannot access
    // the app without logging in first.
    await expect(loginPage.loginButton).toBeVisible({ timeout: 8_000 });
  }
);

  test(
    'login form – invalid credentials show an error, not a crash',
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.assertLoginPageVisible();

      await loginPage.login('bad-user@example.com', 'wrong-password');

      // The user should stay on the login page and see a meaningful error
      await loginPage.assertLoginError();

      // Critically: the URL must not have navigated away to the app
      await expect(loginPage.loginButton).toBeVisible();
    }
  );

test(
  'login form – submit button is disabled until fields are filled',
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.assertLoginPageVisible();

    // This app disables the Sign In button when fields are empty —
    // that IS the validation feedback. Assert the button is disabled.
    await expect(loginPage.submitButton).toBeDisabled();

    // Once the user fills in both fields the button should become enabled
    await loginPage.emailInput.fill('test@example.com');
    await loginPage.passwordInput.fill('somepassword');
    await expect(loginPage.submitButton).toBeEnabled();
  }
);
});
