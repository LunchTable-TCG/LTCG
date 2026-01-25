/**
 * Tests for marketplace.ts
 *
 * Tests P2P trading functionality including:
 * - Creating fixed-price and auction listings
 * - Buying listings
 * - Bidding on auctions
 * - Canceling listings
 * - Platform fees
 */

import { describe, it, expect, vi } from "vitest";
import { createTestInstance } from "./test.setup";
import type { TestMutationCtx } from "./test.setup";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";


describe("createListing", () => {
  it("should create fixed-price listing", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Trade Card",
        rarity: "rare",
        archetype: "fire",
        cardType: "creature",
        cost: 3,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: uid,
        cardDefinitionId: cid,
        quantity: 5,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "seller-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid];
    });

    const result = await t.mutation(api.marketplace.createListing, {
      token: "seller-token",
      cardDefinitionId: cardDefId,
      quantity: 2,
      listingType: "fixed",
      price: 500,
    });

    expect(result.success).toBe(true);
    expect(result.listingId).toBeDefined();

    // Verify cards were locked
    const userCards = await t.query(api.cards.getUserCards, {
      token: "seller-token",
    });
    expect(userCards![0]!.owned).toBe(3); // 5 - 2 listed
  });

  it("should create auction listing with duration", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "auctioneer",
        email: "auction@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Auction Card",
        rarity: "epic",
        archetype: "water",
        cardType: "spell",
        cost: 4,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: uid,
        cardDefinitionId: cid,
        quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "auction-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid];
    });

    const result = await t.mutation(api.marketplace.createListing, {
      token: "auction-token",
      cardDefinitionId: cardDefId,
      quantity: 1,
      listingType: "auction",
      price: 100, // Starting bid
      duration: 48, // 48 hours
    });

    expect(result.success).toBe(true);

    // Verify auction has end time
    const listing = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.get(result.listingId!);
    });

    expect(listing?.endsAt).toBeDefined();
    expect(listing?.listingType).toBe("auction");
  });

  it("should reject listing with price below minimum", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "cheapuser",
        email: "cheap@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Cheap Card",
        rarity: "common",
        archetype: "earth",
        cardType: "trap",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: uid,
        cardDefinitionId: cid,
        quantity: 10,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "cheap-token",
        expiresAt: Date.now() + 3600000,
      });
    });

    const cardDefId = await t.run(async (ctx: TestMutationCtx) => {
      return (await ctx.db.query("cardDefinitions").first())?._id!;
    });

    await expect(
      t.mutation(api.marketplace.createListing, {
        token: "cheap-token",
        cardDefinitionId: cardDefId,
        quantity: 1,
        listingType: "fixed",
        price: 5, // Below minimum of 10
      })
    ).rejects.toThrowError("Minimum price is");
  });

  it("should reject listing when user doesn't own card", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "faker",
        email: "fake@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Unowned Card",
        rarity: "legendary",
        archetype: "wind",
        cardType: "equipment",
        cost: 5,
        isActive: true,
        createdAt: Date.now(),
      });

      // Don't give user the card

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "faker-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid];
    });

    await expect(
      t.mutation(api.marketplace.createListing, {
        token: "faker-token",
        cardDefinitionId: cardDefId,
        quantity: 1,
        listingType: "fixed",
        price: 1000,
      })
    ).rejects.toThrowError("You don't own enough of this card");
  });
});

