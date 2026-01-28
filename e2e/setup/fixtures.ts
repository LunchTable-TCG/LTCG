import { test as base, type Page } from "@playwright/test";
import { AuthHelper } from "./helpers";
import type { TestUser } from "./test-data";

/**
 * Extended test fixtures with authenticated user support
 */
type TestFixtures = {
  authHelper: AuthHelper;
  authenticatedPage: Page;
  testUser: TestUser;
};

/**
 * Extended Playwright test with custom fixtures
 *
 * Usage:
 * test('my test', async ({ authenticatedPage, testUser }) => {
 *   // authenticatedPage is already logged in
 *   // testUser contains the test user data
 * });
 */
export const test = base.extend<TestFixtures>({
  authHelper: async ({ page }, use) => {
    const helper = new AuthHelper(page);
    await use(helper);
  },

  testUser: async ({}, use) => {
    // Generate a unique test user for each test
    const timestamp = Date.now();
    const user: TestUser = {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: "TestPassword123!",
      displayName: `Test User ${timestamp}`,
    };
    await use(user);
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    const authHelper = new AuthHelper(page);

    // Navigate to app
    await page.goto("/");

    // Sign up new test user
    await authHelper.signup(
      testUser.username,
      testUser.email,
      testUser.password
    );

    // Wait for redirect to dashboard or home
    await page.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

    await use(page);

    // Cleanup: logout after test
    await authHelper.logout();
  },
});

export { expect } from "@playwright/test";
