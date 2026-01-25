/**
 * Tests for leaderboards.ts
 *
 * SKIPPED: Requires @convex-dev/aggregate component registration which is not
 * currently supported in Bun test environment. The official test helper uses
 * import.meta.glob which is Vite-specific. Integration tests recommended.
 */

import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createTestInstance } from "./test.setup";
import type { TestMutationCtx } from "./test.setup";

describe.skip("Leaderboards (requires aggregate component)", () => {
  describe("getLeaderboard", () => {
    it("should return empty array when no users exist", async () => {
      const t = createTestInstance();

      const rankings = await t.query(api.leaderboards.getLeaderboard, {
        type: "ranked",
        segment: "all",
      });

      expect(rankings!).toEqual([]);
    });

    it("should return ranked leaderboard ordered by ELO", async () => {
      const t = createTestInstance();

      // Create users with different ELO ratings
      await t.run(async (ctx: TestMutationCtx) => {
        for (let i = 0; i < 5; i++) {
          await ctx.db.insert("users", {
            username: `player${i}`,
            email: `player${i}@example.com`,
            createdAt: Date.now(),
            rankedElo: 1000 + i * 100,
            rankedWins: i * 10,
            rankedLosses: 5,
          });
        }
      });

      const rankings = await t.query(api.leaderboards.getLeaderboard, {
        type: "ranked",
        segment: "all",
        limit: 5,
      });

      expect(rankings).toHaveLength(5);
      expect(rankings[0].rating).toBe(1400); // Highest ELO first
      expect(rankings[4].rating).toBe(1000); // Lowest ELO last
    });

    it("should filter by player segment (humans only)", async () => {
      const t = createTestInstance();

      await t.run(async (ctx: TestMutationCtx) => {
        // Create human players
        await ctx.db.insert("users", {
          username: "human1",
          email: "human1@example.com",
          createdAt: Date.now(),
          rankedElo: 1500,
          isAiAgent: false,
        });

        // Create AI agents
        await ctx.db.insert("users", {
          username: "ai1",
          email: "ai1@example.com",
          createdAt: Date.now(),
          rankedElo: 1600,
          isAiAgent: true,
        });
      });

      const rankings = await t.query(api.leaderboards.getLeaderboard, {
        type: "ranked",
        segment: "humans",
        limit: 10,
      });

      expect(rankings.length).toBe(1);
      expect(rankings[0].username).toBe("human1");
      expect(rankings[0].isAiAgent).toBe(false);
    });

    it("should filter by player segment (AI only)", async () => {
      const t = createTestInstance();

      await t.run(async (ctx: TestMutationCtx) => {
        await ctx.db.insert("users", {
          username: "human1",
          email: "human1@example.com",
          createdAt: Date.now(),
          rankedElo: 1500,
          isAiAgent: false,
        });

        await ctx.db.insert("users", {
          username: "ai1",
          email: "ai1@example.com",
          createdAt: Date.now(),
          rankedElo: 1600,
          isAiAgent: true,
        });
      });

      const rankings = await t.query(api.leaderboards.getLeaderboard, {
        type: "ranked",
        segment: "ai",
        limit: 10,
      });

      expect(rankings.length).toBe(1);
      expect(rankings[0].username).toBe("ai1");
      expect(rankings[0].isAiAgent).toBe(true);
    });

    it("should return casual leaderboard ordered by rating", async () => {
      const t = createTestInstance();

      await t.run(async (ctx: TestMutationCtx) => {
        for (let i = 0; i < 3; i++) {
          await ctx.db.insert("users", {
            username: `casual${i}`,
            email: `casual${i}@example.com`,
            createdAt: Date.now(),
            casualRating: 1000 + i * 50,
            casualWins: i * 5,
            casualLosses: 2,
          });
        }
      });

      const rankings = await t.query(api.leaderboards.getLeaderboard, {
        type: "casual",
        segment: "all",
        limit: 5,
      });

      expect(rankings).toHaveLength(3);
      expect(rankings[0].rating).toBe(1100);
      expect(rankings[2].rating).toBe(1000);
    });

    it("should return story mode leaderboard ordered by XP", async () => {
      const t = createTestInstance();

      await t.run(async (ctx: TestMutationCtx) => {
        for (let i = 0; i < 3; i++) {
          const userId = await ctx.db.insert("users", {
            username: `story${i}`,
            email: `story${i}@example.com`,
            createdAt: Date.now(),
            storyWins: i * 5,
          });

          await ctx.db.insert("playerXP", {
            userId,
            currentXP: 1000 + i * 500,
            currentLevel: 5 + i,
            lifetimeXP: 1000 + i * 500,
            lastUpdatedAt: Date.now(),
          });
        }
      });

      const rankings = await t.query(api.leaderboards.getLeaderboard, {
        type: "story",
        segment: "all",
        limit: 5,
      });

      expect(rankings).toHaveLength(3);
      expect(rankings[0].rating).toBe(2000); // Highest XP first
      expect(rankings[2].rating).toBe(1000); // Lowest XP last
    });

    it("should respect limit parameter", async () => {
      const t = createTestInstance();

      await t.run(async (ctx: TestMutationCtx) => {
        for (let i = 0; i < 10; i++) {
          await ctx.db.insert("users", {
            username: `player${i}`,
            email: `player${i}@example.com`,
            createdAt: Date.now(),
            rankedElo: 1000 + i * 10,
          });
        }
      });

      const rankings = await t.query(api.leaderboards.getLeaderboard, {
        type: "ranked",
        segment: "all",
        limit: 3,
      });

      expect(rankings).toHaveLength(3);
    });
  });

  describe("getCachedLeaderboard", () => {
    it("should return cached leaderboard from snapshot", async () => {
      const t = createTestInstance();

      // Create a leaderboard snapshot
      await t.run(async (ctx: TestMutationCtx) => {
        await ctx.db.insert("leaderboardSnapshots", {
          leaderboardType: "ranked",
          playerSegment: "all",
          rankings: [
            {
              userId: "user1" as Id<"users">,
              username: "Player1",
              rank: 1,
              rating: 1500,
              level: 5,
              wins: 50,
              losses: 10,
              winRate: 0.83,
              isAiAgent: false,
            },
          ],
          lastUpdated: Date.now(),
        });
      });

      const cached = await t.query(api.leaderboards.getCachedLeaderboard, {
        type: "ranked",
        segment: "all",
      });

      expect(cached).not.toBeNull();
      expect(cached!.rankings).toHaveLength(1);
      expect(cached!.rankings[0].username).toBe("Player1");
    });

    it("should return null when no snapshot exists", async () => {
      const t = createTestInstance();

      const cached = await t.query(api.leaderboards.getCachedLeaderboard, {
        type: "ranked",
        segment: "all",
      });

      expect(cached).toBeNull();
    });
  });

  describe("getUserRank", () => {
    it("should calculate user rank correctly", async () => {
      const t = createTestInstance();

      const userId = await t.run(async (ctx: TestMutationCtx) => {
        // Create target user
        const uid = await ctx.db.insert("users", {
          username: "target",
          email: "target@example.com",
          createdAt: Date.now(),
          rankedElo: 1200,
        });

        // Create users with higher ratings
        for (let i = 0; i < 3; i++) {
          await ctx.db.insert("users", {
            username: `higher${i}`,
            email: `higher${i}@example.com`,
            createdAt: Date.now(),
            rankedElo: 1300 + i * 100,
          });
        }

        // Create users with lower ratings
        for (let i = 0; i < 2; i++) {
          await ctx.db.insert("users", {
            username: `lower${i}`,
            email: `lower${i}@example.com`,
            createdAt: Date.now(),
            rankedElo: 1000 + i * 50,
          });
        }

        return uid;
      });

      // TODO: Fix this test - getUserRank requires token, not userId
      // const rank = await t.query(api.leaderboards.getUserRank, {
      //   token: "test-token",
      //   type: "ranked",
      // });
      // expect(rank).toBe(4); // 3 users with higher ELO + target
    });

    it("should handle user with highest rating", async () => {
      const t = createTestInstance();

      const userId = await t.run(async (ctx: TestMutationCtx) => {
        // Create target user with highest rating
        const uid = await ctx.db.insert("users", {
          username: "best",
          email: "best@example.com",
          createdAt: Date.now(),
          rankedElo: 2000,
        });

        // Create users with lower ratings
        for (let i = 0; i < 3; i++) {
          await ctx.db.insert("users", {
            username: `player${i}`,
            email: `player${i}@example.com`,
            createdAt: Date.now(),
            rankedElo: 1000 + i * 100,
          });
        }

        return uid;
      });

      // TODO: Fix this test - getUserRank requires token, not userId
      // const rank = await t.query(api.leaderboards.getUserRank, {
      //   token: "test-token",
      //   type: "ranked",
      // });
      // expect(rank).toBe(1); // Rank 1 (highest)
    });
  });

  describe("refreshAllSnapshots", () => {
    it("should create snapshots for all leaderboard types and segments", async () => {
      const t = createTestInstance();

      // Create some users
      await t.run(async (ctx: TestMutationCtx) => {
        for (let i = 0; i < 2; i++) {
          await ctx.db.insert("users", {
            username: `player${i}`,
            email: `player${i}@example.com`,
            createdAt: Date.now(),
            rankedElo: 1000 + i * 100,
            casualRating: 1000 + i * 50,
          });
        }
      });

      // Trigger snapshot refresh
      await t.mutation(internal.leaderboards.refreshAllSnapshots);

      // Verify snapshots were created (6 total: ranked/casual/story × all/humans/ai)
      const snapshots = await t.run(async (ctx: TestMutationCtx) => {
        return await ctx.db.query("leaderboardSnapshots").collect();
      });

      // Should have created snapshots for ranked and casual (story requires playerXP)
      expect(snapshots.length).toBeGreaterThanOrEqual(6);
    });
  });
});

