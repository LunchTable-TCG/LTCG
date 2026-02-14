import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

export const getConfig = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("tokenConfig")
      .withIndex("by_status", (q) => q.eq("status", "launched"))
      .first();
    if (config) return config;

    const readyConfig = await ctx.db
      .query("tokenConfig")
      .withIndex("by_status", (q) => q.eq("status", "ready"))
      .first();
    if (readyConfig) return readyConfig;

    const draftConfig = await ctx.db
      .query("tokenConfig")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .first();
    return draftConfig;
  },
});

export const updateConfig = mutation({
  args: {
    configId: v.id("tokenConfig"),
    updates: v.any(),
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

export const createConfig = mutation({
  args: {
    name: v.string(),
    symbol: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    twitter: v.optional(v.string()),
    telegram: v.optional(v.string()),
    website: v.optional(v.string()),
    discord: v.optional(v.string()),
    initialSupply: v.optional(v.number()),
    decimals: v.optional(v.number()),
    targetMarketCap: v.optional(v.number()),
    mintAddress: v.optional(v.string()),
    bondingCurveAddress: v.optional(v.string()),
    pumpfunUrl: v.optional(v.string()),
    launchedAt: v.optional(v.number()),
    graduatedAt: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("ready"), v.literal("launched"), v.literal("graduated")),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.id("tokenConfig"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tokenConfig", args);
    return id;
  },
});
