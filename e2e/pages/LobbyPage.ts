import { type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LobbyPage extends BasePage {
  readonly url = "/lunchtable";

  // ============================================================================
  // Main Lobby Elements
  // ============================================================================

  get gameLobby(): Locator {
    return this.page.locator('[data-testid="game-lobby"]');
  }

  get lobbyPlayers(): Locator {
    return this.page.locator('[data-testid="lobby-players"]');
  }

  // ============================================================================
  // Quick Match / Matchmaking
  // ============================================================================

  get quickMatchButton(): Locator {
    return this.page.getByRole("button", { name: /Quick Match/i });
  }

  get casualModeButton(): Locator {
    return this.page.getByRole("button", { name: /Casual/i });
  }

  get rankedModeButton(): Locator {
    return this.page.getByRole("button", { name: /Ranked/i });
  }

  get matchmakingStatus(): Locator {
    return this.page.getByText(/Searching for opponent/i);
  }

  get cancelSearchButton(): Locator {
    return this.page.getByRole("button", { name: /Cancel/i }).first();
  }

  // ============================================================================
  // Create Game
  // ============================================================================

  get createGameButton(): Locator {
    return this.page.getByRole("button", { name: /Create Game/i });
  }

  get createGameModal(): Locator {
    return this.page.locator('[data-testid="create-game-modal"]');
  }

  get casualGameOption(): Locator {
    return this.createGameModal.getByRole("button", { name: /Casual/i });
  }

  get rankedGameOption(): Locator {
    return this.createGameModal.getByRole("button", { name: /Ranked/i });
  }

  get privateMatchToggle(): Locator {
    return this.createGameModal.getByRole("button", { name: /Private Match/i });
  }

  get confirmCreateButton(): Locator {
    return this.createGameModal.getByRole("button", { name: /Create Game/i });
  }

  // ============================================================================
  // Tabs
  // ============================================================================

  get joinGameTab(): Locator {
    return this.page.getByRole("button", { name: /Join Game/i });
  }

  get watchTab(): Locator {
    return this.page.getByRole("button", { name: /Watch/i });
  }

  // ============================================================================
  // Game Mode Filters
  // ============================================================================

  get allGamesFilter(): Locator {
    return this.page.getByRole("button", { name: /All Games/i });
  }

  get casualFilter(): Locator {
    return this.page.getByRole("button", { name: /Casual/i }).filter({ hasText: /^Casual$/ });
  }

  get rankedFilter(): Locator {
    return this.page.getByRole("button", { name: /Ranked/i }).filter({ hasText: /^Ranked$/ });
  }

  // ============================================================================
  // Lobby List
  // ============================================================================

  get lobbyList(): Locator {
    return this.page.locator('[data-testid="lobby-players"]');
  }

  get lobbyItems(): Locator {
    return this.page.locator('[data-testid="lobby-player"]');
  }

  getLobbyItem(index: number): Locator {
    return this.lobbyItems.nth(index);
  }

  getLobbyByHostName(hostName: string): Locator {
    return this.lobbyItems.filter({ has: this.page.getByText(hostName, { exact: true }) });
  }

  // ============================================================================
  // Active Lobby (Waiting for opponent)
  // ============================================================================

  get myActiveLobbyStatus(): Locator {
    return this.page.getByText(/Waiting for opponent/i);
  }

  get cancelMyLobbyButton(): Locator {
    return this.page.getByRole("button", { name: /Cancel/i }).first();
  }

  // ============================================================================
  // Join Confirmation Dialog
  // ============================================================================

  get joinConfirmDialog(): Locator {
    return this.page.getByRole("dialog");
  }

  get confirmJoinButton(): Locator {
    return this.joinConfirmDialog.getByRole("button", { name: /Confirm|Join/i });
  }

  get cancelJoinButton(): Locator {
    return this.joinConfirmDialog.getByRole("button", { name: /Cancel/i });
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Start quick match with specified mode
   */
  async startQuickMatch(mode: "casual" | "ranked" = "casual") {
    // Select mode
    if (mode === "casual") {
      await this.casualModeButton.click();
    } else {
      await this.rankedModeButton.click();
    }

    // Click quick match
    await this.quickMatchButton.click();
    await expect(this.matchmakingStatus).toBeVisible({ timeout: 5000 });
  }

  /**
   * Cancel matchmaking search
   */
  async cancelMatchmaking() {
    await this.cancelSearchButton.click();
    await expect(this.matchmakingStatus).not.toBeVisible();
  }

  /**
   * Create a new lobby
   */
  async createLobby(
    options: {
      mode: "casual" | "ranked";
      isPrivate?: boolean;
    } = { mode: "casual" }
  ) {
    // Open create game modal
    await this.createGameButton.click();
    await expect(this.createGameModal).toBeVisible({ timeout: 5000 });

    // Select mode
    if (options.mode === "casual") {
      await this.casualGameOption.click();
    } else {
      await this.rankedGameOption.click();
    }

    // Toggle private match if needed
    if (options.isPrivate) {
      await this.privateMatchToggle.click();
    }

    // Confirm creation
    await this.confirmCreateButton.click();
    await this.waitForLoad();
  }

  /**
   * Join a lobby by index
   */
  async joinLobby(index = 0) {
    const lobby = this.getLobbyItem(index);
    await expect(lobby).toBeVisible();

    // Click join button within the lobby item
    const joinButton = lobby.getByRole("button", { name: /Join/i });
    await joinButton.click();

    // Wait for confirmation dialog
    await expect(this.joinConfirmDialog).toBeVisible({ timeout: 5000 });
  }

  /**
   * Join a lobby by host name
   */
  async joinLobbyByHost(hostName: string) {
    const lobby = this.getLobbyByHostName(hostName);
    await expect(lobby).toBeVisible();

    // Click join button within the lobby item
    const joinButton = lobby.getByRole("button", { name: /Join/i });
    await joinButton.click();

    // Wait for confirmation dialog
    await expect(this.joinConfirmDialog).toBeVisible({ timeout: 5000 });
  }

  /**
   * Confirm joining a lobby
   */
  async confirmJoin() {
    await this.confirmJoinButton.click();
    await this.waitForLoad();
  }

  /**
   * Cancel joining a lobby
   */
  async cancelJoin() {
    await this.cancelJoinButton.click();
    await expect(this.joinConfirmDialog).not.toBeVisible();
  }

  /**
   * Cancel your own active lobby
   */
  async cancelMyLobby() {
    await this.cancelMyLobbyButton.click();
    await expect(this.myActiveLobbyStatus).not.toBeVisible();
  }

  /**
   * Watch a game by index
   */
  async watchGame(index = 0) {
    // Switch to watch tab
    await this.watchTab.click();

    // Find and click watch button
    const gameItem = this.getLobbyItem(index);
    const watchButton = gameItem.getByRole("button", { name: /Watch/i });
    await watchButton.click();
    await this.waitForLoad();
  }

  /**
   * Switch to join game tab
   */
  async switchToJoinTab() {
    await this.joinGameTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Switch to watch tab
   */
  async switchToWatchTab() {
    await this.watchTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter lobbies by mode
   */
  async filterByMode(mode: "all" | "casual" | "ranked") {
    if (mode === "all") {
      await this.allGamesFilter.click();
    } else if (mode === "casual") {
      await this.casualFilter.click();
    } else {
      await this.rankedFilter.click();
    }
    await this.page.waitForTimeout(300);
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Assert lobby page is visible
   */
  async expectLobbyVisible() {
    await expect(this.gameLobby).toBeVisible();
  }

  /**
   * Assert in lobby waiting for opponent
   */
  async expectInLobby() {
    await expect(this.myActiveLobbyStatus).toBeVisible();
  }

  /**
   * Assert matchmaking is active
   */
  async expectMatchmaking() {
    await expect(this.matchmakingStatus).toBeVisible();
  }

  /**
   * Assert not in matchmaking
   */
  async expectNotMatchmaking() {
    await expect(this.matchmakingStatus).not.toBeVisible();
  }

  /**
   * Assert specific number of lobbies available
   */
  async expectLobbyCount(count: number) {
    await expect(this.lobbyItems).toHaveCount(count);
  }

  /**
   * Assert at least one lobby is available
   */
  async expectLobbiesAvailable() {
    await expect(this.lobbyItems).toHaveCount({ gte: 1 } as any);
  }

  /**
   * Assert no lobbies are available
   */
  async expectNoLobbies() {
    await expect(this.page.getByText(/No Games Available/i)).toBeVisible();
  }

  /**
   * Assert specific lobby exists by host name
   */
  async expectLobbyByHost(hostName: string) {
    const lobby = this.getLobbyByHostName(hostName);
    await expect(lobby).toBeVisible();
  }

  /**
   * Assert join tab is active
   */
  async expectJoinTabActive() {
    await expect(this.joinGameTab).toHaveClass(/bg-\[#d4af37\]/);
  }

  /**
   * Assert watch tab is active
   */
  async expectWatchTabActive() {
    await expect(this.watchTab).toHaveClass(/bg-\[#d4af37\]/);
  }

  /**
   * Assert create game modal is visible
   */
  async expectCreateModalVisible() {
    await expect(this.createGameModal).toBeVisible();
  }

  /**
   * Assert create game modal is not visible
   */
  async expectCreateModalNotVisible() {
    await expect(this.createGameModal).not.toBeVisible();
  }
}
