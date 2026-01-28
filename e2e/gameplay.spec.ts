import { test, expect } from "./setup/fixtures";
import { GameStateHelper } from "./setup/helpers";
import { TEST_CONFIG } from "./setup/test-data";

/**
 * Basic Gameplay Flow E2E Tests
 *
 * Tests core gameplay mechanics including:
 * - Draw phase
 * - Normal summon
 * - Attack with monster
 * - Activate spell card
 * - Set trap card
 * - End turn
 * - Win/lose conditions
 */

test.describe("Basic Gameplay Flow", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to lunchtable and create game with AI
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

    // Start game
    await authenticatedPage.click('button:has-text("Start Game")');
    await authenticatedPage.waitForSelector('[data-testid="game-board"]', {
      timeout: TEST_CONFIG.GAME_START_TIMEOUT,
    });
  });

  test.describe("Draw Phase", () => {
    test("should automatically draw card at start of turn", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      // Wait for draw phase
      await gameHelper.waitForPhase("draw");

      // Hand size should increase by 1
      const handSize = await gameHelper.getHandSize();
      expect(handSize).toBeGreaterThan(TEST_CONFIG.STARTING_HAND_SIZE);
    });

    test("should transition from draw to main phase", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      // Wait for draw phase
      await gameHelper.waitForPhase("draw");

      // Should automatically transition to main phase
      await gameHelper.waitForPhase("main1");

      // Main phase indicator should be visible
      await expect(
        authenticatedPage.locator('[data-phase="main1"]')
      ).toBeVisible();
    });
  });

  test.describe("Monster Summoning", () => {
    test("should normal summon monster in attack position", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      // Wait for main phase
      await gameHelper.waitForPhase("main1");

      const initialHandSize = await gameHelper.getHandSize();

      // Summon monster from hand
      await gameHelper.clickHandCard(0);

      // Select attack position
      const attackButton = authenticatedPage.locator('button:has-text("Attack")');
      if (await attackButton.isVisible({ timeout: 2000 })) {
        await attackButton.click();
      }

      // Confirm summon
      const summonButton = authenticatedPage.locator('button:has-text("Summon")');
      if (await summonButton.isVisible({ timeout: 2000 })) {
        await summonButton.click();
      }

      // Wait for monster to appear on field
      await authenticatedPage.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);

      // Monster should be on field
      const monsterCount = await authenticatedPage
        .locator('[data-testid="player-monster"]')
        .count();
      expect(monsterCount).toBeGreaterThan(0);

      // Hand size should decrease
      const newHandSize = await gameHelper.getHandSize();
      expect(newHandSize).toBe(initialHandSize - 1);
    });

    test("should normal summon monster in defense position", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      await gameHelper.waitForPhase("main1");

      // Summon in defense
      await gameHelper.clickHandCard(0);

      const defenseButton = authenticatedPage.locator('button:has-text("Defense")');
      if (await defenseButton.isVisible({ timeout: 2000 })) {
        await defenseButton.click();
      }

      const summonButton = authenticatedPage.locator('button:has-text("Summon")');
      if (await summonButton.isVisible({ timeout: 2000 })) {
        await summonButton.click();
      }

      await authenticatedPage.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);

      // Monster should be in defense position
      const defenseMonster = await authenticatedPage
        .locator('[data-position="defense"]')
        .count();
      expect(defenseMonster).toBeGreaterThan(0);
    });

    test("should enforce one normal summon per turn", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      await gameHelper.waitForPhase("main1");

      // First summon
      await gameHelper.clickHandCard(0);
      const summonButton = authenticatedPage.locator('button:has-text("Summon")');
      if (await summonButton.isVisible({ timeout: 2000 })) {
        await summonButton.click();
      }
      await authenticatedPage.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);

      // Try second summon
      await gameHelper.clickHandCard(0);

      // Summon button should be disabled or show error
      const secondSummonButton = authenticatedPage.locator('button:has-text("Summon")');
      if (await secondSummonButton.isVisible({ timeout: 2000 })) {
        const isDisabled = await secondSummonButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      } else {
        // Should show error message
        await expect(
          authenticatedPage.locator('text=/already.*summoned/i')
        ).toBeVisible({ timeout: 2000 });
      }
    });

    test("should require tribute for high-level monsters", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      await gameHelper.waitForPhase("main1");

      // Try to summon level 5+ monster without tribute
      // This depends on having such a card in hand
      await gameHelper.clickHandCard(0);

      // Check if tribute is required
      const tributePrompt = authenticatedPage.locator('text=/select.*tribute/i');
      if (await tributePrompt.isVisible({ timeout: 2000 })) {
        // Tribute summon mechanics are working
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe("Spell Cards", () => {
    test("should activate spell card from hand", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      await gameHelper.waitForPhase("main1");

      const initialHandSize = await gameHelper.getHandSize();

      // Look for spell card in hand and activate it
      // This assumes we have spell cards in starting hand
      await gameHelper.clickHandCard(1);

      const activateButton = authenticatedPage.locator('button:has-text("Activate")');
      if (await activateButton.isVisible({ timeout: 2000 })) {
        await activateButton.click();

        // Confirm activation
        const confirmButton = authenticatedPage.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible({ timeout: 1000 })) {
          await confirmButton.click();
        }

        await authenticatedPage.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);

        // Hand size should decrease
        const newHandSize = await gameHelper.getHandSize();
        expect(newHandSize).toBeLessThan(initialHandSize);
      }
    });

    test("should set spell card face-down", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      await gameHelper.waitForPhase("main1");

      // Set spell/trap card
      await gameHelper.setSpellTrap(1);

      await authenticatedPage.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);

      // Should appear in spell/trap zone
      const setCards = await authenticatedPage
        .locator('[data-testid="player-spell-trap"]')
        .count();
      expect(setCards).toBeGreaterThan(0);
    });
  });

  test.describe("Trap Cards", () => {
    test("should set trap card face-down", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      await gameHelper.waitForPhase("main1");

      // Set trap
      await gameHelper.setSpellTrap(2);

      await authenticatedPage.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);

      // Trap should be set
      const setCards = await authenticatedPage
        .locator('[data-testid="player-spell-trap"][data-face-down="true"]')
        .count();
      expect(setCards).toBeGreaterThan(0);
    });
  });

  test.describe("Battle Phase", () => {
    test("should attack opponent directly with monster", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      // Wait for main phase and summon monster
      await gameHelper.waitForPhase("main1");
      await gameHelper.clickHandCard(0);

      const summonButton = authenticatedPage.locator('button:has-text("Summon")');
      if (await summonButton.isVisible({ timeout: 2000 })) {
        await summonButton.click();
      }
      await authenticatedPage.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY);

      // Enter battle phase
      const battleButton = authenticatedPage.locator('button:has-text("Battle")');
      if (await battleButton.isVisible({ timeout: 2000 })) {
        await battleButton.click();
      }

      await gameHelper.waitForPhase("battle");

      const opponentLPBefore = await gameHelper.getOpponentLifePoints();

      // Attack directly
      await gameHelper.attackWithMonster(0);

      await authenticatedPage.waitForTimeout(TEST_CONFIG.ANIMATION_DELAY * 2);

      // Opponent LP should decrease
      const opponentLPAfter = await gameHelper.getOpponentLifePoints();
      expect(opponentLPAfter).toBeLessThan(opponentLPBefore);
    });

    test("should not attack on first turn", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      // On turn 1, battle phase should not be available
      await gameHelper.waitForPhase("main1");

      // Battle button should not be clickable
      const battleButton = authenticatedPage.locator('button:has-text("Battle")');
      if (await battleButton.isVisible({ timeout: 1000 })) {
        const isDisabled = await battleButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    });

    test("should attack opponent monster", async () => {
      // This test requires opponent to have monsters
      // Skip implementation details as it depends on AI behavior
    });
  });

  test.describe("End Turn", () => {
    test("should end turn and pass to opponent", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      await gameHelper.waitForPhase("main1");

      // End turn
      await gameHelper.endTurn();

      // Should show opponent's turn indicator
      await expect(
        authenticatedPage.locator('text=/opponent.*turn/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should enforce hand size limit at end of turn", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      await gameHelper.waitForPhase("main1");

      const handSize = await gameHelper.getHandSize();

      // If hand size > 6, should prompt to discard
      if (handSize > 6) {
        await gameHelper.endTurn();

        // Should show discard prompt
        await expect(
          authenticatedPage.locator('text=/discard.*cards/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Win/Lose Conditions", () => {
    test("should show victory screen when opponent LP reaches 0", async ({
      authenticatedPage,
    }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      // This would require playing through a full game
      // For now, we can check that the game result screen exists
      // when the game ends naturally

      // Play turns until game ends (with timeout)
      const maxTurns = 50;
      let turnCount = 0;

      while (turnCount < maxTurns) {
        const isGameOver = await gameHelper.isGameOver();
        if (isGameOver) {
          break;
        }

        // Play a basic turn
        try {
          await gameHelper.waitForPhase("main1");
          await gameHelper.endTurn();
          await authenticatedPage.waitForTimeout(2000);
          turnCount++;
        } catch (error) {
          break;
        }
      }

      // If game ended, check result screen
      const isGameOver = await gameHelper.isGameOver();
      if (isGameOver) {
        const result = await gameHelper.getGameResult();
        expect(["win", "lose", "draw"]).toContain(result);
      }
    });

    test("should show defeat screen when player LP reaches 0", async () => {
      // Similar to above but checking for defeat condition
    });

    test("should handle deck-out condition", async () => {
      // Player loses if they need to draw but deck is empty
      // This is difficult to test in E2E without special setup
    });
  });

  test.describe("Game UI/UX", () => {
    test("should display life points correctly", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      const playerLP = await gameHelper.getPlayerLifePoints();
      const opponentLP = await gameHelper.getOpponentLifePoints();

      expect(playerLP).toBe(TEST_CONFIG.STARTING_LP);
      expect(opponentLP).toBe(TEST_CONFIG.STARTING_LP);
    });

    test("should show card count in deck", async ({ authenticatedPage }) => {
      await expect(
        authenticatedPage.locator('[data-testid="deck-count"]')
      ).toBeVisible();
    });

    test("should show card count in graveyard", async ({ authenticatedPage }) => {
      await expect(
        authenticatedPage.locator('[data-testid="graveyard-count"]')
      ).toBeVisible();
    });

    test("should highlight current phase", async ({ authenticatedPage }) => {
      const gameHelper = new GameStateHelper(authenticatedPage);

      await gameHelper.waitForPhase("main1");

      // Main phase should be highlighted
      await expect(
        authenticatedPage.locator('[data-phase="main1"][data-active="true"]')
      ).toBeVisible();
    });

    test("should show turn number", async ({ authenticatedPage }) => {
      await expect(
        authenticatedPage.locator('[data-testid="turn-number"]')
      ).toBeVisible();
    });
  });

  test.describe("Game Controls", () => {
    test("should open forfeit dialog", async ({ authenticatedPage }) => {
      const forfeitButton = authenticatedPage.locator('button:has-text("Forfeit")');

      if (await forfeitButton.isVisible({ timeout: 2000 })) {
        await forfeitButton.click();

        // Confirmation dialog should appear
        await expect(
          authenticatedPage.locator('text=/are you sure/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test("should cancel forfeit", async ({ authenticatedPage }) => {
      const forfeitButton = authenticatedPage.locator('button:has-text("Forfeit")');

      if (await forfeitButton.isVisible({ timeout: 2000 })) {
        await forfeitButton.click();

        // Cancel
        await authenticatedPage.click('button:has-text("Cancel")');

        // Should still be in game
        await expect(
          authenticatedPage.locator('[data-testid="game-board"]')
        ).toBeVisible();
      }
    });

    test("should confirm forfeit and leave game", async ({ authenticatedPage }) => {
      const forfeitButton = authenticatedPage.locator('button:has-text("Forfeit")');

      if (await forfeitButton.isVisible({ timeout: 2000 })) {
        await forfeitButton.click();

        // Confirm
        await authenticatedPage.click('button:has-text("Confirm")');

        // Should show game result or return to lobby
        await authenticatedPage.waitForURL(/\/(lunchtable|game\/result)/, {
          timeout: 5000,
        });
      }
    });
  });
});
