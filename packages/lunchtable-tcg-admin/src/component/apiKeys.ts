import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new API key record.
 */
export const create = mutation({
  args: {
    agentId: v.string(),
    userId: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("apiKeys", {
      agentId: args.agentId,
      userId: args.userId,
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
      isActive: true,
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * Deactivate an API key.
 */
export const deactivate = mutation({
  args: {
    keyHash: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", args.keyHash))
      .first();

    if (!key) {
      throw new Error("API key not found");
    }

    await ctx.db.patch(key._id, { isActive: false });
    return null;
  },
});

/**
 * Record usage of an API key and update lastUsedAt.
 */
export const recordUsage = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    endpoint: v.optional(v.string()),
    responseStatus: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Update lastUsedAt on the key
    await ctx.db.patch(args.apiKeyId, { lastUsedAt: now });

    const id = await ctx.db.insert("apiKeyUsage", {
      apiKeyId: args.apiKeyId,
      timestamp: now,
      endpoint: args.endpoint,
      responseStatus: args.responseStatus,
      durationMs: args.durationMs,
    });

    return id;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get an API key by its hash.
 */
export const getByHash = query({
  args: { keyHash: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", args.keyHash))
      .first();
  },
});

/**
 * Get all API keys for an agent.
 */
export const getByAgent = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
  },
});

/**
 * Get all API keys for a user.
 */
export const getByUser = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get usage records for an API key.
 */
export const getUsage = query({
  args: {
    apiKeyId: v.id("apiKeys"),
    limit: v.optional(v.number()),
    since: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.since) {
      return await ctx.db
        .query("apiKeyUsage")
        .withIndex("by_key_and_time", (q) =>
          q.eq("apiKeyId", args.apiKeyId).gte("timestamp", args.since!)
        )
        .order("desc")
        .take(args.limit ?? 100);
    }

    return await ctx.db
      .query("apiKeyUsage")
      .withIndex("by_key_and_time", (q) => q.eq("apiKeyId", args.apiKeyId))
      .order("desc")
      .take(args.limit ?? 100);
  },
});
