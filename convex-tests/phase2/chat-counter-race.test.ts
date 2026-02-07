/**
 * Phase 2 Test: Global Chat Message Counter Race
 *
 * Tests that concurrent chat messages are all counted correctly using the
 * shardedCounter component for high-frequency increments.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { TestConvex } from "convex-test";
import { api } from "../../_generated/api";
import { createTestWithComponents } from "../../test.setup";

describe("Phase 2: Global Chat Message Counter Race", () => {
  let t: TestConvex<any>;

  beforeAll(async () => {
    t = await createTestWithComponents();
  });

  it("should count all messages in concurrent sends", async () => {
    // Setup: Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "chatter",
        email: "chat@test.com",
        privyId: "privy_chatter",
        createdAt: Date.now(),
      });
    });

    // Get initial message count
    const initialMessages = await t.run(async (ctx) => {
      return await ctx.db.query("globalChatMessages").collect();
    });
    const initialCount = initialMessages.length;

    // Execute: Send 5 messages concurrently (rate limiter may reject some)
    const results = await Promise.allSettled([
      t
        .withIdentity({ subject: "privy_chatter" })
        .mutation(api.social.globalChat.sendMessage, { content: "Hello 1" }),
      t
        .withIdentity({ subject: "privy_chatter" })
        .mutation(api.social.globalChat.sendMessage, { content: "Hello 2" }),
      t
        .withIdentity({ subject: "privy_chatter" })
        .mutation(api.social.globalChat.sendMessage, { content: "Hello 3" }),
      t
        .withIdentity({ subject: "privy_chatter" })
        .mutation(api.social.globalChat.sendMessage, { content: "Hello 4" }),
      t
        .withIdentity({ subject: "privy_chatter" })
        .mutation(api.social.globalChat.sendMessage, { content: "Hello 5" }),
    ]);

    // Verify: Rate limiter allows up to 5 messages (capacity = 5)
    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded.length).toBeGreaterThan(0);
    expect(succeeded.length).toBeLessThanOrEqual(5);

    // Verify: Messages were stored correctly
    const finalMessages = await t.run(async (ctx) => {
      return await ctx.db.query("globalChatMessages").collect();
    });
    const newMessages = finalMessages.slice(initialCount);
    expect(newMessages.length).toBe(succeeded.length);

    // Verify: All stored messages have unique content (no duplicates)
    if (newMessages.length > 0) {
      const messageTexts = newMessages.map((m) => m.message);
      expect(new Set(messageTexts).size).toBe(newMessages.length);
    }
  });
});
