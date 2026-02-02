/**
 * Debug Cards E2E Tests
 *
 * Tests for debugging card collection functionality.
 *
 * Note: These tests require authentication. Tests are skipped by default.
 * To run them, set up authenticated browser state first.
 */

import { test, expect, enableConsoleLogs } from "./setup/fixtures";
import { waitForLoadingToComplete } from "./setup/test-data";

// =============================================================================
// AUTHENTICATED DEBUG TESTS
// =============================================================================

test.describe("Debug Cards", () => {
  // Skip all tests by default since they require authentication
  test.beforeEach(async () => {
    test.skip();
  });

  test("should have cards after starter deck claim", async ({ page }) => {
    enableConsoleLogs(page);

    await page.goto("/binder");
    await waitForLoadingToComplete(page);

    // Wait for loader to disappear
    await page.locator('text=Loading Collection...').waitFor({ state: "detached", timeout: 15000 });

    // Wait for at least one card to appear
    await page.waitForSelector('[data-testid="card-item"]', { timeout: 5000 });

    // Check if any cards exist
    const cardCount = await page.locator('[data-testid="card-item"]').count();
    console.log("Card Items Found in Binder:", cardCount);

    // Check if the deck was created in userDecks
    const deckCount = await page.locator('[data-testid="deck-item"]').count();
    console.log("Decks Found:", deckCount);

    expect(cardCount).toBeGreaterThan(0);
  });
});
