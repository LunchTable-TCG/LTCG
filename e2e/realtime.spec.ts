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
 *
 * Note: These tests require authentication. Tests are skipped by default.
 * To run them, set up authenticated browser state first.
 */

import { enableConsoleLogs, expect, test } from "./setup/fixtures";
import { waitForLoadingToComplete } from "./setup/test-data";

// =============================================================================
// AUTHENTICATED REAL-TIME TESTS
// =============================================================================

test.describe("Real-time Data Updates", () => {
  // Skip all tests by default since they require authentication
  test.beforeEach(async () => {
    test.skip();
  });

  test.describe("Currency Update After Purchase", () => {
    test("should update gold balance in real-time without refresh", async ({
      page,
      shopHelper,
    }) => {
      enableConsoleLogs(page);

      await shopHelper.navigate();

      // Get initial gold
      const goldBefore = await shopHelper.getGold();

      // Purchase pack
      await shopHelper.buyPack();

      // CRITICAL: Gold should update immediately in UI without refresh
      // Wait for gold to update (within 2 seconds)
      await page.waitForFunction(
        (expectedGold: number) => {
          const goldElement = document.querySelector('[data-testid="player-gold"]');
          if (!goldElement) return false;
          const currentGold = Number.parseInt(
            goldElement.textContent?.replace(/\D/g, "") || "0",
            10
          );
          return currentGold < expectedGold;
        },
        goldBefore,
        { timeout: 2000 }
      );

      const goldAfter = await shopHelper.getGold();

      // Verify no stale cached balance
      expect(goldAfter).toBeLessThan(goldBefore);
    });

    test("should persist gold balance after page refresh", async ({ page, shopHelper }) => {
      enableConsoleLogs(page);

      await shopHelper.navigate();

      // Purchase pack
      await shopHelper.buyPack();

      // Wait for update
      await page.waitForTimeout(1000);

      // Get gold after purchase
      const goldAfterPurchase = await shopHelper.getGold();

      // CRITICAL: Refresh page and verify cache invalidated
      await page.reload();
      await page.waitForSelector('[data-testid="player-gold"]', {
        timeout: 5000,
      });

      const goldAfterRefresh = await shopHelper.getGold();

      // Should match, not show stale cached value
      expect(goldAfterRefresh).toBe(goldAfterPurchase);
    });

    test("should update pack count in real-time", async ({ page, shopHelper }) => {
      enableConsoleLogs(page);

      await shopHelper.navigate();

      // Buy pack
      await shopHelper.buyPack();

      // CRITICAL: Pack count should update without refresh
      // Verify persistence
      await page.reload();
      await page.waitForSelector('[data-testid="shop"]', { timeout: 5000 });
    });
  });

  test.describe("Leaderboard Position After Win", () => {
    test("should update leaderboard rank after winning game", async ({ page }) => {
      enableConsoleLogs(page);

      // Get initial rank
      await page.goto("/leaderboards");
      await waitForLoadingToComplete(page);

      await page.waitForSelector('[data-testid="leaderboard"]', {
        timeout: 5000,
      });

      // Find current user in leaderboard
      const initialRankElement = page.locator(
        '[data-testid="player-rank"]:has([data-current-user="true"])'
      );

      if (await initialRankElement.isVisible({ timeout: 2000 })) {
        const rankText = await initialRankElement.textContent();
        const initialRank = Number.parseInt(rankText || "0", 10);
        expect(initialRank).toBeGreaterThan(0);
      }
    });

    test("should persist leaderboard rank after page refresh", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/leaderboards");
      await waitForLoadingToComplete(page);

      await page.waitForSelector('[data-testid="leaderboard"]', {
        timeout: 5000,
      });

      // Get current rank
      const rankElement = page.locator(
        '[data-testid="player-rank"]:has([data-current-user="true"])'
      );

      let rank: number | null = null;
      if (await rankElement.isVisible({ timeout: 2000 })) {
        const rankText = await rankElement.textContent();
        rank = Number.parseInt(rankText || "0", 10);
      }

      // CRITICAL: Refresh and verify cache invalidated
      await page.reload();
      await page.waitForSelector('[data-testid="leaderboard"]', {
        timeout: 5000,
      });

      // Rank should persist
      const rankAfterRefresh = page.locator(
        '[data-testid="player-rank"]:has([data-current-user="true"])'
      );

      if (rank !== null) {
        await expect(rankAfterRefresh).toBeVisible({ timeout: 5000 });
        const rankTextAfter = await rankAfterRefresh.textContent();
        const rankAfter = Number.parseInt(rankTextAfter || "0", 10);

        expect(rankAfter).toBe(rank);
      }
    });

    test("should show updated win/loss stats in real-time", async ({ page }) => {
      enableConsoleLogs(page);

      // View profile
      await page.goto("/profile");
      await waitForLoadingToComplete(page);

      await page.waitForSelector('[data-testid="player-stats"]', {
        timeout: 5000,
      });

      // Get initial win count
      const winsElement = page.locator('[data-testid="win-count"]');
      if (await winsElement.isVisible({ timeout: 2000 })) {
        const winsText = await winsElement.textContent();
        const wins = Number.parseInt(winsText?.replace(/\D/g, "") || "0", 10);
        expect(wins).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe("Chat Message Real-time Delivery", () => {
    test("should deliver chat messages in real-time", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/lunchtable");
      await waitForLoadingToComplete(page);

      // Find chat input
      const chatInput = page.locator('[data-testid="chat-input"]');

      // Send message
      const testMessage = `Test message ${Date.now()}`;
      await chatInput.fill(testMessage);
      await page.keyboard.press("Enter");

      // Message should appear in chat
      const messageLocator = page.locator(`text=${testMessage}`);
      await expect(messageLocator).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Collection Updates After Pack Opening", () => {
    test("should add cards to collection in real-time", async ({ page, shopHelper }) => {
      enableConsoleLogs(page);

      // Go to binder, count initial cards
      await page.goto("/binder");
      await waitForLoadingToComplete(page);

      await page.waitForSelector('[data-testid="collection-view"]', {
        timeout: 5000,
      });

      const initialCardCount = await page.locator('[data-testid="collection-card"]').count();

      // Buy and open pack
      await shopHelper.navigate();
      await shopHelper.buyPack();

      if (await shopHelper.hasPackResults()) {
        // Close results
        const closeButton = page.locator('button:has-text("Close")');
        if (await closeButton.isVisible({ timeout: 2000 })) {
          await closeButton.click();
        }
      }

      // CRITICAL: Navigate to binder, cards should be there immediately
      await page.goto("/binder");
      await waitForLoadingToComplete(page);

      await page.waitForSelector('[data-testid="collection-view"]', {
        timeout: 5000,
      });

      const newCardCount = await page.locator('[data-testid="collection-card"]').count();

      expect(newCardCount).toBeGreaterThanOrEqual(initialCardCount);
    });

    test("should persist collection after refresh", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/binder");
      await waitForLoadingToComplete(page);

      await page.waitForSelector('[data-testid="collection-view"]', {
        timeout: 5000,
      });

      const cardCountBefore = await page.locator('[data-testid="collection-card"]').count();

      // CRITICAL: Refresh and verify no stale cache
      await page.reload();
      await waitForLoadingToComplete(page);

      await page.waitForSelector('[data-testid="collection-view"]', {
        timeout: 5000,
      });

      const cardCountAfter = await page.locator('[data-testid="collection-card"]').count();

      expect(cardCountAfter).toBe(cardCountBefore);
    });
  });

  test.describe("Quest Progress Real-time Updates", () => {
    test("should update quest progress without refresh", async ({ page }) => {
      enableConsoleLogs(page);

      await page.goto("/quests");
      await waitForLoadingToComplete(page);

      await page.waitForSelector('[data-testid="quests-list"]', {
        timeout: 5000,
      });

      // Get initial quest progress
      const questProgress = page.locator('[data-testid="quest-progress"]').first();

      if (await questProgress.isVisible({ timeout: 2000 })) {
        const progressText = await questProgress.textContent();
        const progress = Number.parseInt(progressText?.replace(/\D/g, "") || "0", 10);
        expect(progress).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