describe("cancelListing", () => {
  it("should cancel listing and return cards", async () => {
    const t = createTestInstance();

    const [userId, cardDefId, listingId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "canceler",
        email: "cancel@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Cancel Card",
        rarity: "uncommon",
        archetype: "fire",
        cardType: "creature",
        cost: 2,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: uid,
        cardDefinitionId: cid,
        quantity: 5,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "cancel-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid, null];
    });

    // Create listing
    const createResult = await t.mutation(api.marketplace.createListing, {
      token: "cancel-token",
      cardDefinitionId: cardDefId,
      quantity: 3,
      listingType: "fixed",
      price: 300,
    });

    // Cancel listing
    const cancelResult = await t.mutation(api.marketplace.cancelListing, {
      token: "cancel-token",
      listingId: createResult.listingId!,
    });

    expect(cancelResult.success).toBe(true);

    // Verify cards returned
    const userCards = await t.query(api.cards.getUserCards, {
      token: "cancel-token",
    });
    expect(userCards![0]!.owned).toBe(5); // Back to original 5
  });

  it("should reject canceling someone else's listing", async () => {
    const t = createTestInstance();

    const [sellerId, buyerId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@example.com",
        createdAt: Date.now(),
      });

      const bid = await ctx.db.insert("users", {
        username: "buyer",
        email: "buyer@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Protected Card",
        rarity: "rare",
        archetype: "water",
        cardType: "spell",
        cost: 3,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: sid,
        cardDefinitionId: cid,
        quantity: 2,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: sid,
        token: "seller-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("sessions", {
        userId: bid,
        token: "buyer-token",
        expiresAt: Date.now() + 3600000,
      });

      return [sid, bid, cid];
    });

    // Seller creates listing
    const createResult = await t.mutation(api.marketplace.createListing, {
      token: "seller-token",
      cardDefinitionId: cardDefId,
      quantity: 1,
      listingType: "fixed",
      price: 200,
    });

    // Buyer tries to cancel
    await expect(
      t.mutation(api.marketplace.cancelListing, {
        token: "buyer-token",
        listingId: createResult.listingId!,
      })
    ).rejects.toThrowError("You can only cancel your own listings");
  });
});

describe("buyNow", () => {
  it("should successfully buy fixed-price listing", async () => {
    const t = createTestInstance();

    const [sellerId, buyerId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@example.com",
        createdAt: Date.now(),
      });

      const bid = await ctx.db.insert("users", {
        username: "buyer",
        email: "buyer@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Trade Card",
        rarity: "epic",
        archetype: "earth",
        cardType: "trap",
        cost: 4,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: sid,
        cardDefinitionId: cid,
        quantity: 3,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: sid,
        gold: 0,
        gems: 0,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: bid,
        gold: 1000,
        gems: 100,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: sid,
        token: "seller-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("sessions", {
        userId: bid,
        token: "buyer-token",
        expiresAt: Date.now() + 3600000,
      });

      return [sid, bid, cid];
    });

    // Seller creates listing
    const listing = await t.mutation(api.marketplace.createListing, {
      token: "seller-token",
      cardDefinitionId: cardDefId,
      quantity: 2,
      listingType: "fixed",
      price: 400,
    });

    // Buyer purchases
    const purchase = await t.mutation(api.marketplace.buyNow, {
      token: "buyer-token",
      listingId: listing.listingId!,
    });

    expect(purchase.success).toBe(true);
    expect(purchase.price).toBe(400);
    expect(purchase.platformFee).toBe(20); // 5% of 400
    expect(purchase.totalCost).toBe(420); // 400 + 20

    // Verify buyer received cards
    const buyerCards = await t.query(api.cards.getUserCards, {
      token: "buyer-token",
    });
    expect(buyerCards.length).toBe(1);
    expect(buyerCards![0]!.owned).toBe(2);

    // Verify seller received gold
    const sellerBalance = await t.query(api.economy.getPlayerBalance, {
      token: "seller-token",
    });
    expect(sellerBalance.gold).toBe(400);

    // Verify buyer paid gold + fee
    const buyerBalance = await t.query(api.economy.getPlayerBalance, {
      token: "buyer-token",
    });
    expect(buyerBalance.gold).toBe(580); // 1000 - 420
  });

  it("should reject buying own listing", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "selfseller",
        email: "self@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Self Card",
        rarity: "common",
        archetype: "fire",
        cardType: "creature",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: uid,
        cardDefinitionId: cid,
        quantity: 5,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "self-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid];
    });

    const listing = await t.mutation(api.marketplace.createListing, {
      token: "self-token",
      cardDefinitionId: cardDefId,
      quantity: 1,
      listingType: "fixed",
      price: 100,
    });

    await expect(
      t.mutation(api.marketplace.buyNow, {
        token: "self-token",
        listingId: listing.listingId!,
      })
    ).rejects.toThrowError("You cannot buy your own listing");
  });
});

