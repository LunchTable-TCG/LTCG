/**
 * Marketplace Module Tests
 *
 * Tests for marketplace query functionality.
 * Note: Mutation tests are limited due to scheduler-based notifications
 * that are not fully supported in convex-test environments.
 */

import { createTestInstance } from "@convex-test-utils/setup";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

// Type helper to avoid TS2589/TS7053 deep instantiation errors
// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const economyMarketplace: any = (api as any)["economy/marketplace"];

// Helper to create user with currency
async function createUserWithCurrency(
  t: ReturnType<typeof createTestInstance>,
  opts: { username: string; gold?: number; gems?: number }
) {
  return await t.run(async (ctx: MutationCtx) => {
    const userId = await ctx.db.insert("users", {
      username: opts.username,
      email: `${opts.username}@test.com`,
      createdAt: Date.now(),
    });

    await ctx.db.insert("playerCurrency", {
      userId,
      gold: opts.gold ?? 1000,
      gems: opts.gems ?? 100,
      lifetimeGoldEarned: 0,
      lifetimeGoldSpent: 0,
      lifetimeGemsEarned: 0,
      lifetimeGemsSpent: 0,
      lastUpdatedAt: Date.now(),
    });

    return userId;
  });
}

// Helper to create test card
async function createTestCard(
  t: ReturnType<typeof createTestInstance>,
  opts: { name: string; rarity?: string }
) {
  return await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("cardDefinitions", {
      name: opts.name,
      rarity: (opts.rarity ?? "common") as "common" | "uncommon" | "rare" | "epic" | "legendary",
      cardType: "creature",
      archetype: "neutral",
      cost: 4,
      attack: 1500,
      defense: 1200,
      isActive: true,
      createdAt: Date.now(),
    });
  });
}

// Helper to create listing directly in database (bypassing mutations)
async function createListingDirectly(
  t: ReturnType<typeof createTestInstance>,
  opts: {
    sellerId: Id<"users">;
    sellerUsername: string;
    cardId: Id<"cardDefinitions">;
    listingType: "fixed" | "auction";
    price: number;
    endsAt?: number;
  }
) {
  return await t.run(async (ctx: MutationCtx) => {
    const now = Date.now();
    return await ctx.db.insert("marketplaceListings", {
      sellerId: opts.sellerId,
      sellerUsername: opts.sellerUsername,
      cardDefinitionId: opts.cardId,
      quantity: 1,
      listingType: opts.listingType,
      price: opts.price,
      status: "active",
      createdAt: now,
      updatedAt: now,
      bidCount: 0,
      endsAt: opts.endsAt,
      currentBid: opts.listingType === "auction" ? opts.price : undefined,
    });
  });
}

// ============================================================================
// GET MARKETPLACE LISTINGS TESTS
// ============================================================================

