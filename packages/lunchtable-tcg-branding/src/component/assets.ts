import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const createAsset = mutation({
  args: {
    folderId: v.id("brandingFolders"),
    fileMetadataId: v.string(),
    name: v.string(),
    tags: v.array(v.string()),
    usageContext: v.array(v.string()),
    variants: v.optional(
      v.object({
        theme: v.optional(v.string()),
        orientation: v.optional(v.string()),
        size: v.optional(v.string()),
        custom: v.optional(v.any()),
      })
    ),
    fileSpecs: v.optional(
      v.object({
        minWidth: v.optional(v.number()),
        minHeight: v.optional(v.number()),
        maxWidth: v.optional(v.number()),
        maxHeight: v.optional(v.number()),
        transparent: v.optional(v.boolean()),
        format: v.optional(v.string()),
        custom: v.optional(v.any()),
      })
    ),
    aiDescription: v.string(),
    sortOrder: v.number(),
  },
  returns: v.id("brandingAssets"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const assetId = await ctx.db.insert("brandingAssets", {
      folderId: args.folderId,
      fileMetadataId: args.fileMetadataId,
      name: args.name,
      tags: args.tags,
      usageContext: args.usageContext,
      variants: args.variants,
      fileSpecs: args.fileSpecs,
      aiDescription: args.aiDescription,
      sortOrder: args.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
    return assetId;
  },
});

export const getAssets = query({
  args: {
    folderId: v.id("brandingFolders"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("brandingAssets")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();
  },
});

export const getAsset = query({
  args: {
    assetId: v.id("brandingAssets"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assetId);
  },
});

export const searchAssets = query({
  args: {
    query: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("brandingAssets")
      .withSearchIndex("search_ai_description", (q) =>
        q.search("aiDescription", args.query)
      )
      .collect();
  },
});

export const updateAsset = mutation({
  args: {
    assetId: v.id("brandingAssets"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assetId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteAsset = mutation({
  args: {
    assetId: v.id("brandingAssets"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.assetId);
    return null;
  },
});
