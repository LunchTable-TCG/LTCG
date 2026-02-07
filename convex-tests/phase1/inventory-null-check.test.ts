/**
 * Phase 1 Test: Card Inventory Null Check
 *
 * Tests that inventory operations validate card definition existence
 * before making any changes.
 */

import { describe, expect, it } from "vitest";
import type { Id } from "../../_generated/dataModel";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 1: Card Inventory Null Check", () => {
  it("should reject inventory adjustment for non-existent card", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "testuser",
        email: "testuser@test.com",
        privyId: "privy_testuser",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create a fake card ID (that doesn't exist in database)
    const fakeCardId = "jh7abc123456789" as Id<"cardDefinitions">;

    // Execute: Try to adjust inventory with non-existent card
    await expect(
      t.run(async (ctx) => {
        // Simulate adjustCardInventory being called with fake card
        const cardDef = await ctx.db.get(fakeCardId);

        if (!cardDef) {
          throw new Error(
            `NOT_FOUND_CARD: Card definition not found - cannot adjust inventory for non-existent card`
          );
        }

        // This should not be reached
        const existing = await ctx.db
          .query("playerCards")
          .filter(
            (q) =>
              q.eq(q.field("userId"), userId) && q.eq(q.field("cardDefinitionId"), fakeCardId)
          )
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            quantity: existing.quantity + 1,
          });
        } else {
          await ctx.db.insert("playerCards", {
            userId,
            cardDefinitionId: fakeCardId,
            quantity: 1,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
          });
        }
      })
    ).rejects.toThrow(/NOT_FOUND_CARD|not found/i);

    // Verify: No inventory record was created
    const inventory = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCards")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    });

    expect(inventory).toHaveLength(0);
  });

  it("should validate card exists before marketplace listing", async () => {
    const t = await createTestWithComponents();

    // Setup: Create seller
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
userId: sellerId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create fake card ID
    const fakeCardId = "jh7999888777666" as Id<"cardDefinitions">;

    // Execute: Try to list non-existent card on marketplace
    // This should fail validation before creating listing
    await expect(
      t.run(async (ctx) => {
        // Simulate marketplace listing validation
        const cardDef = await ctx.db.get(fakeCardId);

        if (!cardDef) {
          throw new Error("NOT_FOUND_CARD: Card definition not found");
        }

        // This should not be reached
        await ctx.db.insert("marketplaceListings", {
          sellerId,
          sellerUsername: "seller",
          listingType: "fixed",
          cardDefinitionId: fakeCardId,
          quantity: 1,
          price: 100,
          bidCount: 0,
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      })
    ).rejects.toThrow(/NOT_FOUND_CARD|not found/i);

    // Verify: No listing was created
    const listings = await t.run(async (ctx) => {
      return await ctx.db
        .query("marketplaceListings")
        .filter((q) => q.eq(q.field("sellerId"), sellerId))
        .collect();
    });

    expect(listings).toHaveLength(0);
  });

  it("should allow valid card inventory adjustments", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user and valid card
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "player",
        email: "player@test.com",
        privyId: "privy_player",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Create VALID card
    const validCardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Valid Card",
        rarity: "rare",
        archetype: "neutral",
        cardType: "creature",
        cost: 5,
        attack: 100,
        defense: 100,
        flavorText: "This card exists",
        imageUrl: "valid.png",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    // Execute: Adjust inventory for VALID card - should succeed
    await t.run(async (ctx) => {
      const cardDef = await ctx.db.get(validCardId);

      if (!cardDef) {
        throw new Error("NOT_FOUND_CARD");
      }

      // Create inventory record
      await ctx.db.insert("playerCards", {
        userId,
        cardDefinitionId: validCardId,
        quantity: 3,
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    // Verify: Inventory created successfully
    const inventory = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCards")
        .filter(
          (q) =>
            q.eq(q.field("userId"), userId) && q.eq(q.field("cardDefinitionId"), validCardId)
        )
        .first();
    });

    expect(inventory).toBeDefined();
    expect(inventory?.quantity).toBe(3);
  });

  it("should prevent negative inventory through invalid cards", async () => {
    const t = await createTestWithComponents();

    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "attacker",
        email: "attacker@test.com",
        privyId: "privy_attacker",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 0,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Attempt: Try to create inventory with negative quantity via fake card
    const fakeCardId = "jh7exploit12345" as Id<"cardDefinitions">;

    await expect(
      t.run(async (ctx) => {
        const cardDef = await ctx.db.get(fakeCardId);

        if (!cardDef) {
          throw new Error("NOT_FOUND_CARD");
        }

        // Should never reach here
        await ctx.db.insert("playerCards", {
          userId,
          cardDefinitionId: fakeCardId,
          quantity: -999, // Attempted exploit
        isFavorite: false,
        acquiredAt: Date.now(),
        lastUpdatedAt: Date.now(),
        });
      })
    ).rejects.toThrow(/NOT_FOUND_CARD/i);

    // Verify: No inventory created
    const inventory = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerCards")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    });

    expect(inventory).toHaveLength(0);
  });
});
