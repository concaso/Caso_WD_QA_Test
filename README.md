# WD Suite – Playwright Test Suite

Automated QA for [Walker & Dunlop Suite](https://suite.walkerdunlop.com) — a commercial
real estate research SPA.

---

## Project Structure

```
wd-suite-qa/
├── pages/                        # Page Object Models
│   ├── BasePage.ts               # Shared helpers (waitForAppReady, goto)
│   ├── LoginPage.ts              # Pre-auth login screen
│   ├── SearchPage.ts             # Property address search UX
│   └── PropertyDetailPage.ts     # Property report / detail view
│
├── tests/
│   ├── auth/
│   │   ├── public-flows.spec.ts  # Unauthenticated / pre-login tests
│   │   └── authenticated-flows.spec.ts  # Core journey behind auth
│   ├── search/
│   │   └── map-component.spec.ts # Map presence and non-blocking behaviour
│   ├── mocks/
│   │   └── search-mocked.spec.ts # Deterministic tests via route interception
│   └── fixtures/
│       └── search-autocomplete.mock.json  # Fixture data for mocked API
│
├── utils/
│   └── global-setup.ts           # Optional: login-once auth state saver
│
├── playwright.config.ts
├── .env.example                  # Copy to .env and fill in credentials
├── TEST_STRATEGY.md              # Risk-based test strategy document
└── README.md
```

---

## Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
npx playwright install chromium
```

### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
TEST_USER_EMAIL=your-test-account@example.com
TEST_USER_PASSWORD=your-password
TEST_SEARCH_ADDRESS=227 W Monroe St, Chicago, IL
```

> **Note:** `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are required only for
> authenticated tests. Public-flow tests run without credentials.

---

## Running Tests

### All tests

```bash
npm test
```

### Smoke tests only (fast, CI-friendly)

```bash
npm run test:smoke
# equivalent: npx playwright test --grep @smoke
```

### Authenticated tests only

```bash
npx playwright test --grep @auth
```

### Mocked / deterministic tests only

```bash
npx playwright test --grep @mock
```

### Map tests only

```bash
npx playwright test --grep @map
```

### Headed mode (watch the browser)

```bash
npm run test:headed
```

### Interactive UI mode

```bash
npm run test:ui
```

### Debug mode (step through tests)

```bash
npm run test:debug
```

---

## Viewing Reports

After a test run, an HTML report is generated automatically:

```bash
npm run report
```

This opens `playwright-report/index.html` in your browser. The report includes:
- Pass/fail status per test
- Screenshots on failure
- Traces on retry (viewable in the Playwright Trace Viewer)
- Video recordings on retry

---

## Key Decisions & Trade-offs

### Selector Strategy
ARIA roles and visible text are preferred over CSS classes. SPA builds often minify class
names, making CSS-based selectors brittle across deployments. Where roles aren't
available, `data-testid` attributes are used as the next best option, with CSS classes
only as a last resort.

### No `page.waitForTimeout()`
All waits are element-based (`waitFor`, `waitForURL`, `waitForLoadState`). Arbitrary
sleeps mask timing issues rather than solve them, and slow down the suite on fast
machines.

### Structural Assertions Over Data Assertions
Property data (cap rates, unit counts, square footage) is dynamic and frequently updated.
Asserting specific values would produce constant false failures. Instead, tests assert that
the *sections* containing data are present and visible, which is a meaningful user
guarantee without the fragility.

### Mocking Strategy
Route interception (`page.route()`) is used for the autocomplete API to decouple UI tests
from backend availability. This means:
- The **mocked** tests (`@mock`) are deterministic and fast — they test that the UI
  *renders* suggestions correctly, given a valid API response.
- The **authenticated** tests (`@auth`) hit the real API, testing the full integration.
- Both layers are needed; neither replaces the other.

### Authentication
Each authenticated test re-logs in via `beforeEach`. This is slightly slower (~3–5s per
test) but maximally isolated. The `utils/global-setup.ts` file is scaffolded to enable
a login-once approach using Playwright's `storageState` — this would be the next
optimisation in a longer-running project.

### Skipping vs Failing on Missing Credentials
Authenticated tests use `test.skip()` when credentials are absent, rather than failing.
This makes the suite safely runnable in environments where secrets aren't configured
(e.g., open-source forks, first-time local setup) without a wall of red errors.

---

## Mocking / Interception Approach

Tests in `tests/mocks/search-mocked.spec.ts` use Playwright's `page.route()` to
intercept HTTP requests matching `/autocomplete|suggest|search|geocod/i` and return
fixture data from `tests/fixtures/search-autocomplete.mock.json`.

This covers two scenarios:
1. **Happy path** — returns realistic fixture data; asserts the UI renders suggestions
2. **Error path** — returns a 500 status; asserts the app doesn't crash

The intercept pattern is intentionally broad to survive minor API path changes. Once the
exact API endpoint is confirmed from the network tab, it can be narrowed for precision.

---

## What Would Come Next

Given more time (beyond the 6–8 hour scope), the following would be added:

1. **Global auth setup** — wire `utils/global-setup.ts` into `playwright.config.ts` to
   log in once per run and reuse `storageState`, reducing auth overhead across the suite.

2. **API contract tests** — use Playwright's `APIRequestContext` to validate the search
   endpoint's response schema independently of the UI.

3. **Accessibility smoke** — integrate `axe-playwright` to catch critical WCAG failures
   on the homepage and property detail page.

4. **GitHub Actions CI** — a workflow that runs `@smoke` on every PR and the full suite
   on merges to `main`.

5. **Performance budget** — Lighthouse CI assertion on property detail page LCP.
