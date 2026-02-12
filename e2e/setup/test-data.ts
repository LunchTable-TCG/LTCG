/**
 * Test data factories and constants for E2E tests
 *
 * Updated for Privy modal authentication (not custom forms)
 */

import type { Page } from "@playwright/test";

// =============================================================================
// TEST USER TYPES
// =============================================================================

export interface TestUser {
  username: string;
  email: string;
  displayName: string;
}

export interface TestDeck {
  name: string;
  description?: string;
}

// =============================================================================
// TEST USER FACTORY
// =============================================================================

/**
 * Factory for creating test user data
 */
export const TestUserFactory = {
  /**
   * Create a single test user
   */
  create(overrides?: Partial<TestUser>): TestUser {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return {
      username: `e2etest${random}`,
      email: `e2e_${timestamp}_${random}@test.ltcg.dev`,
      displayName: `E2E Test User ${random}`,
      ...overrides,
    };
  },

  /**
   * Create multiple test users
   */
  createMultiple(count: number): TestUser[] {
    return Array.from({ length: count }, (_, i) => {
      const timestamp = Date.now() + i;
      const random = Math.random().toString(36).slice(2, 8);
      return TestUserFactory.create({
        username: `e2etest${i}_${random}`,
        email: `e2e_${timestamp}_${i}@test.ltcg.dev`,
        displayName: `E2E Test User ${i}`,
      });
    });
  },

  /**
   * Create a deterministic test user for persistent sessions
   * Use this for auth setup that persists between test runs
   */
  createPersistent(): TestUser {
    return {
      username: "e2etestuser",
      email: "e2e.persistent@test.ltcg.dev",
      displayName: "E2E Persistent Test User",
    };
  },
};

// =============================================================================
// TEST DECK FACTORY
// =============================================================================

export const TestDeckFactory = {
  create(overrides?: Partial<TestDeck>): TestDeck {
    const timestamp = Date.now();
    return {
      name: `Test Deck ${timestamp}`,
      description: "Created by E2E test",
      ...overrides,
    };
  },
};

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

export const TEST_CONFIG = {
  // Timeouts
  DEFAULT_TIMEOUT: 10000,
  GAME_START_TIMEOUT: 15000,
  NAVIGATION_TIMEOUT: 10000,
  ANIMATION_DELAY: 500,
  FAST_WAIT: 300,

  // Game constants
  STARTING_LP: 8000,
  STARTING_HAND_SIZE: 5,
  MIN_DECK_SIZE: 30,
  MAX_DECK_SIZE: 60,

  // Economy defaults
  STARTING_GOLD: 500,

  // URLs - matching actual app routes
  BASE_URL: "http://localhost:3334",
  LOGIN_URL: "/login",
  SIGNUP_URL: "/signup",
  SETUP_USERNAME_URL: "/setup-username",
  DASHBOARD_URL: "/lunchtable",
  BINDER_URL: "/binder",
  SHOP_URL: "/shop",
  SHOP_OPEN_URL: "/shop/open",
  STORY_URL: "/play/story",
  QUESTS_URL: "/quests",
  SOCIAL_URL: "/social",
  SETTINGS_URL: "/settings",
  LEADERBOARDS_URL: "/leaderboards",
} as const;

// =============================================================================
// SELECTORS - Updated for actual app components
// =============================================================================

