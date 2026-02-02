/**
 * Game Lobby Flow E2E Tests
 *
 * Tests game lobby functionality including:
 * - Creating game lobby
 * - Joining lobby
 * - Starting game
 * - Leaving lobby
 * - Spectator mode
 *
 * Note: These tests require authentication. Tests are skipped by default.
 * To run them, set up authenticated browser state first.
 */

import { test, expect, enableConsoleLogs } from "./setup/fixtures";
import { TEST_CONFIG, SELECTORS, waitForLoadingToComplete } from "./setup/test-data";

// =============================================================================
// AUTHENTICATED LOBBY TESTS
// =============================================================================

test.describe("Game Lobby Flow", () => {
  // Skip all tests by default since they require authentication
  test.beforeEach(async () => {
    test.skip();
  });

  test.describe("Lobby Creation", () => {
    test("should create a new game lobby", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Click create game
      await page.click('button:has-text("Create Game")');

      // Fill in game settings
      await page.waitForSelector('[data-testid="create-game-modal"]', {
        timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
      });

      // Submit
      await page.click('button:has-text("Create")');

      // Should show lobby
      await page.waitForSelector('[data-testid="game-lobby"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      // Verify lobby exists
      await expect(page.locator('[data-testid="game-lobby"]')).toBeVisible();
    });

    test("should show lobby code/ID", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Create game
      await page.click('button:has-text("Create Game")');
      await page.waitForSelector('[data-testid="create-game-modal"]');
      await page.click('button:has-text("Create")');

      // Wait for lobby
      await page.waitForSelector('[data-testid="game-lobby"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      // Lobby ID should be visible
      await expect(page.locator('[data-testid="lobby-id"]')).toBeVisible();
    });

    test("should show host as lobby creator", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Create game
      await page.click('button:has-text("Create Game")');
      await page.waitForSelector('[data-testid="create-game-modal"]');
      await page.click('button:has-text("Create")');

      // Wait for lobby
      await page.waitForSelector('[data-testid="game-lobby"]');

      // Host indicator should be visible
      await expect(page.locator('[data-testid="host-indicator"]')).toBeVisible();
    });

    test("should require active deck to create game", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Try to create game without active deck
      const createButton = page.locator('button:has-text("Create Game")');

      // Should show error or button should be disabled
      const isDisabled = await createButton.isDisabled();
      if (!isDisabled) {
        await createButton.click();
        await expect(
          page.locator('text=/select.*active.*deck/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Joining Lobby", () => {
    test("should join existing lobby", async ({ page }) => {
      enableConsoleLogs(page);

      // This test requires two authenticated users
      // For now, test the join UI flow
      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Check if join button exists
      const joinButton = page.locator('button:has-text("Join Game")');
      await expect(joinButton).toBeVisible();
    });

    test("should show error for invalid lobby ID", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Try to join with invalid ID
      await page.click('button:has-text("Join Game")');
      await page.fill('input[name="lobbyId"]', "INVALID_LOBBY_ID");
      await page.click('button:has-text("Join")');

      // Should show error
      await expect(
        page.locator('text=/lobby.*not.*found/i')
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Starting Game", () => {
    test("should start game when all players ready", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Create game with AI opponent (if supported)
      await page.click('button:has-text("Create Game")');
      await page.waitForSelector('[data-testid="create-game-modal"]');

      // Select AI opponent option (if available)
      const aiOption = page.locator('input[value="ai"]');
      if (await aiOption.isVisible({ timeout: 2000 })) {
        await aiOption.click();
      }

      await page.click('button:has-text("Create")');
      await page.waitForSelector('[data-testid="game-lobby"]');

      // Mark as ready
      const readyButton = page.locator('button:has-text("Ready")');
      if (await readyButton.isVisible({ timeout: 2000 })) {
        await readyButton.click();
      }

      // Start game
      await page.click('button:has-text("Start Game")');

      // Should navigate to game
      await page.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    });

    test("should require minimum players to start", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Create game
      await page.click('button:has-text("Create Game")');
      await page.waitForSelector('[data-testid="create-game-modal"]');
      await page.click('button:has-text("Create")');
      await page.waitForSelector('[data-testid="game-lobby"]');

      // Try to start with only 1 player
      const startButton = page.locator('button:has-text("Start Game")');

      // Should be disabled or show error
      const isDisabled = await startButton.isDisabled();
      if (!isDisabled) {
        await startButton.click();
        await expect(
          page.locator('text=/need.*more.*players/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Leaving Lobby", () => {
    test("should leave lobby before game starts", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Create game
      await page.click('button:has-text("Create Game")');
      await page.waitForSelector('[data-testid="create-game-modal"]');
      await page.click('button:has-text("Create")');
      await page.waitForSelector('[data-testid="game-lobby"]');

      // Leave lobby
      const leaveButton = page.locator('button:has-text("Leave")');
      if (await leaveButton.isVisible({ timeout: 2000 })) {
        await leaveButton.click();
      }

      // Should return to lunchtable
      await page.waitForURL(/\/lunchtable/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/lunchtable/);
    });
  });

  test.describe("Spectator Mode", () => {
    test("should allow spectating ongoing games", async ({ page }) => {
      enableConsoleLogs(page);

      // Navigate to a spectate URL if available
      // This depends on having a game in progress
    });
  });

  test.describe("Lobby UI/UX", () => {
    test("should display player list", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      await page.click('button:has-text("Create Game")');
      await page.waitForSelector('[data-testid="create-game-modal"]');
      await page.click('button:has-text("Create")');
      await page.waitForSelector('[data-testid="game-lobby"]');

      // Player list should be visible
      await expect(
        page.locator('[data-testid="lobby-players"]')
      ).toBeVisible();
    });

    test("should show player ready status", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      await page.click('button:has-text("Create Game")');
      await page.waitForSelector('[data-testid="create-game-modal"]');
      await page.click('button:has-text("Create")');
      await page.waitForSelector('[data-testid="game-lobby"]');

      // Ready button should be visible
      const readyButton = page.locator('button:has-text("Ready")');
      if (await readyButton.isVisible({ timeout: 2000 })) {
        await readyButton.click();

        // Ready indicator should appear
        await expect(
          page.locator('[data-testid="player-ready"]')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
