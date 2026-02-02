import { type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DeckBuilderPage extends BasePage {
  readonly url = "/binder";

  // Tab selectors
  get collectionTab(): Locator {
    return this.page.locator('button:has-text("Collection")');
  }

  get deckBuilderTab(): Locator {
    return this.page.locator('button:has-text("Deck Builder")');
  }

  // Deck List selectors
  get deckList(): Locator {
    return this.page.locator('[data-testid="deck-list"]');
  }

  get createDeckButton(): Locator {
    return this.page.locator('button:has-text("Create New Deck")');
  }

  get newDeckNameInput(): Locator {
    return this.deckList.locator('input[placeholder*="Enter deck name"]');
  }

  getDeckCard(deckName: string): Locator {
    return this.page.locator(`[data-testid="deck-card"]:has-text("${deckName}")`);
  }

  getDeckCardByIndex(index: number): Locator {
    return this.page.locator('[data-testid="deck-card"]').nth(index);
  }

  // Deck Editor selectors
  get deckEditor(): Locator {
    return this.page.locator('[data-testid="deck-editor"]');
  }

  get deckCount(): Locator {
    return this.deckEditor.locator('[data-testid="deck-count"]').first();
  }

  get saveButton(): Locator {
    return this.deckEditor.locator('button:has-text("Save")');
  }

  get clearButton(): Locator {
    return this.deckEditor.locator('button:has-text("Clear")');
  }

  get backButton(): Locator {
    return this.deckEditor.locator("button").first();
  }

  get editNameButton(): Locator {
    return this.deckEditor
      .locator("button")
      .filter({ has: this.page.locator("svg") })
      .nth(1);
  }

  get deckNameInput(): Locator {
    return this.deckEditor.locator("input").first();
  }

  get deckSearchInput(): Locator {
    return this.page.locator('[data-testid="deck-search"]');
  }

  getCardInDeck(index: number): Locator {
    return this.deckEditor.locator('[data-testid="deck-card"]').nth(index);
  }

  getAvailableCard(index: number): Locator {
    return this.deckEditor.locator(".grid > div").nth(index);
  }

  // Actions
  async switchToCollectionTab() {
    await this.collectionTab.click();
    await this.waitForLoad();
  }

  async switchToDeckBuilderTab() {
    await this.deckBuilderTab.click();
    await this.waitForLoad();
  }

  async createNewDeck(name: string) {
    await this.createDeckButton.click();
    await this.newDeckNameInput.fill(name);
    await this.page.keyboard.press("Enter");
    await this.waitForLoad();
  }

  async selectDeck(deckName: string) {
    await this.getDeckCard(deckName).click();
    await this.waitForLoad();
  }

  async selectDeckByIndex(index: number) {
    await this.getDeckCardByIndex(index).click();
    await this.waitForLoad();
  }

  async addCardToDeck(index = 0) {
    await this.getAvailableCard(index).click();
    await this.page.waitForTimeout(200);
  }

  async addCardsToDeck(count: number) {
    for (let i = 0; i < count; i++) {
      await this.addCardToDeck(0);
    }
  }

  async removeCardFromDeck(index: number) {
    const card = this.getCardInDeck(index);
    const minusButton = card.locator("button").first();
    await minusButton.click();
  }

  async saveDeck() {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
    await this.page.waitForTimeout(500);
  }

  async clearDeck() {
    await this.clearButton.click();
    // Confirm dialog
    await this.page.locator('button:has-text("Clear Deck")').click();
    await this.waitForToast("Deck cleared");
  }

  async goBackToDeckList() {
    await this.backButton.click();
    await this.waitForLoad();
  }

  async renameDeck(newName: string) {
    await this.editNameButton.click();
    await this.deckNameInput.fill(newName);
    await this.page.keyboard.press("Enter");
    await this.waitForLoad();
  }

  async deleteDeck(deckName: string) {
    const deckCard = this.getDeckCard(deckName);
    await deckCard.hover();
    const deleteButton = deckCard.locator("button").filter({ hasText: /delete/i });
    await deleteButton.click();
    // Confirm dialog
    await this.page.locator('button:has-text("Delete")').click();
    await this.waitForToast("Deck deleted successfully");
  }

  async setActiveDeck(deckName: string) {
    const deckCard = this.getDeckCard(deckName);
    await deckCard.hover();
    const activateButton = deckCard.locator('button:has-text("Set Active")');
    await activateButton.click();
    await this.page.waitForTimeout(500);
  }

  async searchCards(query: string) {
    await this.deckSearchInput.fill(query);
    await this.page.waitForTimeout(300);
  }

  // Assertions
  async expectDeckCount(count: number) {
    await expect(this.deckCount).toContainText(`${count}`);
  }

  async expectDeckInList(name: string) {
    await expect(this.getDeckCard(name)).toBeVisible();
  }

  async expectDeckNotInList(name: string) {
    await expect(this.getDeckCard(name)).not.toBeVisible();
  }

  async expectSaveButtonEnabled() {
    await expect(this.saveButton).toBeEnabled();
  }

  async expectSaveButtonDisabled() {
    await expect(this.saveButton).toBeDisabled();
  }

  async expectMinimumCardsWarning() {
    await expect(this.deckEditor.locator(':has-text("Deck needs at least")')).toBeVisible();
  }

  async expectNoDeckSelected() {
    await expect(this.deckList).toBeVisible();
    await expect(this.deckEditor).not.toBeVisible();
  }

  async expectDeckEditorVisible() {
    await expect(this.deckEditor).toBeVisible();
  }

  async expectActiveDeck(deckName: string) {
    const deckCard = this.getDeckCard(deckName);
    await expect(deckCard.locator(':has-text("Active")')).toBeVisible();
  }

  async expectCardsInDeck(count: number) {
    const deckCards = this.deckEditor.locator('[data-testid="deck-card"]');
    await expect(deckCards).toHaveCount(count);
  }
}