export const SELECTORS = {
  // Auth - Privy modal based (not custom form inputs!)
  AUTH_LOGIN_BUTTON:
    'button:has-text("Enter the Hall"), button:has-text("Sign In"), button:has-text("Create Account")',
  AUTH_LOADING: 'text="Loading...", text="Entering the halls..."',

  // Username setup (after Privy auth)
  USERNAME_INPUT: "input#username",
  USERNAME_SUBMIT: 'button[type="submit"]:has-text("Enter the Archive")',

  // Navigation - sidebar/header links
  NAV_LUNCHTABLE: 'a[href="/lunchtable"]',
  NAV_BINDER: 'a[href="/binder"]',
  NAV_SHOP: 'a[href="/shop"]',
  NAV_STORY: 'a[href="/play/story"]',
  NAV_QUESTS: 'a[href="/quests"]',
  NAV_SOCIAL: 'a[href="/social"]',
  NAV_SETTINGS: 'a[href="/settings"]',
  NAV_LEADERBOARDS: 'a[href="/leaderboards"]',

  // Deck Builder (Binder page)
  DECK_LIST: '[data-testid="deck-list"]',
  DECK_BUILDER: '[data-testid="deck-builder"]',
  DECK_NAME_INPUT: 'input[name="deckName"], input[placeholder*="deck name" i]',
  DECK_SAVE_BUTTON: 'button:has-text("Save")',
  DECK_DELETE_BUTTON: 'button:has-text("Delete")',
  DECK_CREATE_BUTTON: 'button:has-text("New Deck"), button:has-text("Create")',
  CARD_ITEM: '[data-testid="card-item"]',

  // Game/Lobby
  GAME_BOARD: '[data-testid="game-board"]',
  GAME_LOBBY: '[data-testid="game-lobby"]',
  CREATE_GAME_MODAL: '[data-testid="create-game-modal"]',
  LOBBY_PLAYER: '[data-testid="lobby-player"]',
  END_TURN_BUTTON: '[data-testid="end-turn-btn"]',
  SKIP_BATTLE_BUTTON: '[data-testid="skip-battle-btn"]',
  PRIORITY_INDICATOR: '[data-testid="priority-indicator"]',
  CHAIN_DISPLAY: '[data-testid="chain-display"]',
  TIMEOUT_DISPLAY: '[data-testid="timeout-display"]',

  // Phase indicators
  TURN_NUMBER: '[data-testid="turn-number"]',
  PHASE_BAR: "[data-phase]",

  // Shop
  SHOP: '[data-testid="shop"]',
  PACK_ITEM: '[data-testid="pack-item"]',
  PACK_RESULTS: '[data-testid="pack-results"]',
  PLAYER_GOLD: '[data-testid="player-gold"]',

  // Story mode
  STORY_CHAPTER: '[data-testid="story-chapter"]',
  STORY_STAGE: '[data-testid="story-stage"]',
  STAGE_STARS: '[data-testid="stage-stars"]',
  STORY_DIALOGUE: '[data-testid="story-dialogue"]',
  CHAPTER_PROGRESS: '[data-testid="chapter-progress"]',
  START_BATTLE_BUTTON: 'button:has-text("Start Battle"), button:has-text("Play")',

  // Social
  FRIEND_REQUEST: '[data-testid="friend-request"]',
  ONLINE_STATUS: '[data-testid="online-status"]',

  // Quests/Achievements
  QUESTS_LIST: '[data-testid="quests-list"]',
  QUEST_PROGRESS: '[data-testid="quest-progress"]',
  ACHIEVEMENT: '[data-testid="achievement"]',
  ACHIEVEMENT_REWARD: '[data-testid="achievement-reward"]',

  // Leaderboard
  LEADERBOARD: '[data-testid="leaderboard"]',
  LEADERBOARD_ENTRY: '[data-testid="leaderboard-entry"]',

  // Chat
  GLOBAL_CHAT: '[data-testid="global-chat"]',
  CHAT_INPUT: '[data-testid="chat-input"]',

  // Notifications
  BATTLE_REWARDS: '[data-testid="battle-rewards"]',

  // Game result
  GAME_RESULT: '[data-testid="game-result"]',

  // Generic
  LOADING_SPINNER: '.animate-spin, [data-loading="true"]',
  ERROR_MESSAGE: '[role="alert"], .error, [data-error]',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
 * Wait for navigation to complete and page to stabilize
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: RegExp,
  timeout = TEST_CONFIG.NAVIGATION_TIMEOUT
) {
  await page.waitForURL(urlPattern, { timeout });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {
    // Network idle might not always be achievable, that's ok
  });
}

/**
 * Generate a random string for unique identifiers
 */
export function generateRandomString(length = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

/**
 * Wait for loading state to disappear
 */
export async function waitForLoadingToComplete(page: Page, _timeout = TEST_CONFIG.DEFAULT_TIMEOUT) {
  // Wait for common loading indicators to disappear
  const loadingSelectors = [
    ".animate-spin",
    'text="Loading..."',
    'text="Entering the halls..."',
    'text="Setting up your account..."',
  ];

  for (const selector of loadingSelectors) {
    try {
      await page.waitForSelector(selector, { state: "hidden", timeout: 2000 });
    } catch {
      // Selector might not exist, that's fine
    }
  }
}
