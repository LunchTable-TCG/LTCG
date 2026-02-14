/**
 * Phase 1 Test: Auction Multiple Claims
 *
 * Tests that auction winners can only claim their winnings once
 * through the `claimed` idempotency flag.
 */

import { describe, expect, it, vi } from "vitest";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 1: Auction Multiple Claims", () => {
  it("should prevent winner from claiming auction twice", async () => {
    const t = await createTestWithComponents();

    // Setup: Create winner and seller
    const winnerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "winner",
        email: "winner@test.com",
        privyId: "privy_winner",
        createdAt: Date.now(),
      });
    });

    const sellerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "seller",
        email: "seller@test.com",
        privyId: "privy_seller",
        createdAt: Date.now(),
      });
    });

    // Give winner enough gold for bid
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
userId: winnerId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
      await ctx.db.insert("playerCurrency", {
userId: sellerId,
        gold: 100,
        gems: 0,
        lifetimeGoldEarned: 100,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create card
    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Legendary Dragon",
        rarity: "legendary",
        archetype: "neutral",
        cardType: "stereotype",
        cost: 10,
        attack: 300,
        defense: 200,
        flavorText: "Claim test card",
        imageUrl: "dragon.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    // Create seller's card inventory
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCards", {
        userId: sellerId,
        cardDefinitionId: cardId,
        quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    // Create ended auction that winner won (status still "active" until claimed)
    const listingId = await t.run(async (ctx) => {
      return await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "seller",
        listingType: "auction",
        cardDefinitionId: cardId,
        quantity: 1,
        price: 100,
        currentBid: 500,
        highestBidderId: winnerId,
        highestBidderUsername: "winner",
        bidCount: 3,
        status: "active", // Active until claimed
        endsAt: Date.now() - 1000, // Already ended
        createdAt: Date.now(),
        updatedAt: Date.now(),
        claimed: false, // Not yet claimed
      });
    });

    // First claim - should succeed
    await t
      .withIdentity({ subject: "privy_winner" })
      .mutation(api.economy.marketplace.claimAuctionWin, {
        listingId,
      });

    // Verify: Listing marked as claimed
    const claimedListing = await t.run(async (ctx) => await ctx.db.get(listingId));
    expect(claimedListing?.claimed).toBe(true);
    expect(claimedListing?.status).toBe("sold");

    // Verify: Winner received card
    const winnerCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCards")
        .filter((q) => q.eq(q.field("userId"), winnerId))
        .collect();
    });
    expect(winnerCards.length).toBeGreaterThan(0);
    const receivedCard = winnerCards.find((c) => c.cardDefinitionId === cardId);
    expect(receivedCard).toBeDefined();
    expect(receivedCard?.quantity).toBeGreaterThanOrEqual(1);

    // Second claim attempt - should fail with MARKETPLACE_ALREADY_CLAIMED
    await expect(
      t
        .withIdentity({ subject: "privy_winner" })
        .mutation(api.economy.marketplace.claimAuctionWin, {
          listingId,
        })
    ).rejects.toThrow(/MARKETPLACE_ALREADY_CLAIMED|already been claimed/i);

    // Verify: No duplicate cards given
    const finalWinnerCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCards")
        .filter((q) => q.eq(q.field("userId"), winnerId))
        .collect();
    });

    // Card quantity should not have increased from second claim attempt
    const finalReceivedCard = finalWinnerCards.find((c) => c.cardDefinitionId === cardId);
    expect(finalReceivedCard?.quantity).toBe(receivedCard?.quantity);
  });

  it("should handle concurrent claim attempts", async () => {
    // Enable fake timers to control scheduled function execution
    vi.useFakeTimers();

    const t = await createTestWithComponents();

    // Setup
    const winnerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "winner",
        email: "winner@test.com",
        privyId: "privy_winner",
        createdAt: Date.now(),
      });
    });

    const sellerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "seller",
        email: "seller@test.com",
        privyId: "privy_seller",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
userId: winnerId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
      await ctx.db.insert("playerCurrency", {
userId: sellerId,
        gold: 100,
        gems: 0,
        lifetimeGoldEarned: 100,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Test Card",
        rarity: "rare",
        archetype: "neutral",
        cardType: "stereotype",
        cost: 5,
        attack: 100,
        defense: 100,
        flavorText: "Concurrent claim test",
        imageUrl: "test.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCards", {
        userId: sellerId,
        cardDefinitionId: cardId,
        quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    const listingId = await t.run(async (ctx) => {
      return await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "seller",
        listingType: "auction",
        cardDefinitionId: cardId,
        quantity: 1,
        price: 100,
        currentBid: 300,
        highestBidderId: winnerId,
        highestBidderUsername: "winner",
        bidCount: 2,
        status: "active", // Active until claimed
        endsAt: Date.now() - 1000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        claimed: false,
      });
    });

    // Execute: Attempt to claim twice simultaneously
    const results = await Promise.allSettled([
      t
        .withIdentity({ subject: "privy_winner" })
        .mutation(api.economy.marketplace.claimAuctionWin, {
          listingId,
        }),
      t
        .withIdentity({ subject: "privy_winner" })
        .mutation(api.economy.marketplace.claimAuctionWin, {
          listingId,
        }),
    ]);

    // Trigger scheduled functions (email notifications with runAfter(0))
    vi.runAllTimers();
    await t.finishInProgressScheduledFunctions();

    // Verify: Only one succeeded
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);

    // Verify: Listing marked as claimed exactly once
    const listing = await t.run(async (ctx) => await ctx.db.get(listingId));
    expect(listing?.claimed).toBe(true);

    // Verify: Winner got exactly one card
    const winnerCards = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCards")
        .filter((q) => q.eq(q.field("userId"), winnerId))
        .collect();
    });
    const receivedCard = winnerCards.find((c) => c.cardDefinitionId === cardId);
    expect(receivedCard?.quantity).toBe(1);

    // Cleanup: Restore real timers
    vi.useRealTimers();
  });
});
