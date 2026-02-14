/**
 * Index Correctness and Performance Tests
 *
 * These tests verify that queries use intended indexes and don't cause table scans.
 * Without proper indexes, queries on large datasets cause production timeouts.
 *
 * Test strategy:
 * 1. Seed large dataset (1000-10000 records)
 * 2. Perform indexed query
 * 3. Measure execution time
 * 4. Assert time < threshold (proves index is used)
 *
 * Index scan: <500ms
 * Table scan: >3000ms (unacceptable)
 */

import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

// Helper to create test instance
const createTestInstance = () => convexTest(schema, modules);

describe("Index Performance Tests", () => {
  describe("Leaderboard Query Performance", () => {
    it("should query 10k users by rankedElo in <500ms", async () => {
      const t = createTestInstance();

      // Seed 10,000 users with varying rankedElo
      await t.run(async (ctx) => {
        const users = [];
        for (let i = 0; i < 10000; i++) {
          users.push({
            email: `user${i}@test.com`,
            username: `user${i}`,
            rankedElo: 800 + Math.floor(Math.random() * 1400), // 800-2200 range
            casualRating: 1000,
            totalWins: Math.floor(Math.random() * 100),
            totalLosses: Math.floor(Math.random() * 100),
            xp: Math.floor(Math.random() * 10000),
            level: 1,
            gold: 1000,
            isAiAgent: i % 10 === 0, // 10% AI agents
            createdAt: Date.now() - i * 1000,
          });
        }

        // Batch insert for performance
        for (const user of users) {
          await ctx.db.insert("users", user);
        }
      });

      // Test: Query top 100 ranked players
      const start = Date.now();
      const results = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("rankedElo", (q) => q.gt("rankedElo", 1500))
          .order("desc")
          .take(100);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(results.length).toBeLessThanOrEqual(100);
      expect(duration).toBeLessThan(500); // Index scan should be fast
      console.log(`Leaderboard query completed in ${duration}ms`);

      // Verify results are sorted correctly
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i]?.rankedElo ?? 0).toBeGreaterThanOrEqual(results[i + 1]?.rankedElo ?? 0);
      }
    });

    it("should query segmented leaderboard (humans only) in <500ms", async () => {
      const t = createTestInstance();

      // Seed 5,000 users (mix of humans and AI)
      await t.run(async (ctx) => {
        for (let i = 0; i < 5000; i++) {
          await ctx.db.insert("users", {
            email: `player${i}@test.com`,
            username: `player${i}`,
            rankedElo: 900 + Math.floor(Math.random() * 1200),
            casualRating: 1000,
            totalWins: 0,
            totalLosses: 0,
            xp: 0,
            level: 1,
            gold: 1000,
            isAiAgent: i % 3 === 0, // 33% AI agents
            createdAt: Date.now(),
          });
        }
      });

      // Test: Query humans only using composite index
      const start = Date.now();
      const results = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("rankedElo_byType", (q) => q.eq("isAiAgent", false).gt("rankedElo", 1000))
          .order("desc")
          .take(100);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(duration).toBeLessThan(500);
      expect(results.length).toBeGreaterThan(0);

      // Verify all results are human players
      for (const user of results) {
        expect(user.isAiAgent).toBe(false);
      }

      console.log(`Segmented leaderboard query completed in ${duration}ms`);
    });

    // XP leaderboard test removed — xp/level fields migrated to playerXP table
  });

  describe("User Lookup by Email", () => {
    it("should use email index, not table scan", async () => {
      const t = createTestInstance();

      // Seed 5,000 users
      await t.run(async (ctx) => {
        for (let i = 0; i < 5000; i++) {
          await ctx.db.insert("users", {
            email: `email${i}@test.com`,
            username: `user${i}`,
            rankedElo: 1000,
            casualRating: 1000,
            totalWins: 0,
            totalLosses: 0,
            xp: 0,
            level: 1,
            gold: 1000,
            createdAt: Date.now(),
          });
        }
      });

      // Test: Lookup user by email
      const targetEmail = "email2500@test.com";
      const start = Date.now();
      const result = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", targetEmail))
          .first();
      });
      const duration = Date.now() - start;

      // Assertions
      expect(result).not.toBeNull();
      expect(result?.email).toBe(targetEmail);
      expect(duration).toBeLessThan(100); // Email lookup should be extremely fast
      console.log(`Email lookup completed in ${duration}ms`);
    });

    it("should lookup by username efficiently", async () => {
      const t = createTestInstance();

      // Seed 3,000 users
      await t.run(async (ctx) => {
        for (let i = 0; i < 3000; i++) {
          await ctx.db.insert("users", {
            email: `user${i}@test.com`,
            username: `player_${i}`,
            rankedElo: 1000,
            casualRating: 1000,
            totalWins: 0,
            totalLosses: 0,
            xp: 0,
            level: 1,
            gold: 1000,
            createdAt: Date.now(),
          });
        }
      });

      // Test: Lookup by username
      const targetUsername = "player_1500";
      const start = Date.now();
      const result = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("username", (q) => q.eq("username", targetUsername))
          .first();
      });
      const duration = Date.now() - start;

      // Assertions
      expect(result).not.toBeNull();
      expect(result?.username).toBe(targetUsername);
      expect(duration).toBeLessThan(100);
      console.log(`Username lookup completed in ${duration}ms`);
    });
  });

  describe("Pack History Pagination", () => {
    it("should use by_user_time index efficiently", async () => {
      const t = createTestInstance();

      // Create test user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "packuser@test.com",
          username: "packuser",
          rankedElo: 1000,
          casualRating: 1000,
          totalWins: 0,
          totalLosses: 0,
          xp: 0,
          level: 1,
          gold: 10000,
          createdAt: Date.now(),
        });
      });

      // Create card definitions
      const cardIds = await t.run(async (ctx) => {
        const ids: Array<Id<"cardDefinitions">> = [];
        for (let i = 0; i < 10; i++) {
          const id = await ctx.db.insert("cardDefinitions", {
            name: `Card ${i}`,
            rarity: "common" as const,
            archetype: "neutral",
            cardType: "stereotype",
            cost: 2,
            attack: 1000,
            defense: 1000,
            isActive: true,
            createdAt: Date.now(),
          });
          ids.push(id);
        }
        return ids;
      });

      // Seed 1,000 pack openings
      await t.run(async (ctx) => {
        for (let i = 0; i < 1000; i++) {
          await ctx.db.insert("packOpeningHistory", {
            userId,
            productId: "starter_pack",
            packType: "starter",
            cardsReceived: cardIds.slice(0, 5).map((id) => ({
              cardDefinitionId: id,
              name: `Card ${i}`,
              rarity: "common" as const,
            })),
            currencyUsed: "gold",
            amountPaid: 100,
            openedAt: Date.now() - i * 60000, // Spread over time
          });
        }
      });

      // Test: Paginate user's pack history
      const start = Date.now();
      const results = await t.run(async (ctx) => {
        return await ctx.db
          .query("packOpeningHistory")
          .withIndex("by_user_time", (q) => q.eq("userId", userId))
          .order("desc")
          .take(50);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(results.length).toBe(50);
      expect(duration).toBeLessThan(200); // Should be very fast with index
      console.log(`Pack history pagination completed in ${duration}ms`);

      // Verify results are sorted by time
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i]?.openedAt).toBeGreaterThanOrEqual(results[i + 1]?.openedAt);
      }
    });

    it("should query global pack history by time", async () => {
      const t = createTestInstance();

      // Create multiple users
      const userIds = await t.run(async (ctx) => {
        const ids: Array<Id<"users">> = [];
        for (let i = 0; i < 10; i++) {
          const id = await ctx.db.insert("users", {
            email: `packuser${i}@test.com`,
            username: `packuser${i}`,
            rankedElo: 1000,
            casualRating: 1000,
            totalWins: 0,
            totalLosses: 0,
            xp: 0,
            level: 1,
            gold: 1000,
            createdAt: Date.now(),
          });
          ids.push(id);
        }
        return ids;
      });

      // Create card definition
      const cardId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Test Card",
          rarity: "common" as const,
          archetype: "neutral",
          cardType: "stereotype",
          cost: 2,
          attack: 1000,
          defense: 1000,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      // Seed 2,000 pack openings across users
      await t.run(async (ctx) => {
        for (let i = 0; i < 2000; i++) {
          const userIdForPack = userIds[i % userIds.length];
          if (!userIdForPack) continue;
          await ctx.db.insert("packOpeningHistory", {
            userId: userIdForPack,
            productId: "starter_pack",
            packType: "starter",
            cardsReceived: [
              {
                cardDefinitionId: cardId,
                name: "Test Card",
                rarity: "common" as const,
              },
            ],
            currencyUsed: "gold",
            amountPaid: 100,
            openedAt: Date.now() - i * 30000,
          });
        }
      });

      // Test: Query recent pack openings
      const start = Date.now();
      const results = await t.run(async (ctx) => {
        return await ctx.db
          .query("packOpeningHistory")
          .withIndex("by_time")
          .order("desc")
          .take(100);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(results.length).toBe(100);
      expect(duration).toBeLessThan(300);
      console.log(`Global pack history query completed in ${duration}ms`);
    });
  });

  describe("Matchmaking Queue Performance", () => {
    it("should use by_mode_rating composite index", async () => {
      const t = createTestInstance();

      // Seed 1,000 matchmaking entries
      await t.run(async (ctx) => {
        for (let i = 0; i < 1000; i++) {
          const userId = await ctx.db.insert("users", {
            email: `queueuser${i}@test.com`,
            username: `queueuser${i}`,
            rankedElo: 800 + Math.floor(Math.random() * 1400),
            casualRating: 1000,
            totalWins: 0,
            totalLosses: 0,
            xp: 0,
            level: 1,
            gold: 1000,
            createdAt: Date.now(),
          });

          const rating = 800 + Math.floor(Math.random() * 1400);
          await ctx.db.insert("matchmakingQueue", {
            userId,
            username: `queueuser${i}`,
            rating,
            deckArchetype: "fire",
            mode: i % 2 === 0 ? "ranked" : "casual",
            joinedAt: Date.now() - i * 1000,
          });
        }
      });

      // Test: Find ranked matches in rating range
      const targetRating = 1200;
      const ratingWindow = 200;

      const start = Date.now();
      const results = await t.run(async (ctx) => {
        return await ctx.db
          .query("matchmakingQueue")
          .withIndex("by_mode_rating", (q) =>
            q.eq("mode", "ranked").gte("rating", targetRating - ratingWindow)
          )
          .filter((q) => q.lte(q.field("rating"), targetRating + ratingWindow))
          .take(10);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(duration).toBeLessThan(200); // Should be fast with composite index
      console.log(`Matchmaking query completed in ${duration}ms`);

      // Verify all results are ranked mode
      for (const entry of results) {
        expect(entry.mode).toBe("ranked");
        expect(entry.rating).toBeGreaterThanOrEqual(targetRating - ratingWindow);
        expect(entry.rating).toBeLessThanOrEqual(targetRating + ratingWindow);
      }
    });

    it("should handle queue by user lookup", async () => {
      const t = createTestInstance();

      // Create test user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "queuetest@test.com",
          username: "queuetest",
          rankedElo: 1200,
          casualRating: 1000,
          totalWins: 0,
          totalLosses: 0,
          xp: 0,
          level: 1,
          gold: 1000,
          createdAt: Date.now(),
        });
      });

      // Seed 500 queue entries
      await t.run(async (ctx) => {
        for (let i = 0; i < 500; i++) {
          const uid = await ctx.db.insert("users", {
            email: `quser${i}@test.com`,
            username: `quser${i}`,
            rankedElo: 1000,
            casualRating: 1000,
            totalWins: 0,
            totalLosses: 0,
            xp: 0,
            level: 1,
            gold: 1000,
            createdAt: Date.now(),
          });

          await ctx.db.insert("matchmakingQueue", {
            userId: uid,
            username: `quser${i}`,
            rating: 1000 + i,
            deckArchetype: "water",
            mode: "casual",
            joinedAt: Date.now() - i * 1000,
          });
        }

        // Add target user to queue
        await ctx.db.insert("matchmakingQueue", {
          userId,
          username: "queuetest",
          rating: 1200,
          deckArchetype: "fire",
          mode: "ranked",
          joinedAt: Date.now(),
        });
      });

      // Test: Check if user is in queue
      const start = Date.now();
      const result = await t.run(async (ctx) => {
        return await ctx.db
          .query("matchmakingQueue")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first();
      });
      const duration = Date.now() - start;

      // Assertions
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(duration).toBeLessThan(100); // Should be instant
      console.log(`Queue user lookup completed in ${duration}ms`);
    });
  });

  describe("Game Events Query Performance", () => {
    it("should use by_lobby index for event log", async () => {
      const t = createTestInstance();

      // Create game lobby
      const lobbyId = await t.run(async (ctx) => {
        const hostId = await ctx.db.insert("users", {
          email: "host@test.com",
          username: "host",
          rankedElo: 1200,
          casualRating: 1000,
          totalWins: 0,
          totalLosses: 0,
          xp: 0,
          level: 1,
          gold: 1000,
          createdAt: Date.now(),
        });

        return await ctx.db.insert("gameLobbies", {
          hostId,
          hostUsername: "host",
          hostRank: "silver",
          hostRating: 1200,
          deckArchetype: "fire",
          mode: "ranked",
          status: "active",
          isPrivate: false,
          createdAt: Date.now(),
        });
      });

      // Seed 5,000 game events
      await t.run(async (ctx) => {
        const playerId = await ctx.db.insert("users", {
          email: "player@test.com",
          username: "player",
          rankedElo: 1000,
          casualRating: 1000,
          totalWins: 0,
          totalLosses: 0,
          xp: 0,
          level: 1,
          gold: 1000,
          createdAt: Date.now(),
        });

        for (let i = 0; i < 5000; i++) {
          await ctx.db.insert("gameEvents", {
            lobbyId,
            gameId: "test-game-123",
            turnNumber: Math.floor(i / 100) + 1,
            eventType: i % 5 === 0 ? "card_drawn" : "damage",
            playerId,
            playerUsername: "player",
            description: `Event ${i}`,
            timestamp: Date.now() - (5000 - i) * 100,
          });
        }
      });

      // Test: Query events for lobby
      const start = Date.now();
      const results = await t.run(async (ctx) => {
        return await ctx.db
          .query("gameEvents")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
          .order("asc")
          .take(100);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(results.length).toBe(100);
      expect(duration).toBeLessThan(300); // Should be fast with index
      console.log(`Game events query completed in ${duration}ms`);

      // Verify results are for correct lobby
      for (const event of results) {
        expect(event.lobbyId).toBe(lobbyId);
      }
    });

    it("should query events by timestamp range", async () => {
      const t = createTestInstance();

      // Create lobby
      const lobbyId = await t.run(async (ctx) => {
        const hostId = await ctx.db.insert("users", {
          email: "eventhost@test.com",
          username: "eventhost",
          rankedElo: 1000,
          casualRating: 1000,
          totalWins: 0,
          totalLosses: 0,
          xp: 0,
          level: 1,
          gold: 1000,
          createdAt: Date.now(),
        });

        return await ctx.db.insert("gameLobbies", {
          hostId,
          hostUsername: "eventhost",
          hostRank: "bronze",
          hostRating: 1000,
          deckArchetype: "earth",
          mode: "casual",
          status: "active",
          isPrivate: false,
          createdAt: Date.now(),
        });
      });

      // Seed 3,000 events
      const now = Date.now();
      await t.run(async (ctx) => {
        const playerId = await ctx.db.insert("users", {
          email: "eventplayer@test.com",
          username: "eventplayer",
          rankedElo: 1000,
          casualRating: 1000,
          totalWins: 0,
          totalLosses: 0,
          xp: 0,
          level: 1,
          gold: 1000,
          createdAt: now,
        });

        for (let i = 0; i < 3000; i++) {
          await ctx.db.insert("gameEvents", {
            lobbyId,
            gameId: "event-game-456",
            turnNumber: 1,
            eventType: "card_drawn",
            playerId,
            playerUsername: "eventplayer",
            description: `Draw event ${i}`,
            timestamp: now - (3000 - i) * 1000, // Spread over time
          });
        }
      });

      // Test: Query recent events
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const start = Date.now();
      const results = await t.run(async (ctx) => {
        return await ctx.db
          .query("gameEvents")
          .withIndex("by_timestamp", (q) => q.gt("timestamp", fiveMinutesAgo))
          .order("desc")
          .take(50);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(300);
      console.log(`Timestamp range query completed in ${duration}ms`);

      // Verify all results are recent
      for (const event of results) {
        expect(event.timestamp).toBeGreaterThan(fiveMinutesAgo);
      }
    });
  });

  describe("Currency Transaction Queries", () => {
    it("should paginate user transactions efficiently", async () => {
      const t = createTestInstance();

      // Create test user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "txuser@test.com",
          username: "txuser",
          rankedElo: 1000,
          casualRating: 1000,
          totalWins: 0,
          totalLosses: 0,
          xp: 0,
          level: 1,
          gold: 10000,
          createdAt: Date.now(),
        });
      });

      // Seed 2,000 transactions
      await t.run(async (ctx) => {
        let balance = 1000;
        for (let i = 0; i < 2000; i++) {
          balance += Math.floor(Math.random() * 100);
          await ctx.db.insert("currencyTransactions", {
            userId,
            transactionType: "reward",
            currencyType: "gold",
            amount: 100,
            balanceAfter: balance,
            description: `Transaction ${i}`,
            createdAt: Date.now() - (2000 - i) * 60000,
          });
        }
      });

      // Test: Paginate recent transactions
      const start = Date.now();
      const results = await t.run(async (ctx) => {
        return await ctx.db
          .query("currencyTransactions")
          .withIndex("by_user_time", (q) => q.eq("userId", userId))
          .order("desc")
          .take(50);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(results.length).toBe(50);
      expect(duration).toBeLessThan(200);
      console.log(`Transaction pagination completed in ${duration}ms`);

      // Verify sorting
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i]?.createdAt).toBeGreaterThanOrEqual(results[i + 1]?.createdAt);
      }
    });
  });

  describe("Match History Queries", () => {
    it("should query user match history efficiently", async () => {
      const t = createTestInstance();

      // Create test users
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "matchuser@test.com",
          username: "matchuser",
          rankedElo: 1200,
          casualRating: 1100,
          totalWins: 50,
          totalLosses: 30,
          xp: 5000,
          level: 10,
          gold: 1000,
          createdAt: Date.now(),
        });
      });

      // Create opponents
      const opponentIds = await t.run(async (ctx) => {
        const ids: Array<Id<"users">> = [];
        for (let i = 0; i < 10; i++) {
          const id = await ctx.db.insert("users", {
            email: `opponent${i}@test.com`,
            username: `opponent${i}`,
            rankedElo: 1000 + i * 50,
            casualRating: 1000,
            totalWins: 0,
            totalLosses: 0,
            xp: 0,
            level: 1,
            gold: 1000,
            createdAt: Date.now(),
          });
          ids.push(id);
        }
        return ids;
      });

      // Seed 1,000 matches
      await t.run(async (ctx) => {
        for (let i = 0; i < 1000; i++) {
          const isWin = i % 2 === 0;
          const opponentId = opponentIds[i % opponentIds.length];
          if (!opponentId) continue;
          await ctx.db.insert("matchHistory", {
            winnerId: isWin ? userId : opponentId,
            loserId: isWin ? opponentId : userId,
            gameType: i % 3 === 0 ? "ranked" : "casual",
            winnerRatingBefore: 1200,
            winnerRatingAfter: 1210,
            loserRatingBefore: 1100,
            loserRatingAfter: 1090,
            xpAwarded: 50,
            completedAt: Date.now() - (1000 - i) * 60000,
          });
        }
      });

      // Test: Query user's wins
      const start = Date.now();
      const wins = await t.run(async (ctx) => {
        return await ctx.db
          .query("matchHistory")
          .withIndex("by_winner", (q) => q.eq("winnerId", userId))
          .order("desc")
          .take(50);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(wins.length).toBe(50);
      expect(duration).toBeLessThan(200);
      console.log(`Match history query completed in ${duration}ms`);

      // Verify all are wins
      for (const match of wins) {
        expect(match.winnerId).toBe(userId);
      }
    });

    it("should query matches by game type and time", async () => {
      const t = createTestInstance();

      // Create users
      const userIds = await t.run(async (ctx) => {
        const ids: Array<Id<"users">> = [];
        for (let i = 0; i < 20; i++) {
          const id = await ctx.db.insert("users", {
            email: `gameuser${i}@test.com`,
            username: `gameuser${i}`,
            rankedElo: 1000 + i * 20,
            casualRating: 1000,
            totalWins: 0,
            totalLosses: 0,
            xp: 0,
            level: 1,
            gold: 1000,
            createdAt: Date.now(),
          });
          ids.push(id);
        }
        return ids;
      });

      // Seed 1,500 matches
      const now = Date.now();
      await t.run(async (ctx) => {
        for (let i = 0; i < 1500; i++) {
          const winnerId = userIds[i % userIds.length];
          const loserId = userIds[(i + 1) % userIds.length];
          if (!winnerId || !loserId) continue;
          await ctx.db.insert("matchHistory", {
            winnerId,
            loserId,
            gameType: i % 3 === 0 ? "ranked" : "casual",
            winnerRatingBefore: 1000,
            winnerRatingAfter: 1015,
            loserRatingBefore: 1000,
            loserRatingAfter: 985,
            xpAwarded: 50,
            completedAt: now - (1500 - i) * 30000,
          });
        }
      });

      // Test: Query recent ranked matches
      const start = Date.now();
      const rankedMatches = await t.run(async (ctx) => {
        return await ctx.db
          .query("matchHistory")
          .withIndex("by_game_type", (q) => q.eq("gameType", "ranked"))
          .order("desc")
          .take(100);
      });
      const duration = Date.now() - start;

      // Assertions
      expect(rankedMatches.length).toBe(100);
      expect(duration).toBeLessThan(300);
      console.log(`Game type filter query completed in ${duration}ms`);

      // Verify all are ranked
      for (const match of rankedMatches) {
        expect(match.gameType).toBe("ranked");
      }
    });
  });

  describe("Story Progress Queries", () => {
    it("should query user progress efficiently", async () => {
      const t = createTestInstance();

      // Create test user
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "storyuser@test.com",
          username: "storyuser",
          rankedElo: 1000,
          casualRating: 1000,
          totalWins: 0,
          totalLosses: 0,
          xp: 1000,
          level: 5,
          gold: 1000,
          createdAt: Date.now(),
        });
      });

      // Seed 500 story progress entries
      await t.run(async (ctx) => {
        for (let act = 1; act <= 5; act++) {
          for (let chapter = 1; chapter <= 10; chapter++) {
            for (const difficulty of ["normal", "hard", "legendary"] as const) {
              await ctx.db.insert("storyProgress", {
                userId,
                actNumber: act,
                chapterNumber: chapter,
                difficulty,
                status: chapter <= 5 ? "completed" : "available",
                starsEarned: chapter <= 5 ? 3 : 0,
                bestScore: chapter <= 5 ? 8000 : undefined,
                timesAttempted: chapter <= 5 ? 1 : 0,
                timesCompleted: chapter <= 5 ? 1 : 0,
                firstCompletedAt: chapter <= 5 ? Date.now() : undefined,
                lastAttemptedAt: chapter <= 5 ? Date.now() : undefined,
              });
            }
          }
        }
      });

      // Test: Query user's progress
      const start = Date.now();
      const progress = await t.run(async (ctx) => {
        return await ctx.db
          .query("storyProgress")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
      });
      const duration = Date.now() - start;

      // Assertions
      expect(progress.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500);
      console.log(`Story progress query completed in ${duration}ms`);
    });
  });
});
