/**
 * Tests for lib/validators.ts
 *
 * Tests centralized validation functions including:
 * - Session validation
 * - Card ownership checks
 * - Currency record management
 * - Transaction recording
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestInstance } from "../test.setup";
import type { TestMutationCtx } from "../test.setup";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";


describe("validateSession", () => {
  it("should throw error when token is empty", async () => {
    const t = createTestInstance();

    await expect(
      t.query(api.cards.getUserCards, { token: "" })
    ).rejects.toThrowError("Authentication required");
  });

  it("should throw error when session does not exist", async () => {
    const t = createTestInstance();

    await expect(
      t.query(api.cards.getUserCards, { token: "invalid-token" })
    ).rejects.toThrowError("Session expired or invalid");
  });

  it("should throw error when session is expired", async () => {
    const t = createTestInstance();

    // Create user
    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });
    });

    // Create expired session
    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("sessions", {
        userId,
        token: "expired-token",
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      });
    });

    await expect(
      t.query(api.cards.getUserCards, { token: "expired-token" })
    ).rejects.toThrowError("Session expired or invalid");
  });

  it("should return user info for valid session", async () => {
    const t = createTestInstance();

    // Create user
    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "validuser",
        email: "valid@example.com",
        createdAt: Date.now(),
      });
    });

    // Create valid session
    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("sessions", {
        userId,
        token: "valid-token",
        expiresAt: Date.now() + 3600000, // Expires in 1 hour
      });
    });

    // Should not throw
    const cards = await t.query(api.cards.getUserCards, { token: "valid-token" });
    expect(cards).toEqual([]);
  });
});

describe("checkCardOwnership", () => {
  it("should return false when user does not own card", async () => {
    const t = createTestInstance();

    const [userId, cardDefId] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Test Card",
        rarity: "common",
        archetype: "fire",
        cardType: "creature",
        cost: 3,
        isActive: true,
        createdAt: Date.now(),
      });

      return [uid, cid];
    });

    // User doesn't own the card - marketplace should reject listing
    const token = await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("sessions", {
        userId,
        token: "test-token",
        expiresAt: Date.now() + 3600000,
      });
      return "test-token";
    });

    await expect(
      t.mutation(api.marketplace.createListing, {
        token,
        cardDefinitionId: cardDefId,
        quantity: 1,
        listingType: "fixed",
        price: 100,
      })
    ).rejects.toThrowError("You don't own enough of this card");
  });

  it("should return true when user owns sufficient quantity", async () => {
    const t = createTestInstance();

    const [userId, cardDefId, token] = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      const cid = await ctx.db.insert("cardDefinitions", {
        name: "Test Card",
        rarity: "common",
        archetype: "fire",
        cardType: "creature",
        cost: 3,
        isActive: true,
        createdAt: Date.now(),
      });

      // Give user 5 cards
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
        token: "test-token",
        expiresAt: Date.now() + 3600000,
      });

      return [uid, cid, "test-token"];
    });

    // Should succeed - user owns 5, trying to list 3
    const result = await t.mutation(api.marketplace.createListing, {
      token,
      cardDefinitionId: cardDefId,
      quantity: 3,
      listingType: "fixed",
      price: 100,
    });

    expect(result.success).toBe(true);
    expect(result.listingId).toBeDefined();
  });
});

describe("getOrCreatePlayerCurrency", () => {
  it("should return existing currency record", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 1000,
        gems: 50,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 50,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "test-token",
        expiresAt: Date.now() + 3600000,
      });

      return uid;
    });

    const balance = await t.query(api.economy.getPlayerBalance, {
      token: "test-token",
    });

    expect(balance.gold).toBe(1000);
    expect(balance.gems).toBe(50);
  });

  it("should return currency record for new user", async () => {
    const t = createTestInstance();

    await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "newuser",
        email: "new@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 0,
        gems: 0,
        lifetimeGoldEarned: 0,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "new-token",
        expiresAt: Date.now() + 3600000,
      });
    });

    const balance = await t.query(api.economy.getPlayerBalance, {
      token: "new-token",
    });

    // Should have 0 values
    expect(balance.gold).toBe(0);
    expect(balance.gems).toBe(0);
    expect(balance.lifetimeStats.goldEarned).toBe(0);
  });
});

describe("recordTransaction", () => {
  it("should record transaction in ledger", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx: TestMutationCtx) => {
      const uid = await ctx.db.insert("users", {
        username: "testuser",
        email: "test@example.com",
        createdAt: Date.now(),
      });

      await ctx.db.insert("playerCurrency", {
        userId: uid,
        gold: 500,
        gems: 100,
        lifetimeGoldEarned: 500,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      await ctx.db.insert("sessions", {
        userId: uid,
        token: "test-token",
        expiresAt: Date.now() + 3600000,
      });

      return uid;
    });

    // Redeem a promo code (which records transactions)
    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("promoCodes", {
        code: "TEST100",
        description: "Test promo code",
        rewardType: "gold",
        rewardAmount: 100,
        isActive: true,
        redemptionCount: 0,
        createdAt: Date.now(),
      });
    });

    await t.mutation(api.economy.redeemPromoCode, {
      token: "test-token",
      code: "TEST100",
    });

    // Check transaction was recorded
    const history = await t.query(api.economy.getTransactionHistory, {
      token: "test-token",
    });

    expect(history.transactions.length).toBeGreaterThan(0);
    expect(history.transactions[0]).toMatchObject({
      transactionType: "gift",
      currencyType: "gold",
      amount: 100,
    });
  });
});