describe("placeBid", () => {
  it("should place bid on auction", async () => {
    const t = createTestInstance();

    const [sellerId, bidderId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "auctioneer",
        email: "auction@example.com",
        createdAt: Date.now(),
      });

      const bid = await ctx.db.insert("users", {
        username: "bidder",
        email: "bidder@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Auction Card",
        rarity: "legendary",
        archetype: "neutral",
        cardType: "equipment",
        cost: 5,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: sid,
        cardDefinitionId: cid,
        quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: bid,
        gold: 1000,
        gems: 100,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: sid,
        token: "auction-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("sessions", {
        userId: bid,
        token: "bidder-token",
        expiresAt: Date.now() + 3600000,
      });

      return [sid, bid, cid];
    });

    // Create auction
    const listing = await t.mutation(api.marketplace.createListing, {
      token: "auction-token",
      cardDefinitionId: cardDefId,
      quantity: 1,
      listingType: "auction",
      price: 500,
      duration: 24,
    });

    // Place bid
    const bidResult = await t.mutation(api.marketplace.placeBid, {
      token: "bidder-token",
      listingId: listing.listingId!,
      bidAmount: 525, // Must be at least 5% higher
    });

    expect(bidResult.success).toBe(true);
    expect(bidResult.currentBid).toBe(525);

    // Verify gold was locked
    const balance = await t.query(api.economy.getPlayerBalance, {
      token: "bidder-token",
    });
    expect(balance.gold).toBe(475); // 1000 - 525
  });

  it("should refund previous bidder when outbid", async () => {
    const t = createTestInstance();

    const [sellerId, bidder1Id, bidder2Id, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@example.com",
        createdAt: Date.now(),
      });

      const b1 = await ctx.db.insert("users", {
        username: "bidder1",
        email: "bidder1@example.com",
        createdAt: Date.now(),
      });

      const b2 = await ctx.db.insert("users", {
        username: "bidder2",
        email: "bidder2@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Contested Card",
        rarity: "epic",
        archetype: "wind",
        cardType: "spell",
        cost: 4,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: sid,
        cardDefinitionId: cid,
        quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: b1,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: b2,
        gold: 1500,
        gems: 0,
        lifetimeGoldEarned: 1500,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: sid,
        token: "seller-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("sessions", {
        userId: b1,
        token: "bidder1-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("sessions", {
        userId: b2,
        token: "bidder2-token",
        expiresAt: Date.now() + 3600000,
      });

      return [sid, b1, b2, cid];
    });

    // Create auction
    const listing = await t.mutation(api.marketplace.createListing, {
      token: "seller-token",
      cardDefinitionId: cardDefId,
      quantity: 1,
      listingType: "auction",
      price: 400,
      duration: 24,
    });

    // Bidder 1 bids
    await t.mutation(api.marketplace.placeBid, {
      token: "bidder1-token",
      listingId: listing.listingId!,
      bidAmount: 420,
    });

    // Bidder 2 outbids
    await t.mutation(api.marketplace.placeBid, {
      token: "bidder2-token",
      listingId: listing.listingId!,
      bidAmount: 450,
    });

    // Verify bidder 1 was refunded
    const bidder1Balance = await t.query(api.economy.getPlayerBalance, {
      token: "bidder1-token",
    });
    expect(bidder1Balance.gold).toBe(1000); // Refunded

    // Verify bidder 2's gold is locked
    const bidder2Balance = await t.query(api.economy.getPlayerBalance, {
      token: "bidder2-token",
    });
    expect(bidder2Balance.gold).toBe(1050); // 1500 - 450
  });

  it("should reject bid below minimum increment", async () => {
    const t = createTestInstance();

    const [sellerId, bidderId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@example.com",
        createdAt: Date.now(),
      });

      const bid = await ctx.db.insert("users", {
        username: "lowbidder",
        email: "low@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Card",
        rarity: "rare",
        archetype: "fire",
        cardType: "creature",
        cost: 3,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: sid,
        cardDefinitionId: cid,
        quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: bid,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: sid,
        token: "seller-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("sessions", {
        userId: bid,
        token: "bidder-token",
        expiresAt: Date.now() + 3600000,
      });

      return [sid, bid, cid];
    });

    const listing = await t.mutation(api.marketplace.createListing, {
      token: "seller-token",
      cardDefinitionId: cardDefId,
      quantity: 1,
      listingType: "auction",
      price: 100,
      duration: 24,
    });

    // Bid must be at least 5% higher (105)
    await expect(
      t.mutation(api.marketplace.placeBid, {
        token: "bidder-token",
        listingId: listing.listingId!,
        bidAmount: 102, // Too low
      })
    ).rejects.toThrowError("Bid must be at least");
  });
});

