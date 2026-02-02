/**
 * Economy E2E Tests
 *
 * Tests shop and currency including:
 * - Viewing shop
 * - Currency display
 * - Purchasing packs
 * - Opening packs
 * - Marketplace (if available)
 */

import { expect, test } from "./setup/fixtures";

test.describe("Economy", () => {
  test.describe("Shop Page", () => {
    test("shop page loads correctly", async ({ shopPage }) => {
      await shopPage.navigate();
      await expect(shopPage.page).toHaveURL(/shop/);
    });

    test("displays gold balance", async ({ shopPage }) => {
      await shopPage.navigate();

      const gold = await shopPage.getGoldAmount();
      expect(gold).toBeGreaterThanOrEqual(0);
    });

    test("displays gems balance", async ({ shopPage }) => {
      await shopPage.navigate();

      const gems = await shopPage.getGemsAmount();
      expect(gems).toBeGreaterThanOrEqual(0);
    });

    test("displays available packs", async ({ shopPage }) => {
      await shopPage.navigate();

      // Should see at least one pack product
      const packCount = await shopPage.getPackCount();
      expect(packCount).toBeGreaterThan(0);
    });
  });

  test.describe("Pack Purchasing", () => {
    test("can view pack details", async ({ shopPage }) => {
      await shopPage.navigate();

      // Packs should show price and be visible
      await shopPage.expectPacksAvailable();
    });

    test("can open purchase dialog", async ({ shopPage }) => {
      await shopPage.navigate();

      await shopPage.openPurchaseDialog(0);
      await shopPage.expectPurchaseDialogVisible();
    });

    test("can close purchase dialog", async ({ shopPage }) => {
      await shopPage.navigate();

      await shopPage.openPurchaseDialog(0);
      await shopPage.expectPurchaseDialogVisible();

      await shopPage.closePurchaseDialog();
      await shopPage.expectPurchaseDialogNotVisible();
    });

    test("can purchase pack with gold", async ({ shopPage }) => {
      await shopPage.navigate();

      const goldBefore = await shopPage.getGoldAmount();

      // Only attempt purchase if user has enough gold (standard pack ~100 gold)
      if (goldBefore >= 100) {
        await shopPage.buyPackWithGold(0);

        // Should redirect to pack opening page
        await expect(shopPage.page).toHaveURL(/\/shop\/open/);
      } else {
        // Skip test if insufficient funds
        test.skip();
      }
    });

    test("can purchase pack with gems", async ({ shopPage }) => {
      await shopPage.navigate();

      const gemsBefore = await shopPage.getGemsAmount();

      // Only attempt purchase if user has enough gems
      if (gemsBefore >= 10) {
        await shopPage.buyPackWithGems(0);

        // Should redirect to pack opening page
        await expect(shopPage.page).toHaveURL(/\/shop\/open/);
      } else {
        // Skip test if insufficient funds
        test.skip();
      }
    });
  });

  test.describe("Pack Opening", () => {
    test("pack opening page displays pack info", async ({ shopPage }) => {
      await shopPage.navigate();

      const goldBefore = await shopPage.getGoldAmount();

      if (goldBefore >= 100) {
        await shopPage.buyPackWithGold(0);

        // Should be on opening page
        await expect(shopPage.page).toHaveURL(/\/shop\/open/);

        // Should see pack display
        const packImage = shopPage.page.locator('img[alt*="Pack"]');
        await expect(packImage).toBeVisible();
      } else {
        test.skip();
      }
    });

    test("can open pack and see revealing phase", async ({ shopPage }) => {
      await shopPage.navigate();

      const goldBefore = await shopPage.getGoldAmount();

      if (goldBefore >= 100) {
        await shopPage.buyPackWithGold(0);

        // Click "Open Pack" button
        const openButton = shopPage.page.getByRole("button", {
          name: /Open Pack/i,
        });
        await openButton.click();

        // Wait for video animation (or skip on error)
        await shopPage.page.waitForTimeout(3000);

        // Should see pack results grid
        const packResults = shopPage.page.locator('[data-testid="pack-results"]');
        await expect(packResults).toBeVisible({ timeout: 10000 });
      } else {
        test.skip();
      }
    });

    test("pack results show cards received", async ({ shopPage }) => {
      await shopPage.navigate();

      const goldBefore = await shopPage.getGoldAmount();

      if (goldBefore >= 100) {
        await shopPage.buyPackWithGold(0);

        // Open pack
        const openButton = shopPage.page.getByRole("button", {
          name: /Open Pack/i,
        });
        await openButton.click();
        await shopPage.page.waitForTimeout(3000);

        // Should show cards (5 per pack typically)
        const packCards = shopPage.page.locator('[data-testid="pack-card"]');
        const cardCount = await packCards.count();
        expect(cardCount).toBeGreaterThan(0);
        expect(cardCount).toBeLessThanOrEqual(10); // Reasonable upper bound
      } else {
        test.skip();
      }
    });

    test("can reveal all cards at once", async ({ shopPage }) => {
      await shopPage.navigate();

      const goldBefore = await shopPage.getGoldAmount();

      if (goldBefore >= 100) {
        await shopPage.buyPackWithGold(0);

        // Open pack
        const openButton = shopPage.page.getByRole("button", {
          name: /Open Pack/i,
        });
        await openButton.click();
        await shopPage.page.waitForTimeout(3000);

        // Click "Reveal All Cards" button
        const revealAllButton = shopPage.page.getByRole("button", {
          name: /Reveal All Cards/i,
        });

        // Button may not be visible if cards auto-reveal
        const isVisible = await revealAllButton.isVisible().catch(() => false);

        if (isVisible) {
          await revealAllButton.click();

          // Should transition to complete phase
          await expect(shopPage.page.getByText("Pack Opened Successfully")).toBeVisible({
            timeout: 5000,
          });
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe("Currency Updates", () => {
    test("gold updates after purchase", async ({ shopPage }) => {
      await shopPage.navigate();

      const goldBefore = await shopPage.getGoldAmount();

      if (goldBefore >= 100) {
        await shopPage.buyPackWithGold(0);

        // Navigate back to shop
        await shopPage.navigate();

        // Gold should be decreased
        const goldAfter = await shopPage.getGoldAmount();
        expect(goldAfter).toBeLessThan(goldBefore);
        expect(goldBefore - goldAfter).toBeGreaterThanOrEqual(50); // Minimum pack cost
      } else {
        test.skip();
      }
    });

    test("gems update after purchase", async ({ shopPage }) => {
      await shopPage.navigate();

      const gemsBefore = await shopPage.getGemsAmount();

      if (gemsBefore >= 10) {
        await shopPage.buyPackWithGems(0);

        // Navigate back to shop
        await shopPage.navigate();

        // Gems should be decreased
        const gemsAfter = await shopPage.getGemsAmount();
        expect(gemsAfter).toBeLessThan(gemsBefore);
      } else {
        test.skip();
      }
    });
  });

  test.describe("Marketplace", () => {
    test("can view marketplace tab", async ({ shopPage }) => {
      await shopPage.navigate();

      await shopPage.selectMarketplaceTab();

      // Should show marketplace content (may be empty)
      const marketplaceContent = shopPage.page.locator(
        '[data-testid="marketplace-card"], .text-\\[\\#a89f94\\]'
      );
      await expect(marketplaceContent.first()).toBeVisible();
    });

    test("can view my listings tab", async ({ shopPage }) => {
      await shopPage.navigate();

      await shopPage.selectMyListingsTab();

      // Should show my listings content (may be empty)
      const listingsContent = shopPage.page.locator(
        'button:has-text("List Card"), .text-\\[\\#a89f94\\]'
      );
      await expect(listingsContent.first()).toBeVisible();
    });

    test("can switch between shop tabs", async ({ shopPage }) => {
      await shopPage.navigate();

      // Go to marketplace
      await shopPage.selectMarketplaceTab();
      await shopPage.page.waitForTimeout(500);

      // Go to my listings
      await shopPage.selectMyListingsTab();
      await shopPage.page.waitForTimeout(500);

      // Back to shop
      await shopPage.selectShopTab();
      await shopPage.expectPacksAvailable();
    });
  });
});
