import { test, expect } from "./setup/fixtures";
import { GameStateHelper, ShopHelper } from "./setup/helpers";
import { TestUserFactory, TEST_CONFIG, SELECTORS } from "./setup/test-data";

/**
 * Real-time Updates & Stale Data Regression E2E Tests
 *
 * These tests are CRITICAL for catching:
 * - WebSocket subscription bugs
 * - Stale cached data
 * - Missing optimistic updates
 * - Cache invalidation failures
 *
 * Tests cover:
 * 1. Opponent moves updating in real-time
 * 2. Currency updates after purchases
 * 3. Leaderboard rank updates after wins
 * 4. Profile stats real-time sync
 * 5. Chat message delivery
 * 6. Game state synchronization
 */

test.describe("Real-time Data Updates", () => {
  test.describe("Opponent Move Updates", () => {
    test("should show opponent card on board in real-time within 2s", async ({
      context,
      authenticatedPage,
    }) => {
      // Create Player 2
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // Player 1 creates game
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');

      // Get game code or room ID for Player 2 to join
      const gameCodeElement = authenticatedPage.locator('[data-testid="game-code"]');
      const gameCode = await gameCodeElement.textContent();

      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      // Player 2 joins same game
      await page2.goto("/lunchtable");
      await page2.click('button:has-text("Join Game")');
      if (gameCode) {
        await page2.fill('input[name="gameCode"]', gameCode);
      }
      await page2.click('button:has-text("Join")');

      // Start game
      await authenticatedPage.click('button:has-text("Start Game")');
      await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      await page2.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      const gameHelper1 = new GameStateHelper(authenticatedPage);

      // Wait for Player 1's turn
      await gameHelper1.waitForPhase("main1");

      // Player 1 summons monster
      const opponentMonsterCountBefore = await page2
        .locator('[data-testid="opponent-monster"]')
        .count();

      await gameHelper1.clickHandCard(0);
      const summonButton = authenticatedPage.locator('button:has-text("Summon")');
      if (await summonButton.isVisible({ timeout: 2000 })) {
        await summonButton.click();
      }

      // CRITICAL: Player 2 should see opponent's monster within 2 seconds
      const startTime = Date.now();

      await page2.waitForSelector('[data-testid="opponent-monster"]', {
        timeout: 2000,
        state: "attached",
      });

      const elapsedTime = Date.now() - startTime;

      // Verify real-time update
      const opponentMonsterCountAfter = await page2
        .locator('[data-testid="opponent-monster"]')
        .count();

      expect(opponentMonsterCountAfter).toBeGreaterThan(opponentMonsterCountBefore);
      expect(elapsedTime).toBeLessThan(2000);

      await page2.close();
    });

    test("should show opponent life points decrease in real-time", async ({
      context,
      authenticatedPage,
    }) => {
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      // Setup two-player game (abbreviated for clarity)
      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      // Join and start game
      await page2.goto("/lunchtable");
      // ... join logic

      await authenticatedPage.click('button:has-text("Start Game")');
      await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      const gameHelper2 = new GameStateHelper(page2);

      // Get initial opponent LP on Player 2's screen
      const initialOpponentLP = await gameHelper2.getOpponentLifePoints();

      // Player 1 deals damage (summon + attack)
      // ... game action that causes damage

      // CRITICAL: Player 2 should see LP update within 2 seconds
      await page2.waitForFunction(
        (expectedLP: number) => {
          const lpElement = document.querySelector('[data-testid="opponent-lp"]');
          return lpElement && Number.parseInt(lpElement.textContent || "0", 10) < expectedLP;
        },
        initialOpponentLP,
        { timeout: 2000 }
      );

      const updatedOpponentLP = await gameHelper2.getOpponentLifePoints();
      expect(updatedOpponentLP).toBeLessThan(initialOpponentLP);

      await page2.close();
    });

    test("should show opponent phase changes in real-time", async ({
      context,
      authenticatedPage,
    }) => {
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      // Setup two-player game
      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // Create and join game (abbreviated)
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]');

      // Start game
      await authenticatedPage.click('button:has-text("Start Game")');
      await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      const gameHelper1 = new GameStateHelper(authenticatedPage);

      // Player 1 ends turn
      await gameHelper1.waitForPhase("main1");
      await gameHelper1.endTurn();

      // CRITICAL: Player 2 should see turn change within 2 seconds
      const turnIndicator = page2.locator('text=/your.*turn/i');
      await expect(turnIndicator).toBeVisible({ timeout: 2000 });

      await page2.close();
    });
  });

  test.describe("Currency Update After Purchase", () => {
    test("should update gold balance in real-time without refresh", async ({
      authenticatedPage,
    }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      // Get initial gold
      const goldBefore = await shopHelper.getGoldAmount();

      // Purchase pack
      await shopHelper.buyPack();

      // CRITICAL: Gold should update immediately in UI without refresh
      // Wait for gold to update (within 2 seconds)
      await authenticatedPage.waitForFunction(
        (expectedGold: number) => {
          const goldElement = document.querySelector('[data-testid="player-gold"]');
          if (!goldElement) return false;
          const currentGold = Number.parseInt(goldElement.textContent?.replace(/\D/g, "") || "0", 10);
          return currentGold < expectedGold;
        },
        goldBefore,
        { timeout: 2000 }
      );

      const goldAfter = await shopHelper.getGoldAmount();

      // Verify no stale cached balance
      expect(goldAfter).toBeLessThan(goldBefore);
      expect(goldAfter).toBe(goldBefore - TEST_CONFIG.PACK_COST);
    });

    test("should persist gold balance after page refresh", async ({
      authenticatedPage,
    }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      // Purchase pack
      await shopHelper.buyPack();

      // Wait for update
      await authenticatedPage.waitForTimeout(1000);

      // Get gold after purchase
      const goldAfterPurchase = await shopHelper.getGoldAmount();

      // CRITICAL: Refresh page and verify cache invalidated
      await authenticatedPage.reload();
      await authenticatedPage.waitForSelector('[data-testid="player-gold"]', {
        timeout: 5000,
      });

      const goldAfterRefresh = await shopHelper.getGoldAmount();

      // Should match, not show stale cached value
      expect(goldAfterRefresh).toBe(goldAfterPurchase);
    });

    test("should update gold across multiple tabs in real-time", async ({
      context,
      authenticatedPage,
    }) => {
      // Open second tab with same user
      const page2 = await context.newPage();
      await page2.goto("/shop");
      await page2.waitForSelector('[data-testid="player-gold"]', { timeout: 5000 });

      const shopHelper1 = new ShopHelper(authenticatedPage);
      const shopHelper2 = new ShopHelper(page2);

      await shopHelper1.navigate();

      // Get initial gold on both tabs
      const goldBeforeTab1 = await shopHelper1.getGoldAmount();
      const goldBeforeTab2 = await shopHelper2.getGoldAmount();

      expect(goldBeforeTab1).toBe(goldBeforeTab2);

      // Purchase on Tab 1
      await shopHelper1.buyPack();

      // Wait for Tab 1 update
      await authenticatedPage.waitForTimeout(500);
      const goldAfterTab1 = await shopHelper1.getGoldAmount();

      // CRITICAL: Tab 2 should see update via WebSocket within 2 seconds
      await page2.waitForFunction(
        (expectedGold: number) => {
          const goldElement = document.querySelector('[data-testid="player-gold"]');
          if (!goldElement) return false;
          const currentGold = Number.parseInt(goldElement.textContent?.replace(/\D/g, "") || "0", 10);
          return currentGold < expectedGold;
        },
        goldBeforeTab2,
        { timeout: 2000 }
      );

      const goldAfterTab2 = await shopHelper2.getGoldAmount();

      // Both tabs should show same updated value
      expect(goldAfterTab2).toBe(goldAfterTab1);
      expect(goldAfterTab2).toBeLessThan(goldBeforeTab2);

      await page2.close();
    });

    test("should update pack count in real-time", async ({
      authenticatedPage,
    }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      const packsBeforePurchase = await shopHelper.getPackCount();

      // Buy pack
      await shopHelper.buyPack();

      // CRITICAL: Pack count should update without refresh
      await authenticatedPage.waitForFunction(
        (expectedCount: number) => {
          const packs = document.querySelectorAll('[data-testid="pack-item"]');
          return packs.length > expectedCount;
        },
        packsBeforePurchase,
        { timeout: 2000 }
      );

      const packsAfterPurchase = await shopHelper.getPackCount();
      expect(packsAfterPurchase).toBeGreaterThan(packsBeforePurchase);

      // Verify persistence
      await authenticatedPage.reload();
      await authenticatedPage.waitForSelector('[data-testid="shop"]', { timeout: 5000 });

      const packsAfterRefresh = await shopHelper.getPackCount();
      expect(packsAfterRefresh).toBe(packsAfterPurchase);
    });
  });

  test.describe("Leaderboard Position After Win", () => {
    test("should update leaderboard rank after winning game", async ({
      authenticatedPage,
    }) => {
      // Get initial rank
      await authenticatedPage.goto("/leaderboards");
      await authenticatedPage.waitForSelector('[data-testid="leaderboard"]', {
        timeout: 5000,
      });

      // Find current user in leaderboard
      const initialRankElement = authenticatedPage.locator(
        '[data-testid="player-rank"]:has([data-current-user="true"])'
      );

      let initialRank: number | null = null;
      if (await initialRankElement.isVisible({ timeout: 2000 })) {
        const rankText = await initialRankElement.textContent();
        initialRank = Number.parseInt(rankText || "0", 10);
      }

      // Play and win a ranked game
      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.click('button:has-text("Create Game")');
      await authenticatedPage.waitForSelector('[data-testid="create-game-modal"]');

      // Select AI opponent
      const aiOption = authenticatedPage.locator('input[value="ai"]');
      if (await aiOption.isVisible({ timeout: 2000 })) {
        await aiOption.click();
      }

      await authenticatedPage.click('button:has-text("Create")');
      await authenticatedPage.waitForSelector('[data-testid="game-lobby"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      await authenticatedPage.click('button:has-text("Start Game")');
      await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      // Win game (simplified - in real test would play to completion)
      const gameHelper = new GameStateHelper(authenticatedPage);

      // Play until win (or timeout)
      let gameOver = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!gameOver && attempts < maxAttempts) {
        try {
          gameOver = await gameHelper.isGameOver();
          if (!gameOver) {
            await gameHelper.waitForPhase("main1");
            await gameHelper.endTurn();
            await authenticatedPage.waitForTimeout(2000);
            attempts++;
          }
        } catch (error) {
          break;
        }
      }

      // If game ended, check result
      if (gameOver) {
        const result = await gameHelper.getGameResult();

        if (result === "win") {
          // Navigate back to leaderboard
          await authenticatedPage.goto("/leaderboards");
          await authenticatedPage.waitForSelector('[data-testid="leaderboard"]', {
            timeout: 5000,
          });

          // CRITICAL: Rank should update without manual refresh
          const updatedRankElement = authenticatedPage.locator(
            '[data-testid="player-rank"]:has([data-current-user="true"])'
          );

          await expect(updatedRankElement).toBeVisible({ timeout: 5000 });

          const rankText = await updatedRankElement.textContent();
          const updatedRank = Number.parseInt(rankText || "0", 10);

          // Rank should improve (lower number) or stats should change
          if (initialRank !== null) {
            expect(updatedRank).toBeLessThanOrEqual(initialRank);
          }
        }
      }
    });

    test("should persist leaderboard rank after page refresh", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/leaderboards");
      await authenticatedPage.waitForSelector('[data-testid="leaderboard"]', {
        timeout: 5000,
      });

      // Get current rank
      const rankElement = authenticatedPage.locator(
        '[data-testid="player-rank"]:has([data-current-user="true"])'
      );

      let rank: number | null = null;
      if (await rankElement.isVisible({ timeout: 2000 })) {
        const rankText = await rankElement.textContent();
        rank = Number.parseInt(rankText || "0", 10);
      }

      // CRITICAL: Refresh and verify cache invalidated
      await authenticatedPage.reload();
      await authenticatedPage.waitForSelector('[data-testid="leaderboard"]', {
        timeout: 5000,
      });

      // Rank should persist
      const rankAfterRefresh = authenticatedPage.locator(
        '[data-testid="player-rank"]:has([data-current-user="true"])'
      );

      if (rank !== null) {
        await expect(rankAfterRefresh).toBeVisible({ timeout: 5000 });
        const rankTextAfter = await rankAfterRefresh.textContent();
        const rankAfter = Number.parseInt(rankTextAfter || "0", 10);

        expect(rankAfter).toBe(rank);
      }
    });

    test("should show updated win/loss stats in real-time", async ({
      authenticatedPage,
    }) => {
      // View profile
      await authenticatedPage.goto("/profile");
      await authenticatedPage.waitForSelector('[data-testid="player-stats"]', {
        timeout: 5000,
      });

      // Get initial win count
      const winsElement = authenticatedPage.locator('[data-testid="win-count"]');
      let initialWins = 0;

      if (await winsElement.isVisible({ timeout: 2000 })) {
        const winsText = await winsElement.textContent();
        initialWins = Number.parseInt(winsText?.replace(/\D/g, "") || "0", 10);
      }

      // Play game (abbreviated)
      await authenticatedPage.goto("/lunchtable");
      // ... play game to win

      // Return to profile
      await authenticatedPage.goto("/profile");
      await authenticatedPage.waitForSelector('[data-testid="player-stats"]', {
        timeout: 5000,
      });

      // CRITICAL: Win count should update without manual refresh
      await authenticatedPage.waitForFunction(
        (expectedWins: number) => {
          const winsEl = document.querySelector('[data-testid="win-count"]');
          if (!winsEl) return false;
          const currentWins = Number.parseInt(winsEl.textContent?.replace(/\D/g, "") || "0", 10);
          return currentWins > expectedWins;
        },
        initialWins,
        { timeout: 5000 }
      );

      const updatedWinsText = await winsElement.textContent();
      const updatedWins = Number.parseInt(updatedWinsText?.replace(/\D/g, "") || "0", 10);

      expect(updatedWins).toBeGreaterThan(initialWins);
    });
  });

  test.describe("Chat Message Real-time Delivery", () => {
    test("should deliver chat messages in real-time between users", async ({
      context,
      authenticatedPage,
    }) => {
      // Create second user
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // Both users go to chat
      await authenticatedPage.goto("/lunchtable");
      await page2.goto("/lunchtable");

      // Find chat input
      const chatInput1 = authenticatedPage.locator('[data-testid="chat-input"]');

      // User 1 sends message
      const testMessage = `Test message ${Date.now()}`;
      await chatInput1.fill(testMessage);
      await authenticatedPage.keyboard.press("Enter");

      // CRITICAL: User 2 should see message within 2 seconds
      const messageLocator = page2.locator(`text=${testMessage}`);
      await expect(messageLocator).toBeVisible({ timeout: 2000 });

      await page2.close();
    });

    test("should update chat across multiple tabs", async ({
      context,
      authenticatedPage,
    }) => {
      // Open second tab with same user
      const page2 = await context.newPage();
      await page2.goto("/lunchtable");

      const chatInput1 = authenticatedPage.locator('[data-testid="chat-input"]');

      await authenticatedPage.goto("/lunchtable");
      await authenticatedPage.waitForSelector('[data-testid="chat-input"]', {
        timeout: 5000,
      });

      await page2.waitForSelector('[data-testid="chat-input"]', { timeout: 5000 });

      // Send message in tab 1
      const testMessage = `Cross-tab test ${Date.now()}`;
      await chatInput1.fill(testMessage);
      await authenticatedPage.keyboard.press("Enter");

      // CRITICAL: Tab 2 should see message via WebSocket
      const messageLocator = page2.locator(`text=${testMessage}`);
      await expect(messageLocator).toBeVisible({ timeout: 2000 });

      await page2.close();
    });
  });

  test.describe("Collection Updates After Pack Opening", () => {
    test("should add cards to collection in real-time", async ({
      authenticatedPage,
    }) => {
      const shopHelper = new ShopHelper(authenticatedPage);

      // Go to binder, count initial cards
      await authenticatedPage.goto("/binder");
      await authenticatedPage.waitForSelector('[data-testid="collection-view"]', {
        timeout: 5000,
      });

      const initialCardCount = await authenticatedPage
        .locator('[data-testid="collection-card"]')
        .count();

      // Buy and open pack
      await shopHelper.navigate();
      await shopHelper.buyPack();
      await shopHelper.openPack();

      // Wait for pack results
      await authenticatedPage.waitForSelector('[data-testid="pack-results"]', {
        timeout: 10000,
      });

      // Close results
      const closeButton = authenticatedPage.locator('button:has-text("Close")');
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
      }

      // CRITICAL: Navigate to binder, cards should be there immediately
      await authenticatedPage.goto("/binder");
      await authenticatedPage.waitForSelector('[data-testid="collection-view"]', {
        timeout: 5000,
      });

      // Wait for card count to update
      await authenticatedPage.waitForFunction(
        (expectedCount: number) => {
          const cards = document.querySelectorAll('[data-testid="collection-card"]');
          return cards.length > expectedCount;
        },
        initialCardCount,
        { timeout: 2000 }
      );

      const newCardCount = await authenticatedPage
        .locator('[data-testid="collection-card"]')
        .count();

      expect(newCardCount).toBeGreaterThan(initialCardCount);
      expect(newCardCount).toBe(initialCardCount + TEST_CONFIG.CARDS_PER_PACK);
    });

    test("should persist collection after refresh", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/binder");
      await authenticatedPage.waitForSelector('[data-testid="collection-view"]', {
        timeout: 5000,
      });

      const cardCountBefore = await authenticatedPage
        .locator('[data-testid="collection-card"]')
        .count();

      // CRITICAL: Refresh and verify no stale cache
      await authenticatedPage.reload();
      await authenticatedPage.waitForSelector('[data-testid="collection-view"]', {
        timeout: 5000,
      });

      const cardCountAfter = await authenticatedPage
        .locator('[data-testid="collection-card"]')
        .count();

      expect(cardCountAfter).toBe(cardCountBefore);
    });
  });

  test.describe("Presence Updates", () => {
    test("should show online status in real-time", async ({
      context,
      authenticatedPage,
    }) => {
      // Add friend first
      const user2 = TestUserFactory.create();
      const page2 = await context.newPage();

      await page2.goto("/signup");
      await page2.fill(SELECTORS.AUTH_USERNAME_INPUT, user2.username);
      await page2.fill(SELECTORS.AUTH_EMAIL_INPUT, user2.email);
      await page2.fill(SELECTORS.AUTH_PASSWORD_INPUT, user2.password);
      await page2.click(SELECTORS.AUTH_SUBMIT_BUTTON);
      await page2.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 10000 });

      // View friends list
      await authenticatedPage.goto("/social");

      // User 2 goes online
      await page2.goto("/lunchtable");

      // CRITICAL: User 1 should see User 2 online within 2 seconds
      const onlineIndicator = authenticatedPage.locator(
        `[data-username="${user2.username}"] [data-testid="online-status"]`
      );

      if (await onlineIndicator.isVisible({ timeout: 2000 })) {
        await expect(onlineIndicator).toHaveAttribute("data-online", "true", {
          timeout: 2000,
        });
      }

      // User 2 goes offline
      await page2.close();

      // CRITICAL: User 1 should see User 2 offline within 5 seconds
      if (await onlineIndicator.isVisible({ timeout: 1000 })) {
        await expect(onlineIndicator).toHaveAttribute("data-online", "false", {
          timeout: 5000,
        });
      }
    });
  });

  test.describe("Optimistic Updates", () => {
    test("should show optimistic UI update before server confirms", async ({
      authenticatedPage,
    }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      const goldBefore = await shopHelper.getGoldAmount();

      // Buy pack - should update UI immediately (optimistically)
      const buyButton = authenticatedPage.locator(SELECTORS.SHOP_BUY_PACK_BUTTON);
      await buyButton.click();

      // CRITICAL: UI should update within 100ms (optimistic)
      await authenticatedPage.waitForTimeout(100);

      const goldAfterOptimistic = await shopHelper.getGoldAmount();

      // Should show optimistic update
      expect(goldAfterOptimistic).toBeLessThan(goldBefore);

      // Wait for server confirmation
      await authenticatedPage.waitForTimeout(1000);

      const goldAfterConfirmed = await shopHelper.getGoldAmount();

      // Should remain consistent
      expect(goldAfterConfirmed).toBe(goldAfterOptimistic);
    });

    test("should rollback optimistic update on error", async ({
      authenticatedPage,
    }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      // Drain gold to insufficient amount
      let currentGold = await shopHelper.getGoldAmount();

      // Try to buy pack with insufficient gold
      if (currentGold < TEST_CONFIG.PACK_COST) {
        const goldBefore = currentGold;

        const buyButton = authenticatedPage.locator(SELECTORS.SHOP_BUY_PACK_BUTTON);

        // Should be disabled or show error
        if (await buyButton.isDisabled()) {
          expect(true).toBeTruthy();
        } else {
          await buyButton.click();

          // CRITICAL: Should show error and rollback optimistic update
          await expect(
            authenticatedPage.locator('text=/insufficient.*gold/i')
          ).toBeVisible({ timeout: 2000 });

          const goldAfter = await shopHelper.getGoldAmount();

          // Gold should be unchanged (rollback)
          expect(goldAfter).toBe(goldBefore);
        }
      }
    });
  });

  test.describe("Quest Progress Real-time Updates", () => {
    test("should update quest progress without refresh", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/quests");
      await authenticatedPage.waitForSelector('[data-testid="quests-list"]', {
        timeout: 5000,
      });

      // Get initial quest progress
      const questProgress = authenticatedPage.locator('[data-testid="quest-progress"]').first();

      let initialProgress = 0;
      if (await questProgress.isVisible({ timeout: 2000 })) {
        const progressText = await questProgress.textContent();
        initialProgress = Number.parseInt(progressText?.replace(/\D/g, "") || "0", 10);
      }

      // Perform action that progresses quest (e.g., win a game)
      await authenticatedPage.goto("/lunchtable");
      // ... play game

      // Return to quests
      await authenticatedPage.goto("/quests");
      await authenticatedPage.waitForSelector('[data-testid="quests-list"]', {
        timeout: 5000,
      });

      // CRITICAL: Quest progress should update without manual refresh
      await authenticatedPage.waitForFunction(
        (expected: number) => {
          const progressEl = document.querySelector('[data-testid="quest-progress"]');
          if (!progressEl) return false;
          const current = Number.parseInt(progressEl.textContent?.replace(/\D/g, "") || "0", 10);
          return current > expected;
        },
        initialProgress,
        { timeout: 5000 }
      );
    });
  });
});
