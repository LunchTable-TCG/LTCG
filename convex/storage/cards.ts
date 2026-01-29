/**
 * Card Image Storage - Optimized for Convex 2026
 *
 * Card-specific image operations using Convex storage
 * Best Practices: Return validators, proper storage URL generation, bulk operations
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_CARDS_BATCH = 100;

// =============================================================================
// RETURN VALUE VALIDATORS
// =============================================================================

const cardWithImagesReturnValidator = v.union(
  v.object({
    _id: v.id("cardDefinitions"),
    name: v.string(),
    resolvedImageUrl: v.union(v.string(), v.null()),
    resolvedThumbnailUrl: v.union(v.string(), v.null()),
  }),
  v.null()
);

// =============================================================================
// PUBLIC QUERIES
// =============================================================================

export const getCardWithImages = query({
  args: {
    cardId: v.id("cardDefinitions"),
  },
  returns: cardWithImagesReturnValidator,
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) return null;

    let imageUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    // Best Practice: Prefer Convex storage over external URLs
    if (card.imageStorageId) {
      imageUrl = await ctx.storage.getUrl(card.imageStorageId as Id<"_storage">);
    } else if (card.imageUrl) {
      imageUrl = card.imageUrl;
    }

    if (card.thumbnailStorageId) {
      thumbnailUrl = await ctx.storage.getUrl(card.thumbnailStorageId as Id<"_storage">);
    }

    return {
      _id: card._id,
      name: card.name,
      resolvedImageUrl: imageUrl,
      resolvedThumbnailUrl: thumbnailUrl,
    };
  },
});

export const getCardsWithImages = query({
  args: {
    cardIds: v.array(v.id("cardDefinitions")),
  },
  returns: v.array(cardWithImagesReturnValidator),
  handler: async (ctx, args) => {
    // Best Practice: Limit batch size
    const limitedIds = args.cardIds.slice(0, MAX_CARDS_BATCH);

    const cards = await Promise.all(
      limitedIds.map(async (cardId) => {
        const card = await ctx.db.get(cardId);
        if (!card) return null;

        let imageUrl: string | null = null;
        let thumbnailUrl: string | null = null;

        if (card.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(card.imageStorageId as Id<"_storage">);
        } else if (card.imageUrl) {
          imageUrl = card.imageUrl;
        }

        if (card.thumbnailStorageId) {
          thumbnailUrl = await ctx.storage.getUrl(card.thumbnailStorageId as Id<"_storage">);
        }

        return {
          _id: card._id,
          name: card.name,
          resolvedImageUrl: imageUrl,
          resolvedThumbnailUrl: thumbnailUrl,
        };
      })
    );

    return cards;
  },
});

// =============================================================================
// PUBLIC MUTATIONS
// =============================================================================

export const updateCardImage = mutation({
  args: {
    cardId: v.id("cardDefinitions"),
    imageStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const updates: Record<string, Id<"_storage"> | undefined> = {};

    if (args.imageStorageId) {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for Record index (TS4111)
      updates["imageStorageId"] = args.imageStorageId;
    }

    if (args.thumbnailStorageId) {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for Record index (TS4111)
      updates["thumbnailStorageId"] = args.thumbnailStorageId;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.cardId, updates);
    }

    return { success: true };
  },
});
