import type { Page } from "@playwright/test";
import { SELECTORS, TEST_CONFIG, waitForElement } from "./test-data";

/**
 * Authentication helper for E2E tests
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Sign up a new user
   */
  async signup(username: string, email: string, password: string) {
    await this.page.goto("/signup");

    // Fill in signup form
    await this.page.fill(SELECTORS.AUTH_USERNAME_INPUT, username);
    await this.page.fill(SELECTORS.AUTH_EMAIL_INPUT, email);
    await this.page.fill(SELECTORS.AUTH_PASSWORD_INPUT, password);
    await this.page.fill('input[id="confirmPassword"]', password); // Required for signup

    // Submit form
    await this.page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

    // Wait for successful signup (redirect or success message)
    await this.page.waitForURL(/\/(lunchtable|binder|profile)/, {
      timeout: 10000,
    });
  }

  /**
   * Log in an existing user
   */
  async login(email: string, password: string) {
    await this.page.goto("/login");

    // Fill in login form
    await this.page.fill(SELECTORS.AUTH_EMAIL_INPUT, email);
    await this.page.fill(SELECTORS.AUTH_PASSWORD_INPUT, password);

    // Submit form
    await this.page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

    // Wait for successful login
    await this.page.waitForURL(/\/(lunchtable|binder|profile)/, {
      timeout: 10000,
    });
  }

  /**
   * Log out the current user
   */
  async logout() {
    // Click on user menu/settings
    const logoutButton = this.page.locator(
      'button:has-text("Logout"), button:has-text("Sign Out")'
    );

    if (await logoutButton.isVisible({ timeout: 2000 })) {
      await logoutButton.click();
      await this.page.waitForURL(/\/(login|$)/, { timeout: 5000 });
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.page.waitForURL(/\/(lunchtable|binder|profile)/, {
        timeout: 2000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Game state helper for E2E tests
 */
export class GameStateHelper {
  constructor(private page: Page) {}

  /**
   * Wait for game to start
   */
  async waitForGameStart() {
    await this.page.waitForSelector('[data-testid="game-board"]', {
      timeout: TEST_CONFIG.GAME_START_TIMEOUT,
    });
  }

  /**
   * Wait for specific game phase
   */
  async waitForPhase(phase: "draw" | "standby" | "main1" | "battle" | "main2" | "end") {
    await this.page.waitForSelector(`[data-phase="${phase}"]`, {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
    });
  }

  /**
   * Get current player's life points
   */
  async getPlayerLifePoints(): Promise<number> {
    const lpElement = await this.page.locator('[data-testid="player-lp"]').textContent();
    return Number.parseInt(lpElement || "0", 10);
  }

  /**
   * Get opponent's life points
   */
  async getOpponentLifePoints(): Promise<number> {
    const lpElement = await this.page.locator('[data-testid="opponent-lp"]').textContent();
    return Number.parseInt(lpElement || "0", 10);
  }

  /**
   * Get number of cards in hand
   */
  async getHandSize(): Promise<number> {
    const handCards = await this.page.locator('[data-testid="hand-card"]').count();
    return handCards;
  }

  /**
   * Click a card in hand by index
   */
  async clickHandCard(index: number) {
    await this.page.locator(`[data-testid="hand-card"]:nth-child(${index + 1})`).click();
  }

  /**
   * Summon a monster from hand
   */
  async summonMonster(handIndex: number, position: "attack" | "defense" = "attack") {
    await this.clickHandCard(handIndex);

    // Select position
    await this.page.click(`button:has-text("${position === "attack" ? "Attack" : "Defense"}")`);

    // Confirm summon
    await this.page.click('button:has-text("Summon")');
  }

  /**
   * Set a spell/trap card
   */
  async setSpellTrap(handIndex: number) {
    await this.clickHandCard(handIndex);
    await this.page.click('button:has-text("Set")');
  }

  /**
   * End the current turn
   */
  async endTurn() {
    await this.page.click(SELECTORS.GAME_END_TURN_BUTTON);
    await this.page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
  }

  /**
   * Attack with a monster
   */
  async attackWithMonster(monsterIndex: number, targetIndex?: number) {
    // Click on attacker
    await this.page.locator(`[data-testid="player-monster"]:nth-child(${monsterIndex + 1})`).click();

    // Click attack button
    await this.page.click('button:has-text("Attack")');

    // Select target (direct attack if no targetIndex)
    if (targetIndex !== undefined) {
      await this.page.locator(`[data-testid="opponent-monster"]:nth-child(${targetIndex + 1})`).click();
    } else {
      await this.page.click('button:has-text("Direct Attack")');
    }
  }

  /**
   * Check if game is over
   */
  async isGameOver(): Promise<boolean> {
    return await this.page.locator('[data-testid="game-result"]').isVisible({ timeout: 1000 });
  }

  /**
   * Get game result
   */
  async getGameResult(): Promise<"win" | "lose" | "draw"> {
    const resultText = await this.page.locator('[data-testid="game-result"]').textContent();

    if (resultText?.toLowerCase().includes("win")) return "win";
    if (resultText?.toLowerCase().includes("lose")) return "lose";
    return "draw";
  }
}

/**
 * Deck builder helper for E2E tests
 */
export class DeckBuilderHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to deck builder
   */
  async navigate() {
    await this.page.goto("/binder");
    await waitForElement(this.page, '[data-testid="deck-builder"]');
  }

  /**
   * Create a new deck
   */
  async createDeck(name: string, cardIds: string[]) {
    // Click create new deck
    await this.page.click('button:has-text("New Deck")');

    // Enter deck name
    await this.page.fill(SELECTORS.DECK_NAME_INPUT, name);

    // Add cards to deck
    for (const cardId of cardIds) {
      await this.addCardToDeck(cardId);
    }

    // Save deck
    await this.page.click(SELECTORS.DECK_SAVE_BUTTON);

    // Wait for success message or deck list update
    await this.page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
  }

  /**
   * Add a card to the current deck
   */
  async addCardToDeck(cardId: string) {
    // Search for card
    await this.page.fill('input[placeholder*="Search"]', cardId);
    await this.page.waitForTimeout(500);

    // Click on card to add it
    await this.page.locator(`[data-card-id="${cardId}"]`).first().click();
  }

  /**
   * Delete a deck by name
   */
  async deleteDeck(deckName: string) {
    await this.page.locator(`[data-deck-name="${deckName}"]`).click();
    await this.page.click(SELECTORS.DECK_DELETE_BUTTON);

    // Confirm deletion
    await this.page.click('button:has-text("Confirm")');
    await this.page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
  }

  /**
   * Set a deck as active
   */
  async setActiveDeck(deckName: string) {
    await this.page.locator(`[data-deck-name="${deckName}"]`).click();
    await this.page.click(SELECTORS.DECK_SET_ACTIVE_BUTTON);
    await this.page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
  }

  /**
   * Get deck card count
   */
  async getDeckCardCount(): Promise<number> {
    const countText = await this.page.locator('[data-testid="deck-card-count"]').textContent();
    return Number.parseInt(countText || "0", 10);
  }
}

/**
 * Shop helper for E2E tests
 */
export class ShopHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to shop
   */
  async navigate() {
    await this.page.goto("/shop");
    await waitForElement(this.page, '[data-testid="shop"]');
  }

  /**
   * Buy a pack
   */
  async buyPack() {
    await this.page.click(SELECTORS.SHOP_BUY_PACK_BUTTON);
    await this.page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
  }

  /**
   * Open a pack
   */
  async openPack() {
    await this.page.click(SELECTORS.SHOP_OPEN_PACK_BUTTON);
    await this.page.waitForTimeout(2000); // Wait for pack opening animation
  }

  /**
   * Get current gold amount
   */
  async getGoldAmount(): Promise<number> {
    const goldText = await this.page.locator('[data-testid="player-gold"]').textContent();
    return Number.parseInt(goldText?.replace(/\D/g, "") || "0", 10);
  }

  /**
   * Get number of packs owned
   */
  async getPackCount(): Promise<number> {
    const packs = await this.page.locator('[data-testid="pack-item"]').count();
    return packs;
  }
}

/**
 * Cleanup helper for test data
 */
export class CleanupHelper {
  constructor(private page: Page) {}

  /**
   * Clear all test data for the current user
   */
  async clearTestData() {
    // This would typically call backend cleanup endpoints
    // For now, we rely on using unique test users per test
  }

  /**
   * Delete test user account
   */
  async deleteAccount() {
    // Navigate to settings
    await this.page.goto("/settings");

    // Find and click delete account button
    const deleteButton = this.page.locator('button:has-text("Delete Account")');
    if (await deleteButton.isVisible({ timeout: 2000 })) {
      await deleteButton.click();
      await this.page.click('button:has-text("Confirm")');
    }
  }
}