/**
 * Unit Tests (No Aggregate Component Required)
 *
 * These tests verify the helper functions and validation logic without
 * actually querying the leaderboards.
 */
describe("Leaderboards - Schema & Validation", () => {
  it("should allow creation of leaderboard snapshots", async () => {
    const t = createTestInstance();

    // Create a test user first
    const testUserId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("users", {
        username: "TestPlayer",
        email: "test@example.com",
        createdAt: Date.now(),
      });
    });

    const snapshotId = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.insert("leaderboardSnapshots", {
        leaderboardType: "ranked",
        playerSegment: "all",
        rankings: [
          {
            userId: testUserId,
            username: "TestPlayer",
            rank: 1,
            rating: 1500,
            level: 10,
            wins: 100,
            losses: 20,
            winRate: 0.83,
            isAiAgent: false,
          },
        ],
        lastUpdated: Date.now(),
      });
    });

    const snapshot = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.get(snapshotId);
    });

    expect(snapshot).toBeDefined();
    expect(snapshot?.leaderboardType).toBe("ranked");
    expect(snapshot?.rankings).toHaveLength(1);
  });

  it("should support all leaderboard types in schema", async () => {
    const t = createTestInstance();

    const types: Array<"ranked" | "casual" | "story"> = [
      "ranked",
      "casual",
      "story",
    ];

    for (const type of types) {
      const snapshotId = await t.run(async (ctx: TestMutationCtx) => {
        return await ctx.db.insert("leaderboardSnapshots", {
          leaderboardType: type,
          playerSegment: "all",
          rankings: [],
          lastUpdated: Date.now(),
        });
      });

      const snapshot = await t.run(async (ctx: TestMutationCtx) => {
        return await ctx.db.get(snapshotId);
      });

      expect(snapshot?.leaderboardType).toBe(type);
    }
  });

  it("should support all player segments in schema", async () => {
    const t = createTestInstance();

    const segments: Array<"all" | "humans" | "ai"> = ["all", "humans", "ai"];

    for (const segment of segments) {
      const snapshotId = await t.run(async (ctx: TestMutationCtx) => {
        return await ctx.db.insert("leaderboardSnapshots", {
          leaderboardType: "ranked",
          playerSegment: segment,
          rankings: [],
          lastUpdated: Date.now(),
        });
      });

      const snapshot = await t.run(async (ctx: TestMutationCtx) => {
        return await ctx.db.get(snapshotId);
      });

      expect(snapshot?.playerSegment).toBe(segment);
    }
  });
});
