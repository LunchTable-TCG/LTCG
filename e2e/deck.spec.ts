import { test, expect } from "./setup/fixtures";
import { DeckBuilderHelper } from "./setup/helpers";
import { TestDeckFactory, SELECTORS, TEST_CONFIG } from "./setup/test-data";

/**
 * Deck Management Flow E2E Tests
 *
 * Tests deck building functionality including:
 * - Creating new decks
 * - Adding/removing cards
 * - Setting active deck
 * - Editing existing decks
 * - Deleting decks
 * - Deck validation (30-60 cards)
 */

test.describe("Deck Management Flow", () => {
  test.describe("Deck Creation", () => {
    test("should create a new deck with valid cards", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      const testDeck = TestDeckFactory.create();

      // Create deck
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, testDeck.name);

      // Wait for deck editor to load
      await authenticatedPage.waitForSelector('[data-testid="deck-editor"]', {
        timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
      });

      // Verify empty deck
      const initialCount = await deckHelper.getDeckCardCount();
      expect(initialCount).toBe(0);
    });

    test("should validate minimum deck size", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      // Create deck with less than 30 cards
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, "Invalid Deck");

      // Try to save without enough cards
      const saveButton = authenticatedPage.locator(SELECTORS.DECK_SAVE_BUTTON);

      // Save button should be disabled or show error
      const isDisabled = await saveButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });

    test("should allow creating deck with exactly 30 cards", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      const deckName = `Valid Deck ${Date.now()}`;

      // Create deck
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);

      // Add 30 cards (minimum valid deck)
      // Note: This assumes starter cards are available
      for (let i = 0; i < 30; i++) {
        // Search and add first available card
        await authenticatedPage.fill('input[placeholder*="Search"]', "");
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(200);
      }

      // Save deck
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Should show success message or deck in list
      await expect(
        authenticatedPage.locator(`text=${deckName}`)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should enforce maximum deck size of 60 cards", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, "Max Deck");

      // Try to add 61 cards
      for (let i = 0; i < 61; i++) {
        await authenticatedPage.fill('input[placeholder*="Search"]', "");

        const addButton = authenticatedPage.locator('[data-testid="card-item"]').first();
        await addButton.click();
        await authenticatedPage.waitForTimeout(100);

        // After 60 cards, should not be able to add more
        if (i === 60) {
          const deckCount = await deckHelper.getDeckCardCount();
          expect(deckCount).toBe(60);
        }
      }
    });

    test("should require unique deck name", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      const deckName = `Unique Deck ${Date.now()}`;

      // Create first deck
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);

      // Add minimum cards and save
      for (let i = 0; i < 30; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Try to create another deck with same name
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);

      // Should show error
      await expect(
        authenticatedPage.locator('text=/deck.*name.*already.*exists/i')
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Deck Editing", () => {
    test("should add cards to existing deck", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      // Create deck with minimum cards
      const deckName = `Edit Test ${Date.now()}`;
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);

      // Add 30 cards
      for (let i = 0; i < 30; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Open deck for editing
      await authenticatedPage.locator(`[data-deck-name="${deckName}"]`).click();

      const initialCount = await deckHelper.getDeckCardCount();
      expect(initialCount).toBe(30);

      // Add 5 more cards
      for (let i = 0; i < 5; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }

      const newCount = await deckHelper.getDeckCardCount();
      expect(newCount).toBe(35);
    });

    test("should remove cards from deck", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      // Create deck
      const deckName = `Remove Test ${Date.now()}`;
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);

      // Add 35 cards
      for (let i = 0; i < 35; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }

      const initialCount = await deckHelper.getDeckCardCount();
      expect(initialCount).toBe(35);

      // Remove 5 cards
      for (let i = 0; i < 5; i++) {
        await authenticatedPage.locator('[data-testid="deck-card"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }

      const newCount = await deckHelper.getDeckCardCount();
      expect(newCount).toBe(30);
    });

    test("should rename deck", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      // Create deck
      const oldName = `Old Name ${Date.now()}`;
      const newName = `New Name ${Date.now()}`;

      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, oldName);

      // Add minimum cards
      for (let i = 0; i < 30; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Open deck for editing
      await authenticatedPage.locator(`[data-deck-name="${oldName}"]`).click();

      // Rename
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, newName);
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Verify new name appears
      await expect(
        authenticatedPage.locator(`text=${newName}`)
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Active Deck", () => {
    test("should set deck as active", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      // Create deck
      const deckName = `Active Test ${Date.now()}`;
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);

      // Add minimum cards
      for (let i = 0; i < 30; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Set as active
      await authenticatedPage.locator(`[data-deck-name="${deckName}"]`).click();
      await authenticatedPage.click(SELECTORS.DECK_SET_ACTIVE_BUTTON);

      // Verify active indicator
      await expect(
        authenticatedPage.locator(`[data-deck-name="${deckName}"][data-active="true"]`)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should only allow one active deck", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      // Create two decks
      const deck1Name = `Deck 1 ${Date.now()}`;
      const deck2Name = `Deck 2 ${Date.now() + 1}`;

      // Create first deck
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deck1Name);
      for (let i = 0; i < 30; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Set first deck as active
      await authenticatedPage.locator(`[data-deck-name="${deck1Name}"]`).click();
      await authenticatedPage.click(SELECTORS.DECK_SET_ACTIVE_BUTTON);

      // Create second deck
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deck2Name);
      for (let i = 0; i < 30; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Set second deck as active
      await authenticatedPage.locator(`[data-deck-name="${deck2Name}"]`).click();
      await authenticatedPage.click(SELECTORS.DECK_SET_ACTIVE_BUTTON);

      // First deck should no longer be active
      const deck1Active = await authenticatedPage
        .locator(`[data-deck-name="${deck1Name}"][data-active="true"]`)
        .count();
      expect(deck1Active).toBe(0);

      // Second deck should be active
      await expect(
        authenticatedPage.locator(`[data-deck-name="${deck2Name}"][data-active="true"]`)
      ).toBeVisible();
    });
  });

  test.describe("Deck Deletion", () => {
    test("should delete a deck", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      // Create deck
      const deckName = `Delete Test ${Date.now()}`;
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);

      // Add minimum cards
      for (let i = 0; i < 30; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Delete deck
      await authenticatedPage.locator(`[data-deck-name="${deckName}"]`).click();
      await authenticatedPage.click(SELECTORS.DECK_DELETE_BUTTON);

      // Confirm deletion
      await authenticatedPage.click('button:has-text("Confirm")');

      // Deck should no longer be visible
      const deckExists = await authenticatedPage
        .locator(`[data-deck-name="${deckName}"]`)
        .count();
      expect(deckExists).toBe(0);
    });

    test("should require confirmation before deleting", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      // Create deck
      const deckName = `Confirm Delete ${Date.now()}`;
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);
      for (let i = 0; i < 30; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(100);
      }
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Click delete
      await authenticatedPage.locator(`[data-deck-name="${deckName}"]`).click();
      await authenticatedPage.click(SELECTORS.DECK_DELETE_BUTTON);

      // Confirmation dialog should appear
      await expect(
        authenticatedPage.locator('text=/are you sure/i')
      ).toBeVisible({ timeout: 5000 });

      // Cancel deletion
      await authenticatedPage.click('button:has-text("Cancel")');

      // Deck should still exist
      await expect(
        authenticatedPage.locator(`[data-deck-name="${deckName}"]`)
      ).toBeVisible();
    });
  });

  test.describe("Deck List View", () => {
    test("should display all user decks", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      // Create multiple decks
      const deckNames = [
        `Deck A ${Date.now()}`,
        `Deck B ${Date.now() + 1}`,
        `Deck C ${Date.now() + 2}`,
      ];

      for (const deckName of deckNames) {
        await authenticatedPage.click('button:has-text("New Deck")');
        await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);
        for (let i = 0; i < 30; i++) {
          await authenticatedPage.locator('[data-testid="card-item"]').first().click();
          await authenticatedPage.waitForTimeout(50);
        }
        await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);
        await authenticatedPage.waitForTimeout(500);
      }

      // All decks should be visible
      for (const deckName of deckNames) {
        await expect(
          authenticatedPage.locator(`text=${deckName}`)
        ).toBeVisible();
      }
    });

    test("should show deck card count", async ({ authenticatedPage }) => {
      const deckHelper = new DeckBuilderHelper(authenticatedPage);
      await deckHelper.navigate();

      const deckName = `Count Test ${Date.now()}`;
      await authenticatedPage.click('button:has-text("New Deck")');
      await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, deckName);

      // Add 40 cards
      for (let i = 0; i < 40; i++) {
        await authenticatedPage.locator('[data-testid="card-item"]').first().click();
        await authenticatedPage.waitForTimeout(50);
      }
      await authenticatedPage.click(SELECTORS.DECK_SAVE_BUTTON);

      // Should show card count
      await expect(
        authenticatedPage.locator(`text=/40.*cards/i`)
      ).toBeVisible({ timeout: 5000 });
    });
  });
});
