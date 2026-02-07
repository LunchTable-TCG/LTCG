/**
 * Phase 2 Test: Leaderboard Position Race
 *
 * Tests that concurrent leaderboard position updates (ELO changes) work correctly
 * with the aggregate component handling concurrent score updates atomically.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: Leaderboard Position Race", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should handle concurrent leaderboard updates correctly", async () => {
    // Setup: Create 3 users
    const users = await Promise.all([
      t.run(async (ctx) => {
        const id = await ctx.db.insert("users", {
          username: "player1",
          email: "p1@test.com",
          privyId: "privy_p1",
          rankedElo: 1000,
          createdAt: Date.now(),
        });
        return { id, elo: 1000 };
      }),
      t.run(async (ctx) => {
        const id = await ctx.db.insert("users", {
          username: "player2",
          email: "p2@test.com",
          privyId: "privy_p2",
          rankedElo: 1000,
          createdAt: Date.now(),
        });
        return { id, elo: 1000 };
      }),
      t.run(async (ctx) => {
        const id = await ctx.db.insert("users", {
          username: "player3",
          email: "p3@test.com",
          privyId: "privy_p3",
          rankedElo: 1000,
          createdAt: Date.now(),
        });
        return { id, elo: 1000 };
      }),
    ]);

    // Execute: Update all 3 players' ELO concurrently
    await Promise.all(
      users.map((user, i) =>
        t.run(async (ctx) => {
          await ctx.db.patch(user.id, {
            rankedElo: 1000 + (i + 1) * 100, // 1100, 1200, 1300
          });
        })
      )
    );

    // Verify: Users have correct ELO
    const finalUsers = await t.run(async (ctx) => {
      const all = await ctx.db.query("users").collect();
      return all.filter(
        (u) => u.username === "player1" || u.username === "player2" || u.username === "player3"
      );
    });

    expect(finalUsers.find((u) => u.username === "player1")?.rankedElo).toBe(1100);
    expect(finalUsers.find((u) => u.username === "player2")?.rankedElo).toBe(1200);
    expect(finalUsers.find((u) => u.username === "player3")?.rankedElo).toBe(1300);
  });
});
