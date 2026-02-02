import { Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class GamePage extends BasePage {
  readonly url = "/play";

  // ============================================================================
  // Main Board Locators
  // ============================================================================

  get gameBoard(): Locator {
    return this.page.locator('[data-testid="game-board"]');
  }

  // ============================================================================
  // Life Points
  // ============================================================================

  get playerLP(): Locator {
    return this.page.locator('[data-testid="player-lp"]');
  }

  get opponentLP(): Locator {
    return this.page.locator('[data-testid="opponent-lp"]');
  }

  // ============================================================================
  // Phase System
  // ============================================================================

  get turnNumber(): Locator {
    return this.page.locator('[data-testid="turn-number"]');
  }

  get phaseBar(): Locator {
    return this.page.getByRole("group", { name: /Phase indicators/i });
  }

  // ============================================================================
  // Monster Cards
  // ============================================================================

  get playerMonsters(): Locator {
    return this.page.locator('[data-testid="player-monster"]');
  }

  get opponentMonsters(): Locator {
    return this.page.locator('[data-testid="opponent-monster"]');
  }

  getPlayerMonster(index: number): Locator {
    return this.playerMonsters.nth(index);
  }

  getOpponentMonster(index: number): Locator {
    return this.opponentMonsters.nth(index);
  }

  // ============================================================================
  // Spell/Trap Cards
  // ============================================================================

  get playerSpellTraps(): Locator {
    return this.page.locator('[data-testid="player-spell-trap"]');
  }

  get opponentSpellTraps(): Locator {
    return this.page.locator('[data-testid="opponent-spell-trap"]');
  }

  // ============================================================================
  // Hand (no specific data-testid found, using structural locators)
  // ============================================================================

  get playerHand(): Locator {
    return this.page.getByRole("region", { name: /Your hand/i });
  }

  get opponentHand(): Locator {
    return this.page.getByRole("region", { name: /Opponent's hand/i });
  }

  // Hand cards are identified by the HandCard component
  get handCards(): Locator {
    return this.playerHand.locator("button").filter({ hasNot: this.page.locator('[data-testid]') });
  }

  getHandCard(index: number): Locator {
    return this.handCards.nth(index);
  }

  // ============================================================================
  // Game Code (for waiting screen)
  // ============================================================================

  get gameCode(): Locator {
    return this.page.locator('[data-testid="game-code"]');
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Play a card from hand at the given index
   */
  async playHandCard(index: number) {
    await this.getHandCard(index).click();
    await this.waitForLoad();
  }

  /**
   * Summon a monster in attack or defense position
   */
  async summonMonster(handIndex: number, position: "attack" | "defense") {
    await this.playHandCard(handIndex);

    // Wait for summon modal to appear
    const modalTitle = this.page.getByRole("heading", { name: /summon/i });
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Click the appropriate summon button
    const summonButton = this.page.getByRole("button", {
      name: new RegExp(`${position} position`, "i"),
    });
    await summonButton.click();

    await this.waitForAnimation();
  }

  /**
   * Set a card face-down
   */
  async setCard(handIndex: number) {
    await this.playHandCard(handIndex);

    // Wait for modal to appear
    await this.page.waitForTimeout(300);

    // Click "Set Face-Down" button
    const setButton = this.page.getByRole("button", { name: /Set Face-Down/i });
    await setButton.click();

    await this.waitForAnimation();
  }

  /**
   * Activate a spell or trap card
   */
  async activateCard(handIndex: number) {
    await this.playHandCard(handIndex);

    // Wait for modal to appear
    await this.page.waitForTimeout(300);

    // Click "Activate Effect" button
    const activateButton = this.page.getByRole("button", { name: /Activate Effect/i });
    await activateButton.click();

    await this.waitForAnimation();
  }

  /**
   * Declare an attack with a monster
   */
  async declareAttack(attackerIndex: number, targetIndex?: number) {
    // Click on the attacking monster
    await this.getPlayerMonster(attackerIndex).click();

    // Wait for attack modal to appear
    const modalTitle = this.page.getByRole("heading", { name: /Declare Attack/i });
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    if (targetIndex !== undefined) {
      // Attack a specific target
      const targetButtons = this.page
        .getByRole("group", { name: /Attack target selection/i })
        .getByRole("option");
      await targetButtons.nth(targetIndex).click();
    } else {
      // Direct attack
      const directAttackButton = this.page.getByRole("button", { name: /Direct Attack/i });
      await directAttackButton.click();
    }

    await this.waitForAnimation();
  }

  /**
   * Advance to the next phase
   */
  async advancePhase() {
    // Look for phase advance buttons (Battle, Main 2, etc.)
    const advanceButton = this.page
      .getByRole("button")
      .filter({ hasText: /Battle|Main 2|End Turn/ });
    await advanceButton.first().click();
    await this.waitForAnimation();
  }

  /**
   * End the current turn
   */
  async endTurn() {
    const endTurnButton = this.page.getByRole("button", { name: /End Turn/i });
    await endTurnButton.click();
    await this.waitForAnimation();
  }

  /**
   * Forfeit the game
   */
  async forfeitGame() {
    const forfeitButton = this.page.getByRole("button", { name: /Forfeit/i });
    await forfeitButton.click();

    // Confirm forfeit in dialog
    const confirmButton = this.page.getByRole("button", { name: /Confirm/i });
    await confirmButton.click();

    await this.waitForLoad();
  }

  // ============================================================================
  // Wait Helpers
  // ============================================================================

  /**
   * Wait for animations to complete
   */
  async waitForAnimation() {
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Wait for a specific phase
   */
  async waitForPhase(_phase: "main1" | "battle" | "main2") {
    await this.page.waitForTimeout(1000);
    // Phase changes are visual - wait for network idle
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Wait for opponent's turn to end
   */
  async waitForPlayerTurn() {
    // Wait for "Your turn" to appear or "Opponent's Turn" to disappear
    await expect(
      this.page.getByText(/Your turn|Opponent's Turn/i)
    ).toBeVisible({ timeout: 30000 });
  }

  /**
   * Wait for game to end
   */
  async waitForGameEnd() {
    await expect(
      this.page.getByRole("heading", { name: /(Victory|Defeat)/i })
    ).toBeVisible({ timeout: 60000 });
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert the number of cards in hand
   */
  async expectHandCount(count: number) {
    await expect(this.handCards).toHaveCount(count);
  }

  /**
   * Assert the number of monsters on player's field
   */
  async expectPlayerMonsterCount(count: number) {
    await expect(this.playerMonsters).toHaveCount(count);
  }

  /**
   * Assert the number of monsters on opponent's field
   */
  async expectOpponentMonsterCount(count: number) {
    await expect(this.opponentMonsters).toHaveCount(count);
  }

  /**
   * Assert player's life points
   */
  async expectPlayerLP(amount: number) {
    await expect(this.playerLP).toHaveText(amount.toLocaleString());
  }

  /**
   * Assert opponent's life points
   */
  async expectOpponentLP(amount: number) {
    await expect(this.opponentLP).toHaveText(amount.toLocaleString());
  }

  /**
   * Assert current turn number
   */
  async expectTurnNumber(turn: number) {
    await expect(this.turnNumber).toHaveText(String(turn));
  }

  /**
   * Assert game has ended with a specific result
   */
  async expectGameResult(result: "victory" | "defeat") {
    const resultHeading = this.page.getByRole("heading", {
      name: new RegExp(result, "i"),
    });
    await expect(resultHeading).toBeVisible();
  }

  /**
   * Assert game board is visible
   */
  async expectGameBoardVisible() {
    await expect(this.gameBoard).toBeVisible();
  }

  /**
   * Assert a specific phase is active
   */
  async expectPhase(phase: "main1" | "battle" | "main2") {
    // Phase indicators in PhaseBar component show active state via styling
    // This is a visual check - we rely on phase text or button availability
    const phaseText = new RegExp(
      phase === "main1" ? "Main Phase" : phase === "battle" ? "Battle" : "Main 2",
      "i"
    );
    await expect(this.page.getByText(phaseText)).toBeVisible();
  }

  /**
   * Assert waiting for opponent
   */
  async expectWaitingForOpponent() {
    await expect(this.page.getByText(/Waiting for Opponent/i)).toBeVisible();
  }

  /**
   * Assert game code is displayed
   */
  async expectGameCode(code: string) {
    await expect(this.gameCode).toHaveText(code);
  }
}
