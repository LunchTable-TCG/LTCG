/**
 * Phase 2 Test: Streaming Session Creation Race
 *
 * Tests that concurrent session creation attempts result in only one active
 * session being created, preventing duplicate active sessions.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: Streaming Session Creation Race", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should prevent creating multiple active sessions", async () => {
    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "streamer",
        email: "streamer@test.com",
        privyId: "privy_streamer",
        createdAt: Date.now(),
      });
    });

    // Execute: Try to create 3 sessions concurrently
    const results = await Promise.allSettled([
      t.mutation(api.streaming.sessions.createSession, {
        streamType: "user",
        userId,
        platform: "twitch",
        streamTitle: "Stream 1",
        overlayConfig: {
          showDecisions: true,
          showAgentInfo: true,
          showEventFeed: true,
          showPlayerCam: true,
          theme: "dark",
        },
      }),
      t.mutation(api.streaming.sessions.createSession, {
        streamType: "user",
        userId,
        platform: "twitch",
        streamTitle: "Stream 2",
        overlayConfig: {
          showDecisions: true,
          showAgentInfo: true,
          showEventFeed: true,
          showPlayerCam: true,
          theme: "dark",
        },
      }),
      t.mutation(api.streaming.sessions.createSession, {
        streamType: "user",
        userId,
        platform: "twitch",
        streamTitle: "Stream 3",
        overlayConfig: {
          showDecisions: true,
          showAgentInfo: true,
          showEventFeed: true,
          showPlayerCam: true,
          theme: "dark",
        },
      }),
    ]);

    // Verify: Only one succeeded
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(2);

    // Verify: Exactly one session exists
    const sessions = await t.run(async (ctx) => {
      return await ctx.db
        .query("streamingSessions")
        .withIndex("by_user_status", (q) => q.eq("userId", userId))
        .collect();
    });
    expect(sessions.length).toBe(1);

    // Verify: Session is in initializing state
    expect(sessions[0].status).toBe("initializing");
  });
});
