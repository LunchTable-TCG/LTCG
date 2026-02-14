import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const getGemPackages = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("gemPackages")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .order("asc")
        .collect();
    }
    return await ctx.db.query("gemPackages").collect();
  },
});

export const getGemPackage = query({
  args: {
    packageId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gemPackages")
      .withIndex("by_package_id", (q) => q.eq("packageId", args.packageId))
      .first();
  },
});

export const createGemPackage = mutation({
  args: {
    packageId: v.string(),
    name: v.string(),
    description: v.string(),
    gems: v.number(),
    usdPrice: v.number(),
    bonusPercent: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
    featuredBadge: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
  },
  returns: v.id("gemPackages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("gemPackages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateGemPackage = mutation({
  args: {
    pkgId: v.id("gemPackages"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pkgId, args.updates);
    return null;
  },
});
