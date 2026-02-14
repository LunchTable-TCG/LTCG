import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const fileCategoryValidator = v.union(
  v.literal("profile_picture"),
  v.literal("card_image"),
  v.literal("document"),
  v.literal("other"),
  v.literal("background"),
  v.literal("texture"),
  v.literal("ui_element"),
  v.literal("shop_asset"),
  v.literal("story_asset"),
  v.literal("logo")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create file metadata record.
 */
export const createFileMetadata = mutation({
  args: {
    userId: v.string(),
    storageId: v.string(),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    category: fileCategoryValidator,
    blobUrl: v.optional(v.string()),
    blobPathname: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("fileMetadata", {
      userId: args.userId,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      size: args.size,
      category: args.category,
      blobUrl: args.blobUrl,
      blobPathname: args.blobPathname,
      description: args.description,
      uploadedAt: Date.now(),
    });
    return id;
  },
});

/**
 * Delete file metadata record.
 */
export const deleteFileMetadata = mutation({
  args: {
    fileId: v.id("fileMetadata"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File metadata not found");
    }
    await ctx.db.delete(args.fileId);
    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get file metadata by user.
 */
export const getByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileMetadata")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Get file metadata by category.
 */
export const getByCategory = query({
  args: {
    category: fileCategoryValidator,
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileMetadata")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Get file metadata by storage ID.
 */
export const getByStorageId = query({
  args: { storageId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileMetadata")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
  },
});

/**
 * Get file metadata by user and category.
 */
export const getByUserCategory = query({
  args: {
    userId: v.string(),
    category: fileCategoryValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileMetadata")
      .withIndex("by_user_category", (q) =>
        q.eq("userId", args.userId).eq("category", args.category)
      )
      .collect();
  },
});
