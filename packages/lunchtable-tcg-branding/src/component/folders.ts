import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const createFolder = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("brandingFolders")),
    section: v.string(),
    path: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    createdBy: v.string(),
  },
  returns: v.id("brandingFolders"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const folderId = await ctx.db.insert("brandingFolders", {
      name: args.name,
      parentId: args.parentId,
      section: args.section,
      path: args.path,
      description: args.description,
      sortOrder: args.sortOrder,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    return folderId;
  },
});

export const getFolders = query({
  args: {
    parentId: v.optional(v.id("brandingFolders")),
    section: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.section !== undefined) {
      return await ctx.db
        .query("brandingFolders")
        .withIndex("by_section", (q) => q.eq("section", args.section!))
        .collect();
    }

    return await ctx.db
      .query("brandingFolders")
      .withIndex("by_parent", (q) =>
        args.parentId !== undefined
          ? q.eq("parentId", args.parentId)
          : q.eq("parentId", undefined)
      )
      .collect();
  },
});

export const getFolder = query({
  args: {
    folderId: v.id("brandingFolders"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.folderId);
  },
});

export const updateFolder = mutation({
  args: {
    folderId: v.id("brandingFolders"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteFolder = mutation({
  args: {
    folderId: v.id("brandingFolders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.folderId);
    return null;
  },
});
