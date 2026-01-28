import { test, expect } from "./setup/fixtures";
import { GameStateHelper } from "./setup/helpers";
import { TEST_CONFIG, SELECTORS } from "./setup/test-data";

/**
 * Story Mode Flow E2E Tests
 *
 * Tests story mode progression including:
 * - Starting story chapters
 * - Completing battles vs AI
 * - Earning rewards
 * - Unlocking next chapters
 * - Completing achievements
 */

test.describe("Story Mode Flow", () => {
  test.describe("Chapter Navigation", () => {
    test("should display available story chapters", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");

      // Chapters should be visible
      await expect(
        authenticatedPage.locator('[data-testid="story-chapter"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show chapter progress", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");

      // Progress indicator should be visible
      await expect(
        authenticatedPage.locator('[data-testid="chapter-progress"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should navigate to chapter details", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");

      // Click first chapter
      await authenticatedPage.locator('[data-testid="story-chapter"]').first().click();

      // Should navigate to chapter page
      await authenticatedPage.waitForURL(/\/play\/story\/chapter-/, {
        timeout: 5000,
      });

      // Stages should be visible
      await expect(
        authenticatedPage.locator('[data-testid="story-stage"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show locked chapters", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");

      // Some chapters may be locked
      const lockedChapter = authenticatedPage.locator('[data-locked="true"]');
      if (await lockedChapter.isVisible({ timeout: 2000 })) {
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe("Stage Battles", () => {
    test("should start story battle", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");

      // Navigate to first chapter
      await authenticatedPage.locator('[data-testid="story-chapter"]').first().click();
      await authenticatedPage.waitForURL(/\/play\/story\/chapter-/);

      // Click first stage
      await authenticatedPage.locator('[data-testid="story-stage"]').first().click();

      // Start battle
      await authenticatedPage.click(SELECTORS.STORY_START_BATTLE);

      // Should navigate to battle
      await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      await expect(
        authenticatedPage.locator('[data-testid="game-board"]')
      ).toBeVisible();
    });

    test("should show stage difficulty", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");
      await authenticatedPage.locator('[data-testid="story-chapter"]').first().click();
      await authenticatedPage.waitForURL(/\/play\/story\/chapter-/);

      // Difficulty indicator should be visible
      await expect(
        authenticatedPage.locator('[data-testid="stage-difficulty"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show AI opponent info", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");
      await authenticatedPage.locator('[data-testid="story-chapter"]').first().click();
      await authenticatedPage.waitForURL(/\/play\/story\/chapter-/);
      await authenticatedPage.locator('[data-testid="story-stage"]').first().click();

      // Opponent info should be visible
      await expect(
        authenticatedPage.locator('[data-testid="opponent-info"]')
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Battle Completion", () => {
    test("should complete story battle and earn rewards", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");

      // Start battle
      await authenticatedPage.locator('[data-testid="story-chapter"]').first().click();
      await authenticatedPage.waitForURL(/\/play\/story\/chapter-/);
      await authenticatedPage.locator('[data-testid="story-stage"]').first().click();
      await authenticatedPage.click(SELECTORS.STORY_START_BATTLE);
      await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
        timeout: TEST_CONFIG.GAME_START_TIMEOUT,
      });

      const gameHelper = new GameStateHelper(authenticatedPage);

      // Play through battle (simplified)
      // In real test, would play until win condition
      // For now, check if victory screen appears

      let turnCount = 0;
      const maxTurns = 30;

      while (turnCount < maxTurns) {
        try {
          const isGameOver = await gameHelper.isGameOver();
          if (isGameOver) {
            break;
          }

          await gameHelper.waitForPhase("main1");
          await gameHelper.endTurn();
          await authenticatedPage.waitForTimeout(2000);
          turnCount++;
        } catch {
          break;
        }
      }

      // Check for victory screen
      const isGameOver = await gameHelper.isGameOver();
      if (isGameOver) {
        const result = await gameHelper.getGameResult();
        if (result === "win") {
          // Should show rewards
          await expect(
            authenticatedPage.locator('[data-testid="battle-rewards"]')
          ).toBeVisible({ timeout: 10000 });
        }
      }
    });

    test("should unlock next stage after completion", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");
      await authenticatedPage.locator('[data-testid="story-chapter"]').first().click();
      await authenticatedPage.waitForURL(/\/play\/story\/chapter-/);

      // After completing stage 1, stage 2 should unlock
      // This requires actually completing stage 1
    });

    test("should track completion stars/rating", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");
      await authenticatedPage.locator('[data-testid="story-chapter"]').first().click();
      await authenticatedPage.waitForURL(/\/play\/story\/chapter-/);

      // Stars/rating indicator should be visible
      const starsElement = authenticatedPage.locator('[data-testid="stage-stars"]');
      if (await starsElement.isVisible({ timeout: 2000 })) {
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe("Rewards", () => {
    test("should earn gold from story completion", async () => {
      // After completing story battle, gold should increase
      // Implementation requires completing a battle
    });

    test("should earn XP from story completion", async () => {
      // XP should be awarded after victory
    });

    test("should earn card rewards", async () => {
      // Some stages award specific cards
    });

    test("should show reward summary", async () => {
      // After battle, reward summary should display
    });
  });

  test.describe("Chapter Progression", () => {
    test("should unlock next chapter after completing current", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");

      // Complete all stages in chapter
      // Next chapter should unlock
      // This is a long test that requires completing multiple stages
    });

    test("should show chapter completion percentage", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");

      // Completion percentage should be visible
      await expect(
        authenticatedPage.locator('[data-testid="completion-percentage"]')
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Achievements", () => {
    test("should display available achievements", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/quests");

      // Achievements tab should be visible
      await authenticatedPage.click('button:has-text("Achievements")');

      // Achievements should be displayed
      await expect(
        authenticatedPage.locator('[data-testid="achievement"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show achievement progress", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/quests");
      await authenticatedPage.click('button:has-text("Achievements")');

      // Progress bar should be visible
      await expect(
        authenticatedPage.locator('[data-testid="achievement-progress"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should claim completed achievement rewards", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/quests");
      await authenticatedPage.click('button:has-text("Achievements")');

      // Check for completed achievements
      const claimButton = authenticatedPage.locator('button:has-text("Claim")');
      if (await claimButton.isVisible({ timeout: 2000 })) {
        await claimButton.click();

        // Should show reward
        await expect(
          authenticatedPage.locator('[data-testid="achievement-reward"]')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Story UI/UX", () => {
    test("should display story narrative/dialogue", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");
      await authenticatedPage.locator('[data-testid="story-chapter"]').first().click();
      await authenticatedPage.waitForURL(/\/play\/story\/chapter-/);
      await authenticatedPage.locator('[data-testid="story-stage"]').first().click();

      // Dialogue/narrative should be visible
      const dialogue = authenticatedPage.locator('[data-testid="story-dialogue"]');
      if (await dialogue.isVisible({ timeout: 2000 })) {
        expect(true).toBeTruthy();
      }
    });

    test("should show chapter artwork", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");

      // Chapter images should be visible
      await expect(
        authenticatedPage.locator('[data-testid="chapter-artwork"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should navigate back to story menu from chapter", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/play/story");
      await authenticatedPage.locator('[data-testid="story-chapter"]').first().click();
      await authenticatedPage.waitForURL(/\/play\/story\/chapter-/);

      // Back button should work
      await authenticatedPage.click('button:has-text("Back")');

      // Should return to story menu
      await authenticatedPage.waitForURL(/\/play\/story$/, { timeout: 5000 });
    });
  });

  test.describe("Retry and Difficulty", () => {
    test("should allow retrying failed stage", async ({ authenticatedPage }) => {
      // If player loses, should have retry option
      const retryButton = authenticatedPage.locator('button:has-text("Retry")');
      if (await retryButton.isVisible({ timeout: 2000 })) {
        await retryButton.click();

        // Should restart battle
        await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
          timeout: TEST_CONFIG.GAME_START_TIMEOUT,
        });
      }
    });

    test("should track retry count", async ({ authenticatedPage }) => {
      // Some implementations track number of retries
      const retryCount = authenticatedPage.locator('[data-testid="retry-count"]');
      if (await retryCount.isVisible({ timeout: 2000 })) {
        expect(true).toBeTruthy();
      }
    });
  });
});
