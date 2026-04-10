import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { LoginPage } from '../../pages';

/**
 * Accessibility smoke tests
 *
 * Risk rationale: CRE platforms serve institutional clients who may be
 * subject to Section 508 / WCAG 2.1 AA compliance requirements. Critical
 * a11y violations (missing labels, keyboard traps, zero-contrast text) are
 * caught cheaply here rather than expensively in an audit.
 *
 * Strategy:
 *   - Run axe on the login page (public, no credentials required)
 *   - Run axe on the post-login landing page if credentials are available
 *   - Assert zero CRITICAL or SERIOUS violations
 *   - Log MODERATE / MINOR violations as warnings (informational, not blocking)
 *
 * Tradeoff: axe catches ~30-40% of WCAG issues automatically. It complements
 * but does not replace manual a11y review.
 *
 * @tag @a11y
 */

const EMAIL = process.env.TEST_USER_EMAIL ?? '';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

/** axe impact levels we treat as test failures */
const BLOCKING_IMPACTS = ['critical', 'serious'] as const;

test.describe('Accessibility – Axe Smoke', () => {
  test(
    '@a11y – login page has no critical or serious violations',
    async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      const blockingViolations = results.violations.filter(v =>
        BLOCKING_IMPACTS.includes(v.impact as typeof BLOCKING_IMPACTS[number])
      );

      if (results.violations.length > 0) {
        const summary = results.violations.map(v =>
          `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n` +
          v.nodes.slice(0, 2).map(n => `  → ${n.target}`).join('\n')
        ).join('\n\n');

        if (blockingViolations.length > 0) {
          // Fail the test, surfacing exactly what needs fixing
          throw new Error(
            `Found ${blockingViolations.length} blocking a11y violation(s) on login page:\n\n${summary}`
          );
        } else {
          // Moderate/minor: log as a warning, don't fail
          console.warn(`[a11y] Non-blocking violations on login page:\n${summary}`);
        }
      }

      // Even with 0 violations, assert the scan ran and found elements
      expect(results.passes.length).toBeGreaterThan(0);
    }
  );

  test(
    '@a11y – post-login landing page has no critical or serious violations',
    async ({ page }) => {
      test.skip(!EMAIL || !PASSWORD, 'Missing TEST_USER_EMAIL / TEST_USER_PASSWORD');

      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.loginSuccessfully(EMAIL, PASSWORD);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        // Exclude the map canvas — canvas elements are inherently non-semantic;
        // map a11y should be handled via ARIA labels on controls, not the canvas itself
        .exclude('canvas')
        .analyze();

      const blockingViolations = results.violations.filter(v =>
        BLOCKING_IMPACTS.includes(v.impact as typeof BLOCKING_IMPACTS[number])
      );

      if (blockingViolations.length > 0) {
        const summary = blockingViolations.map(v =>
          `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n` +
          v.nodes.slice(0, 2).map(n => `  → ${n.target}`).join('\n')
        ).join('\n\n');

        throw new Error(
          `Found ${blockingViolations.length} blocking a11y violation(s) on dashboard:\n\n${summary}`
        );
      }

      expect(results.passes.length).toBeGreaterThan(0);
    }
  );
});
