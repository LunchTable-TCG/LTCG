import { type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ShopPage extends BasePage {
  readonly url = "/shop";

  // Main container
  get container(): Locator {
    return this.page.locator('[data-testid="shop"]');
  }

  // Currency display
  get goldBalance(): Locator {
    return this.page.locator('[data-testid="player-gold"]');
  }

  get gemsBalance(): Locator {
    // Gems balance doesn't have data-testid, use structure: purple container with purple text
    return this.page.locator(".bg-purple-500\\/20 .text-purple-300");
  }

  // Tab navigation
  get shopTab(): Locator {
    return this.page.getByRole("button", { name: /^Shop/i });
  }

  get marketplaceTab(): Locator {
    return this.page.getByRole("button", { name: /^Marketplace/i });
  }

  get myListingsTab(): Locator {
    return this.page.getByRole("button", { name: /^My Listings/i });
  }

  // Shop items
  get packProducts(): Locator {
    return this.page.locator('[data-testid="pack-product"]');
  }

  getPackProductByIndex(index: number): Locator {
    return this.packProducts.nth(index);
  }

  getPackProductByName(name: string): Locator {
    return this.page.locator('[data-testid="pack-product"]', { hasText: name });
  }

  // Marketplace listings
  get marketplaceCards(): Locator {
    return this.page.locator('[data-testid="marketplace-card"]');
  }

  get tokenMarketplaceCards(): Locator {
    return this.page.locator('[data-testid="token-marketplace-card"]');
  }

  getMarketplaceCardByName(cardName: string): Locator {
    return this.page.locator('[data-testid="marketplace-card"]', { hasText: cardName });
  }

  // Purchase dialog (appears after clicking a pack)
  get purchaseDialog(): Locator {
    return this.page.locator(".fixed.inset-0.z-50", { hasText: "Purchase Item" });
  }

  get payWithGoldButton(): Locator {
    return this.purchaseDialog.getByRole("button", { name: /Pay with Gold/i });
  }

  get payWithGemsButton(): Locator {
    return this.purchaseDialog.getByRole("button", { name: /Pay with Gems/i });
  }

  get closePurchaseDialogButton(): Locator {
    return this.purchaseDialog.getByRole("button", { name: /close/i }).first();
  }

  // Marketplace purchase dialog
  get marketplacePurchaseDialog(): Locator {
    return this.page.locator(".fixed.inset-0.z-50", { hasText: /Purchase|Place Bid/i });
  }

  get buyNowButton(): Locator {
    return this.marketplacePurchaseDialog.getByRole("button", { name: /Buy Now/i });
  }

  get placeBidButton(): Locator {
    return this.marketplacePurchaseDialog.getByRole("button", { name: /Place Bid/i });
  }

  get bidInput(): Locator {
    return this.marketplacePurchaseDialog.getByPlaceholder("Enter bid amount");
  }

  // Currency selector for marketplace
  getCurrencySelector(type: "gold" | "token"): Locator {
    return this.page.getByRole("button", { name: new RegExp(type, "i") });
  }

  // Search and filters
  get searchInput(): Locator {
    return this.page.getByPlaceholder("Search cards...");
  }

  get raritySelect(): Locator {
    return this.page.locator("select", { hasText: /All Rarities/i });
  }

  get typeSelect(): Locator {
    return this.page.locator("select", { hasText: /All Types/i });
  }

  get sortSelect(): Locator {
    return this.page.locator("select", { hasText: /Newest/i });
  }

  // List card button
  get listCardButton(): Locator {
    return this.page.getByRole("button", { name: /List Card/i });
  }

  // My listings - cancel button
  getCancelListingButton(cardName: string): Locator {
    return this.page
      .locator(".p-4.rounded-xl", { hasText: cardName })
      .getByRole("button", { name: /Cancel/i });
  }

  // Actions
  async selectShopTab() {
    await this.shopTab.click();
    await this.page.waitForTimeout(500); // Wait for tab transition
  }

  async selectMarketplaceTab() {
    await this.marketplaceTab.click();
    await this.page.waitForTimeout(500);
  }

  async selectMyListingsTab() {
    await this.myListingsTab.click();
    await this.page.waitForTimeout(500);
  }

  async buyPackWithGold(packIndex = 0) {
    const pack = this.getPackProductByIndex(packIndex);
    await pack.locator('[data-testid="pack-price"]').first().click();
    await expect(this.purchaseDialog).toBeVisible({ timeout: 5000 });
    await this.payWithGoldButton.click();
    // Wait for redirect to opening page
    await this.page.waitForURL(/\/shop\/open/, { timeout: 10000 });
  }

  async buyPackWithGems(packIndex = 0) {
    const pack = this.getPackProductByIndex(packIndex);
    await pack.locator('[data-testid="pack-price"]').last().click();
    await expect(this.purchaseDialog).toBeVisible({ timeout: 5000 });
    await this.payWithGemsButton.click();
    await this.page.waitForURL(/\/shop\/open/, { timeout: 10000 });
  }

  async openPurchaseDialog(packIndex = 0) {
    const pack = this.getPackProductByIndex(packIndex);
    await pack.locator('[data-testid="pack-price"]').first().click();
    await expect(this.purchaseDialog).toBeVisible({ timeout: 5000 });
  }

  async closePurchaseDialog() {
    await this.closePurchaseDialogButton.click();
    await expect(this.purchaseDialog).not.toBeVisible();
  }

  async buyMarketplaceListing(cardName: string) {
    const card = this.getMarketplaceCardByName(cardName);
    await card.click();
    await expect(this.marketplacePurchaseDialog).toBeVisible({ timeout: 5000 });
    await this.buyNowButton.click();
    await expect(this.marketplacePurchaseDialog).not.toBeVisible({ timeout: 5000 });
  }

  async placeBidOnAuction(cardName: string, bidAmount: number) {
    const card = this.getMarketplaceCardByName(cardName);
    await card.click();
    await expect(this.marketplacePurchaseDialog).toBeVisible({ timeout: 5000 });
    await this.bidInput.fill(bidAmount.toString());
    await this.placeBidButton.click();
    await expect(this.marketplacePurchaseDialog).not.toBeVisible({ timeout: 5000 });
  }

  async searchMarketplace(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for search to filter
  }

  async filterByRarity(rarity: "common" | "uncommon" | "rare" | "epic" | "legendary") {
    await this.raritySelect.selectOption(rarity);
    await this.page.waitForTimeout(500);
  }

  async filterByType(type: "fixed" | "auction") {
    await this.typeSelect.selectOption(type);
    await this.page.waitForTimeout(500);
  }

  async sortBy(sortType: "newest" | "price_asc" | "price_desc") {
    await this.sortSelect.selectOption(sortType);
    await this.page.waitForTimeout(500);
  }

  async selectCurrencyFilter(type: "gold" | "token") {
    await this.getCurrencySelector(type).click();
    await this.page.waitForTimeout(500);
  }

  async cancelListing(cardName: string) {
    await this.getCancelListingButton(cardName).click();
    // Wait for listing to be removed
    await this.page.waitForTimeout(1000);
  }

  // Helpers to get amounts
  async getGoldAmount(): Promise<number> {
    const text = await this.goldBalance.textContent();
    // Remove commas and parse
    return Number.parseInt(text?.replace(/,/g, "") || "0", 10);
  }

  async getGemsAmount(): Promise<number> {
    const text = await this.gemsBalance.textContent();
    return Number.parseInt(text?.replace(/,/g, "") || "0", 10);
  }

  async getPackCount(): Promise<number> {
    return await this.packProducts.count();
  }

  async getMarketplaceListingCount(): Promise<number> {
    return await this.marketplaceCards.count();
  }

  async getTokenMarketplaceListingCount(): Promise<number> {
    return await this.tokenMarketplaceCards.count();
  }

  // Assertions
  async expectGoldBalance(amount: number) {
    await expect(this.goldBalance).toContainText(amount.toLocaleString());
  }

  async expectGemsBalance(amount: number) {
    await expect(this.gemsBalance).toContainText(amount.toLocaleString());
  }

  async expectGoldLessThan(amount: number) {
    const current = await this.getGoldAmount();
    expect(current).toBeLessThan(amount);
  }

  async expectGoldGreaterThan(amount: number) {
    const current = await this.getGoldAmount();
    expect(current).toBeGreaterThan(amount);
  }

  async expectPacksAvailable() {
    await expect(this.packProducts.first()).toBeVisible();
  }

  async expectMarketplaceListings(count: number) {
    await expect(this.marketplaceCards).toHaveCount(count);
  }

  async expectNoMarketplaceListings() {
    await expect(this.page.getByText("No Listings Found")).toBeVisible();
  }

  async expectPurchaseDialogVisible() {
    await expect(this.purchaseDialog).toBeVisible();
  }

  async expectPurchaseDialogNotVisible() {
    await expect(this.purchaseDialog).not.toBeVisible();
  }

  async expectMarketplacePurchaseDialogVisible() {
    await expect(this.marketplacePurchaseDialog).toBeVisible();
  }
}
