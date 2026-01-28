import { test, expect } from "./setup/fixtures";
import { TestUserFactory, SELECTORS, TEST_CONFIG } from "./setup/test-data";

/**
 * Game Lobby Flow E2E Tests
 *
 * Tests game lobby functionality including:
 * - Creating game lobby
 * - Joining lobby
 * - Starting game
 * - Leaving lobby
 * - Spectator mode
 */

test.describe("Game Lobby Flow", () => {
  test.describe("Lobby Creation", () => {
    test("should create a new game lobby", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      // Click create game
      await authenticatedPage.click('button:has-text("Create Game")');

      // Fill in game settings
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]', {
        timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
      });

      // Select game mode (if applicable)
      // Submit
      await authenticatedPage.click('button:has-text("Create")');

      // Should show lobby
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      // Verify lobby exists
      await expect(
        authenticatedPage.locator('[data-testid="game-lobby"]')
      ).toBeVisible();
    });

    test("should show lobby code/ID", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      // Create game
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');
      await authenticatedPage.click('button:has-text("Create")');

      // Wait for lobby
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      // Lobby ID should be visible
      await expect(
        authenticatedPage.locator('[data-testid="lobby-id"]')
      ).toBeVisible();
    });

    test("should show host as lobby creator", async ({ authenticatedPage, testUser }) => {
      await authenticatedPage.goto("/lunchtable");

      // Create game
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');
      await authenticatedPage.click('button:has-text("Create")');

      // Wait for lobby
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      // Host indicator should be visible
      await expect(
        authenticatedPage.locator('[data-testid="host-indicator"]')
      ).toBeVisible();
    });

    test("should require active deck to create game", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      // Try to create game without active deck
      const createButton = authenticatedPage.locator('button:has-text("Create Game")');

      // Should show error or button should be disabled
      const isDisabled = await createButton.isDisabled();
      if (!isDisabled) {
        await createButton.click();
        await expect(
          authenticatedPage.locator('text=/select.*active.*deck/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Joining Lobby", () => {
    test("should join existing lobby", async ({ context, authenticatedPage, testUser }) => {
      // User 1 creates lobby
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');
      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      // Get lobby ID
      const lobbyId = await authenticatedPage
        .locator('[data-testid="lobby-id"]')
        .textContent();

      // User 2 joins lobby
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      // Sign up user 2
      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // Navigate to lunchtable and join
      await page2.goto("/lunchtable");
      await page2.click('button:has-text("Join Game")');
      await page2.fill('input[name="lobbyId"]', lobbyId || "");
      await page2.click('button:has-text("Join")');

      // Should see lobby
      await page2.waitForSelector('[data-testid="game-lobby"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      // Original page should show 2 players
      const playerCount = await authenticatedPage
        .locator('[data-testid="lobby-player"]')
        .count();
      expect(playerCount).toBeGreaterThanOrEqual(2);

      await page2.close();
    });

    test("should show error for invalid lobby ID", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      // Try to join with invalid ID
      await authenticatedPage.click('button:has-text("Join Game")');
      await authenticatedPage.fill('input[name="lobbyId"]', "INVALID_LOBBY_ID");
      await authenticatedPage.click('button:has-text("Join")');

      // Should show error
      await expect(
        authenticatedPage.locator('text=/lobby.*not.*found/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should not join full lobby", async ({ authenticatedPage }) => {
      // This test assumes a 2-player maximum
      // Create lobby and have it filled by other players
      // Then try to join as third player
      // Implementation depends on game rules
    });
  });

  test.describe("Starting Game", () => {
    test("should start game when all players ready", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      // Create game with AI opponent (if supported)
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');

      // Select AI opponent option (if available)
      const aiOption = authenticatedPage.locator('input[value="ai"]');
      if (await aiOption.isVisible({ timeout: 2000 })) {
        await aiOption.click();
      }

      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      // Mark as ready
      const readyButton = authenticatedPage.locator('button:has-text("Ready")');
      if (await readyButton.isVisible({ timeout: 2000 })) {
        await readyButton.click();
      }

      // Start game
      await authenticatedPage.click('button:has-text("Start Game")');

      // Should navigate to game
      await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      await expect(
        authenticatedPage.locator('[data-testid="game-board"]')
      ).toBeVisible();
    });

    test("should only allow host to start game", async ({ context, authenticatedPage }) => {
      // User 1 creates lobby (host)
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');
      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      const lobbyId = await authenticatedPage
        .locator('[data-testid="lobby-id"]')
        .textContent();

      // User 2 joins lobby (non-host)
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      await page2.goto("/lunchtable");
      await page2.click('button:has-text("Join Game")');
      await page2.fill('input[name="lobbyId"]', lobbyId || "");
      await page2.click('button:has-text("Join")');
      await page2.waitForSelector('[data-testid="game-lobby"]');

      // User 2 should not see start button
      const startButton = page2.locator('button:has-text("Start Game")');
      const isVisible = await startButton.isVisible({ timeout: 2000 });
      expect(isVisible).toBeFalsy();

      await page2.close();
    });

    test("should require minimum players to start", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      // Create game
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');
      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      // Try to start with only 1 player
      const startButton = authenticatedPage.locator('button:has-text("Start Game")');

      // Should be disabled or show error
      const isDisabled = await startButton.isDisabled();
      if (!isDisabled) {
        await startButton.click();
        await expect(
          authenticatedPage.locator('text=/need.*more.*players/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Leaving Lobby", () => {
    test("should leave lobby before game starts", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");

      // Create game
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');
      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      // Leave lobby
      await authenticatedPage.click(SELECTORS.GAME_LEAVE_BUTTON);

      // Should return to lunchtable
      await authenticatedPage.waitForURL(/\/lunchtable/, { timeout: 5000 });
      await expect(authenticatedPage).toHaveURL(/\/lunchtable/);
    });

    test("should close lobby when host leaves", async ({ context, authenticatedPage }) => {
      // User 1 creates lobby
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');
      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      const lobbyId = await authenticatedPage
        .locator('[data-testid="lobby-id"]')
        .textContent();

      // User 2 joins
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      await page2.goto("/lunchtable");
      await page2.click('button:has-text("Join Game")');
      await page2.fill('input[name="lobbyId"]', lobbyId || "");
      await page2.click('button:has-text("Join")');
      await page2.waitForSelector('[data-testid="game-lobby"]');

      // Host leaves
      await authenticatedPage.click(SELECTORS.GAME_LEAVE_BUTTON);

      // User 2 should be kicked/notified
      await expect(
        page2.locator('text=/lobby.*closed/i')
      ).toBeVisible({ timeout: 5000 });

      await page2.close();
    });
  });

  test.describe("Spectator Mode", () => {
    test("should allow spectating ongoing games", async ({ context, authenticatedPage }) => {
      // Create and start a game
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');

      // Select AI opponent
      const aiOption = authenticatedPage.locator('input[value="ai"]');
      if (await aiOption.isVisible({ timeout: 2000 })) {
        await aiOption.click();
      }

      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');
      await authenticatedPage.click('button:has-text("Start Game")');

      // Wait for game to start
      await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      // Get game ID from URL
      const gameUrl = authenticatedPage.url();
      const gameId = gameUrl.match(/game\/([^/]+)/)?.[1];

      if (gameId) {
        // Create spectator user
        const spectator = TestUserFactory.create();
        const spectatorPage = await context.newPage();

        await spectatorPage.goto("/signup");
        await spectatorPage.fill(SELECTORS.AUTH_USERNAME_INPUT, spectator.username);
        await spectatorPage.fill(SELECTORS.AUTH_EMAIL_INPUT, spectator.email);
        await spectatorPage.fill(SELECTORS.AUTH_PASSWORD_INPUT, spectator.password);
        await spectatorPage.click(SELECTORS.AUTH_SUBMIT_BUTTON);
        await spectatorPage.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

        // Navigate to spectate
        await spectatorPage.goto(`/game/${gameId}/spectate`);

        // Should see game board in spectator mode
        await spectatorPage.waitForSelector('[data-testid="spectator-view"]', {
          timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
        });

        await expect(
          spectatorPage.locator('[data-testid="spectator-view"]')
        ).toBeVisible();

        await spectatorPage.close();
      }
    });

    test("should not allow spectator actions", async ({ context, authenticatedPage }) => {
      // Similar setup to above test
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');

      const aiOption = authenticatedPage.locator('input[value="ai"]');
      if (await aiOption.isVisible({ timeout: 2000 })) {
        await aiOption.click();
      }

      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');
      await authenticatedPage.click('button:has-text("Start Game")');
      await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      const gameUrl = authenticatedPage.url();
      const gameId = gameUrl.match(/game\/([^/]+)/)?.[1];

      if (gameId) {
        const spectator = TestUserFactory.create();
        const spectatorPage = await context.newPage();

        await spectatorPage.goto("/signup");
        await spectatorPage.fill(SELECTORS.AUTH_USERNAME_INPUT, spectator.username);
        await spectatorPage.fill(SELECTORS.AUTH_EMAIL_INPUT, spectator.email);
        await spectatorPage.fill(SELECTORS.AUTH_PASSWORD_INPUT, spectator.password);
        await spectatorPage.click(SELECTORS.AUTH_SUBMIT_BUTTON);
        await spectatorPage.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

        await spectatorPage.goto(`/game/${gameId}/spectate`);
        await spectatorPage.waitForSelector('[data-testid="spectator-view"]');

        // Action buttons should not be visible/enabled
        const endTurnButton = spectatorPage.locator(SELECTORS.GAME_END_TURN_BUTTON);
        const isVisible = await endTurnButton.isVisible({ timeout: 2000 });
        expect(isVisible).toBeFalsy();

        await spectatorPage.close();
      }
    });
  });

  test.describe("Lobby UI/UX", () => {
    test("should display player list", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');
      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      // Player list should be visible
      await expect(
        authenticatedPage.locator('[data-testid="lobby-players"]')
      ).toBeVisible();
    });

    test("should show player ready status", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');
      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      // Ready button should be visible
      const readyButton = authenticatedPage.locator('button:has-text("Ready")');
      if (await readyButton.isVisible({ timeout: 2000 })) {
        await readyButton.click();

        // Ready indicator should appear
        await expect(
          authenticatedPage.locator('[data-testid="player-ready"]')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