describe("claimAuctionWin", () => {
  it("should allow winner to claim after auction ends", async () => {
    const t = createTestInstance();
    vi.useFakeTimers();

    const [sellerId, winnerId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@example.com",
        createdAt: Date.now(),
      });

      const wid = await ctx.db.insert("users", {
        username: "winner",
        email: "winner@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Prize Card",
        rarity: "legendary",
        archetype: "neutral",
        cardType: "equipment",
        cost: 5,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: sid,
        cardDefinitionId: cid,
        quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: sid,
        gold: 0,
        gems: 0,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: wid,
        gold: 2000,
        gems: 100,
        lifetimeGoldEarned: 2000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: sid,
        token: "seller-token",
        expiresAt: Date.now() + 7200000,
      });

      await ctx.db.insert("sessions", {
        userId: wid,
        token: "winner-token",
        expiresAt: Date.now() + 7200000,
      });

      return [sid, wid, cid];
    });

    // Create auction
    const listing = await t.mutation(api.marketplace.createListing, {
      token: "seller-token",
      cardDefinitionId: cardDefId,
      quantity: 1,
      listingType: "auction",
      price: 500,
      duration: 1, // 1 hour
    });

    // Winner bids
    await t.mutation(api.marketplace.placeBid, {
      token: "winner-token",
      listingId: listing.listingId!,
      bidAmount: 600,
    });

    // Advance time past auction end
    vi.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

    // Claim auction
    const claim = await t.mutation(api.marketplace.claimAuctionWin, {
      token: "winner-token",
      listingId: listing.listingId!,
    });

    expect(claim.success).toBe(true);
    expect(claim.finalPrice).toBe(600);
    expect(claim.platformFee).toBe(30); // 5% of 600

    // Verify winner received card
    const winnerCards = await t.query(api.cards.getUserCards, {
      token: "winner-token",
    });
    expect(winnerCards.length).toBe(1);

    // Verify seller received payment
    const sellerBalance = await t.query(api.economy.getPlayerBalance, {
      token: "seller-token",
    });
    expect(sellerBalance.gold).toBe(600);

    vi.useRealTimers();
  });

  it("should reject claim before auction ends", async () => {
    const t = createTestInstance();

    const [sellerId, bidderId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@example.com",
        createdAt: Date.now(),
      });

      const bid = await ctx.db.insert("users", {
        username: "earlybird",
        email: "early@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Pending Card",
        rarity: "epic",
        archetype: "water",
        cardType: "spell",
        cost: 4,
        isActive: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCards", {
        userId: sid,
        cardDefinitionId: cid,
        quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: bid,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: sid,
        token: "seller-token",
        expiresAt: Date.now() + 3600000,
      });

      await ctx.db.insert("sessions", {
        userId: bid,
        token: "early-token",
        expiresAt: Date.now() + 3600000,
      });

      return [sid, bid, cid];
    });

    const listing = await t.mutation(api.marketplace.createListing, {
      token: "seller-token",
      cardDefinitionId: cardDefId,
      quantity: 1,
      listingType: "auction",
      price: 300,
      duration: 48,
    });

    await t.mutation(api.marketplace.placeBid, {
      token: "early-token",
      listingId: listing.listingId!,
      bidAmount: 350,
    });

    // Try to claim before auction ends
    await expect(
      t.mutation(api.marketplace.claimAuctionWin, {
        token: "early-token",
        listingId: listing.listingId!,
      })
    ).rejects.toThrowError("Auction has not ended yet");
  });
});

