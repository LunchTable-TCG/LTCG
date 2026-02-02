/**
 * Test Deck Saving E2E Tests
 *
 * Tests for deck saving functionality.
 *
 * Note: These tests require authentication. Tests are skipped by default.
 * To run them, set up authenticated browser state first.
 */

import { enableConsoleLogs, expect, test } from "./setup/fixtures";
import { SELECTORS } from "./setup/test-data";

// =============================================================================
// AUTHENTICATED DECK SAVE TESTS
// =============================================================================

test.describe("Test Deck Saving", () => {
  // Skip all tests by default since they require authentication
  test.beforeEach(async () => {
    test.skip();
  });

  test("can we save a deck at all", async ({ page, deckHelper }) => {
    enableConsoleLogs(page);

    await deckHelper.navigate();

    // Create deck
    await page.click('button:has-text("New Deck")');
    await page.fill(SELECTORS.DECK_NAME_INPUT, "Save Test");
    await page.keyboard.press("Enter");

    // Wait for cards
    await page.waitForSelector('[data-testid="deck-editor"]');
    await page
      .locator('[data-testid="card-item"]')
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    console.log("Cards are visible");

    // Add exactly 30 cards with longer waits
    for (let i = 0; i < 30; i++) {
      console.log(`Adding card ${i + 1}/30`);
      await page.locator('[data-testid="card-item"]').first().click();
      await page.waitForTimeout(1000); // Wait 1 second

      // Check deck count after each click
      const count = await deckHelper.getDeckCount();
      console.log(`  Deck count is now: ${count}`);
    }

    // Final check
    const finalCount = await deckHelper.getDeckCount();
    console.log(`Final deck count: ${finalCount}`);
    expect(finalCount).toBe(30);

    // Try to save
    const saveButton = page.locator(SELECTORS.DECK_SAVE_BUTTON);
    const isDisabled = await saveButton.isDisabled();
    console.log(`Save button disabled: ${isDisabled}`);

    if (!isDisabled) {
      await saveButton.click();
      console.log("Clicked save button");

      // Wait for deck to appear in list
      await page.waitForTimeout(2000);

      // Check if deck appears in the list
      const deckInList = await page.locator('[data-deck-name="Save Test"]').count();
      console.log(`Deck appears in list: ${deckInList > 0}`);

      expect(deckInList).toBeGreaterThan(0);
    } else {
      throw new Error("Save button is still disabled after adding 30 cards!");
    }
  });
});
