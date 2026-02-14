/**
 * Gameplay E2E Tests
 *
 * Tests core game mechanics including:
 * - Card summoning
 * - Attack declaration
 * - Phase transitions
 * - Win/lose conditions
 *
 * Most gameplay tests require active game state. Tests requiring game seeding
 * are marked with test.skip until test data seeding is implemented.
 * Story mode tests provide a way to test gameplay without multiplayer setup.
 */

import { expect, test } from "./setup/fixtures";

test.describe("Gameplay", () => {
  test.describe("Game Board UI", () => {
    test("game board page loads without errors", async ({ gamePage }) => {
      await gamePage.navigate();
      // If no active game, should show lobby/waiting state
      // This tests the game page loads without errors
      await gamePage.waitForLoad();
    });

    test("can access game page from lobby", async ({ lobbyPage }) => {
      await lobbyPage.navigate();
      // Verify matchmaking options are available
      await lobbyPage.expectLobbyVisible();
      await expect(lobbyPage.quickMatchButton).toBeVisible();
    });

    test("displays waiting screen when no active game", async ({ gamePage }) => {
      await gamePage.navigate();
      // Should show waiting for opponent or game lobby
      await expect(gamePage.page.getByText(/Waiting for|No Active Game/i)).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Story Mode Gameplay", () => {
    test("can start story battle", async ({ storyPage }) => {
      await storyPage.navigate();
      await storyPage.waitForChaptersLoaded();

      // Select first chapter
      await storyPage.selectChapter(0);
      await storyPage.waitForStagesLoaded();

      // Select first stage
      await storyPage.selectStage(1);

      // Start button should be available
      const startButton = storyPage.page.locator('button:has-text("Start Battle")');
      await expect(startButton).toBeVisible({ timeout: 5000 });
    });

    test("chapter selection displays correctly", async ({ storyPage }) => {
      await storyPage.navigate();
      await storyPage.waitForChaptersLoaded();

      // At least one chapter should be available
      const chapterCount = await storyPage.getChapterCount();
      expect(chapterCount).toBeGreaterThan(0);

      // First chapter should be unlocked
      await storyPage.expectChapterUnlocked(0);
    });

    test("stage selection shows stage details", async ({ storyPage }) => {
      await storyPage.navigate();
      await storyPage.waitForChaptersLoaded();

      await storyPage.selectChapter(0);
      await storyPage.waitForStagesLoaded();

      // At least one stage should be available
      const stageCount = await storyPage.getStageCount();
      expect(stageCount).toBeGreaterThan(0);

      // Select stage to see details
      await storyPage.selectStage(1);

      // Story dialogue should appear with stage info
      await expect(storyPage.storyDialogue).toBeVisible();
    });
  });

  test.describe("Game Board Elements", () => {
    test.skip("displays life points correctly", async ({ gamePage }) => {
      // Requires active game state
      await gamePage.navigate();
      await gamePage.expectGameBoardVisible();

      // Life points should be visible
      await expect(gamePage.playerLP).toBeVisible();
      await expect(gamePage.opponentLP).toBeVisible();
    });

    test.skip("displays turn number", async ({ gamePage }) => {
      // Requires active game state
      await gamePage.navigate();
      await gamePage.expectGameBoardVisible();

      // Turn number should be visible
      await expect(gamePage.turnNumber).toBeVisible();
    });

    test.skip("displays phase indicators", async ({ gamePage }) => {
      // Requires active game state
      await gamePage.navigate();
      await gamePage.expectGameBoardVisible();

      // Phase bar should be visible
      await expect(gamePage.phaseBar).toBeVisible();
    });

    test.skip("displays player hand", async ({ gamePage }) => {
      // Requires active game state
      await gamePage.navigate();
      await gamePage.expectGameBoardVisible();

      // Player hand region should be visible
      await expect(gamePage.playerHand).toBeVisible();
    });

    test.skip("displays monster zones", async ({ gamePage }) => {
      // Requires active game state
      await gamePage.navigate();
      await gamePage.expectGameBoardVisible();

      // Monster zones should be present (even if empty)
      const playerMonsterZone = gamePage.page.locator('[data-zone="player-monsters"]');
      const opponentMonsterZone = gamePage.page.locator('[data-zone="opponent-monsters"]');

      await expect(playerMonsterZone.or(gamePage.playerMonsters.first())).toBeVisible();
      await expect(opponentMonsterZone.or(gamePage.opponentMonsters.first())).toBeVisible();
    });
  });

  test.describe("Monster Summoning", () => {
    test.skip("can summon monster in attack position", async ({ gamePage }) => {
      // Requires active game with cards in hand
      await gamePage.navigate();
      await gamePage.waitForPhase("main");

      // Get initial hand count
      const initialCount = await gamePage.handCards.count();
      expect(initialCount).toBeGreaterThan(0);

      // Summon first card in attack position
      await gamePage.summonMonster(0, "attack");

      // Verify monster appeared on field
      await gamePage.expectPlayerMonsterCount(1);

      // Hand size should decrease
      await gamePage.expectHandCount(initialCount - 1);
    });

    test.skip("can summon monster in defense position", async ({ gamePage }) => {
      // Requires active game with cards in hand
      await gamePage.navigate();
      await gamePage.waitForPhase("main");

      const initialCount = await gamePage.handCards.count();
      expect(initialCount).toBeGreaterThan(0);

      // Summon first card in defense position
      await gamePage.summonMonster(0, "defense");

      // Verify monster appeared on field
      await gamePage.expectPlayerMonsterCount(1);

      // Hand size should decrease
      await gamePage.expectHandCount(initialCount - 1);
    });

    test.skip("can set spell/trap card face-down", async ({ gamePage }) => {
      // Requires active game with spell/trap cards in hand
      await gamePage.navigate();
      await gamePage.waitForPhase("main");

      const initialCount = await gamePage.handCards.count();
      expect(initialCount).toBeGreaterThan(0);

      // Set card face-down
      await gamePage.setCard(1);

      // Verify card appeared in spell/trap zone
      const spellTrapCount = await gamePage.playerSpellTraps.count();
      expect(spellTrapCount).toBeGreaterThan(0);

      // Hand size should decrease
      await gamePage.expectHandCount(initialCount - 1);
    });

    test.skip("enforces one normal summon per turn", async ({ gamePage }) => {
      // Requires active game with multiple monsters in hand
      await gamePage.navigate();
      await gamePage.waitForPhase("main");

      // First summon should succeed
      await gamePage.summonMonster(0, "attack");
      await gamePage.expectPlayerMonsterCount(1);

      // Second summon should fail or show error
      // This would need to verify error message or disabled state
      const secondCard = gamePage.getHandCard(0);
      await secondCard.click();

      // Should show error or disabled summon button
      const errorMessage = gamePage.page.getByText(/already.*summoned/i);
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe("Battle Phase", () => {
    test.skip("can declare direct attack", async ({ gamePage }) => {
      // Requires active game with monster on player field
      await gamePage.navigate();
      await gamePage.waitForPhase("combat");

      // Should have at least one monster
      await gamePage.expectPlayerMonsterCount(1);

      // Get opponent's initial LP
      const initialLP = await gamePage.opponentLP.textContent();

      // Declare direct attack
      await gamePage.declareAttack(0);

      // Wait for attack animation
      await gamePage.waitForAnimation();

      // Opponent LP should decrease
      const newLP = await gamePage.opponentLP.textContent();
      expect(newLP).not.toBe(initialLP);
    });

    test.skip("can attack opponent monster", async ({ gamePage }) => {
      // Requires active game with monsters on both sides
      await gamePage.navigate();
      await gamePage.waitForPhase("combat");

      await gamePage.expectPlayerMonsterCount(1);
      await gamePage.expectOpponentMonsterCount(1);

      // Declare attack on opponent monster
      await gamePage.declareAttack(0, 0);

      // Wait for battle resolution
      await gamePage.waitForAnimation();

      // Battle should resolve (monsters may be destroyed based on ATK/DEF)
    });

    test.skip("cannot attack on first turn", async ({ gamePage }) => {
      // Requires active game on turn 1
      await gamePage.navigate();
      await gamePage.waitForPhase("main");

      // Verify turn 1
      await gamePage.expectTurnNumber(1);

      // Battle phase button should be disabled
      const battleButton = gamePage.page.getByRole("button", { name: /Battle/i });
      await expect(battleButton).toBeDisabled();
    });
  });

  test.describe("Phase Management", () => {
    test.skip("can advance from Main Phase to Combat Phase", async ({ gamePage }) => {
      // Requires active game in main phase
      await gamePage.navigate();
      await gamePage.waitForPhase("main");

      await gamePage.expectPhase("main");

      // Advance to combat phase
      await gamePage.advancePhase();

      await gamePage.expectPhase("combat");
    });

    test.skip("can advance from Combat Phase to End", async ({ gamePage }) => {
      // Requires active game in combat phase
      await gamePage.navigate();
      await gamePage.waitForPhase("combat");

      await gamePage.expectPhase("combat");

      // Advance to end phase
      await gamePage.advancePhase();

      await gamePage.expectPhase("end");
    });

    test.skip("can end turn", async ({ gamePage }) => {
      // Requires active game
      await gamePage.navigate();
      await gamePage.waitForPhase("main");

      // Get current turn number
      const turnText = await gamePage.turnNumber.textContent();
      const currentTurn = Number.parseInt(turnText || "1");

      // End turn
      await gamePage.endTurn();

      // Wait for opponent's turn
      await gamePage.waitForPlayerTurn();

      // Turn number should increase
      const newTurnText = await gamePage.turnNumber.textContent();
      const newTurn = Number.parseInt(newTurnText || "1");
      expect(newTurn).toBeGreaterThan(currentTurn);
    });
  });

  test.describe("Game End Conditions", () => {
    test.skip("shows victory screen on win", async ({ gamePage }) => {
      // Requires game state where player wins
      await gamePage.navigate();
      await gamePage.waitForGameEnd();

      await gamePage.expectGameResult("victory");
    });

    test.skip("shows defeat screen on loss", async ({ gamePage }) => {
      // Requires game state where player loses
      await gamePage.navigate();
      await gamePage.waitForGameEnd();

      await gamePage.expectGameResult("defeat");
    });

    test.skip("handles LP reaching zero", async ({ gamePage }) => {
      // Requires game state where LP manipulation occurs
      await gamePage.navigate();

      // Play until someone's LP reaches 0
      await gamePage.waitForGameEnd();

      // Should show game result
      const resultHeading = gamePage.page.getByRole("heading", {
        name: /(Victory|Defeat)/i,
      });
      await expect(resultHeading).toBeVisible();
    });
  });

  test.describe("Game Controls", () => {
    test.skip("can forfeit game", async ({ gamePage }) => {
      // Requires active game
      await gamePage.navigate();
      await gamePage.expectGameBoardVisible();

      // Forfeit the game
      await gamePage.forfeitGame();

      // Should return to lobby or show defeat screen
      await expect(gamePage.page.getByRole("heading", { name: /Defeat|Game Over/i })).toBeVisible({
        timeout: 10000,
      });
    });

    test.skip("displays game code for multiplayer", async ({ gamePage }) => {
      // Requires active multiplayer game
      await gamePage.navigate();

      // Game code should be visible for sharing
      const gameCode = await gamePage.gameCode.textContent();
      expect(gameCode).toBeTruthy();
      expect(gameCode?.length).toBeGreaterThan(0);
    });
  });
});
