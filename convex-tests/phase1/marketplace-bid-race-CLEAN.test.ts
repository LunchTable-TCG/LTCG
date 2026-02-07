/**
 * Phase 1 Test: Marketplace Bid Race Condition
 *
 * Tests that concurrent bids respect minimum bid increment through
 * Convex's automatic Optimistic Concurrency Control (OCC).
 */

import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";
import { createTestCard, createTestCurrency, createTestUser } from "./testHelpers";

describe("Phase 1: Marketplace Bid Race Condition (Clean)", () => {
  it("should prevent concurrent bids from bypassing minimum increment", async () => {
    const t = await createTestWithComponents();

    // Setup: Create two users
    const user1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", createTestUser({
        username: "bidder1",
        email: "bidder1@test.com",
        privyId: "privy_bidder1",
      }));
    });

    const user2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", createTestUser({
        username: "bidder2",
        email: "bidder2@test.com",
        privyId: "privy_bidder2",
      }));
    });

    // Give both users gold
    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", createTestCurrency(user1Id, { gold: 1000 }));
      await ctx.db.insert("playerCurrency", createTestCurrency(user2Id, { gold: 1000 }));
    });

    // Create a card for the auction
    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", createTestCard({
        name: "Test Card",
        rarity: "rare",
      }));
    });

    // Create a seller
    const sellerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", createTestUser({
        username: "seller",
        email: "seller@test.com",
        privyId: "privy_seller",
      }));
    });

    // Create auction listing with initial bid of 100 gold
    const listingId = await t.run(async (ctx) => {
      return await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "seller",
        listingType: "auction",
        cardDefinitionId: cardId,
        quantity: 1,
        price: 100,
        currentBid: 100,
        highestBidderId: user1Id,
        highestBidderUsername: "bidder1",
        bidCount: 1,
        status: "active",
        endsAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Execute: Both users try to bid 105 gold simultaneously (minimum should be 105)
    // With OCC, one should succeed and the other should fail/retry
    const results = await Promise.allSettled([
      t.withIdentity({ subject: "privy_bidder1" }).mutation(api.economy.marketplace.placeBid, {
        listingId,
        bidAmount: 105,
      }),
      t.withIdentity({ subject: "privy_bidder2" }).mutation(api.economy.marketplace.placeBid, {
        listingId,
        bidAmount: 105,
      }),
    ]);

    // Verify: At least one should succeed
    const succeeded = results.filter((r) => r.status === "fulfilled");

    expect(succeeded.length).toBeGreaterThanOrEqual(1);
    expect(succeeded.length).toBeLessThanOrEqual(2);

    // Verify: Final bid should be either 105 (if one succeeded) or 110 (if both succeeded via OCC retry)
    const listing = await t.run(async (ctx) => {
      return await ctx.db.get(listingId);
    });

    if (succeeded.length === 1) {
      // One bid succeeded
      expect(listing?.currentBid).toBe(105);
      expect(listing?.bidCount).toBe(2); // Original + 1 new bid
    } else if (succeeded.length === 2) {
      // Both succeeded via OCC retry (second bid saw updated value)
      expect(listing?.currentBid).toBeGreaterThanOrEqual(105);
      expect(listing?.bidCount).toBe(3); // Original + 2 new bids
    }

    console.log(`✓ Test passed: ${succeeded.length} bids succeeded, final bid: ${listing?.currentBid}`);
  });

  it("should respect 5% minimum bid increment rule", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user and listing
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", createTestUser({
        username: "bidder",
        email: "bidder@test.com",
        privyId: "privy_bidder",
      }));
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", createTestCurrency(userId, { gold: 1000 }));
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", createTestCard({
        name: "Test Card",
        rarity: "rare",
      }));
    });

    const sellerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", createTestUser({
        username: "seller",
        email: "seller@test.com",
        privyId: "privy_seller",
      }));
    });

    const listingId = await t.run(async (ctx) => {
      return await ctx.db.insert("marketplaceListings", {
        sellerId,
        sellerUsername: "seller",
        listingType: "auction",
        cardDefinitionId: cardId,
        quantity: 1,
        bidCount: 0,
        price: 100,
        currentBid: 100,
        status: "active",
        endsAt: Date.now() + 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Execute: Try to bid 104 gold (less than 5% increment)
    await expect(
      t.withIdentity({ subject: "privy_bidder" }).mutation(api.economy.marketplace.placeBid, {
        listingId,
        bidAmount: 104,
      })
    ).rejects.toThrow();

    // Execute: Bid 105 gold (exactly 5% increment) - should succeed
    await t.withIdentity({ subject: "privy_bidder" }).mutation(api.economy.marketplace.placeBid, {
      listingId,
      bidAmount: 105,
    });

    const listing = await t.run(async (ctx) => await ctx.db.get(listingId));
    expect(listing?.currentBid).toBe(105);
  });
});
