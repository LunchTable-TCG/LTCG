import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all card backgrounds
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cardBackgrounds").order("desc").collect();
  },
});

// Get single background by ID
export const get = query({
  args: { id: v.id("cardBackgrounds") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create new background
export const create = mutation({
  args: {
    filename: v.string(),
    blobUrl: v.string(),
    width: v.number(),
    height: v.number(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cardBackgrounds", {
      filename: args.filename,
      blobUrl: args.blobUrl,
      width: args.width,
      height: args.height,
      uploadedAt: Date.now(),
      tags: args.tags,
    });
  },
});

// Delete background
export const remove = mutation({
  args: { id: v.id("cardBackgrounds") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
