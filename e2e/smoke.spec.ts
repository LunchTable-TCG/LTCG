import { test, expect } from "./setup/fixtures";
import { TestUserFactory, SELECTORS } from "./setup/test-data";

/**
 * Smoke Test - Critical Path E2E
 *
 * Fast (<1 minute) smoke test covering the critical user journey:
 * 1. Sign up new user
 * 2. Purchase pack with gold
 * 3. Verify cards received
 * 4. Create deck with new cards
 * 5. Start story mode battle
 *
 * This test runs on every PR and MUST be fast.
 * - Skip animations
 * - Use minimal waits
 * - No unnecessary validation
 * - Focus on critical path only
 *
 * Usage:
 *   bun run test:e2e:smoke        # Run smoke test only
 *   bun run test:e2e              # Run all E2E tests (includes smoke)
 *
 * Prerequisites:
 *   - App running on http://localhost:3000 (or use webServer in playwright.config.ts)
 *   - Convex backend running
 */
test.describe("Smoke Test - Critical Path", () => {
  test("should complete full user journey in under 1 minute", async ({ page }) => {
    // Capture console logs for debugging
    page.on('console', (msg) => console.log(`[Browser ${msg.type()}]:`, msg.text()));
    page.on('pageerror', (err) => console.error('[Browser Error]:', err.message));

    // Reduce animation delays for speed
    const FAST_WAIT = 300;

    const testUser = TestUserFactory.create();

    // ===== 1. AUTH: Sign up new user =====
    await page.goto("/signup");

    // Wait for form to be fully loaded
    await page.waitForSelector(SELECTORS.AUTH_USERNAME_INPUT, { state: 'visible' });

    await page.fill(SELECTORS.AUTH_USERNAME_INPUT, testUser.username);
    await page.fill(SELECTORS.AUTH_EMAIL_INPUT, testUser.email);
    await page.fill(SELECTORS.AUTH_PASSWORD_INPUT, testUser.password);
    await page.fill('input[id="confirmPassword"]', testUser.password); // Confirm password for signup

    // Click submit and wait for either redirect or error
    await page.click(SELECTORS.AUTH_SUBMIT_BUTTON);

    // Wait a moment for the form to process
    await page.waitForTimeout(2000);

    // Check if there's an error message
    const errorMessage = await page.locator('[role="alert"], .error, [data-error]').textContent().catch(() => null);
    if (errorMessage) {
      console.log("❌ Auth error:", errorMessage);
    }

    // Wait for redirect to authenticated page
    await page.waitForURL(/\/(lunchtable|binder|profile)/, { timeout: 13000 });

    // Quick verification - user is logged in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(lunchtable|binder|profile)/);

    // ===== 2. SHOP: Purchase one pack with gold =====
    await page.goto("/shop");

    // Wait for shop to load
    await page.waitForSelector('[data-testid="shop"]', { timeout: 5000 });

    // Get initial gold amount
    const goldElement = page.locator('[data-testid="player-gold"]');
    await goldElement.waitFor({ state: "visible", timeout: 3000 });
    const goldText = await goldElement.textContent();
    const goldBefore = Number.parseInt(goldText?.replace(/\D/g, "") || "0", 10);

    // Buy one pack
    const buyButton = page.locator(SELECTORS.SHOP_BUY_PACK_BUTTON).first();
    await buyButton.click();
    await page.waitForTimeout(FAST_WAIT);

    // Verify gold decreased
    const goldTextAfter = await goldElement.textContent();
    const goldAfter = Number.parseInt(goldTextAfter?.replace(/\D/g, "") || "0", 10);
    expect(goldAfter).toBeLessThan(goldBefore);

    // ===== 3. COLLECTION: Verify cards received (open pack) =====
    // Navigate to pack opening page or click open pack
    const openPackButton = page.locator(
      'button:has-text("Open"), a[href*="/shop/open"]'
    ).first();

    if (await openPackButton.isVisible({ timeout: 2000 })) {
      await openPackButton.click();
      await page.waitForURL(/\/shop\/open/, { timeout: 5000 });

      // Wait for pack opening interface
      await page.waitForSelector(
        '[data-testid="pack-results"], [data-testid="pack-card"], button:has-text("Open")',
        { timeout: 5000 }
      );

      // If there's an "Open Pack" button on this page, click it
      const finalOpenButton = page.locator('button:has-text("Open Pack")');
      if (await finalOpenButton.isVisible({ timeout: 2000 })) {
        await finalOpenButton.click();
        await page.waitForTimeout(1500); // Wait for opening animation (keep short)
      }

      // Verify cards received
      const packCards = page.locator('[data-testid="pack-card"]');
      const cardCount = await packCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Close/confirm pack results
      const closeButton = page.locator(
        'button:has-text("Close"), button:has-text("Confirm"), button:has-text("Continue")'
      ).first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
        await page.waitForTimeout(FAST_WAIT);
      }
    }

    // ===== 4. DECK: Create deck with new cards =====
    await page.goto("/binder");

    // Wait for binder/deck builder to load
    await page.waitForSelector(
      '[data-testid="deck-builder"], [data-testid="deck-list"], button:has-text("New Deck")',
      { timeout: 5000 }
    );

    // Create new deck
    const newDeckButton = page.locator('button:has-text("New Deck")');
    await newDeckButton.click();
    await page.waitForTimeout(FAST_WAIT);

    // Enter deck name
    const deckName = `Smoke Test Deck ${Date.now()}`;
    await page.fill(SELECTORS.DECK_NAME_INPUT, deckName);
    await page.waitForTimeout(FAST_WAIT);

    // Add 30 cards quickly (minimum valid deck)
    // Use any available cards from starter deck or opened packs
    for (let i = 0; i < 30; i++) {
      // Clear search to show all cards
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible({ timeout: 1000 })) {
        await searchInput.fill("");
        await page.waitForTimeout(100);
      }

      // Click first available card
      const cardItem = page.locator('[data-testid="card-item"]').first();
      if (await cardItem.isVisible({ timeout: 1000 })) {
        await cardItem.click();
        await page.waitForTimeout(50); // Minimal wait between adds
      }
    }

    // Save deck
    const saveButton = page.locator(SELECTORS.DECK_SAVE_BUTTON);
    if (await saveButton.isVisible({ timeout: 2000 })) {
      await saveButton.click();
      await page.waitForTimeout(FAST_WAIT);
    }

    // Verify deck was created (should see it in list or success message)
    await expect(
      page.locator(`text=${deckName}, [data-deck-name="${deckName}"]`).first()
    ).toBeVisible({ timeout: 3000 });

    // ===== 5. GAME: Start story mode battle (just verify it loads) =====
    await page.goto("/play/story");

    // Wait for story mode to load
    await page.waitForSelector('[data-testid="story-chapter"]', {
      timeout: 5000,
    });

    // Click first available chapter
    const firstChapter = page.locator('[data-testid="story-chapter"]').first();
    await firstChapter.click();
    await page.waitForURL(/\/play\/story\//, { timeout: 5000 });

    // Click first available stage
    const firstStage = page.locator('[data-testid="story-stage"]').first();
    if (await firstStage.isVisible({ timeout: 3000 })) {
      await firstStage.click();
      await page.waitForTimeout(FAST_WAIT);

      // Start battle
      const startBattleButton = page.locator(SELECTORS.STORY_START_BATTLE);
      if (await startBattleButton.isVisible({ timeout: 2000 })) {
        await startBattleButton.click();

        // Verify battle screen loads (don't play the full game)
        await page.waitForSelector('[data-testid="game-board"]', {
          timeout: 8000,
        });

        // Confirm game board is visible
        await expect(
          page.locator('[data-testid="game-board"]')
        ).toBeVisible();

        // SUCCESS - Critical path complete!
        // Don't play the full game - just verify it loaded
      }
    }

    // Test complete - all critical flows passed
  });
});
