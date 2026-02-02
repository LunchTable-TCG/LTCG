/**
 * Playwright Test Fixtures for E2E Tests
 *
 * Provides extended test fixtures with:
 * - TestDataFactory for server-side test data creation with auto-cleanup
 * - Pre-authenticated test user with Privy JWT token
 * - Page Objects for all major application areas
 * - Authenticated page with Privy state pre-injected
 *
 * Usage:
 *   import { test, expect } from './setup/fixtures';
 *
 *   test('deck builder test', async ({ deckPage, testUser }) => {
 *     await deckPage.goto();
 *     await deckPage.createDeck('My Deck');
 *   });
 */

import { type Page, test as base, expect } from "@playwright/test";
import { DeckBuilderPage, GamePage, LobbyPage, ShopPage, SocialPage, StoryPage } from "../pages";
import { TEST_ENV } from "./env";
import { TestDataFactory } from "./factories";
import { createMockPrivyToken } from "./mock-privy-token";

export { expect };

// =============================================================================
// FIXTURE TYPES
// =============================================================================

type TestFixtures = {
  // Data factory with auto-cleanup
  factory: TestDataFactory;

  // Pre-created test user with auth token
  testUser: {
    userId: string;
    privyDid: string;
    displayName: string;
    token: string;
  };

  // Page with auth already injected
  authenticatedPage: Page;

  // Page Objects (lazy-loaded)
  gamePage: GamePage;
  deckPage: DeckBuilderPage;
  shopPage: ShopPage;
  lobbyPage: LobbyPage;
  socialPage: SocialPage;
  storyPage: StoryPage;
};

// =============================================================================
// EXTENDED TEST
// =============================================================================

/**
 * Extended Playwright test with custom fixtures
 *
 * Available fixtures:
 * - factory: TestDataFactory for creating server-side test data (auto-cleanup)
 * - testUser: Pre-created test user with Privy auth token
 * - authenticatedPage: Page with Privy auth state pre-injected
 * - gamePage: GamePage object for game board interactions
 * - deckPage: DeckBuilderPage object for deck management
 * - shopPage: ShopPage object for shop interactions
 * - lobbyPage: LobbyPage object for multiplayer lobby
 * - socialPage: SocialPage object for social features
 * - storyPage: StoryPage object for story mode
 */
export const test = base.extend<TestFixtures>({
  // Factory fixture with automatic cleanup
  factory: async ({}, use) => {
    const factory = new TestDataFactory(TEST_ENV.CONVEX_URL);
    await use(factory);
    await factory.cleanup();
  },

  // Test user fixture with Privy auth token
  testUser: async ({ factory }, use) => {
    const user = await factory.createUser();
    const token = await createMockPrivyToken(user.privyDid, TEST_ENV.PRIVY_APP_ID);
    await use({ ...user, token });
  },

  // Authenticated page with Privy state injected
  authenticatedPage: async ({ page, testUser }, use) => {
    // Inject Privy auth state before any navigation
    await page.addInitScript(
      ({ token, privyDid }) => {
        localStorage.setItem("privy:token", token);
        localStorage.setItem("privy:user", JSON.stringify({ id: privyDid }));
        localStorage.setItem("privy:authenticated", "true");
      },
      { token: testUser.token, privyDid: testUser.privyDid }
    );
    await use(page);
  },

  // Page Object fixtures (lazy-loaded)
  gamePage: async ({ authenticatedPage }, use) => {
    await use(new GamePage(authenticatedPage));
  },

  deckPage: async ({ authenticatedPage }, use) => {
    await use(new DeckBuilderPage(authenticatedPage));
  },

  shopPage: async ({ authenticatedPage }, use) => {
    await use(new ShopPage(authenticatedPage));
  },

  lobbyPage: async ({ authenticatedPage }, use) => {
    await use(new LobbyPage(authenticatedPage));
  },

  socialPage: async ({ authenticatedPage }, use) => {
    await use(new SocialPage(authenticatedPage));
  },

  storyPage: async ({ authenticatedPage }, use) => {
    await use(new StoryPage(authenticatedPage));
  },
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Enable console logging for debugging browser issues
 *
 * Captures browser console messages and page errors for debugging.
 * Call this in test setup when investigating browser-side issues.
 *
 * Usage:
 *   test('my test', async ({ page }) => {
 *     enableConsoleLogs(page);
 *     // ... test code
 *   });
 */
export function enableConsoleLogs(page: Page) {
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error") {
      console.error(`[Browser Error] ${msg.text()}`);
    } else if (type === "warning") {
      console.warn(`[Browser Warning] ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    console.error("[Page Error]:", err.message);
  });
}

/**
 * Take a debug screenshot with timestamp
 *
 * Saves to test-results directory with descriptive name.
 *
 * @param page - Playwright page instance
 * @param name - Descriptive name for the screenshot
 */
export async function takeDebugScreenshot(page: Page, name: string) {
  const timestamp = Date.now();
  await page.screenshot({
    path: `test-results/debug-${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Log current page state for debugging
 *
 * Logs URL, title, loading state, and any visible error messages.
 * Useful for diagnosing test failures.
 *
 * @param page - Playwright page instance
 */
export async function logPageState(page: Page) {
  console.log("=== Page State ===");
  console.log("URL:", page.url());
  console.log("Title:", await page.title());

  // Check for loading indicators
  const isLoading = await page
    .locator(".animate-spin")
    .isVisible()
    .catch(() => false);
  console.log("Is Loading:", isLoading);

  // Check for error messages
  const errorElement = page.locator('[role="alert"], .error').first();
  const hasError = await errorElement.isVisible().catch(() => false);
  if (hasError) {
    const errorText = await errorElement.textContent();
    console.log("Error Message:", errorText);
  }

  console.log("==================");
}
