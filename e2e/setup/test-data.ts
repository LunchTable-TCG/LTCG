/**
 * Test data factories and constants for E2E tests
 */

import type { Page } from "@playwright/test";

export interface TestUser {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface TestDeck {
  name: string;
  cards: string[];
}

export interface TestCard {
  name: string;
  type: "Monster" | "Spell" | "Trap";
  attribute?: string;
  level?: number;
  atk?: number;
  def?: number;
}

/**
 * Test user data factory
 */
export class TestUserFactory {
  static create(overrides?: Partial<TestUser>): TestUser {
    const timestamp = Date.now();
    return {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: "TestPassword123!",
      displayName: `Test User ${timestamp}`,
      ...overrides,
    };
  }

  static createMultiple(count: number): TestUser[] {
    return Array.from({ length: count }, (_, i) => {
      const timestamp = Date.now() + i;
      return this.create({
        username: `testuser${timestamp}${i}`,
        email: `test${timestamp}${i}@example.com`,
        displayName: `Test User ${timestamp} ${i}`,
      });
    });
  }
}

/**
 * Test deck data factory
 */
export class TestDeckFactory {
  static create(overrides?: Partial<TestDeck>): TestDeck {
    const timestamp = Date.now();
    return {
      name: `Test Deck ${timestamp}`,
      cards: this.generateDefaultDeck(),
      ...overrides,
    };
  }

  /**
   * Generate a valid 30-card deck with starter cards
   */
  static generateDefaultDeck(): string[] {
    // This should match the actual card IDs available in your system
    // You may need to query these from the database or use known starter card IDs
    const monsterCards = Array(15).fill("starter_monster_1");
    const spellCards = Array(10).fill("starter_spell_1");
    const trapCards = Array(5).fill("starter_trap_1");

    return [...monsterCards, ...spellCards, ...trapCards];
  }

  /**
   * Generate a minimal valid deck (30 cards)
   */
  static generateMinimalDeck(): string[] {
    return Array(30).fill("starter_monster_1");
  }

  /**
   * Generate an invalid deck (less than 30 cards)
   */
  static generateInvalidDeck(): string[] {
    return Array(20).fill("starter_monster_1");
  }
}

/**
 * Test card data
 */
export const TEST_CARDS = {
  MONSTER_NORMAL: {
    name: "Test Monster",
    type: "Monster" as const,
    attribute: "LIGHT",
    level: 4,
    atk: 1800,
    def: 1500,
  },
  MONSTER_EFFECT: {
    name: "Test Effect Monster",
    type: "Monster" as const,
    attribute: "DARK",
    level: 4,
    atk: 1600,
    def: 1200,
  },
  SPELL_NORMAL: {
    name: "Test Spell",
    type: "Spell" as const,
  },
  TRAP_NORMAL: {
    name: "Test Trap",
    type: "Trap" as const,
  },
};

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  // Timeouts
  DEFAULT_TIMEOUT: 5000,
  GAME_START_TIMEOUT: 10000,
  NAVIGATION_TIMEOUT: 5000,
  ANIMATION_DELAY: 500,

  // Game constants
  STARTING_LP: 8000,
  STARTING_HAND_SIZE: 5,
  MIN_DECK_SIZE: 30,
  MAX_DECK_SIZE: 60,

  // Economy
  STARTING_GOLD: 1000,
  PACK_COST: 100,
  CARDS_PER_PACK: 5,

  // URLs
  BASE_URL: "http://localhost:3333",
  LOGIN_URL: "/login",
  SIGNUP_URL: "/signup",
  DASHBOARD_URL: "/lunchtable",
  BINDER_URL: "/binder",
  SHOP_URL: "/shop",
  STORY_URL: "/play/story",
};

/**
 * Common test selectors
 */
export const SELECTORS = {
  // Auth
  AUTH_USERNAME_INPUT: 'input[name="name"]', // AuthForm uses "name" not "username"
  AUTH_EMAIL_INPUT: 'input[name="email"]',
  AUTH_PASSWORD_INPUT: 'input[name="password"]',
  AUTH_SUBMIT_BUTTON: 'button[type="submit"]',
  LOGOUT_BUTTON: 'button:has-text("Logout")',

  // Navigation
  NAV_BINDER: 'a[href="/binder"]',
  NAV_SHOP: 'a[href="/shop"]',
  NAV_LUNCHTABLE: 'a[href="/lunchtable"]',
  NAV_STORY: 'a[href="/play/story"]',

  // Deck Builder
  DECK_NAME_INPUT: 'input[name="deckName"]',
  DECK_SAVE_BUTTON: 'button:has-text("Save Deck")',
  DECK_DELETE_BUTTON: 'button:has-text("Delete")',
  DECK_SET_ACTIVE_BUTTON: 'button:has-text("Set Active")',

  // Game
  GAME_START_BUTTON: 'button:has-text("Start Game")',
  GAME_JOIN_BUTTON: 'button:has-text("Join Game")',
  GAME_LEAVE_BUTTON: 'button:has-text("Leave")',
  GAME_END_TURN_BUTTON: 'button:has-text("End Turn")',
  GAME_DRAW_PHASE: '[data-phase="draw"]',
  GAME_MAIN_PHASE: '[data-phase="main"]',
  GAME_BATTLE_PHASE: '[data-phase="battle"]',

  // Shop
  SHOP_BUY_PACK_BUTTON: 'button:has-text("Buy Pack")',
  SHOP_OPEN_PACK_BUTTON: 'button:has-text("Open Pack")',

  // Story
  STORY_CHAPTER: '[data-testid="story-chapter"]',
  STORY_STAGE: '[data-testid="story-stage"]',
  STORY_START_BATTLE: 'button:has-text("Start Battle")',
};

/**
 * Wait for an element to be visible and stable
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = TEST_CONFIG.DEFAULT_TIMEOUT
) {
  await page.waitForSelector(selector, { state: "visible", timeout });
  await page.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);
}

/**
 * Generate a random string for unique identifiers
 */
export function generateRandomString(length = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}
