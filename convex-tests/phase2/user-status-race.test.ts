/**
 * Phase 2 Test: User Status Update Race
 *
 * Tests that concurrent user status updates result in a valid final state
 * using last-write-wins semantics (acceptable for non-critical status).
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: User Status Update Race", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should handle concurrent status updates gracefully", async () => {
    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "statususer",
        email: "status@test.com",
        privyId: "privy_status",
        createdAt: Date.now(),
      });
    });

    // Setup: Create user presence with idle status
    const presenceId = await t.run(async (ctx) => {
      return await ctx.db.insert("userPresence", {
        userId,
        username: "statususer",
        lastActiveAt: Date.now(),
        status: "idle",
      });
    });

    // Execute: Update status concurrently to different values
    await Promise.all([
      t.run(async (ctx) => {
        await ctx.db.patch(presenceId, { status: "online", lastActiveAt: Date.now() });
      }),
      t.run(async (ctx) => {
        await ctx.db.patch(presenceId, { status: "in_game", lastActiveAt: Date.now() });
      }),
      t.run(async (ctx) => {
        await ctx.db.patch(presenceId, { status: "idle", lastActiveAt: Date.now() });
      }),
    ]);

    // Verify: Status is one of the valid values (last-write-wins)
    const presence = await t.run(async (ctx) => {
      return await ctx.db.get(presenceId);
    });
    expect(["online", "in_game", "idle"]).toContain(presence?.status);

    // Note: This is expected behavior - last write wins
    // We're just verifying no corruption or invalid states
  });
});
