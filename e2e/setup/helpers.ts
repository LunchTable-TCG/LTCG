/**
 * E2E Test Helpers
 *
 * Helper classes for common E2E testing patterns.
 * Updated for Privy modal authentication.
 */

import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { SELECTORS, TEST_CONFIG, waitForLoadingToComplete, waitForNavigation } from "./test-data";

// =============================================================================
// AUTHENTICATION HELPER
// =============================================================================

/**
 * Authentication helper for E2E tests
 *
 * Note: This app uses Privy modal authentication, not custom form inputs.
 * The login flow triggers a Privy modal which handles email/social auth.
 *
 * For most tests, use the authenticated fixtures instead of manually logging in.
 * This helper is mainly for testing the auth flow itself.
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to login page and click the login button to trigger Privy modal
   *
   * Note: This only triggers the modal - completing auth requires
   * interacting with Privy's iframe/modal which varies by auth method.
   * For E2E tests, prefer using saved auth state fixtures.
   */
  async triggerLogin() {
    await this.page.goto("/login");
    await waitForLoadingToComplete(this.page);

    // Find and click the login button (triggers Privy modal)
    const loginButton = this.page.locator(SELECTORS.AUTH_LOGIN_BUTTON).first();
    await loginButton.waitFor({ state: "visible", timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
    await loginButton.click();

    // Wait a moment for Privy modal to appear
    await this.page.waitForTimeout(1000);
  }

  /**
   * Complete username setup after Privy authentication
   * This is required for new users before accessing the app
   */
  async setupUsername(username: string) {
    // Check if we're on the username setup page
    const isOnSetupPage = this.page.url().includes("/setup-username");

    if (!isOnSetupPage) {
      // Try to navigate there if user needs username
      await this.page.goto("/setup-username");
    }

    await this.page.waitForSelector(SELECTORS.USERNAME_INPUT, {
      state: "visible",
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
    });

    // Fill in username
    await this.page.fill(SELECTORS.USERNAME_INPUT, username);

    // Submit
    await this.page.click(SELECTORS.USERNAME_SUBMIT);

    // Wait for redirect to dashboard
    await waitForNavigation(this.page, /\/lunchtable/);
  }

  /**
   * Check if user is authenticated by looking at current URL
   */
  async isAuthenticated(): Promise<boolean> {
    const url = this.page.url();
    // User is authenticated if they're on a protected route
    const protectedRoutes = ["/lunchtable", "/binder", "/shop", "/play", "/quests", "/social"];
    return protectedRoutes.some((route) => url.includes(route));
  }

  /**
   * Check if user needs to set up username
   */
  async needsUsername(): Promise<boolean> {
    const url = this.page.url();
    return url.includes("/setup-username");
  }

  /**
   * Wait for authentication to complete (after Privy login)
   * Returns the final destination URL
   */
  async waitForAuthComplete(timeout = 30000): Promise<string> {
    // Wait until we're no longer on login/signup pages
    await this.page.waitForURL(
      (url) => {
        const path = url.pathname;
        return !path.includes("/login") && !path.includes("/signup") && path !== "/";
      },
      { timeout }
    );

    return this.page.url();
  }

  /**
   * Logout the current user
   */
  async logout() {
    // Navigate to settings where logout is typically available
    await this.page.goto("/settings");
    await waitForLoadingToComplete(this.page);

    // Look for logout button
    const logoutButton = this.page
      .locator('button:has-text("Logout"), button:has-text("Sign Out"), button:has-text("Log Out")')
      .first();

    if (await logoutButton.isVisible({ timeout: 3000 })) {
      await logoutButton.click();
      // Wait for redirect to login
      await this.page.waitForURL(/\/(login|$)/, { timeout: 10000 });
    }
  }
}

// =============================================================================
// GAME STATE HELPER
// =============================================================================

/**
 * Helper for game state interactions during gameplay tests
 */
export class GameStateHelper {
  constructor(private page: Page) {}

  /**
   * Wait for game board to load
   */
  async waitForGameStart(timeout = TEST_CONFIG.GAME_START_TIMEOUT) {
    await this.page.waitForSelector(SELECTORS.GAME_BOARD, {
      state: "visible",
      timeout,
    });
  }

  /**
   * Wait for a specific game phase
   */
  async waitForPhase(phase: "draw" | "standby" | "main1" | "battle" | "main2" | "end") {
    await this.page.waitForSelector(`[data-phase="${phase}"]`, {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
    });
  }

  /**
   * Get the current turn number
   */
  async getTurnNumber(): Promise<number> {
    const turnElement = this.page.locator(SELECTORS.TURN_NUMBER);
    const text = await turnElement.textContent();
    return Number.parseInt(text?.replace(/\D/g, "") || "0", 10);
  }

  /**
   * Click the end turn button
   */
  async endTurn() {
    await this.page.click(SELECTORS.END_TURN_BUTTON);
    await this.page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
  }

  /**
   * Skip the battle phase
   */
  async skipBattlePhase() {
    await this.page.click(SELECTORS.SKIP_BATTLE_BUTTON);
    await this.page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
  }

  /**
   * Check if the game is over
   */
  async isGameOver(): Promise<boolean> {
    const resultElement = this.page.locator(SELECTORS.GAME_RESULT);
    return resultElement.isVisible({ timeout: 1000 });
  }

  /**
   * Get hand cards
   */
  getHandCards(): Locator {
    return this.page.locator('[data-testid="hand-card"]');
  }

  /**
   * Get board monsters
   */
  getBoardMonsters(): Locator {
    return this.page.locator('[data-testid="board-monster"]');
  }
}

// =============================================================================
// DECK BUILDER HELPER
// =============================================================================

/**
 * Helper for deck builder/binder interactions
 */
export class DeckBuilderHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to the binder/deck builder page
   */
  async navigate() {
    await this.page.goto("/binder");
    await waitForLoadingToComplete(this.page);
    // Wait for either deck list or deck builder to load
    await this.page.waitForSelector(
      `${SELECTORS.DECK_LIST}, ${SELECTORS.DECK_BUILDER}, button:has-text("New Deck")`,
      { timeout: TEST_CONFIG.DEFAULT_TIMEOUT }
    );
  }

  /**
   * Create a new deck
   */
  async createNewDeck(name: string) {
    // Click create/new deck button
    const createButton = this.page.locator(SELECTORS.DECK_CREATE_BUTTON).first();
    await createButton.click();
    await this.page.waitForTimeout(TEST_CONFIG.FAST_WAIT);

    // Fill in deck name if input is visible
    const nameInput = this.page.locator(SELECTORS.DECK_NAME_INPUT);
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill(name);
    }
  }

  /**
   * Add cards to the current deck
   * @param count Number of cards to add (clicks the first available card multiple times)
   */
  async addCards(count: number) {
    for (let i = 0; i < count; i++) {
      const cardItem = this.page.locator(SELECTORS.CARD_ITEM).first();
      if (await cardItem.isVisible({ timeout: 1000 })) {
        await cardItem.click();
        await this.page.waitForTimeout(100); // Small delay between adds
      }
    }
  }

  /**
   * Save the current deck
   */
  async saveDeck() {
    const saveButton = this.page.locator(SELECTORS.DECK_SAVE_BUTTON).first();
    if (await saveButton.isVisible({ timeout: 2000 })) {
      await saveButton.click();
      await this.page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
    }
  }

  /**
   * Get the number of decks in the list
   */
  async getDeckCount(): Promise<number> {
    // Look for deck items in the list
    const deckItems = this.page.locator('[data-deck-name], [data-testid="deck-item"]');
    return deckItems.count();
  }
}

