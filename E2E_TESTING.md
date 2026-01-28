# End-to-End Testing Guide

Comprehensive guide for running and maintaining E2E tests for the LTCG (Lunch Table Card Game) application.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Writing New Tests](#writing-new-tests)
6. [Test Patterns](#test-patterns)
7. [Debugging](#debugging)
8. [CI/CD Integration](#cicd-integration)
9. [Coverage Goals](#coverage-goals)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The E2E test suite uses **Playwright** to test critical user flows across the application. Tests cover:

- **Authentication**: Signup, login, password reset, session management
- **Deck Management**: Creating, editing, and managing decks
- **Game Lobby**: Creating, joining, and managing game lobbies
- **Gameplay**: Core game mechanics including summoning, battles, and turns
- **Effect System**: Card effects, chains, and resolution
- **Economy**: Shop, packs, marketplace, and promo codes
- **Story Mode**: Chapter progression, battles, and rewards
- **Social Features**: Friends, chat, leaderboards, and profiles

### Test Coverage

- **Critical user paths**: 100%
- **Game mechanics**: 80%
- **Edge cases**: 60%

---

## Setup

### Prerequisites

1. **Node.js/Bun**: Ensure Bun 1.3+ is installed
2. **Convex**: Backend must be running
3. **Environment Variables**: Configure `.env.local` with required keys

### Installation

Playwright is already installed as a dev dependency. To install browsers:

```bash
bun x playwright install
```

### Environment Setup

Create or update `.env.local`:

```env
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

---

## Running Tests

### Run All Tests

```bash
bun run test:e2e
```

### Run Specific Test Suite

```bash
# Authentication tests
bun run test:e2e:auth

# Deck management tests
bun run test:e2e:deck

# Lobby tests
bun run test:e2e:lobby

# Gameplay tests
bun run test:e2e:gameplay

# Effect system tests
bun run test:e2e:effects

# Economy tests
bun run test:e2e:economy

# Story mode tests
bun run test:e2e:story

# Social features tests
bun run test:e2e:social
```

### Run with UI Mode

Interactive test runner with live preview:

```bash
bun run test:e2e:ui
```

### Run in Debug Mode

Step through tests with Playwright Inspector:

```bash
bun run test:e2e:debug
```

### Run in Headed Mode

See the browser while tests run:

```bash
bun run test:e2e:headed
```

### View Test Report

After running tests:

```bash
bun run test:e2e:report
```

---

## Test Structure

```
e2e/
├── setup/
│   ├── fixtures.ts       # Custom Playwright fixtures
│   ├── helpers.ts        # Test helper classes
│   └── test-data.ts      # Test data factories and constants
├── auth.spec.ts          # Authentication flow tests
├── deck.spec.ts          # Deck management tests
├── lobby.spec.ts         # Game lobby tests
├── gameplay.spec.ts      # Core gameplay tests
├── effects.spec.ts       # Effect system tests
├── economy.spec.ts       # Economy and shop tests
├── story.spec.ts         # Story mode tests
└── social.spec.ts        # Social features tests
```

### Setup Files

#### `fixtures.ts`

Provides custom fixtures for authenticated testing:

- `authHelper`: Authentication utility methods
- `authenticatedPage`: Pre-authenticated page instance
- `testUser`: Unique test user data

#### `helpers.ts`

Helper classes for common operations:

- `AuthHelper`: Login, signup, logout operations
- `GameStateHelper`: Game state queries and actions
- `DeckBuilderHelper`: Deck creation and management
- `ShopHelper`: Shop and economy operations
- `CleanupHelper`: Test data cleanup

#### `test-data.ts`

Test data factories and constants:

- `TestUserFactory`: Generate test user data
- `TestDeckFactory`: Generate test deck configurations
- `TEST_CONFIG`: Global test configuration
- `SELECTORS`: Common element selectors

---

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from "./setup/fixtures";

test.describe("Feature Name", () => {
  test("should perform specific action", async ({ authenticatedPage }) => {
    // Arrange
    await authenticatedPage.goto("/feature");

    // Act
    await authenticatedPage.click('button:has-text("Action")');

    // Assert
    await expect(
      authenticatedPage.locator('[data-testid="result"]')
    ).toBeVisible();
  });
});
```

### Using Authenticated Pages

```typescript
test("should access protected feature", async ({ authenticatedPage, testUser }) => {
  // authenticatedPage is already logged in
  // testUser contains the test user credentials

  await authenticatedPage.goto("/protected-page");

  await expect(
    authenticatedPage.locator(`text=${testUser.username}`)
  ).toBeVisible();
});
```

### Using Helper Classes

```typescript
import { GameStateHelper } from "./setup/helpers";

test("should play game turn", async ({ authenticatedPage }) => {
  const gameHelper = new GameStateHelper(authenticatedPage);

  await gameHelper.waitForPhase("main1");
  await gameHelper.summonMonster(0, "attack");
  await gameHelper.endTurn();

  const opponentLP = await gameHelper.getOpponentLifePoints();
  expect(opponentLP).toBeLessThan(8000);
});
```

### Multi-User Tests

```typescript
test("should interact between users", async ({ context, authenticatedPage, testUser }) => {
  // Create second user
  const user2 = TestUserFactory.create();
  const page2 = await context.newPage();

  // Sign up user 2
  await page2.goto("/signup");
  await page2.fill('input[name="username"]', user2.username);
  await page2.fill('input[name="email"]', user2.email);
  await page2.fill('input[name="password"]', user2.password);
  await page2.click('button[type="submit"]');

  // Interact between users
  // ...

  await page2.close();
});
```

---

## Test Patterns

### Waiting for Elements

```typescript
// Wait for element to be visible
await page.waitForSelector('[data-testid="element"]', {
  state: "visible",
  timeout: 5000,
});

// Wait for navigation
await page.waitForURL(/\/expected-route/, { timeout: 5000 });

// Wait for network idle
await page.waitForLoadState("networkidle");
```

### Assertions

```typescript
// Element visibility
await expect(page.locator('[data-testid="element"]')).toBeVisible();

// Text content
await expect(page.locator("h1")).toHaveText("Expected Title");

// Count elements
const count = await page.locator('.card').count();
expect(count).toBeGreaterThan(0);

// URL matching
await expect(page).toHaveURL(/\/expected-route/);
```

### Data-Testid Pattern

Use `data-testid` attributes for reliable selectors:

```tsx
// In component
<button data-testid="submit-button">Submit</button>

// In test
await page.click('[data-testid="submit-button"]');
```

### Test Isolation

Each test should:

1. Use unique test data (timestamps, UUIDs)
2. Clean up after itself (or use fresh user accounts)
3. Not depend on other tests
4. Be able to run in any order

```typescript
test("should create unique entity", async ({ authenticatedPage }) => {
  const uniqueName = `Entity ${Date.now()}`;

  // Create with unique name
  await authenticatedPage.fill('input[name="name"]', uniqueName);

  // Test continues...
});
```

---

## Debugging

### Debug Specific Test

```bash
bun run test:e2e:debug e2e/auth.spec.ts
```

### Add Debug Points

```typescript
test("should debug this test", async ({ page }) => {
  await page.goto("/page");

  // Pause execution
  await page.pause();

  // Continue test...
});
```

### Screenshots on Failure

Screenshots are automatically captured on failure in `test-results/`.

### Video Recording

Videos are captured on failure and saved in `test-results/`.

### Trace Viewer

After a test fails:

```bash
bun x playwright show-trace test-results/trace.zip
```

### Console Logs

View browser console logs:

```typescript
page.on('console', msg => console.log('Browser log:', msg.text()));
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: 1.3.5

      - name: Install dependencies
        run: bun install

      - name: Install Playwright
        run: bun x playwright install --with-deps

      - name: Run E2E tests
        run: bun run test:e2e
        env:
          CONVEX_DEPLOYMENT: ${{ secrets.CONVEX_DEPLOYMENT }}
          NEXT_PUBLIC_CONVEX_URL: ${{ secrets.NEXT_PUBLIC_CONVEX_URL }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Coverage Goals

### Critical Paths (100% Coverage)

- ✅ User authentication (signup, login, logout)
- ✅ Deck creation and validation
- ✅ Game lobby creation and joining
- ✅ Basic gameplay (summon, attack, end turn)
- ✅ Shop purchases and pack opening
- ✅ Story mode battles

### Game Mechanics (80% Coverage)

- ✅ Monster summoning (normal, tribute)
- ✅ Spell/trap activation
- ✅ Battle phase
- ✅ Effect resolution
- ✅ Chain system
- ⚠️ Advanced effect interactions
- ⚠️ Complex game states

### Edge Cases (60% Coverage)

- ⚠️ Network errors and retries
- ⚠️ Race conditions in multiplayer
- ⚠️ Browser back/forward navigation
- ⚠️ Session expiration during gameplay
- ⚠️ Invalid game states

---

## Troubleshooting

### Tests Timing Out

**Issue**: Tests fail with timeout errors

**Solutions**:
1. Increase timeout in `playwright.config.ts`
2. Add explicit waits: `await page.waitForTimeout(1000)`
3. Check for network requests completing: `await page.waitForLoadState('networkidle')`
4. Ensure dev server is running

### Elements Not Found

**Issue**: Selectors don't match elements

**Solutions**:
1. Use Playwright Inspector to verify selectors
2. Add `data-testid` attributes for reliability
3. Wait for element before interaction: `await page.waitForSelector()`
4. Check if element is in correct frame/shadow DOM

### Flaky Tests

**Issue**: Tests pass sometimes, fail others

**Solutions**:
1. Add proper waits instead of `waitForTimeout()`
2. Ensure test isolation (unique data per test)
3. Disable animations in test environment
4. Use `toBeVisible()` instead of checking element existence
5. Retry flaky tests once: `retries: 1` in config

### Authentication Issues

**Issue**: Tests fail at login/signup

**Solutions**:
1. Verify `.env.local` has correct Convex URL
2. Check Convex backend is running
3. Use unique usernames/emails per test
4. Clear browser storage between tests

### Convex Backend Connection

**Issue**: Can't connect to Convex

**Solutions**:
1. Start Convex dev server: `bun run dev:convex`
2. Verify `NEXT_PUBLIC_CONVEX_URL` is correct
3. Check firewall/network settings
4. Use `webServer` config to auto-start services

### Test Data Conflicts

**Issue**: Tests fail due to duplicate data

**Solutions**:
1. Use timestamps in test data: `testuser_${Date.now()}`
2. Create fresh users per test
3. Don't reuse test accounts
4. Implement cleanup in `afterEach()` if needed

---

## Best Practices

### DO ✅

- Use `data-testid` for reliable selectors
- Create unique test data per test
- Use fixtures for common setup
- Wait for elements before interacting
- Test user flows, not implementation details
- Keep tests independent and isolated
- Use descriptive test names
- Group related tests with `test.describe()`

### DON'T ❌

- Don't use brittle selectors (classes, XPath)
- Don't share state between tests
- Don't use arbitrary timeouts (`waitForTimeout`)
- Don't test internal implementation
- Don't skip cleanup
- Don't commit hard-coded credentials
- Don't make tests depend on each other
- Don't test every edge case in E2E (use unit tests)

---

## Adding New Test Suites

1. Create new spec file in `e2e/` directory:
   ```typescript
   // e2e/new-feature.spec.ts
   import { test, expect } from "./setup/fixtures";

   test.describe("New Feature", () => {
     test("should test feature", async ({ authenticatedPage }) => {
       // Test implementation
     });
   });
   ```

2. Add npm script in `package.json`:
   ```json
   "test:e2e:new-feature": "playwright test e2e/new-feature.spec.ts"
   ```

3. Update this documentation with new test suite details

---

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Debugging Tests](https://playwright.dev/docs/debug)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review test logs in `test-results/`
3. Use Playwright Inspector: `bun run test:e2e:debug`
4. Open issue with reproduction steps

---

**Last Updated**: 2026-01-28