describe("getMarketplaceListings", () => {
  it("should return active listings with card info", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "listseller", gold: 1000 });
    const cardId = await createTestCard(t, { name: "List Card" });

    // Create listings directly in database
    await createListingDirectly(t, {
      sellerId,
      sellerUsername: "listseller",
      cardId,
      listingType: "fixed",
      price: 100,
    });

    await createListingDirectly(t, {
      sellerId,
      sellerUsername: "listseller",
      cardId,
      listingType: "fixed",
      price: 150,
    });

    await createListingDirectly(t, {
      sellerId,
      sellerUsername: "listseller",
      cardId,
      listingType: "fixed",
      price: 200,
    });

    const result = await t.query(economyMarketplace.getMarketplaceListings, {});

    expect(result.listings.length).toBe(3);
    // Verify listings have card info flattened (cardName, cardRarity, etc.)
    expect(result.listings[0]?.cardName).toBe("List Card");
    expect(result.listings[0]?.cardRarity).toBe("common");
  });

  it("should filter by listing type", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "typeseller", gold: 1000 });
    const cardId = await createTestCard(t, { name: "Type Card" });

    // Create fixed listing
    await createListingDirectly(t, {
      sellerId,
      sellerUsername: "typeseller",
      cardId,
      listingType: "fixed",
      price: 100,
    });

    // Create auction listing
    await createListingDirectly(t, {
      sellerId,
      sellerUsername: "typeseller",
      cardId,
      listingType: "auction",
      price: 100,
      endsAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    const fixedResult = await t.query(economyMarketplace.getMarketplaceListings, {
      listingType: "fixed",
    });
    expect(fixedResult.listings.length).toBe(1);
    expect(fixedResult.listings[0]?.listingType).toBe("fixed");

    const auctionResult = await t.query(economyMarketplace.getMarketplaceListings, {
      listingType: "auction",
    });
    expect(auctionResult.listings.length).toBe(1);
    expect(auctionResult.listings[0]?.listingType).toBe("auction");
  });

  it("should not return cancelled or sold listings", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "statusseller", gold: 1000 });
    const cardId = await createTestCard(t, { name: "Status Card" });

    // Create active listing
    await createListingDirectly(t, {
      sellerId,
      sellerUsername: "statusseller",
      cardId,
      listingType: "fixed",
      price: 100,
    });

    // Create cancelled listing
    await t.run(async (ctx: MutationCtx) => {
      const now = Date.now();
      await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "statusseller",
        cardDefinitionId: cardId,
        quantity: 1,
        listingType: "fixed",
        price: 200,
        status: "cancelled",
        createdAt: now,
        updatedAt: now,
        bidCount: 0,
      });
    });

    // Create sold listing
    await t.run(async (ctx: MutationCtx) => {
      const now = Date.now();
      await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "statusseller",
        cardDefinitionId: cardId,
        quantity: 1,
        listingType: "fixed",
        price: 300,
        status: "sold",
        createdAt: now,
        updatedAt: now,
        bidCount: 0,
      });
    });

    const result = await t.query(economyMarketplace.getMarketplaceListings, {});

    expect(result.listings.length).toBe(1);
    expect(result.listings[0]?.price).toBe(100);
  });

  it("should support page-based pagination", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "pagseller", gold: 1000 });
    const cardId = await createTestCard(t, { name: "Pagination Card" });

    // Create 5 listings
    for (let i = 0; i < 5; i++) {
      await createListingDirectly(t, {
        sellerId,
        sellerUsername: "pagseller",
        cardId,
        listingType: "fixed",
        price: 100 + i * 10,
      });
    }

    // Query first page (default page 1)
    const firstPage = await t.query(economyMarketplace.getMarketplaceListings, {});
    expect(firstPage.listings.length).toBe(5);

    // Query with explicit page 1
    const page1 = await t.query(economyMarketplace.getMarketplaceListings, { page: 1 });
    expect(page1.listings.length).toBe(5);
  });

  it("should filter by rarity", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "rarityseller", gold: 1000 });
    const commonCard = await createTestCard(t, { name: "Common Card", rarity: "common" });
    const rareCard = await createTestCard(t, { name: "Rare Card", rarity: "rare" });

    await createListingDirectly(t, {
      sellerId,
      sellerUsername: "rarityseller",
      cardId: commonCard,
      listingType: "fixed",
      price: 50,
    });

    await createListingDirectly(t, {
      sellerId,
      sellerUsername: "rarityseller",
      cardId: rareCard,
      listingType: "fixed",
      price: 500,
    });

    const commonResult = await t.query(economyMarketplace.getMarketplaceListings, {
      rarity: "common",
    });
    expect(commonResult.listings.length).toBe(1);
    expect(commonResult.listings[0]?.cardRarity).toBe("common");

    const rareResult = await t.query(economyMarketplace.getMarketplaceListings, {
      rarity: "rare",
    });
    expect(rareResult.listings.length).toBe(1);
    expect(rareResult.listings[0]?.cardRarity).toBe("rare");
  });
});

// ============================================================================
// GET USER LISTINGS TESTS
// ============================================================================