// =============================================================================
// SHOP HELPER
// =============================================================================

/**
 * Helper for shop/economy interactions
 */
export class ShopHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to the shop page
   */
  async navigate() {
    await this.page.goto("/shop");
    await waitForLoadingToComplete(this.page);
    await this.page.waitForSelector(SELECTORS.SHOP, { timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
  }

  /**
   * Get current gold amount
   */
  async getGold(): Promise<number> {
    const goldElement = this.page.locator(SELECTORS.PLAYER_GOLD);
    await goldElement.waitFor({ state: "visible", timeout: TEST_CONFIG.DEFAULT_TIMEOUT });
    const text = await goldElement.textContent();
    return Number.parseInt(text?.replace(/\D/g, "") || "0", 10);
  }

  /**
   * Purchase a pack (clicks the first pack buy button)
   */
  async buyPack() {
    const packButton = this.page.locator(SELECTORS.PACK_ITEM).first().locator("button").first();
    await packButton.click();
    await this.page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
  }

  /**
   * Navigate to pack opening page
   */
  async goToPackOpening() {
    await this.page.goto("/shop/open");
    await waitForLoadingToComplete(this.page);
  }

  /**
   * Open a pack (on the pack opening page)
   */
  async openPack() {
    const openButton = this.page
      .locator('button:has-text("Open Pack"), button:has-text("Open")')
      .first();
    if (await openButton.isVisible({ timeout: 2000 })) {
      await openButton.click();
      // Wait for pack opening animation
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Check if pack results are showing
   */
  async hasPackResults(): Promise<boolean> {
    const results = this.page.locator(SELECTORS.PACK_RESULTS);
    return results.isVisible({ timeout: 2000 });
  }
}

// =============================================================================
// STORY MODE HELPER
// =============================================================================

/**
 * Helper for story mode interactions
 */
export class StoryHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to story mode
   */
  async navigate() {
    await this.page.goto("/play/story");
    await waitForLoadingToComplete(this.page);
    await this.page.waitForSelector(SELECTORS.STORY_CHAPTER, {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
    });
  }

  /**
   * Select a chapter by index (0-based)
   */
  async selectChapter(index = 0) {
    const chapters = this.page.locator(SELECTORS.STORY_CHAPTER);
    await chapters.nth(index).click();
    await this.page.waitForURL(/\/play\/story\//, { timeout: TEST_CONFIG.NAVIGATION_TIMEOUT });
  }

  /**
   * Select a stage within a chapter
   */
  async selectStage(index = 0) {
    const stages = this.page.locator(SELECTORS.STORY_STAGE);
    await stages.nth(index).click();
    await this.page.waitForTimeout(TEST_CONFIG.FAST_WAIT);
  }

  /**
   * Start a battle
   */
  async startBattle() {
    const startButton = this.page.locator(SELECTORS.START_BATTLE_BUTTON).first();
    if (await startButton.isVisible({ timeout: 3000 })) {
      await startButton.click();
      // Wait for game to load
      await this.page.waitForSelector(SELECTORS.GAME_BOARD, {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });
    }
  }

  /**
   * Get chapter count
   */
  async getChapterCount(): Promise<number> {
    const chapters = this.page.locator(SELECTORS.STORY_CHAPTER);
    return chapters.count();
  }
}

// =============================================================================
// SOCIAL HELPER
// =============================================================================

/**
 * Helper for social features (friends, chat)
 */
export class SocialHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to social page
   */
  async navigate() {
    await this.page.goto("/social");
    await waitForLoadingToComplete(this.page);
  }

  /**
   * Get pending friend request count
   */
  async getPendingRequestCount(): Promise<number> {
    const requests = this.page.locator(SELECTORS.FRIEND_REQUEST);
    return requests.count();
  }

  /**
   * Send a chat message (on lunchtable global chat)
   */
  async sendChatMessage(message: string) {
    const chatInput = this.page.locator(SELECTORS.CHAT_INPUT);
    await chatInput.fill(message);
    await chatInput.press("Enter");
    await this.page.waitForTimeout(TEST_CONFIG.FAST_WAIT);
  }
}

// =============================================================================
// NAVIGATION HELPER
// =============================================================================

/**
 * Helper for navigating between app sections
 */
export class NavigationHelper {
  constructor(private page: Page) {}

  async goToLunchtable() {
    await this.page.click(SELECTORS.NAV_LUNCHTABLE);
    await waitForNavigation(this.page, /\/lunchtable/);
  }

  async goToBinder() {
    await this.page.click(SELECTORS.NAV_BINDER);
    await waitForNavigation(this.page, /\/binder/);
  }

  async goToShop() {
    await this.page.click(SELECTORS.NAV_SHOP);
    await waitForNavigation(this.page, /\/shop/);
  }

  async goToStory() {
    await this.page.click(SELECTORS.NAV_STORY);
    await waitForNavigation(this.page, /\/play\/story/);
  }

  async goToQuests() {
    await this.page.click(SELECTORS.NAV_QUESTS);
    await waitForNavigation(this.page, /\/quests/);
  }

  async goToSocial() {
    await this.page.click(SELECTORS.NAV_SOCIAL);
    await waitForNavigation(this.page, /\/social/);
  }

  async goToSettings() {
    await this.page.click(SELECTORS.NAV_SETTINGS);
    await waitForNavigation(this.page, /\/settings/);
  }

  async goToLeaderboards() {
    await this.page.click(SELECTORS.NAV_LEADERBOARDS);
    await waitForNavigation(this.page, /\/leaderboards/);
  }
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Common assertions for E2E tests
 */
export class AssertionHelper {
  constructor(private page: Page) {}

  /**
   * Assert user is on an authenticated page
   */
  async assertAuthenticated() {
    const url = this.page.url();
    expect(url).not.toMatch(/\/(login|signup|$)/);
  }

  /**
   * Assert user is on login page
   */
  async assertOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/);
  }

  /**
   * Assert no error messages are visible
   */
  async assertNoErrors() {
    const errorElement = this.page.locator(SELECTORS.ERROR_MESSAGE);
    await expect(errorElement).not.toBeVisible({ timeout: 1000 });
  }

  /**
   * Assert page has loaded (no loading spinners)
   */
  async assertPageLoaded() {
    await waitForLoadingToComplete(this.page);
  }
}
