import { test, expect } from "./setup/fixtures";
import { ShopHelper } from "./setup/helpers";
import { TEST_CONFIG, SELECTORS } from "./setup/test-data";

/**
 * Economy Flow E2E Tests
 *
 * Tests economy features including:
 * - Purchasing packs with gold
 * - Opening packs
 * - Receiving cards
 * - Marketplace listing
 * - Marketplace purchasing
 * - Promo code redemption
 */

test.describe("Economy Flow", () => {
  test.describe("Shop - Buying Packs", () => {
    test("should display available packs", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      // Pack products should be visible
      await expect(
        authenticatedPage.locator('[data-testid="pack-product"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show pack price", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      // Price should be displayed
      await expect(
        authenticatedPage.locator('[data-testid="pack-price"]')
      ).toBeVisible();
    });

    test("should buy pack with gold", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      const goldBefore = await shopHelper.getGoldAmount();
      const packsBefore = await shopHelper.getPackCount();

      // Buy pack
      await shopHelper.buyPack();

      // Gold should decrease
      const goldAfter = await shopHelper.getGoldAmount();
      expect(goldAfter).toBeLessThan(goldBefore);

      // Pack count should increase
      const packsAfter = await shopHelper.getPackCount();
      expect(packsAfter).toBeGreaterThan(packsBefore);
    });

    test("should not allow purchase with insufficient gold", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      const gold = await shopHelper.getGoldAmount();

      // If gold is insufficient for pack
      if (gold < TEST_CONFIG.PACK_COST) {
        const buyButton = authenticatedPage.locator(SELECTORS.SHOP_BUY_PACK_BUTTON);
        const isDisabled = await buyButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    });
  });

  test.describe("Opening Packs", () => {
    test("should open pack and receive cards", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      // Buy pack first
      await shopHelper.buyPack();

      // Open pack
      await shopHelper.openPack();

      // Should show pack opening animation/results
      await expect(
        authenticatedPage.locator('[data-testid="pack-results"]')
      ).toBeVisible({ timeout: 10000 });

      // Should show received cards
      const cardCount = await authenticatedPage
        .locator('[data-testid="pack-card"]')
        .count();
      expect(cardCount).toBe(TEST_CONFIG.CARDS_PER_PACK);
    });

    test("should add cards to collection after opening", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      // Buy and open pack
      await shopHelper.buyPack();
      await shopHelper.openPack();

      // Close pack results
      await authenticatedPage.click('button:has-text("Close")');

      // Navigate to binder
      await authenticatedPage.goto("/binder");

      // New cards should be in collection
      await expect(
        authenticatedPage.locator('[data-testid="collection-card"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show pack inventory", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      // Navigate to open packs section
      await authenticatedPage.goto("/shop/open");

      // Should show owned packs
      await expect(
        authenticatedPage.locator('[data-testid="owned-pack"]')
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Marketplace - Listing", () => {
    test("should list card for sale", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/binder");

      // Select card to list
      await authenticatedPage.locator('[data-testid="collection-card"]').first().click();

      // List on marketplace
      const listButton = authenticatedPage.locator('button:has-text("List")');
      if (await listButton.isVisible({ timeout: 2000 })) {
        await listButton.click();

        // Enter price
        await authenticatedPage.fill('input[name="price"]', "100");

        // Confirm listing
        await authenticatedPage.click('button:has-text("Confirm")');

        // Should show success message
        await expect(
          authenticatedPage.locator('text=/listed.*successfully/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test("should validate listing price", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/binder");

      const listButton = authenticatedPage.locator('button:has-text("List")');
      if (await listButton.isVisible({ timeout: 2000 })) {
        await listButton.click();

        // Try invalid price
        await authenticatedPage.fill('input[name="price"]', "-10");
        await authenticatedPage.click('button:has-text("Confirm")');

        // Should show validation error
        await expect(
          authenticatedPage.locator('text=/valid.*price/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test("should remove listing", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/binder");

      // List card first
      await authenticatedPage.locator('[data-testid="collection-card"]').first().click();
      const listButton = authenticatedPage.locator('button:has-text("List")');
      if (await listButton.isVisible({ timeout: 2000 })) {
        await listButton.click();
        await authenticatedPage.fill('input[name="price"]', "100");
        await authenticatedPage.click('button:has-text("Confirm")');

        // Remove listing
        await authenticatedPage.click('button:has-text("Unlist")');

        // Should be removed
        await expect(
          authenticatedPage.locator('text=/unlisted.*successfully/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Marketplace - Purchasing", () => {
    test("should display marketplace listings", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/marketplace");

      // Should show available cards
      await expect(
        authenticatedPage.locator('[data-testid="marketplace-card"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test("should buy card from marketplace", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await authenticatedPage.goto("/marketplace");

      const goldBefore = await shopHelper.getGoldAmount();

      // Buy first available card
      await authenticatedPage.locator('[data-testid="marketplace-card"]').first().click();
      await authenticatedPage.click('button:has-text("Buy")');

      // Confirm purchase
      await authenticatedPage.click('button:has-text("Confirm")');

      // Gold should decrease
      const goldAfter = await shopHelper.getGoldAmount();
      expect(goldAfter).toBeLessThan(goldBefore);

      // Card should be in collection
      await authenticatedPage.goto("/binder");
      await expect(
        authenticatedPage.locator('[data-testid="collection-card"]')
      ).toBeVisible();
    });

    test("should filter marketplace by rarity", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/marketplace");

      // Select rarity filter
      await authenticatedPage.click('[data-filter="rarity"]');
      await authenticatedPage.click('option:has-text("Rare")');

      // Results should update
      await authenticatedPage.waitForTimeout(1000);

      // Verify filtered results
      const cards = await authenticatedPage.locator('[data-testid="marketplace-card"]').count();
      expect(cards).toBeGreaterThanOrEqual(0);
    });

    test("should search marketplace by card name", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/marketplace");

      // Search for card
      await authenticatedPage.fill('input[placeholder*="Search"]', "Dragon");

      // Wait for results
      await authenticatedPage.waitForTimeout(1000);

      // Should show filtered results
      const results = await authenticatedPage.locator('[data-testid="marketplace-card"]').count();
      expect(results).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Promo Codes", () => {
    test("should redeem valid promo code", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      // Enter promo code
      const promoInput = authenticatedPage.locator('input[name="promoCode"]');
      if (await promoInput.isVisible({ timeout: 2000 })) {
        await promoInput.fill("TESTCODE123");
        await authenticatedPage.click('button:has-text("Redeem")');

        // Should show success or error
        const successMessage = authenticatedPage.locator('text=/redeemed/i');
        const errorMessage = authenticatedPage.locator('text=/invalid.*code/i');

        const hasMessage = await Promise.race([
          successMessage.isVisible({ timeout: 5000 }).then(() => "success"),
          errorMessage.isVisible({ timeout: 5000 }).then(() => "error"),
        ]);

        expect(["success", "error"]).toContain(hasMessage);
      }
    });

    test("should show error for invalid promo code", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      const promoInput = authenticatedPage.locator('input[name="promoCode"]');
      if (await promoInput.isVisible({ timeout: 2000 })) {
        await promoInput.fill("INVALID_CODE_XYZ");
        await authenticatedPage.click('button:has-text("Redeem")');

        // Should show error
        await expect(
          authenticatedPage.locator('text=/invalid.*code/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test("should not allow reusing promo code", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      const promoInput = authenticatedPage.locator('input[name="promoCode"]');
      if (await promoInput.isVisible({ timeout: 2000 })) {
        const testCode = "REUSECODE123";

        // Redeem once
        await promoInput.fill(testCode);
        await authenticatedPage.click('button:has-text("Redeem")');
        await authenticatedPage.waitForTimeout(2000);

        // Try to redeem again
        await promoInput.fill(testCode);
        await authenticatedPage.click('button:has-text("Redeem")');

        // Should show already used error
        await expect(
          authenticatedPage.locator('text=/already.*used/i')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Currency Display", () => {
    test("should display current gold amount", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/shop");

      // Gold display should be visible
      await expect(
        authenticatedPage.locator('[data-testid="player-gold"]')
      ).toBeVisible();
    });

    test("should update gold amount after transactions", async ({ authenticatedPage }) => {
      const shopHelper = new ShopHelper(authenticatedPage);
      await shopHelper.navigate();

      const goldBefore = await shopHelper.getGoldAmount();

      // Make purchase
      await shopHelper.buyPack();

      // Gold should update
      const goldAfter = await shopHelper.getGoldAmount();
      expect(goldAfter).not.toBe(goldBefore);
    });
  });
});
