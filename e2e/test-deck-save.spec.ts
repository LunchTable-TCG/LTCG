import { test, expect } from "./setup/fixtures";
import { DeckBuilderHelper } from "./setup/helpers";
import { SELECTORS } from "./setup/test-data";

test.describe("Test Deck Saving", () => {
  test("can we save a deck at all", async ({ authenticatedPage }) => {
    const deckHelper = new DeckBuilderHelper(authenticatedPage);
    await deckHelper.navigate();

    // Create deck
    await authenticatedPage.click('button:has-text("New Deck")');
    await authenticatedPage.fill(SELECTORS.DECK_NAME_INPUT, "Save Test");
    await authenticatedPage.keyboard.press("Enter");

    // Wait for cards
    await authenticatedPage.waitForSelector('[data-testid="deck-editor"]');
    await authenticatedPage.locator('[data-testid="card-item"]').first().waitFor({ state: "visible", timeout: 15000 });

    console.log("Cards are visible");

    // Add exactly 30 cards with longer waits
    for (let i = 0; i < 30; i++) {
      console.log(`Adding card ${i + 1}/30`);
      await authenticatedPage.locator('[data-testid="card-item"]').first().click();
      await authenticatedPage.waitForTimeout(1000); // Wait 1 second

      // Check deck count after each click
      const count = await deckHelper.getDeckCardCount();
      console.log(`  Deck count is now: ${count}`);
    }

    // Final check
    const finalCount = await deckHelper.getDeckCardCount();
    console.log(`Final deck count: ${finalCount}`);
    expect(finalCount).toBe(30);

    // Try to save
    const saveButton = authenticatedPage.locator(SELECTORS.DECK_SAVE_BUTTON);
    const isDisabled = await saveButton.isDisabled();
    console.log(`Save button disabled: ${isDisabled}`);

    if (!isDisabled) {
      await saveButton.click();
      console.log("Clicked save button");

      // Wait for deck to appear in list
      await authenticatedPage.waitForTimeout(2000);

      // Check if deck appears in the list
      const deckInList = await authenticatedPage.locator('[data-deck-name="Save Test"]').count();
      console.log(`Deck appears in list: ${deckInList > 0}`);

      expect(deckInList).toBeGreaterThan(0);
    } else {
      throw new Error("Save button is still disabled after adding 30 cards!");
    }
  });
});
