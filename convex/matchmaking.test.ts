import { expect, test, describe } from "vitest";
import { createTestInstance } from "./test.setup";
import type { TestMutationCtx } from "./test.setup";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

describe("Matchmaking System", () => {
  test("getMyStatus returns null when not in queue", async () => {
    const t = createTestInstance();

    // Create test user with session
    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "player1",
        email: "player1@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });
    });

    const sessionToken = await t.run(async (ctx: TestMutationCtx) => {
      const token = "test_token_player1";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000, // 24 hours
      });
      return token;
    });

    const status = await t.query(api.matchmaking.getMyStatus, {
      token: sessionToken,
    });

    expect(status!).toBeNull();
  });

  test("joinQueue adds player to queue", async () => {
    const t = createTestInstance();

    // Create test user with session
    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "player1",
        email: "player1@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });
    });

    const sessionToken = await t.run(async (ctx: TestMutationCtx) => {
      const token = "test_token_player1";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });
      return token;
    });

    await t.mutation(api.matchmaking.joinQueue, {
      token: sessionToken,
      mode: "ranked",
      deckArchetype: "fire",
    });

    const status = await t.query(api.matchmaking.getMyStatus, {
      token: sessionToken,
    });

    expect(status?.status).toBe("searching");
    expect(status?.mode).toBe("ranked");
  });

  test("leaveQueue removes player from queue", async () => {
    const t = createTestInstance();

    // Create test user with session
    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "player1",
        email: "player1@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });
    });

    const sessionToken = await t.run(async (ctx: TestMutationCtx) => {
      const token = "test_token_player1";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });
      return token;
    });

    await t.mutation(api.matchmaking.joinQueue, {
      token: sessionToken,
      mode: "ranked",
      deckArchetype: "fire",
    });

    await t.mutation(api.matchmaking.leaveQueue, {
      token: sessionToken,
    });

    const status = await t.query(api.matchmaking.getMyStatus, {
      token: sessionToken,
    });

    expect(status!).toBeNull();
  });

  // SKIPPED: Test needs proper active deck setup
  test.skip("findMatches creates game for similar ratings", async () => {
    const t = createTestInstance();

    // Create two test users with similar ratings and active decks
    const player1 = await t.run(async (ctx: TestMutationCtx) => {
      // Create a deck for player1
      const deckId = await ctx.db.insert("userDecks", {
        userId: "" as any, // Will patch after creating user
        name: "Player 1 Deck",
        deckArchetype: "fire",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const userId = await ctx.db.insert("users", {
        username: "player1",
        email: "player1@test.com",
        rankedElo: 1200,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        activeDeckId: deckId,
        createdAt: Date.now(),
      });

      // Update deck with correct userId
      await ctx.db.patch(deckId, { userId });

      const token = "test_token_player1";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });

      return { userId, token };
    });

    const player2 = await t.run(async (ctx: TestMutationCtx) => {
      // Create a deck for player2
      const deckId = await ctx.db.insert("userDecks", {
        userId: "" as any, // Will patch after creating user
        name: "Player 2 Deck",
        deckArchetype: "water",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const userId = await ctx.db.insert("users", {
        username: "player2",
        email: "player2@test.com",
        rankedElo: 1250, // 50 point difference
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        activeDeckId: deckId,
        createdAt: Date.now(),
      });

      // Update deck with correct userId
      await ctx.db.patch(deckId, { userId });

      const token = "test_token_player2";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });

      return { userId, token };
    });

    // Both join queue
    await t.mutation(api.matchmaking.joinQueue, {
      token: player1.token,
      mode: "ranked",
      deckArchetype: "fire",
    });

    await t.mutation(api.matchmaking.joinQueue, {
      token: player2.token,
      mode: "ranked",
      deckArchetype: "water",
    });

    // Run matching
    await t.action(internal.matchmaking.findMatches);

    // Verify game created
    const games = await t.run(async (ctx: TestMutationCtx) => ctx.db.query("gameLobbies").collect());

    expect(games.length).toBe(1);
    expect(games![0]!.status).toBe("active");

    // Verify removed from queue
    const queue = await t.run(async (ctx: TestMutationCtx) => ctx.db.query("matchmakingQueue").collect());

    expect(queue.length).toBe(0);
  });

  test("findMatches does not match distant ratings initially", async () => {
    const t = createTestInstance();

    // Create two test users with distant ratings
    const player1 = await t.run(async (ctx: TestMutationCtx) => {
      const userId = await ctx.db.insert("users", {
        username: "player1",
        email: "player1@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });

      const token = "test_token_player1";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });

      return { userId, token };
    });

    const player2 = await t.run(async (ctx: TestMutationCtx) => {
      const userId = await ctx.db.insert("users", {
        username: "player2",
        email: "player2@test.com",
        rankedElo: 1500, // 500 point difference > 200 initial window
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });

      const token = "test_token_player2";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });

      return { userId, token };
    });

    // Both join queue
    await t.mutation(api.matchmaking.joinQueue, {
      token: player1.token,
      mode: "ranked",
      deckArchetype: "fire",
    });

    await t.mutation(api.matchmaking.joinQueue, {
      token: player2.token,
      mode: "ranked",
      deckArchetype: "water",
    });

    // Run matching immediately (initial window = ±200)
    await t.action(internal.matchmaking.findMatches);

    // No match should be created
    const games = await t.run(async (ctx: TestMutationCtx) => ctx.db.query("gameLobbies").collect());

    expect(games.length).toBe(0);

    // Both players should still be in queue
    const queue = await t.run(async (ctx: TestMutationCtx) => ctx.db.query("matchmakingQueue").collect());

    expect(queue.length).toBe(2);
  });

  test("rating window expands over time", async () => {
    const t = createTestInstance();

    // Create test user
    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "player1",
        email: "player1@test.com",
        rankedElo: 1200,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });
    });

    const sessionToken = await t.run(async (ctx: TestMutationCtx) => {
      const token = "test_token_player1";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });
      return token;
    });

    // Join queue with timestamp 20 seconds ago
    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("matchmakingQueue", {
        userId,
        username: "player1",
        rating: 1200,
        deckArchetype: "fire",
        mode: "ranked",
        joinedAt: Date.now() - 20000, // 20 seconds ago
      });
    });

    const status = await t.query(api.matchmaking.getMyStatus, {
      token: sessionToken,
    });

    // Window should expand: 200 + (2 expansions * 50) = 300
    expect(status?.currentRatingWindow).toBe(300);
  });

  test("cleanupExpiredEntries removes old queue entries", async () => {
    const t = createTestInstance();

    // Create dummy user
    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "expired",
        email: "expired@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });
    });

    // Add expired entry
    await t.run(async (ctx: TestMutationCtx) => {
      await ctx.db.insert("matchmakingQueue", {
        userId,
        username: "expired",
        rating: 1000,
        deckArchetype: "fire",
        mode: "ranked",
        joinedAt: Date.now() - 400000, // 6+ minutes ago
      });
    });

    // Run cleanup
    await t.mutation(internal.matchmaking.cleanupExpiredEntries);

    // Verify removed
    const queue = await t.run(async (ctx: TestMutationCtx) => ctx.db.query("matchmakingQueue").collect());

    expect(queue.length).toBe(0);
  });

  test("prevents joining queue when already in queue", async () => {
    const t = createTestInstance();

    // Create test user
    const userId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "player1",
        email: "player1@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });
    });

    const sessionToken = await t.run(async (ctx: TestMutationCtx) => {
      const token = "test_token_player1";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });
      return token;
    });

    // Join queue
    await t.mutation(api.matchmaking.joinQueue, {
      token: sessionToken,
      mode: "ranked",
      deckArchetype: "fire",
    });

    // Try to join again - should throw error
    await expect(
      t.mutation(api.matchmaking.joinQueue, {
        token: sessionToken,
        mode: "ranked",
        deckArchetype: "water",
      })
    ).rejects.toThrow("Already in matchmaking queue");
  });

  test("getQueueStats returns accurate statistics", async () => {
    const t = createTestInstance();

    // Create test users
    const user1 = await t.run(async (ctx: TestMutationCtx) => {
      const userId = await ctx.db.insert("users", {
        username: "player1",
        email: "player1@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });
      const token = "test_token_player1";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });
      return { userId, token };
    });

    const user2 = await t.run(async (ctx: TestMutationCtx) => {
      const userId = await ctx.db.insert("users", {
        username: "player2",
        email: "player2@test.com",
        rankedElo: 1000,
        casualRating: 1000,
        totalWins: 0,
        totalLosses: 0,
        createdAt: Date.now(),
      });
      const token = "test_token_player2";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
      });
      return { userId, token };
    });

    // Join queues
    await t.mutation(api.matchmaking.joinQueue, {
      token: user1.token,
      mode: "ranked",
      deckArchetype: "fire",
    });

    await t.mutation(api.matchmaking.joinQueue, {
      token: user2.token,
      mode: "casual",
      deckArchetype: "water",
    });

    // Get stats
    const stats = await t.query(api.matchmaking.getQueueStats);

    expect(stats.totalPlayers).toBe(2);
    expect(stats.byMode.ranked).toBe(1);
    expect(stats.byMode.casual).toBe(1);
    expect(stats.averageWaitTime).toBeGreaterThanOrEqual(0);
  });
});
