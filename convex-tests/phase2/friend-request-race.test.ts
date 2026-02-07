/**
 * Phase 2 Test: Friend Request Race Conditions
 *
 * Tests concurrent friend request scenarios:
 * 1. Mutual friend requests (auto-accept)
 * 2. Duplicate request prevention
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: Friend Request Race Conditions", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should correctly handle simultaneous mutual friend requests", async () => {
    // Setup: Create two users
    const [alice, bob] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "alice_mutual",
          email: "alice_mutual@test.com",
          privyId: "privy_alice_mutual",
          createdAt: Date.now(),
        });
      }),
      t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "bob_mutual",
          email: "bob_mutual@test.com",
          privyId: "privy_bob_mutual",
          createdAt: Date.now(),
        });
      }),
    ]);

    // Execute: Both send friend requests simultaneously
    const [aliceResult, bobResult] = await Promise.allSettled([
      t
        .withIdentity({ subject: "privy_alice_mutual" })
        .mutation(api.social.friends.sendFriendRequest, { friendUsername: "bob_mutual" }),
      t
        .withIdentity({ subject: "privy_bob_mutual" })
        .mutation(api.social.friends.sendFriendRequest, { friendUsername: "alice_mutual" }),
    ]);

    // Verify: At least one should succeed (auto-accept)
    const succeeded = [aliceResult, bobResult].filter((r) => r.status === "fulfilled");
    expect(succeeded.length).toBeGreaterThanOrEqual(1);

    // Verify: Exactly 2 friendship records (reciprocal)
    const friendships = await t.run(async (ctx) => {
      const all = await ctx.db.query("friendships").collect();
      return all.filter(
        (f) => f.userId === alice || f.userId === bob || f.friendId === alice || f.friendId === bob
      );
    });
    expect(friendships.length).toBe(2);

    // Verify: Both are accepted
    expect(friendships.every((f) => f.status === "accepted")).toBe(true);

    // Verify: Reciprocal integrity
    const aliceFriendship = friendships.find((f) => f.userId === alice);
    const bobFriendship = friendships.find((f) => f.userId === bob);
    expect(aliceFriendship?.friendId).toBe(bob);
    expect(bobFriendship?.friendId).toBe(alice);
  });

  it("should prevent duplicate friend requests", async () => {
    const [alice, bob] = await Promise.all([
      t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "alice_dup",
          email: "alice_dup@test.com",
          privyId: "privy_alice_dup",
          createdAt: Date.now(),
        });
      }),
      t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "bob_dup",
          email: "bob_dup@test.com",
          privyId: "privy_bob_dup",
          createdAt: Date.now(),
        });
      }),
    ]);

    // Execute: Alice sends two requests concurrently
    const [result1, result2] = await Promise.allSettled([
      t
        .withIdentity({ subject: "privy_alice_dup" })
        .mutation(api.social.friends.sendFriendRequest, { friendUsername: "bob_dup" }),
      t
        .withIdentity({ subject: "privy_alice_dup" })
        .mutation(api.social.friends.sendFriendRequest, { friendUsername: "bob_dup" }),
    ]);

    // Verify: Only one succeeds
    const succeeded = [result1, result2].filter((r) => r.status === "fulfilled");
    const failed = [result1, result2].filter((r) => r.status === "rejected");
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);

    // Verify: Exactly 2 friendship records (reciprocal), not 4
    const friendships = await t.run(async (ctx) => {
      const all = await ctx.db.query("friendships").collect();
      return all.filter(
        (f) => f.userId === alice || f.userId === bob || f.friendId === alice || f.friendId === bob
      );
    });
    expect(friendships.length).toBe(2);
  });
});
