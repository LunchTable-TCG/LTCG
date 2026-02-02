/**
 * Smoke Tests - Critical Path Validation
 *
 * These tests validate the most critical user flows.
 * Run on every PR to catch breaking changes quickly.
 *
 * Tagged with @smoke for selective execution in CI.
 */

import { expect, test } from "./setup/fixtures";

test.describe("Smoke Tests @smoke", () => {
  test("homepage redirects to login for unauthenticated users", async ({ page }) => {
    await page.goto("/");

    // Should redirect to login page
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("authenticated user can access dashboard", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/lunchtable");
    await authenticatedPage.waitForLoadState("networkidle");

    // Verify dashboard loads (checking for global chat is a good indicator)
    const globalChat = authenticatedPage.locator('[data-testid="global-chat"]');
    await expect(globalChat).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to deck builder", async ({ deckPage }) => {
    await deckPage.navigate();
    await expect(deckPage.page).toHaveURL(/binder/);

    // Verify deck builder UI loaded
    await expect(deckPage.createDeckButton).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to shop", async ({ shopPage }) => {
    await shopPage.navigate();
    await expect(shopPage.page).toHaveURL(/shop/);

    // Verify shop loaded
    await expect(shopPage.container).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to play/lobby", async ({ lobbyPage }) => {
    await lobbyPage.navigate();
    await expect(lobbyPage.page).toHaveURL(/play|lunchtable/);
  });

  test("can create and save a deck", async ({ deckPage }) => {
    await deckPage.navigate();

    // Create new deck
    const deckName = `Smoke Test Deck ${Date.now()}`;
    await deckPage.createNewDeck(deckName);

    // Add 30 cards
    await deckPage.addCardsToDeck(30);

    // Verify count and save
    await deckPage.expectDeckCount(30);
    await deckPage.saveDeck();

    // Go back to deck list
    await deckPage.goBackToDeckList();

    // Verify deck appears in list
    await deckPage.expectDeckInList(deckName);
  });

  test("can view shop and see gold balance", async ({ shopPage }) => {
    await shopPage.navigate();

    // Verify currency displays
    const gold = await shopPage.getGoldAmount();
    expect(gold).toBeGreaterThanOrEqual(0);

    // Verify packs are available
    await shopPage.expectPacksAvailable();
  });

  test("can view story mode chapters", async ({ storyPage }) => {
    await storyPage.navigate();
    await expect(storyPage.page).toHaveURL(/play\/story/);

    // Verify at least one chapter is visible
    const chapterCount = await storyPage.getChapterCount();
    expect(chapterCount).toBeGreaterThan(0);
  });

  test("can view social features", async ({ socialPage }) => {
    await socialPage.navigate();
    await expect(socialPage.page).toHaveURL(/social/);

    // Verify page loaded without errors
    await socialPage.waitForLoad();
  });
});
