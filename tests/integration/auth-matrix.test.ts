/**
 * Authorization Matrix Integration Tests
 *
 * Tests that protected operations correctly enforce authentication and authorization.
 * Verifies that:
 * 1. Unauthenticated users cannot access protected resources
 * 2. Authenticated users cannot access resources belonging to other users
 * 3. Authenticated users can access their own resources
 * 4. Admin users have appropriate elevated privileges
 *
 * CRITICAL: These tests catch unauthorized data access bugs that could lead to:
 * - Data breaches
 * - Account takeovers
 * - Privilege escalation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { TestConvex } from "convex-test";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { createTestUser } from "../fixtures/users";
import { createTestInstance } from "../../convex_test_utils/setup";

describe("Authorization Matrix - Shop Operations", () => {
  let helper: TestConvex<typeof schema>;
  let userAId: Id<"users">;
  let userBId: Id<"users">;
  let productId: string;

  beforeEach(async () => {
    helper = createTestInstance();

    // Create two test users
    const userA = createTestUser({ gold: 1000 });
    const userB = createTestUser({ gold: 1000 });

    userAId = await helper.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: userA.email,
        username: userA.username,
        name: userA.name,
        gold: userA.gold,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    userBId = await helper.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: userB.email,
        username: userB.username,
        name: userB.name,
        gold: userB.gold,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    // Create a test shop product
    productId = "test_pack_basic";
    await helper.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId,
        name: "Test Basic Pack",
        description: "Test pack for integration tests",
        productType: "pack",
        goldPrice: 100,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });
    });
  });

  afterEach(async () => {
    // Cleanup handled automatically by convex-test
  });

  describe("1. Unauthenticated Access", () => {
    it("should reject pack purchase without authentication", async () => {
      // Attempt to purchase pack without authentication
      await expect(
        helper.mutation(api.economy.shop.purchasePack, {
          productId,
          useGems: false,
        })
      ).rejects.toThrow(/not authenticated|user not found/i);
    });

    it("should reject viewing pack history without authentication", async () => {
      await expect(
        helper.query(api.economy.shop.getPackOpeningHistory, { page: 1 })
      ).rejects.toThrow(/not authenticated|user not found/i);
    });
  });

  describe("2. Authenticated Access (Own Resources)", () => {
    it("should allow authenticated user to purchase pack", async () => {
      // Set authentication context as userA
      helper.withIdentity({ subject: userAId });

      // Purchase pack
      const result = await helper.mutation(api.economy.shop.purchasePack, {
        productId,
        useGems: false,
      });

      expect(result.success).toBe(true);
      expect(result.cardsReceived).toHaveLength(5);

      // Verify gold was deducted
      const userA = await helper.run(async (ctx) => {
        return await ctx.db.get(userAId);
      });
      expect(userA?.gold).toBe(900); // 1000 - 100
    });

    it("should allow authenticated user to view their own pack history", async () => {
      helper.withIdentity({ subject: userAId });

      // First purchase a pack
      await helper.mutation(api.economy.shop.purchasePack, {
        productId,
        useGems: false,
      });

      // Then view history
      const history = await helper.query(api.economy.shop.getPackOpeningHistory, { page: 1 });

      expect(history.history).toHaveLength(1);
      expect(history.history[0]?.userId).toBe(userAId);
    });
  });

  describe("3. Cross-User Access (Security Critical)", () => {
    it("should NOT allow user A to view user B's pack history", async () => {
      // User B purchases a pack
      helper.withIdentity({ subject: userBId });
      await helper.mutation(api.economy.shop.purchasePack, {
        productId,
        useGems: false,
      });

      // User A tries to view history (should only see their own)
      helper.withIdentity({ subject: userAId });
      const history = await helper.query(api.economy.shop.getPackOpeningHistory, { page: 1 });

      // Should be empty (User A has no purchases)
      expect(history.history).toHaveLength(0);
    });
  });
});

describe("Authorization Matrix - Deck Operations", () => {
  let helper: TestConvex<typeof schema>;
  let userAId: Id<"users">;
  let userBId: Id<"users">;
  let userADeckId: Id<"userDecks">;

  beforeEach(async () => {
    helper = createTestInstance();

    // Create test users
    const userA = createTestUser();
    const userB = createTestUser();

    userAId = await helper.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: userA.email,
        username: userA.username,
        name: userA.name,
        gold: 1000,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    userBId = await helper.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: userB.email,
        username: userB.username,
        name: userB.name,
        gold: 1000,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    // Create a deck for user A
    userADeckId = await helper.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId: userAId,
        name: "User A's Deck",
        deckArchetype: "fire",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
  });

  afterEach(async () => {
    // Cleanup handled automatically by convex-test
  });

  describe("1. Unauthenticated Access", () => {
    it("should reject viewing decks without authentication", async () => {
      await expect(
        helper.query(api.core.decks.getUserDecks, {})
      ).rejects.toThrow(/not authenticated|user not found/i);
    });

    it("should reject creating deck without authentication", async () => {
      await expect(
        helper.mutation(api.core.decks.createDeck, {
          name: "Test Deck",
        })
      ).rejects.toThrow(/not authenticated|user not found/i);
    });
  });

  describe("2. Authenticated Access (Own Resources)", () => {
    it("should allow user to view their own decks", async () => {
      helper.withIdentity({ subject: userAId });

      const decks = await helper.query(api.core.decks.getUserDecks, {});

      expect(decks).toHaveLength(1);
      expect(decks[0]?.id).toBe(userADeckId);
    });

    it("should allow user to create their own deck", async () => {
      helper.withIdentity({ subject: userAId });

      const result = await helper.mutation(api.core.decks.createDeck, {
        name: "New Test Deck",
      });

      expect(result.deckId).toBeDefined();

      // Verify deck belongs to correct user
      const deck = await helper.run(async (ctx) => {
        return await ctx.db.get(result.deckId);
      });
      expect(deck?.userId).toBe(userAId);
    });
  });

  describe("3. Cross-User Access (Security Critical)", () => {
    it("should NOT allow user B to delete user A's deck", async () => {
      // User B tries to delete User A's deck
      helper.withIdentity({ subject: userBId });

      await expect(
        helper.mutation(api.core.decks.deleteDeck, {
          deckId: userADeckId,
        })
      ).rejects.toThrow(/not found|unauthorized|permission denied/i);

      // Verify deck still exists
      const deck = await helper.run(async (ctx) => {
        return await ctx.db.get(userADeckId);
      });
      expect(deck).not.toBeNull();
      expect(deck?.isActive).toBe(true);
    });

    it("should NOT allow user B to view user A's decks", async () => {
      helper.withIdentity({ subject: userBId });

      const decks = await helper.query(api.core.decks.getUserDecks, {});

      // User B should only see their own decks (none created yet)
      expect(decks).toHaveLength(0);
    });
  });
});

describe("Authorization Matrix - Admin Operations", () => {
  let helper: TestConvex<typeof schema>;
  let adminUserId: Id<"users">;
  let regularUserId: Id<"users">;
  let targetUserId: Id<"users">;

  beforeEach(async () => {
    helper = createTestInstance();

    // Create admin user
    const admin = createTestUser({ email: "admin@example.com" });
    adminUserId = await helper.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: admin.email,
        username: admin.username,
        name: "Admin User",
        gold: 1000,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });

      // Grant admin role
      await ctx.db.insert("adminRoles", {
        userId,
        role: "admin",
        grantedBy: userId,
        grantedAt: Date.now(),
        isActive: true,
      });

      return userId;
    });

    // Create regular user
    const regular = createTestUser();
    regularUserId = await helper.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: regular.email,
        username: regular.username,
        name: "Regular User",
        gold: 1000,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    // Create target user (to be deleted)
    const target = createTestUser();
    targetUserId = await helper.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: target.email,
        username: target.username,
        name: "Target User",
        gold: 1000,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });
  });

  afterEach(async () => {
    // Cleanup handled automatically by convex-test
  });

  describe("1. Admin-Only Operations", () => {
    it("should allow admin to delete user", async () => {
      helper.withIdentity({ subject: adminUserId });

      const targetEmail = await helper.run(async (ctx) => {
        const user = await ctx.db.get(targetUserId);
        return user?.email;
      });

      const result = await helper.mutation(api.admin.mutations.deleteUserByEmail, {
        email: targetEmail!,
      });

      expect(result.success).toBe(true);

      // Verify user was deleted
      const deletedUser = await helper.run(async (ctx) => {
        return await ctx.db.get(targetUserId);
      });
      expect(deletedUser).toBeNull();
    });

    it("should reject regular user attempting admin operation", async () => {
      helper.withIdentity({ subject: regularUserId });

      const targetEmail = await helper.run(async (ctx) => {
        const user = await ctx.db.get(targetUserId);
        return user?.email;
      });

      await expect(
        helper.mutation(api.admin.mutations.deleteUserByEmail, {
          email: targetEmail!,
        })
      ).rejects.toThrow(/unauthorized|permission denied|admin required/i);

      // Verify user was NOT deleted
      const user = await helper.run(async (ctx) => {
        return await ctx.db.get(targetUserId);
      });
      expect(user).not.toBeNull();
    });
  });
});
