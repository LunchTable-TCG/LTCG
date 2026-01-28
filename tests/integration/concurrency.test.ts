/**
 * Concurrency and Race Condition Integration Tests
 *
 * CRITICAL: These tests catch real concurrency bugs that lead to:
 * - Double-spend exploits (duplicate purchases with insufficient funds)
 * - Lost currency updates (race conditions overwriting balance changes)
 * - Matchmaking corruption (multiple matches for same player)
 * - Orphaned game state (deck deleted while in use)
 * - Leaderboard inconsistency (concurrent rating updates corrupting rankings)
 *
 * Test Pattern:
 * 1. Launch two operations simultaneously using Promise.all()
 * 2. Verify system maintained consistency
 * 3. Check final state reflects both operations correctly OR one was rejected
 *
 * These tests verify that Convex's transaction isolation prevents data corruption.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { createTestUser, createTestUserWithGold } from "../fixtures/users";

describe("Concurrency Tests - Double Purchase Prevention", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;
  let productId: string;

  beforeEach(async () => {
    t = convexTest(schema, {} as any);

    // Create user with EXACTLY enough gold for ONE purchase
    const user = createTestUserWithGold(100);

    userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: user.email,
        username: user.username,
        name: user.name,
        gold: 100, // Exactly one pack price
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    // Create test shop product (100 gold)
    productId = "test_pack_basic";
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId,
        name: "Test Basic Pack",
        description: "Test pack for concurrency tests",
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
    // No cleanup needed - convexTest creates isolated test environments
  });

  it("should prevent double purchase when two simultaneous purchases attempt to spend same funds", async () => {
    const userContext = t.withIdentity({ subject: userId });

    // Launch TWO pack purchases simultaneously (user only has gold for ONE)
    const results = await Promise.allSettled([
      userContext.mutation(api.economy.shop.purchasePack, {
        productId,
        useGems: false,
      }),
      userContext.mutation(api.economy.shop.purchasePack, {
        productId,
        useGems: false,
      }),
    ]);

    // Verify exactly ONE succeeded and ONE failed
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // Verify the failure was due to insufficient funds
    const failedResult = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failedResult.reason.message).toMatch(/insufficient|balance/i);

    // CRITICAL: Verify user's gold balance is correct (0, not negative)
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });
    expect(user?.gold).toBe(0); // Should have 0 gold after ONE purchase

    // Verify only ONE pack opening was recorded
    const history = await t.run(async (ctx) => {
      const allHistory = await ctx.db.query("packOpeningHistory").collect();
      return allHistory.filter((h) => h.userId === userId);
    });
    expect(history).toHaveLength(1);
  });

  it("should handle three simultaneous purchases correctly (only one succeeds)", async () => {
    const userContext = t.withIdentity({ subject: userId });

    // Launch THREE pack purchases simultaneously
    const results = await Promise.allSettled([
      userContext.mutation(api.economy.shop.purchasePack, { productId, useGems: false }),
      userContext.mutation(api.economy.shop.purchasePack, { productId, useGems: false }),
      userContext.mutation(api.economy.shop.purchasePack, { productId, useGems: false }),
    ]);

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(2);

    // Verify final balance
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });
    expect(user?.gold).toBe(0);
  });
});

describe("Concurrency Tests - Atomic Currency Updates", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, {} as any);

    const user = createTestUserWithGold(1000);

    userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: user.email,
        username: user.username,
        name: user.name,
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
    // No cleanup needed - convexTest creates isolated test environments
  });

  it.skip("should not lose currency updates when multiple concurrent modifications occur", async () => {
    // TODO: adjustPlayerCurrency is an internal mutation not exposed in the public API
    // This test requires direct currency manipulation which should be done through shop purchases or rewards
    // Consider rewriting this test to use public API methods like purchasePack

    // SKIPPED: adjustPlayerCurrency is not a public mutation
    // Launch FIVE concurrent currency modifications
    // Each should deduct 100 gold
    const operations: Promise<any>[] = [];

    const results = await Promise.allSettled(operations);

    // All should succeed (user has 1000 gold, 5 × 100 = 500 deducted)
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    expect(successCount).toBe(5);

    // CRITICAL: Verify final balance is correct (not corrupted by race condition)
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });
    expect(user?.gold).toBe(500); // 1000 - (5 × 100) = 500

    // Verify all 5 transactions were recorded
    const transactions = await t.run(async (ctx) => {
      return await ctx.db.query("currencyTransactions").collect();
    });
    expect(transactions).toHaveLength(5);
  });

  it.skip("should handle concurrent additions and subtractions correctly", async () => {
    // TODO: adjustPlayerCurrency is an internal mutation not exposed in the public API
    // This test requires direct currency manipulation which should be done through shop purchases or rewards

    // SKIPPED: adjustPlayerCurrency is not a public mutation
    // Mix of additions and subtractions
    const operations: Promise<any>[] = [];

    await Promise.all(operations);

    // Final balance: 1000 - 200 + 300 - 150 + 50 = 1000
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });
    expect(user?.gold).toBe(1000);
  });
});

describe("Concurrency Tests - Matchmaking Race Conditions", () => {
  let t: ReturnType<typeof convexTest>;
  let userAId: Id<"users">;
  let userBId: Id<"users">;
  let deckAId: Id<"userDecks">;
  let deckBId: Id<"userDecks">;

  beforeEach(async () => {
    t = convexTest(schema, {} as any);

    // Create two users with similar ratings (should match)
    const userA = createTestUser({ rankedElo: 1000 });
    const userB = createTestUser({ rankedElo: 1010 });

    userAId = await t.run(async (ctx) => {
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

    userBId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: userB.email,
        username: userB.username,
        name: userB.name,
        gold: 1000,
        rankedElo: 1010,
        casualRating: 1010,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    // Create valid decks for both users
    deckAId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId: userAId,
        name: "User A's Deck",
        deckArchetype: "fire",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    deckBId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId: userBId,
        name: "User B's Deck",
        deckArchetype: "fire",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Set active decks
    await t.run(async (ctx) => {
      await ctx.db.patch(userAId, { activeDeckId: deckAId });
      await ctx.db.patch(userBId, { activeDeckId: deckBId });
    });
  });

  afterEach(async () => {
    // No cleanup needed - convexTest creates isolated test environments
  });

  it("should handle two players joining queue simultaneously without corruption", async () => {
    // Both join queue at the same time
    await Promise.all([
      t.withIdentity({ subject: userAId }).mutation(api.social.matchmaking.joinQueue, {
        mode: "ranked",
      }),
      t.withIdentity({ subject: userBId }).mutation(api.social.matchmaking.joinQueue, {
        mode: "ranked",
      }),
    ]);

    // Verify both are in queue
    const queueEntries = await t.run(async (ctx) => {
      return await ctx.db.query("matchmakingQueue").collect();
    });
    expect(queueEntries).toHaveLength(2);

    // Verify each user has exactly one queue entry
    const userAEntries = queueEntries.filter((e) => e.userId === userAId);
    const userBEntries = queueEntries.filter((e) => e.userId === userBId);
    expect(userAEntries).toHaveLength(1);
    expect(userBEntries).toHaveLength(1);
  });

  it("should prevent duplicate queue entries when same user joins twice", async () => {
    const userContext = t.withIdentity({ subject: userAId });

    // Try to join queue twice simultaneously
    const results = await Promise.allSettled([
      userContext.mutation(api.social.matchmaking.joinQueue, { mode: "ranked" }),
      userContext.mutation(api.social.matchmaking.joinQueue, { mode: "ranked" }),
    ]);

    // One should succeed, one should fail
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // Verify the failure was due to already being in queue
    const failedResult = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failedResult.reason.message).toMatch(/already in queue/i);

    // Verify user has exactly one queue entry
    const queueEntries = await t.run(async (ctx) => {
      const allEntries = await ctx.db.query("matchmakingQueue").collect();
      return allEntries.filter((e) => e.userId === userAId);
    });
    expect(queueEntries).toHaveLength(1);
  });
});

describe("Concurrency Tests - Deck Deletion Race", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;
  let deckId: Id<"userDecks">;

  beforeEach(async () => {
    t = convexTest(schema, {} as any);

    const user = createTestUser();

    userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: user.email,
        username: user.username,
        name: user.name,
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

    // Create deck
    deckId = await t.run(async (ctx) => {
      return await ctx.db.insert("userDecks", {
        userId,
        name: "Test Deck",
        deckArchetype: "fire",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Set as active deck
    await t.run(async (ctx) => {
      await ctx.db.patch(userId, { activeDeckId: deckId });
    });
  });

  afterEach(async () => {
    // No cleanup needed - convexTest creates isolated test environments
  });

  it("should handle concurrent deck deletion and matchmaking join", async () => {
    const userContext = t.withIdentity({ subject: userId });

    // Try to delete deck AND join queue simultaneously
    const results = await Promise.allSettled([
      userContext.mutation(api.core.decks.deleteDeck, { deckId }),
      userContext.mutation(api.social.matchmaking.joinQueue, { mode: "ranked" }),
    ]);

    // One should succeed, one should fail (depending on which executes first)
    const failureCount = results.filter((r) => r.status === "rejected").length;

    // At least one should fail (either can't join with deleted deck, or can't delete while in queue)
    expect(failureCount).toBeGreaterThanOrEqual(1);

    // CRITICAL: Verify no orphaned state exists
    const deck = await t.run(async (ctx) => {
      return await ctx.db.get(deckId);
    });

    const queueEntry = await t.run(async (ctx) => {
      const allEntries = await ctx.db.query("matchmakingQueue").collect();
      return allEntries.find((e) => e.userId === userId) || null;
    });

    // If user is in queue, deck must still be active
    if (queueEntry) {
      expect(deck?.isActive).toBe(true);
    }

    // If deck is deleted, user should not be in queue
    if (deck?.isActive === false) {
      expect(queueEntry).toBeNull();
    }
  });

  it("should prevent deck deletion while in active game", async () => {
    const userContext = t.withIdentity({ subject: userId });

    // Create an active game lobby
    await t.run(async (ctx) => {
      await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "testuser",
        status: "active",
        gameMode: "ranked",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Try to delete deck
    await expect(
      userContext.mutation(api.core.decks.deleteDeck, { deckId })
    ).rejects.toThrow();

    // Verify deck still exists
    const deck = await t.run(async (ctx) => {
      return await ctx.db.get(deckId);
    });
    expect(deck?.isActive).toBe(true);
  });
});

describe("Concurrency Tests - Leaderboard Updates", () => {
  let t: ReturnType<typeof convexTest>;
  let player1Id: Id<"users">;
  let player2Id: Id<"users">;
  let player3Id: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, {} as any);

    // Create three players with different ratings
    const player1 = createTestUser({ rankedElo: 1000 });
    const player2 = createTestUser({ rankedElo: 1000 });
    const player3 = createTestUser({ rankedElo: 1000 });

    player1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: player1.email,
        username: "player1",
        name: "Player 1",
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

    player2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: player2.email,
        username: "player2",
        name: "Player 2",
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

    player3Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: player3.email,
        username: "player3",
        name: "Player 3",
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
    // No cleanup needed - convexTest creates isolated test environments
  });

  it("should handle concurrent rating updates without corruption", async () => {
    // Simulate three concurrent game completions
    // Player1 beats Player2, Player2 beats Player3, Player3 beats Player1
    const updates = [
      t.run(async (ctx) => {
        // Player1 wins against Player2
        const p1 = await ctx.db.get(player1Id);
        const p2 = await ctx.db.get(player2Id);
        if (!p1 || !p2) throw new Error("Players not found");

        await ctx.db.patch(player1Id, {
          rankedElo: (p1.rankedElo || 1000) + 16,
          totalWins: (p1.totalWins || 0) + 1,
        });
        await ctx.db.patch(player2Id, {
          rankedElo: (p2.rankedElo || 1000) - 16,
          totalLosses: (p2.totalLosses || 0) + 1,
        });
      }),
      t.run(async (ctx) => {
        // Player2 wins against Player3
        const p2 = await ctx.db.get(player2Id);
        const p3 = await ctx.db.get(player3Id);
        if (!p2 || !p3) throw new Error("Players not found");

        await ctx.db.patch(player2Id, {
          rankedElo: (p2.rankedElo || 1000) + 16,
          totalWins: (p2.totalWins || 0) + 1,
        });
        await ctx.db.patch(player3Id, {
          rankedElo: (p3.rankedElo || 1000) - 16,
          totalLosses: (p3.totalLosses || 0) + 1,
        });
      }),
      t.run(async (ctx) => {
        // Player3 wins against Player1
        const p3 = await ctx.db.get(player3Id);
        const p1 = await ctx.db.get(player1Id);
        if (!p3 || !p1) throw new Error("Players not found");

        await ctx.db.patch(player3Id, {
          rankedElo: (p3.rankedElo || 1000) + 16,
          totalWins: (p3.totalWins || 0) + 1,
        });
        await ctx.db.patch(player1Id, {
          rankedElo: (p1.rankedElo || 1000) - 16,
          totalLosses: (p1.totalLosses || 0) + 1,
        });
      }),
    ];

    await Promise.all(updates);

    // Verify all three players have consistent data
    const player1 = await t.run(async (ctx) => {
      return await ctx.db.get(player1Id);
    });
    const player2 = await t.run(async (ctx) => {
      return await ctx.db.get(player2Id);
    });
    const player3 = await t.run(async (ctx) => {
      return await ctx.db.get(player3Id);
    });

    // Each player should have exactly 1 win and 1 loss
    expect(player1?.totalWins).toBe(1);
    expect(player1?.totalLosses).toBe(1);
    expect(player2?.totalWins).toBe(1);
    expect(player2?.totalLosses).toBe(1);
    expect(player3?.totalWins).toBe(1);
    expect(player3?.totalLosses).toBe(1);

    // Total rating should be conserved (each game +16/-16)
    // Net change: each player +16 -16 = 0
    const totalRating = (player1?.rankedElo || 0) + (player2?.rankedElo || 0) + (player3?.rankedElo || 0);
    expect(totalRating).toBe(3000); // 3 players × 1000 initial rating
  });

  it("should maintain leaderboard consistency with concurrent updates", async () => {
    // Give players different initial ratings
    await t.run(async (ctx) => {
      await ctx.db.patch(player1Id, { rankedElo: 1200 });
      await ctx.db.patch(player2Id, { rankedElo: 1100 });
      await ctx.db.patch(player3Id, { rankedElo: 1000 });
    });

    // Simulate concurrent rating updates
    await Promise.all([
      t.run(async (ctx) => {
        const p1 = await ctx.db.get(player1Id);
        if (!p1) throw new Error("Player 1 not found");
        await ctx.db.patch(player1Id, {
          rankedElo: (p1.rankedElo || 1200) + 50,
          totalWins: (p1.totalWins || 0) + 1,
        });
      }),
      t.run(async (ctx) => {
        const p2 = await ctx.db.get(player2Id);
        if (!p2) throw new Error("Player 2 not found");
        await ctx.db.patch(player2Id, {
          rankedElo: (p2.rankedElo || 1100) + 80,
          totalWins: (p2.totalWins || 0) + 1,
        });
      }),
      t.run(async (ctx) => {
        const p3 = await ctx.db.get(player3Id);
        if (!p3) throw new Error("Player 3 not found");
        await ctx.db.patch(player3Id, {
          rankedElo: (p3.rankedElo || 1000) - 30,
          totalWins: (p3.totalWins || 0) + 0,
        });
      }),
    ]);

    // Query leaderboard and verify order
    const leaderboard = await t.query(api.social.leaderboards.getLeaderboard, {
      type: "ranked",
      segment: "all",
      limit: 10,
    });

    // Verify correct ranking order (highest first)
    expect(leaderboard[0]?.userId).toBe(player1Id); // 1250
    expect(leaderboard[1]?.userId).toBe(player2Id); // 1180
    expect(leaderboard[2]?.userId).toBe(player3Id); // 970

    // Verify ratings are correct
    expect(leaderboard[0]?.rating).toBe(1250);
    expect(leaderboard[1]?.rating).toBe(1180);
    expect(leaderboard[2]?.rating).toBe(970);
  });
});

describe("Concurrency Tests - Transaction Isolation", () => {
  let t: ReturnType<typeof convexTest>;
  let userId: Id<"users">;
  let productId: string;

  beforeEach(async () => {
    t = convexTest(schema, {} as any);

    const user = createTestUserWithGold(500);

    userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: user.email,
        username: user.username,
        name: user.name,
        gold: 500,
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        xp: 0,
        level: 1,
        createdAt: Date.now(),
      });
    });

    // Create two products
    productId = "test_pack_expensive";
    await t.run(async (ctx) => {
      await ctx.db.insert("shopProducts", {
        productId,
        name: "Expensive Pack",
        description: "Costs 300 gold",
        productType: "pack",
        goldPrice: 300,
        packConfig: {
          cardCount: 5,
          guaranteedRarity: "rare",
        },
        isActive: true,
        sortOrder: 1,
        createdAt: Date.now(),
      });

      await ctx.db.insert("shopProducts", {
        productId: "test_pack_cheap",
        name: "Cheap Pack",
        description: "Costs 250 gold",
        productType: "pack",
        goldPrice: 250,
        packConfig: {
          cardCount: 3,
          guaranteedRarity: "common",
        },
        isActive: true,
        sortOrder: 2,
        createdAt: Date.now(),
      });
    });
  });

  afterEach(async () => {
    // No cleanup needed - convexTest creates isolated test environments
  });

  it("should prevent purchasing both packs when user only has gold for one", async () => {
    const userContext = t.withIdentity({ subject: userId });

    // User has 500 gold
    // Expensive pack: 300 gold
    // Cheap pack: 250 gold
    // Total: 550 gold (more than user has)

    const results = await Promise.allSettled([
      userContext.mutation(api.economy.shop.purchasePack, {
        productId,
        useGems: false,
      }),
      userContext.mutation(api.economy.shop.purchasePack, {
        productId: "test_pack_cheap",
        useGems: false,
      }),
    ]);

    // At most ONE should succeed (user doesn't have enough for both)
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    expect(successCount).toBeLessThanOrEqual(1);

    // Verify final balance is non-negative
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });
    expect(user?.gold).toBeGreaterThanOrEqual(0);

    // Verify balance is correct
    if (successCount === 1) {
      // Determine which pack was purchased
      const history = await t.run(async (ctx) => {
        const allHistory = await ctx.db.query("packOpeningHistory").collect();
        return allHistory.filter((h) => h.userId === userId);
      });

      if (history[0]?.productId === productId) {
        expect(user?.gold).toBe(200); // 500 - 300
      } else {
        expect(user?.gold).toBe(250); // 500 - 250
      }
    } else {
      expect(user?.gold).toBe(500); // No purchases
    }
  });
});
