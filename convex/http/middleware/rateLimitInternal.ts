/**
 * Rate Limit Internal Queries and Mutations
 *
 * Internal functions for rate limit database operations.
 * These are called by HTTP actions via ctx.runQuery/ctx.runMutation.
 */

import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { internalMutation } from "../../functions";

/**
 * Get API request count within a time window
 */
export const getUsageCount = internalQuery({
  args: {
    apiKeyId: v.id("apiKeys"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("apiKeyUsage")
      .withIndex("by_key_and_time", (q) =>
        q.eq("apiKeyId", args.apiKeyId).gte("timestamp", args.since)
      )
      .collect();

    return usage.length;
  },
});

/**
 * Record an API request for rate limiting
 */
export const recordUsage = internalMutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    timestamp: v.number(),
    endpoint: v.optional(v.string()),
    responseStatus: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiKeyUsage", {
      apiKeyId: args.apiKeyId,
      timestamp: args.timestamp,
      endpoint: args.endpoint,
      responseStatus: args.responseStatus,
      durationMs: args.durationMs,
    });

    // Also update lastUsedAt on the API key
    await ctx.db.patch(args.apiKeyId, {
      lastUsedAt: args.timestamp,
    });
  },
});

/**
 * Clean up old rate limit records (called periodically)
 * Removes records older than 25 hours to save storage
 */
export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

    const oldRecords = await ctx.db
      .query("apiKeyUsage")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .take(100); // Limit to 100 per run to avoid timeout

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return { deleted: oldRecords.length };
  },
});