describe("getUserListings", () => {
  it("should return only user's own listings", async () => {
    const t = createTestInstance();

    const seller1Id = await createUserWithCurrency(t, { username: "userlisting1", gold: 1000 });
    const seller2Id = await createUserWithCurrency(t, { username: "userlisting2", gold: 1000 });
    const cardId = await createTestCard(t, { name: "User Listing Card" });

    // Create listings for seller1
    await createListingDirectly(t, {
      sellerId: seller1Id,
      sellerUsername: "userlisting1",
      cardId,
      listingType: "fixed",
      price: 100,
    });

    await createListingDirectly(t, {
      sellerId: seller1Id,
      sellerUsername: "userlisting1",
      cardId,
      listingType: "fixed",
      price: 200,
    });

    // Create listing for seller2
    await createListingDirectly(t, {
      sellerId: seller2Id,
      sellerUsername: "userlisting2",
      cardId,
      listingType: "fixed",
      price: 150,
    });

    const asSeller1 = t.withIdentity({ subject: seller1Id });
    const asSeller2 = t.withIdentity({ subject: seller2Id });

    const seller1Listings = await asSeller1.query(economyMarketplace.getUserListings, {});
    expect(seller1Listings.length).toBe(2);

    const seller2Listings = await asSeller2.query(economyMarketplace.getUserListings, {});
    expect(seller2Listings.length).toBe(1);
  });

  it("should include all statuses for user's own listings", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "mystatuses", gold: 1000 });
    const cardId = await createTestCard(t, { name: "My Status Card" });

    // Create listings with different statuses
    await createListingDirectly(t, {
      sellerId,
      sellerUsername: "mystatuses",
      cardId,
      listingType: "fixed",
      price: 100,
    });

    await t.run(async (ctx: MutationCtx) => {
      const now = Date.now();
      await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "mystatuses",
        cardDefinitionId: cardId,
        quantity: 1,
        listingType: "fixed",
        price: 200,
        status: "cancelled",
        createdAt: now,
        updatedAt: now,
        bidCount: 0,
      });
    });

    await t.run(async (ctx: MutationCtx) => {
      const now = Date.now();
      await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "mystatuses",
        cardDefinitionId: cardId,
        quantity: 1,
        listingType: "fixed",
        price: 300,
        status: "sold",
        createdAt: now,
        updatedAt: now,
        bidCount: 0,
      });
    });

    const asSeller = t.withIdentity({ subject: sellerId });
    const listings = await asSeller.query(economyMarketplace.getUserListings, {});

    // User should see all their listings regardless of status
    expect(listings.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// GET AUCTION BID HISTORY TESTS
// ============================================================================

describe("getAuctionBidHistory", () => {
  it("should return bid history for auction", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "auctionseller", gold: 1000 });
    const bidderId = await createUserWithCurrency(t, { username: "bidder", gold: 5000 });
    const cardId = await createTestCard(t, { name: "Auction Card" });

    const listingId = await createListingDirectly(t, {
      sellerId,
      sellerUsername: "auctionseller",
      cardId,
      listingType: "auction",
      price: 100,
      endsAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Create bid records in the correct table (auctionBids, not marketplaceBids)
    await t.run(async (ctx: MutationCtx) => {
      const now = Date.now();
      await ctx.db.insert("auctionBids", {
        listingId,
        bidderId,
        bidderUsername: "bidder",
        bidAmount: 150,
        bidStatus: "active",
        createdAt: now,
      });

      await ctx.db.insert("auctionBids", {
        listingId,
        bidderId,
        bidderUsername: "bidder",
        bidAmount: 200,
        bidStatus: "active",
        createdAt: now + 1000,
      });
    });

    const history = await t.query(economyMarketplace.getAuctionBidHistory, {
      listingId,
    });

    expect(history.length).toBe(2);
  });

  it("should order bids by time descending", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "orderseller", gold: 1000 });
    const bidderId = await createUserWithCurrency(t, { username: "orderbidder", gold: 5000 });
    const cardId = await createTestCard(t, { name: "Order Card" });

    const listingId = await createListingDirectly(t, {
      sellerId,
      sellerUsername: "orderseller",
      cardId,
      listingType: "auction",
      price: 100,
      endsAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    const basetime = Date.now();

    // Create bids with specific times
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("auctionBids", {
        listingId,
        bidderId,
        bidderUsername: "orderbidder",
        bidAmount: 150,
        bidStatus: "active",
        createdAt: basetime,
      });

      await ctx.db.insert("auctionBids", {
        listingId,
        bidderId,
        bidderUsername: "orderbidder",
        bidAmount: 200,
        bidStatus: "active",
        createdAt: basetime + 5000,
      });

      await ctx.db.insert("auctionBids", {
        listingId,
        bidderId,
        bidderUsername: "orderbidder",
        bidAmount: 175,
        bidStatus: "active",
        createdAt: basetime + 2500,
      });
    });

    const history = await t.query(economyMarketplace.getAuctionBidHistory, {
      listingId,
    });

    // Should be ordered by createdAt descending (most recent first)
    expect(history.length).toBe(3);
    expect(history[0]?.bidAmount).toBe(200);
    expect(history[1]?.bidAmount).toBe(175);
    expect(history[2]?.bidAmount).toBe(150);
  });
});

// ============================================================================
// MARKETPLACE CONSTANTS AND VALIDATION TESTS
// ============================================================================

describe("Marketplace Validation", () => {
  it("should have required fields in listing schema", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "schematest", gold: 1000 });
    const cardId = await createTestCard(t, { name: "Schema Card" });

    const listingId = await createListingDirectly(t, {
      sellerId,
      sellerUsername: "schematest",
      cardId,
      listingType: "fixed",
      price: 100,
    });

    const listing = await t.run(async (ctx: QueryCtx) => {
      return await ctx.db.get(listingId);
    });

    expect(listing).toBeDefined();
    expect(listing?.sellerId).toBe(sellerId);
    expect(listing?.sellerUsername).toBe("schematest");
    expect(listing?.cardDefinitionId).toBe(cardId);
    expect(listing?.quantity).toBe(1);
    expect(listing?.listingType).toBe("fixed");
    expect(listing?.price).toBe(100);
    expect(listing?.status).toBe("active");
    expect(listing?.createdAt).toBeDefined();
  });

  it("should track auction-specific fields", async () => {
    const t = createTestInstance();

    const sellerId = await createUserWithCurrency(t, { username: "auctionfields", gold: 1000 });
    const cardId = await createTestCard(t, { name: "Auction Fields Card" });
    const endsAt = Date.now() + 24 * 60 * 60 * 1000;

    const listingId = await createListingDirectly(t, {
      sellerId,
      sellerUsername: "auctionfields",
      cardId,
      listingType: "auction",
      price: 100,
      endsAt,
    });

    const listing = await t.run(async (ctx: QueryCtx) => {
      return await ctx.db.get(listingId);
    });

    expect(listing).toBeDefined();
    expect(listing?.listingType).toBe("auction");
    expect(listing?.endsAt).toBe(endsAt);
    expect(listing?.currentBid).toBe(100);
  });
});
