import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

export const getWebhookConfig = query({
  args: {
    provider: v.optional(
      v.union(v.literal("helius"), v.literal("shyft"), v.literal("bitquery"))
    ),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("webhookConfig"),
      _creationTime: v.number(),
      provider: v.union(
        v.literal("helius"),
        v.literal("shyft"),
        v.literal("bitquery")
      ),
      webhookId: v.optional(v.string()),
      webhookUrl: v.string(),
      webhookSecret: v.optional(v.string()),
      tokenMint: v.optional(v.string()),
      isActive: v.boolean(),
      lastEventAt: v.optional(v.number()),
      errorCount: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    if (args.provider) {
      return await ctx.db
        .query("webhookConfig")
        .withIndex("by_provider", (q) => q.eq("provider", args.provider!))
        .first();
    }
    return await ctx.db.query("webhookConfig").first();
  },
});

export const getAllConfigs = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("webhookConfig"),
      _creationTime: v.number(),
      provider: v.union(
        v.literal("helius"),
        v.literal("shyft"),
        v.literal("bitquery")
      ),
      webhookId: v.optional(v.string()),
      webhookUrl: v.string(),
      webhookSecret: v.optional(v.string()),
      tokenMint: v.optional(v.string()),
      isActive: v.boolean(),
      lastEventAt: v.optional(v.number()),
      errorCount: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("webhookConfig").collect();
  },
});

export const upsertWebhookConfig = mutation({
  args: {
    provider: v.union(
      v.literal("helius"),
      v.literal("shyft"),
      v.literal("bitquery")
    ),
    webhookId: v.optional(v.string()),
    webhookUrl: v.string(),
    webhookSecret: v.optional(v.string()),
    tokenMint: v.optional(v.string()),
    isActive: v.boolean(),
  },
  returns: v.id("webhookConfig"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookConfig")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        webhookId: args.webhookId,
        webhookUrl: args.webhookUrl,
        webhookSecret: args.webhookSecret,
        tokenMint: args.tokenMint,
        isActive: args.isActive,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("webhookConfig", {
      provider: args.provider,
      webhookId: args.webhookId,
      webhookUrl: args.webhookUrl,
      webhookSecret: args.webhookSecret,
      tokenMint: args.tokenMint,
      isActive: args.isActive,
      errorCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateWebhookConfig = mutation({
  args: {
    configId: v.id("webhookConfig"),
    updates: v.object({
      webhookId: v.optional(v.string()),
      webhookUrl: v.optional(v.string()),
      webhookSecret: v.optional(v.string()),
      tokenMint: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.configId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordEvent = mutation({
  args: {
    configId: v.id("webhookConfig"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.configId, {
      lastEventAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordError = mutation({
  args: {
    configId: v.id("webhookConfig"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.configId);
    if (!config) return null;

    await ctx.db.patch(args.configId, {
      errorCount: (config.errorCount ?? 0) + 1,
      updatedAt: Date.now(),
    });
    return null;
  },
});
