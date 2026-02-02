/**
 * Deck Building E2E Tests
 *
 * Tests deck management including:
 * - Creating new decks
 * - Adding/removing cards
 * - Saving decks
 * - Deck validation (30 card minimum)
 * - Deleting decks
 */

import { expect, test } from "./setup/fixtures";

test.describe("Deck Building", () => {
  test.describe("Deck List", () => {
    test("displays deck list on binder page", async ({ deckPage }) => {
      await deckPage.navigate();
      await expect(deckPage.deckList).toBeVisible();
    });

    test("can switch between collection and deck builder tabs", async ({ deckPage }) => {
      await deckPage.navigate();
      await deckPage.switchToCollectionTab();
      await deckPage.switchToDeckBuilderTab();
    });
  });

  test.describe("Creating Decks", () => {
    test("can create a new deck", async ({ deckPage }) => {
      await deckPage.navigate();

      const deckName = `Test Deck ${Date.now()}`;
      await deckPage.createNewDeck(deckName);

      await deckPage.expectDeckEditorVisible();
    });

    test("new deck starts empty", async ({ deckPage }) => {
      await deckPage.navigate();
      await deckPage.createNewDeck(`Empty Deck ${Date.now()}`);

      await deckPage.expectDeckCount(0);
    });
  });

  test.describe("Editing Decks", () => {
    test("can add cards to deck", async ({ deckPage }) => {
      await deckPage.navigate();
      await deckPage.createNewDeck(`Add Cards Test ${Date.now()}`);

      // Add a card
      await deckPage.addCardToDeck(0);

      // Verify count increased
      await deckPage.expectCardsInDeck(1);
    });

    test("can add multiple cards", async ({ deckPage }) => {
      await deckPage.navigate();
      await deckPage.createNewDeck(`Multi Card Test ${Date.now()}`);

      await deckPage.addCardsToDeck(10);
      await deckPage.expectCardsInDeck(10);
    });

    test("can remove cards from deck", async ({ deckPage }) => {
      await deckPage.navigate();
      await deckPage.createNewDeck(`Remove Cards Test ${Date.now()}`);

      await deckPage.addCardsToDeck(5);
      await deckPage.removeCardFromDeck(0);

      await deckPage.expectCardsInDeck(4);
    });
  });

  test.describe("Deck Validation", () => {
    test("save button disabled with less than 30 cards", async ({ deckPage }) => {
      await deckPage.navigate();
      await deckPage.createNewDeck(`Invalid Deck ${Date.now()}`);

      await deckPage.addCardsToDeck(10);
      await deckPage.expectSaveButtonDisabled();
    });

    test("save button enabled with exactly 30 cards", async ({ deckPage }) => {
      await deckPage.navigate();
      await deckPage.createNewDeck(`Valid Deck ${Date.now()}`);

      await deckPage.addCardsToDeck(30);
      await deckPage.expectSaveButtonEnabled();
    });

    test("shows warning for invalid deck size", async ({ deckPage }) => {
      await deckPage.navigate();
      await deckPage.createNewDeck(`Warning Test ${Date.now()}`);

      await deckPage.addCardsToDeck(15);
      await deckPage.expectMinimumCardsWarning();
    });
  });

  test.describe("Saving Decks", () => {
    test("can save a valid deck", async ({ deckPage }) => {
      await deckPage.navigate();

      const deckName = `Save Test ${Date.now()}`;
      await deckPage.createNewDeck(deckName);
      await deckPage.addCardsToDeck(30);
      await deckPage.saveDeck();

      // Deck should appear in list
      await deckPage.goBackToDeckList();
      await deckPage.expectDeckInList(deckName);
    });
  });

  test.describe("Deleting Decks", () => {
    test("can delete a deck", async ({ deckPage }) => {
      await deckPage.navigate();

      // Create and save a deck first
      const deckName = `Delete Test ${Date.now()}`;
      await deckPage.createNewDeck(deckName);
      await deckPage.addCardsToDeck(30);
      await deckPage.saveDeck();

      // Delete it
      await deckPage.goBackToDeckList();
      await deckPage.deleteDeck(deckName);

      // Should not appear in list
      await deckPage.expectDeckNotInList(deckName);
    });
  });
});
