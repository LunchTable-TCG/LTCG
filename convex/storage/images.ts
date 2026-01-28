/**
 * Image Storage System - Optimized for Convex 2026
 *
 * Core file storage operations for card art and cosmetics
 * Best Practices: Return validators, proper storage API usage, size validation
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  mutation,
  query,
} from "../_generated/server";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { checkRateLimitWrapper } from "../lib/rateLimit";
import type { SupportedImageFormat } from "../lib/types";

// =============================================================================
// CONSTANTS
// =============================================================================

const SUPPORTED_FORMATS = ["image/png", "image/jpeg", "image/webp"] as const;

// Type guard for supported image formats
function isSupportedFormat(
  contentType: string | null | undefined
): contentType is SupportedImageFormat {
  if (!contentType) return false;
  return SUPPORTED_FORMATS.some((format) => format === contentType);
}
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_THUMBNAIL_SIZE = 1 * 1024 * 1024; // 1MB

// =============================================================================
// RETURN VALUE VALIDATORS
// =============================================================================

const imageUrlReturnValidator = v.union(v.string(), v.null());

const cardImageUrlsReturnValidator = v.union(
  v.object({
    imageUrl: v.union(v.string(), v.null()),
    thumbnailUrl: v.union(v.string(), v.null()),
  }),
  v.null()
);

// =============================================================================
// PUBLIC QUERIES
// =============================================================================

export const getImageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: imageUrlReturnValidator,
  handler: async (ctx, args) => {
    // Best Practice: Use ctx.storage.getUrl() for signed URLs
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});

export const getCardImageUrls = query({
  args: {
    cardId: v.id("cardDefinitions"),
  },
  returns: cardImageUrlsReturnValidator,
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) return null;

    let imageUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    // Best Practice: Prefer Convex storage over legacy external URLs
    if (card.imageStorageId) {
      imageUrl = await ctx.storage.getUrl(card.imageStorageId as Id<"_storage">);
    } else if (card.imageUrl) {
      imageUrl = card.imageUrl;
    }

    if (card.thumbnailStorageId) {
      thumbnailUrl = await ctx.storage.getUrl(card.thumbnailStorageId as Id<"_storage">);
    }

    return {
      imageUrl,
      thumbnailUrl,
    };
  },
});

// =============================================================================
// PUBLIC MUTATIONS
// =============================================================================

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Require authentication for upload URL generation
    const { userId } = await requireAuthMutation(ctx);

    // SECURITY: Rate limit image uploads to prevent spam/abuse
    // Max 10 upload URLs per minute per user (configured in lib/rateLimit.ts)
    await checkRateLimitWrapper(ctx, "IMAGE_UPLOAD", userId);

    // Best Practice: Generate temporary upload URL for client-side uploads
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveCardImage = mutation({
  args: {
    cardId: v.id("cardDefinitions"),
    storageId: v.id("_storage"),
    imageType: v.union(v.literal("image"), v.literal("thumbnail")),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Best Practice: Query _storage system table for metadata validation
    const storageFile = await ctx.db.system
      .query("_storage")
      .filter((q) => q.eq(q.field("_id"), args.storageId))
      .first();

    if (!storageFile) {
      throw createError(ErrorCode.NOT_FOUND_STORAGE_FILE, {
        storageId: args.storageId,
      });
    }

    // Validate file type
    if (!isSupportedFormat(storageFile.contentType)) {
      throw createError(ErrorCode.VALIDATION_UNSUPPORTED_FORMAT, {
        contentType: storageFile.contentType,
        supportedFormats: SUPPORTED_FORMATS,
      });
    }

    // Validate file size
    const maxSize = args.imageType === "thumbnail" ? MAX_THUMBNAIL_SIZE : MAX_IMAGE_SIZE;
    if (storageFile.size > maxSize) {
      throw createError(ErrorCode.VALIDATION_FILE_TOO_LARGE, {
        fileSize: storageFile.size,
        maxSize,
        imageType: args.imageType,
      });
    }

    // Update card with storage reference
    const updates: Partial<{
      imageStorageId: Id<"_storage">;
      thumbnailStorageId: Id<"_storage">;
    }> = {};
    if (args.imageType === "image") {
      updates.imageStorageId = args.storageId;
    } else {
      updates.thumbnailStorageId = args.storageId;
    }

    await ctx.db.patch(args.cardId, updates);

    return { success: true };
  },
});

export const deleteCardImage = mutation({
  args: {
    cardId: v.id("cardDefinitions"),
    imageType: v.union(v.literal("image"), v.literal("thumbnail")),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw createError(ErrorCode.NOT_FOUND_CARD, {
        cardId: args.cardId,
      });
    }

    // Get storage ID and delete from storage
    const storageId = args.imageType === "image" ? card.imageStorageId : card.thumbnailStorageId;

    if (storageId) {
      // Best Practice: Delete from both storage and database reference
      await ctx.storage.delete(storageId as Id<"_storage">);

      const updates: Partial<{
        imageStorageId: undefined;
        thumbnailStorageId: undefined;
      }> = {};
      if (args.imageType === "image") {
        updates.imageStorageId = undefined;
      } else {
        updates.thumbnailStorageId = undefined;
      }

      await ctx.db.patch(args.cardId, updates);
    }

    return { success: true };
  },
});