describe("finalizeExpiredAuctions", () => {
  it("should auto-finalize auction with winning bid", async () => {
    const t = createTestInstance();

    // Create seller and winner
    const [sellerId, winnerId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "seller",
        email: "seller@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });

      const wid = await ctx.db.insert("users", {
        username: "winner",
        email: "winner@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Auto Finalize Card",
        rarity: "epic",
        archetype: "fire",
        cardType: "creature",
        attack: 7,
        defense: 7,
        cost: 5,
        imageUrl: "test.jpg",
        isActive: true,
        createdAt: Date.now(),
      });

      // Initialize currencies
      await ctx.db.insert("playerCurrency", {
        userId: sid,
        gold: 0,
        gems: 0,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: wid,
        gold: 2000,
        gems: 0,
        lifetimeGoldEarned: 2000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      return [sid, wid, cid];
    });

    // Create expired auction (ended 2 hours ago, beyond 1-hour grace period)
    const listingId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "seller",
        listingType: "auction",
        cardDefinitionId: cardDefId,
        quantity: 1,
        price: 100,
        currentBid: 150,
        highestBidderId: winnerId,
        highestBidderUsername: "winner",
        bidCount: 1,
        status: "active",
        endsAt: Date.now() - 7200000, // 2 hours ago
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 7200000,
      });
    });

    // Create active bid record
    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("auctionBids", {
        listingId,
        bidderId: winnerId,
        bidderUsername: "winner",
        bidAmount: 150,
        bidStatus: "active",
        createdAt: Date.now() - 7200000,
      });
    });

    // Run auto-finalization
    const result = await t.mutation(internal.marketplace.finalizeExpiredAuctions);

    expect(result.processed).toBe(1);
    expect(result.finalized).toBe(1);
    expect(result.returned).toBe(0);

    // Verify listing marked as sold
    const listing = await t.run(async (ctx: TestMutationCtx) => ctx.db.get(listingId));
    expect(listing?.status).toBe("sold");
    expect(listing?.soldTo).toBe(winnerId);
    expect(listing?.soldFor).toBe(150);

    // Verify winner got the card
    const winnerCard = await t.run(async (ctx: TestMutationCtx) =>
      ctx.db
        .query("playerCards")
        .withIndex("by_user_card", (q: any) =>
          q.eq("userId", winnerId).eq("cardDefinitionId", cardDefId)
        )
        .first()
    );
    expect(winnerCard?.quantity).toBe(1);

    // Verify bid marked as won
    const bids = await t.run(async (ctx: TestMutationCtx) =>
      ctx.db
        .query("auctionBids")
        .withIndex("by_listing", (q: any) => q.eq("listingId", listingId))
        .collect()
    );
    expect(bids![0]!.bidStatus).toBe("won");
  });

  it("should return cards for auction with no bids", async () => {
    const t = createTestInstance();

    // Create seller
    const [sellerId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "nobids",
        email: "nobids@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Unsold Card",
        rarity: "rare",
        archetype: "water",
        cardType: "spell",
        cost: 3,
        imageUrl: "test.jpg",
        isActive: true,
        createdAt: Date.now(),
      });

      return [sid, cid];
    });

    // Create expired auction with no bids
    const listingId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "nobids",
        listingType: "auction",
        cardDefinitionId: cardDefId,
        quantity: 1,
        price: 100,
        bidCount: 0,
        status: "active",
        endsAt: Date.now() - 7200000, // 2 hours ago
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 7200000,
      });
    });

    // Run finalization
    const result = await t.mutation(internal.marketplace.finalizeExpiredAuctions);

    expect(result.processed).toBe(1);
    expect(result.finalized).toBe(0);
    expect(result.returned).toBe(1);

    // Verify listing marked as expired
    const listing = await t.run(async (ctx: TestMutationCtx) => ctx.db.get(listingId));
    expect(listing?.status).toBe("expired");

    // Verify seller got card back
    const sellerCard = await t.run(async (ctx: TestMutationCtx) =>
      ctx.db
        .query("playerCards")
        .withIndex("by_user_card", (q: any) =>
          q.eq("userId", sellerId).eq("cardDefinitionId", cardDefId)
        )
        .first()
    );
    expect(sellerCard?.quantity).toBe(1);
  });

  it("should respect grace period (not finalize within 1 hour)", async () => {
    const t = createTestInstance();

    const [sellerId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const sid = await ctx.db.insert("users", {
        username: "grace",
        email: "grace@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Grace Card",
        rarity: "common",
        archetype: "earth",
        cardType: "creature",
        cost: 2,
        imageUrl: "test.jpg",
        isActive: true,
        createdAt: Date.now(),
      });

      return [sid, cid];
    });

    // Auction expired 30 minutes ago (within grace period)
    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "grace",
        listingType: "auction",
        cardDefinitionId: cardDefId,
        quantity: 1,
        price: 50,
        bidCount: 0,
        status: "active",
        endsAt: Date.now() - 1800000, // 30 minutes ago
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 1800000,
      });
    });

    // Run finalization
    const result = await t.mutation(internal.marketplace.finalizeExpiredAuctions);

    // Should not process (still in grace period)
    expect(result.processed).toBe(0);
    expect(result.finalized).toBe(0);
    expect(result.returned).toBe(0);
  });
});
