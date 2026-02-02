/**
 * Admin Asset Management
 *
 * Manages file uploads and metadata for Vercel Blob storage.
 * Provides CRUD operations for admin-managed assets like backgrounds,
 * textures, UI elements, shop assets, and story assets.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Validators
// =============================================================================

const assetCategoryValidator = v.union(
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

export type AssetCategory =
  | "profile_picture"
  | "card_image"
  | "document"
  | "other"
  | "background"
  | "texture"
  | "ui_element"
  | "shop_asset"
  | "story_asset"
  | "logo";

// =============================================================================
// Queries
// =============================================================================

/**
 * List assets with optional filtering and pagination
 * Requires admin role
 */
export const listAssets = query({
  args: {
    category: v.optional(assetCategoryValidator),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 20;

    // Get assets based on filters
    let allAssets;
    if (args.category) {
      allAssets = await ctx.db
        .query("fileMetadata")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .collect();
    } else {
      allAssets = await ctx.db
        .query("fileMetadata")
        .withIndex("by_uploaded_at")
        .order("desc")
        .collect();
    }

    // Apply search filter if provided
    let filteredAssets = allAssets;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filteredAssets = allAssets.filter(
        (asset) =>
          asset.fileName.toLowerCase().includes(searchLower) ||
          asset.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply cursor-based pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = filteredAssets.findIndex(
        (a) => a._id === args.cursor
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedAssets = filteredAssets.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filteredAssets.length;
    const nextCursor = hasMore
      ? paginatedAssets[paginatedAssets.length - 1]?._id
      : null;

    return {
      assets: paginatedAssets,
      nextCursor,
      totalCount: filteredAssets.length,
    };
  },
});

/**
 * Get a single asset by ID
 * Requires admin role
 */
export const getAsset = query({
  args: {
    assetId: v.id("fileMetadata"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw createError(ErrorCode.NOT_FOUND, { reason: "Asset not found" });
    }

    return asset;
  },
});

/**
 * Get asset statistics
 * Requires admin role
 */
export const getAssetStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const allAssets = await ctx.db.query("fileMetadata").collect();

    // Count by category
    const categoryCountsObj: Record<string, number> = {};
    let totalSize = 0;

    for (const asset of allAssets) {
      categoryCountsObj[asset.category] =
        (categoryCountsObj[asset.category] || 0) + 1;
      totalSize += asset.size;
    }

    const categoryCounts = Object.entries(categoryCountsObj).map(
      ([category, count]) => ({ category, count })
    );

    return {
      totalAssets: allAssets.length,
      totalSize,
      categoryCounts,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Save metadata for a newly uploaded asset
 * Called after successful upload to Vercel Blob
 * Requires admin role
 */
export const saveAssetMetadata = mutation({
  args: {
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    category: assetCategoryValidator,
    description: v.optional(v.string()),
    blobUrl: v.string(),
    blobPathname: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Check for duplicate pathname
    const existing = await ctx.db
      .query("fileMetadata")
      .withIndex("by_blob_pathname", (q) => q.eq("blobPathname", args.blobPathname))
      .first();

    if (existing) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Asset with pathname "${args.blobPathname}" already exists`,
        pathname: args.blobPathname,
      });
    }

    const assetId = await ctx.db.insert("fileMetadata", {
      userId,
      storageId: args.blobPathname, // Use pathname as storageId for consistency
      fileName: args.fileName,
      contentType: args.contentType,
      size: args.size,
      category: args.category,
      description: args.description,
      blobUrl: args.blobUrl,
      blobPathname: args.blobPathname,
      uploadedAt: Date.now(),
    });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "upload_asset",
      metadata: {
        assetId,
        fileName: args.fileName,
        category: args.category,
        size: args.size,
      },
      success: true,
    });

    return { assetId, blobUrl: args.blobUrl };
  },
});

/**
 * Update asset metadata (category, description)
 * Requires admin role
 */
export const updateAsset = mutation({
  args: {
    assetId: v.id("fileMetadata"),
    category: v.optional(assetCategoryValidator),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw createError(ErrorCode.NOT_FOUND, { reason: "Asset not found" });
    }

    const updates: Partial<{
      category: AssetCategory;
      description: string;
    }> = {};

    if (args.category !== undefined) {
      updates.category = args.category;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.assetId, updates);
    }

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "update_asset",
      metadata: {
        assetId: args.assetId,
        updates,
      },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Sync blob assets to Convex metadata
 * Imports blob assets that don't have metadata entries yet
 * Requires admin role
 */
export const syncBlobAssets = mutation({
  args: {
    blobs: v.array(
      v.object({
        url: v.string(),
        pathname: v.string(),
        size: v.number(),
        uploadedAt: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    let synced = 0;
    let skipped = 0;

    for (const blob of args.blobs) {
      // Check if we already have metadata for this blob
      const existing = await ctx.db
        .query("fileMetadata")
        .withIndex("by_blob_pathname", (q) => q.eq("blobPathname", blob.pathname))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Determine category based on pathname
      let category: AssetCategory = "other";
      const pathLower = blob.pathname.toLowerCase();

      if (pathLower.startsWith("backgrounds/") || pathLower.includes("-bg.")) {
        category = "background";
      } else if (pathLower.startsWith("textures/") || pathLower.includes("parchment") || pathLower.includes("leather")) {
        category = "texture";
      } else if (pathLower.startsWith("ui/") || pathLower.includes("button") || pathLower.includes("panel") || pathLower.includes("frame")) {
        category = "ui_element";
      } else if (pathLower.startsWith("shop/") || pathLower.includes("pack") || pathLower.includes("box")) {
        category = "shop_asset";
      } else if (pathLower.startsWith("story/")) {
        category = "story_asset";
      } else if (pathLower.includes("logo")) {
        category = "logo";
      } else if (pathLower.startsWith("cards/") || pathLower.includes("card")) {
        category = "card_image";
      }

      // Determine content type from extension
      const ext = blob.pathname.substring(blob.pathname.lastIndexOf(".")).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".pdf": "application/pdf",
      };
      const contentType = contentTypeMap[ext] || "application/octet-stream";

      // Extract filename from pathname
      const fileName = blob.pathname.includes("/")
        ? blob.pathname.substring(blob.pathname.lastIndexOf("/") + 1)
        : blob.pathname;

      // Create metadata entry
      await ctx.db.insert("fileMetadata", {
        userId,
        storageId: blob.pathname,
        fileName,
        contentType,
        size: blob.size,
        category,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        uploadedAt: new Date(blob.uploadedAt).getTime(),
      });

      synced++;
    }

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "sync_blob_assets",
      metadata: {
        totalBlobs: args.blobs.length,
        synced,
        skipped,
      },
      success: true,
    });

    return { synced, skipped, total: args.blobs.length };
  },
});

/**
 * Delete asset metadata
 * Note: The actual blob deletion happens via the web app API
 * Requires admin role
 */
export const deleteAssetMetadata = mutation({
  args: {
    assetId: v.id("fileMetadata"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw createError(ErrorCode.NOT_FOUND, { reason: "Asset not found" });
    }

    // Store info for audit before deleting
    const assetInfo = {
      fileName: asset.fileName,
      category: asset.category,
      blobUrl: asset.blobUrl,
      blobPathname: asset.blobPathname,
    };

    await ctx.db.delete(args.assetId);

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "delete_asset",
      metadata: assetInfo,
      success: true,
    });

    return { success: true, blobUrl: asset.blobUrl };
  },
});
