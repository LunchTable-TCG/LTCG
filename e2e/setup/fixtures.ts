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

/**
 * Game Helper provides high-level methods for game interactions
 */
export interface GameHelper {
  waitForPhase(phase: "main1" | "main2" | "battle" | "end"): Promise<void>;
  summonCreature(cardIndex: number): Promise<void>;
  attack(attackerIndex: number, targetIndex: number): Promise<void>;
  endTurn(): Promise<void>;
  getHandCount(): Promise<number>;
  getFieldMonsters(): Promise<number>;
}

/**
 * Shop Helper provides high-level methods for shop interactions
 */
export interface ShopHelper {
  navigate(): Promise<void>;
  getGold(): Promise<number>;
  buyPack(): Promise<void>;
  hasPack(packName: string): Promise<boolean>;
  hasPackResults(): Promise<boolean>;
}

/**
 * Deck Helper provides high-level methods for deck management
 */
export interface DeckHelper {
  navigate(): Promise<void>;
  createDeck(name: string): Promise<void>;
  addCard(cardName: string): Promise<void>;
  saveDeck(): Promise<void>;
  getDeckCount(): Promise<number>;
}

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

  // Helper fixtures for tests
  gameHelper: GameHelper;
  shopHelper: ShopHelper;
  deckHelper: DeckHelper;
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
  factory: async (_deps, use) => {
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

  // Helper fixtures that wrap page objects with high-level methods
  gameHelper: async ({ gamePage }, use) => {
    const helper: GameHelper = {
      async waitForPhase(phase) {
        await gamePage.page.waitForSelector(
          `[data-testid="phase-${phase}"], [data-phase="${phase}"]`,
          {
            timeout: 10000,
          }
        );
      },
      async summonCreature(cardIndex) {
        await gamePage.page.click(`[data-testid="hand-card-${cardIndex}"]`);
        await gamePage.page.click('[data-testid="summon-button"]');
      },
      async attack(attackerIndex, targetIndex) {
        await gamePage.page.click(`[data-testid="field-monster-${attackerIndex}"]`);
        await gamePage.page.click(`[data-testid="target-${targetIndex}"]`);
      },
      async endTurn() {
        await gamePage.page.click('[data-testid="end-turn-button"]');
      },
      async getHandCount() {
        const cards = await gamePage.page.locator('[data-testid^="hand-card-"]').count();
        return cards;
      },
      async getFieldMonsters() {
        const monsters = await gamePage.page.locator('[data-testid^="field-monster-"]').count();
        return monsters;
      },
    };
    await use(helper);
  },

  shopHelper: async ({ shopPage }, use) => {
    const helper: ShopHelper = {
      async navigate() {
        await shopPage.navigate();
      },
      async getGold() {
        const goldElement = shopPage.page.locator('[data-testid="player-gold"]');
        const text = await goldElement.textContent();
        return Number.parseInt(text?.replace(/\D/g, "") || "0", 10);
      },
      async buyPack() {
        await shopPage.page.click('[data-testid="buy-pack-button"]');
        await shopPage.page
          .waitForSelector('[data-testid="pack-opened"]', { timeout: 5000 })
          .catch(() => {});
      },
      async hasPack(packName) {
        const pack = shopPage.page.locator(`[data-testid="pack-${packName}"]`);
        return await pack.isVisible();
      },
      async hasPackResults() {
        const results = shopPage.page.locator(
          '[data-testid="pack-results"], [data-testid="pack-opened"]'
        );
        return await results.isVisible({ timeout: 1000 }).catch(() => false);
      },
    };
    await use(helper);
  },

  deckHelper: async ({ deckPage }, use) => {
    const helper: DeckHelper = {
      async navigate() {
        await deckPage.navigate();
      },
      async createDeck(name) {
        await deckPage.page.click('[data-testid="create-deck-button"]');
        await deckPage.page.fill('[data-testid="deck-name-input"]', name);
        await deckPage.page.click('[data-testid="confirm-create-deck"]');
      },
      async addCard(cardName) {
        const card = deckPage.page.locator(`[data-testid="card-${cardName}"]`);
        await card.click();
      },
      async saveDeck() {
        await deckPage.page.click('[data-testid="save-deck-button"]');
      },
      async getDeckCount() {
        const cards = await deckPage.page.locator('[data-testid^="deck-card-"]').count();
        return cards;
      },
    };
    await use(helper);
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
