/**
 * Batch Admin Operations Module
 *
 * Bulk operations for admin convenience: grant currency, reset ratings, and manage cards.
 * All operations are logged individually for accountability.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import {
  addCardsToInventory,
  adjustCardInventory,
  getRandomCard,
  weightedRandomRarity,
} from "../lib/helpers";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";
import type { PackConfig, Rarity } from "../lib/types";

/**
 * Open a pack for a player without charging currency (admin grant)
 * Similar to openPack in helpers.ts but without economy tracking.
 */
async function openPackForAdmin(
  ctx: MutationCtx,
  packConfig: PackConfig,
  userId: Id<"users">
): Promise<Array<{ cardDefinitionId: Id<"cardDefinitions">; name: string; rarity: string }>> {
  const { cardCount, guaranteedRarity, archetype } = packConfig;
  const cards: Array<{ cardDefinitionId: Id<"cardDefinitions">; name: string; rarity: string }> =
    [];

  for (let i = 0; i < cardCount; i++) {
    const isLastCard = i === cardCount - 1;
    let rarity: Rarity;

    // Last card gets guaranteed rarity
    if (isLastCard && guaranteedRarity) {
      rarity = guaranteedRarity;
    } else {
      rarity = weightedRandomRarity();
    }

    // Get random card of this rarity
    const card = await getRandomCard(ctx, rarity, archetype);

    // Add to inventory
    await addCardsToInventory(ctx, userId, card._id, 1);

    cards.push({
      cardDefinitionId: card._id,
      name: card.name,
      rarity: card.rarity,
    });
  }

  return cards;
}

// =============================================================================
// Currency Operations
// =============================================================================

/**
 * Grant gold to multiple players
 * Requires admin role or higher
 */
export const batchGrantGold = mutation({
  args: {
    playerIds: v.array(v.id("users")),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, { playerIds, amount, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const results: Array<{ playerId: Id<"users">; success: boolean; error?: string }> = [];

    for (const playerId of playerIds) {
      try {
        const player = await ctx.db.get(playerId);
        if (!player) {
          results.push({
            playerId,
            success: false,
            error: "Player not found",
          });
          continue;
        }

        const currentGold = player.gold || 0;
        const newGold = currentGold + amount;

        await ctx.db.patch(playerId, {
          gold: newGold,
        });

        // Log action
        await scheduleAuditLog(ctx, {
          adminId,
          action: "batch_grant_gold",
          targetUserId: playerId,
          targetEmail: player.email,
          metadata: {
            amount,
            reason,
            previousGold: currentGold,
            newGold,
            playerUsername: player.username,
          },
          success: true,
        });

        results.push({
          playerId,
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          playerId,
          success: false,
          error: errorMessage,
        });

        // Log failed action
        await scheduleAuditLog(ctx, {
          adminId,
          action: "batch_grant_gold",
          targetUserId: playerId,
          metadata: {
            amount,
            reason,
            error: errorMessage,
          },
          success: false,
          errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      message: `Granted ${amount} gold to ${successCount} players. ${failureCount} failed.`,
      results,
    };
  },
});

// =============================================================================
// Rating Operations
// =============================================================================

/**
 * Reset ratings for multiple players
 * Requires admin role or higher
 */
export const batchResetRatings = mutation({
  args: {
    playerIds: v.array(v.id("users")),
    reason: v.string(),
  },
  handler: async (ctx, { playerIds, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const results: Array<{ playerId: Id<"users">; success: boolean; error?: string }> = [];
    const defaultRankedElo = 1000;
    const defaultCasualRating = 1000;

    for (const playerId of playerIds) {
      try {
        const player = await ctx.db.get(playerId);
        if (!player) {
          results.push({
            playerId,
            success: false,
            error: "Player not found",
          });
          continue;
        }

        const previousRankedElo = player.rankedElo || defaultRankedElo;
        const previousCasualRating = player.casualRating || defaultCasualRating;

        await ctx.db.patch(playerId, {
          rankedElo: defaultRankedElo,
          casualRating: defaultCasualRating,
        });

        // Log action
        await scheduleAuditLog(ctx, {
          adminId,
          action: "batch_reset_ratings",
          targetUserId: playerId,
          targetEmail: player.email,
          metadata: {
            reason,
            previousRankedElo,
            previousCasualRating,
            newRankedElo: defaultRankedElo,
            newCasualRating: defaultCasualRating,
            playerUsername: player.username,
          },
          success: true,
        });

        results.push({
          playerId,
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          playerId,
          success: false,
          error: errorMessage,
        });

        // Log failed action
        await scheduleAuditLog(ctx, {
          adminId,
          action: "batch_reset_ratings",
          targetUserId: playerId,
          metadata: {
            reason,
            error: errorMessage,
          },
          success: false,
          errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      message: `Reset ratings for ${successCount} players. ${failureCount} failed.`,
      results,
    };
  },
});

// =============================================================================
// Placeholder/Stub Operations (To be implemented)
// =============================================================================

/**
 * Grant premium status to multiple players
 * NOTE: Premium system is not yet implemented in the schema.
 * When implemented, this function should:
 * 1. Set isPremium = true on user
 * 2. Set premiumExpiresAt = Date.now() + (durationDays * 86400000)
 * 3. Log the grant action for audit
 */
export const batchGrantPremium = mutation({
  args: {
    playerIds: v.array(v.id("users")),
    durationDays: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, { playerIds: _playerIds, durationDays: _durationDays, reason: _reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Premium system not yet implemented in schema
    // Required fields: users.isPremium (boolean), users.premiumExpiresAt (number)
    throw createError(ErrorCode.NOT_IMPLEMENTED, {
      reason:
        "Premium system not yet implemented. Schema needs isPremium and premiumExpiresAt fields on users table.",
    });
  },
});

/**
 * Grant card packs to multiple players
 * Opens packs immediately and adds cards to player inventory.
 * Requires admin role or higher.
 *
 * @param playerIds - Array of user IDs to grant packs to
 * @param packType - Product ID of the pack (e.g., "starter-pack", "booster-pack")
 * @param quantity - Number of packs to grant per player
 * @param reason - Reason for the grant (for audit logging)
 */
export const batchGrantPacks = mutation({
  args: {
    playerIds: v.array(v.id("users")),
    packType: v.string(),
    quantity: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, { playerIds, packType, quantity, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate quantity
    if (quantity <= 0 || quantity > 100) {
      throw createError(ErrorCode.VALIDATION_RANGE, {
        field: "quantity",
        min: 1,
        max: 100,
        value: quantity,
      });
    }

    // Get pack product configuration
    const packProduct = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", packType))
      .first();

    if (!packProduct) {
      throw createError(ErrorCode.NOT_FOUND_PRODUCT, {
        productId: packType,
      });
    }

    if (packProduct.productType !== "pack" || !packProduct.packConfig) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Product "${packType}" is not a valid pack type`,
      });
    }

    const results: Array<{
      playerId: Id<"users">;
      success: boolean;
      cardsGranted?: number;
      error?: string;
    }> = [];

    for (const playerId of playerIds) {
      try {
        const player = await ctx.db.get(playerId);
        if (!player) {
          results.push({
            playerId,
            success: false,
            error: "Player not found",
          });
          continue;
        }

        let totalCardsGranted = 0;

        // Open packs for this player
        for (let i = 0; i < quantity; i++) {
          const cards = await openPackForAdmin(ctx, packProduct.packConfig, playerId);
          totalCardsGranted += cards.length;
        }

        // Log action
        await scheduleAuditLog(ctx, {
          adminId,
          action: "batch_grant_packs",
          targetUserId: playerId,
          targetEmail: player.email,
          metadata: {
            packType,
            quantity,
            reason,
            cardsGranted: totalCardsGranted,
            playerUsername: player.username,
          },
          success: true,
        });

        results.push({
          playerId,
          success: true,
          cardsGranted: totalCardsGranted,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          playerId,
          success: false,
          error: errorMessage,
        });

        // Log failed action
        await scheduleAuditLog(ctx, {
          adminId,
          action: "batch_grant_packs",
          targetUserId: playerId,
          metadata: {
            packType,
            quantity,
            reason,
            error: errorMessage,
          },
          success: false,
          errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const totalCards = results.reduce((sum, r) => sum + (r.cardsGranted || 0), 0);

    return {
      success: true,
      message: `Granted ${quantity} ${packType} pack(s) to ${successCount} players (${totalCards} total cards). ${failureCount} failed.`,
      results,
    };
  },
});

/**
 * Grant specific cards to a player
 * Adds cards directly to player's inventory.
 * Requires admin role or higher.
 *
 * @param playerId - User ID of the player to grant cards to
 * @param cardIds - Array of card definition IDs to grant (1 copy each)
 * @param reason - Reason for the grant (for audit logging)
 */
export const grantCardsToPlayer = mutation({
  args: {
    playerId: v.id("users"),
    cardIds: v.array(v.id("cardDefinitions")),
    reason: v.string(),
  },
  handler: async (ctx, { playerId, cardIds, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate player exists
    const player = await ctx.db.get(playerId);
    if (!player) {
      throw createError(ErrorCode.NOT_FOUND_USER, { userId: playerId });
    }

    // Validate card limit
    if (cardIds.length === 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No cards specified",
      });
    }
    if (cardIds.length > 100) {
      throw createError(ErrorCode.VALIDATION_RANGE, {
        field: "cardIds",
        max: 100,
        value: cardIds.length,
      });
    }

    const results: Array<{
      cardId: Id<"cardDefinitions">;
      success: boolean;
      cardName?: string;
      error?: string;
    }> = [];

    for (const cardId of cardIds) {
      try {
        // Validate card exists
        const cardDef = await ctx.db.get(cardId);
        if (!cardDef) {
          results.push({
            cardId,
            success: false,
            error: "Card definition not found",
          });
          continue;
        }

        // Add card to inventory
        await addCardsToInventory(ctx, playerId, cardId, 1);

        results.push({
          cardId,
          success: true,
          cardName: cardDef.name,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          cardId,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Log action
    await scheduleAuditLog(ctx, {
      adminId,
      action: "grant_cards_to_player",
      targetUserId: playerId,
      targetEmail: player.email,
      metadata: {
        reason,
        cardsGranted: successCount,
        cardsFailed: failureCount,
        cardNames: results.filter((r) => r.success).map((r) => r.cardName),
        playerUsername: player.username,
      },
      success: failureCount === 0,
      errorMessage: failureCount > 0 ? `${failureCount} cards failed to grant` : undefined,
    });

    return {
      success: failureCount === 0,
      message: `Granted ${successCount} cards to ${player.username || "player"}. ${failureCount} failed.`,
      results,
    };
  },
});

/**
 * Remove specific cards from a player
 * Removes cards from player's inventory (1 copy each).
 * Requires admin role or higher.
 *
 * @param playerId - User ID of the player to remove cards from
 * @param cardIds - Array of card definition IDs to remove (1 copy each)
 * @param reason - Reason for the removal (for audit logging)
 */
export const removeCardsFromPlayer = mutation({
  args: {
    playerId: v.id("users"),
    cardIds: v.array(v.id("cardDefinitions")),
    reason: v.string(),
  },
  handler: async (ctx, { playerId, cardIds, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate player exists
    const player = await ctx.db.get(playerId);
    if (!player) {
      throw createError(ErrorCode.NOT_FOUND_USER, { userId: playerId });
    }

    // Validate card limit
    if (cardIds.length === 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No cards specified",
      });
    }
    if (cardIds.length > 100) {
      throw createError(ErrorCode.VALIDATION_RANGE, {
        field: "cardIds",
        max: 100,
        value: cardIds.length,
      });
    }

    const results: Array<{
      cardId: Id<"cardDefinitions">;
      success: boolean;
      cardName?: string;
      error?: string;
    }> = [];

    for (const cardId of cardIds) {
      try {
        // Get card definition for logging
        const cardDef = await ctx.db.get(cardId);
        if (!cardDef) {
          results.push({
            cardId,
            success: false,
            error: "Card definition not found",
          });
          continue;
        }

        // Check if player owns the card
        const playerCard = await ctx.db
          .query("playerCards")
          .withIndex("by_user_card", (q) => q.eq("userId", playerId).eq("cardDefinitionId", cardId))
          .first();

        if (!playerCard || playerCard.quantity <= 0) {
          results.push({
            cardId,
            success: false,
            cardName: cardDef.name,
            error: "Player does not own this card",
          });
          continue;
        }

        // Remove card from inventory (decrease by 1)
        await adjustCardInventory(ctx, playerId, cardId, -1);

        results.push({
          cardId,
          success: true,
          cardName: cardDef.name,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          cardId,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Log action
    await scheduleAuditLog(ctx, {
      adminId,
      action: "remove_cards_from_player",
      targetUserId: playerId,
      targetEmail: player.email,
      metadata: {
        reason,
        cardsRemoved: successCount,
        cardsFailed: failureCount,
        cardNames: results.filter((r) => r.success).map((r) => r.cardName),
        playerUsername: player.username,
      },
      success: failureCount === 0,
      errorMessage: failureCount > 0 ? `${failureCount} cards failed to remove` : undefined,
    });

    return {
      success: failureCount === 0,
      message: `Removed ${successCount} cards from ${player.username || "player"}. ${failureCount} failed.`,
      results,
    };
  },
});

/**
 * Grant specific cards to multiple players
 * Adds the same set of cards to all specified players.
 * Requires admin role or higher.
 *
 * @param playerIds - Array of user IDs to grant cards to
 * @param cardIds - Array of card definition IDs to grant (1 copy each)
 * @param reason - Reason for the grant (for audit logging)
 */
export const batchGrantCards = mutation({
  args: {
    playerIds: v.array(v.id("users")),
    cardIds: v.array(v.id("cardDefinitions")),
    reason: v.string(),
  },
  handler: async (ctx, { playerIds, cardIds, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate inputs
    if (playerIds.length === 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No players specified",
      });
    }
    if (cardIds.length === 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No cards specified",
      });
    }
    if (playerIds.length > 100) {
      throw createError(ErrorCode.VALIDATION_RANGE, {
        field: "playerIds",
        max: 100,
        value: playerIds.length,
      });
    }
    if (cardIds.length > 50) {
      throw createError(ErrorCode.VALIDATION_RANGE, {
        field: "cardIds",
        max: 50,
        value: cardIds.length,
      });
    }

    // Pre-validate all cards exist
    const cardDefinitions: Map<Id<"cardDefinitions">, { name: string; rarity: string }> = new Map();
    for (const cardId of cardIds) {
      const cardDef = await ctx.db.get(cardId);
      if (!cardDef) {
        throw createError(ErrorCode.NOT_FOUND_CARD, { cardId });
      }
      cardDefinitions.set(cardId, { name: cardDef.name, rarity: cardDef.rarity });
    }

    const results: Array<{
      playerId: Id<"users">;
      success: boolean;
      cardsGranted?: number;
      error?: string;
    }> = [];

    for (const playerId of playerIds) {
      try {
        const player = await ctx.db.get(playerId);
        if (!player) {
          results.push({
            playerId,
            success: false,
            error: "Player not found",
          });
          continue;
        }

        // Grant all cards to this player
        for (const cardId of cardIds) {
          await addCardsToInventory(ctx, playerId, cardId, 1);
        }

        // Log action
        await scheduleAuditLog(ctx, {
          adminId,
          action: "batch_grant_cards",
          targetUserId: playerId,
          targetEmail: player.email,
          metadata: {
            reason,
            cardsGranted: cardIds.length,
            cardNames: cardIds.map((id) => cardDefinitions.get(id)?.name),
            playerUsername: player.username,
          },
          success: true,
        });

        results.push({
          playerId,
          success: true,
          cardsGranted: cardIds.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          playerId,
          success: false,
          error: errorMessage,
        });

        // Log failed action
        await scheduleAuditLog(ctx, {
          adminId,
          action: "batch_grant_cards",
          targetUserId: playerId,
          metadata: {
            reason,
            error: errorMessage,
          },
          success: false,
          errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const totalCardsGranted = results.reduce((sum, r) => sum + (r.cardsGranted || 0), 0);

    return {
      success: failureCount === 0,
      message: `Granted ${cardIds.length} card(s) to ${successCount} players (${totalCardsGranted} total). ${failureCount} failed.`,
      results,
    };
  },
});

// =============================================================================
// Preview/Dry-Run Queries
// =============================================================================

/**
 * Preview batch gold grant operation
 * Shows what would happen before executing the grant.
 * Requires admin role or higher.
 */
export const previewBatchGrantGold = query({
  args: {
    playerIds: v.array(v.id("users")),
    amount: v.number(),
  },
  handler: async (ctx, { playerIds, amount }) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "admin");

    const preview: Array<{
      playerId: Id<"users">;
      username: string | undefined;
      email: string | undefined;
      currentGold: number;
      newGold: number;
      valid: boolean;
      error?: string;
    }> = [];

    for (const playerId of playerIds) {
      const player = await ctx.db.get(playerId);
      if (!player) {
        preview.push({
          playerId,
          username: undefined,
          email: undefined,
          currentGold: 0,
          newGold: 0,
          valid: false,
          error: "Player not found",
        });
        continue;
      }

      const currentGold = player.gold || 0;
      preview.push({
        playerId,
        username: player.username,
        email: player.email,
        currentGold,
        newGold: currentGold + amount,
        valid: true,
      });
    }

    const validCount = preview.filter((p) => p.valid).length;
    const invalidCount = preview.filter((p) => !p.valid).length;
    const totalGoldToGrant = validCount * amount;

    return {
      operation: "batchGrantGold",
      summary: {
        totalPlayers: playerIds.length,
        validPlayers: validCount,
        invalidPlayers: invalidCount,
        amountPerPlayer: amount,
        totalGoldToGrant,
      },
      preview,
    };
  },
});

/**
 * Preview batch rating reset operation
 * Shows what would happen before executing the reset.
 * Requires admin role or higher.
 */
export const previewBatchResetRatings = query({
  args: {
    playerIds: v.array(v.id("users")),
  },
  handler: async (ctx, { playerIds }) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "admin");

    const defaultRankedElo = 1000;
    const defaultCasualRating = 1000;

    const preview: Array<{
      playerId: Id<"users">;
      username: string | undefined;
      email: string | undefined;
      currentRankedElo: number;
      currentCasualRating: number;
      newRankedElo: number;
      newCasualRating: number;
      rankedChange: number;
      casualChange: number;
      valid: boolean;
      error?: string;
    }> = [];

    for (const playerId of playerIds) {
      const player = await ctx.db.get(playerId);
      if (!player) {
        preview.push({
          playerId,
          username: undefined,
          email: undefined,
          currentRankedElo: 0,
          currentCasualRating: 0,
          newRankedElo: defaultRankedElo,
          newCasualRating: defaultCasualRating,
          rankedChange: 0,
          casualChange: 0,
          valid: false,
          error: "Player not found",
        });
        continue;
      }

      const currentRankedElo = player.rankedElo || defaultRankedElo;
      const currentCasualRating = player.casualRating || defaultCasualRating;

      preview.push({
        playerId,
        username: player.username,
        email: player.email,
        currentRankedElo,
        currentCasualRating,
        newRankedElo: defaultRankedElo,
        newCasualRating: defaultCasualRating,
        rankedChange: defaultRankedElo - currentRankedElo,
        casualChange: defaultCasualRating - currentCasualRating,
        valid: true,
      });
    }

    const validCount = preview.filter((p) => p.valid).length;
    const invalidCount = preview.filter((p) => !p.valid).length;
    const playersLosingRating = preview.filter(
      (p) => p.valid && (p.currentRankedElo > defaultRankedElo || p.currentCasualRating > defaultCasualRating)
    ).length;
    const playersGainingRating = preview.filter(
      (p) => p.valid && (p.currentRankedElo < defaultRankedElo || p.currentCasualRating < defaultCasualRating)
    ).length;

    return {
      operation: "batchResetRatings",
      summary: {
        totalPlayers: playerIds.length,
        validPlayers: validCount,
        invalidPlayers: invalidCount,
        playersLosingRating,
        playersGainingRating,
        targetRankedElo: defaultRankedElo,
        targetCasualRating: defaultCasualRating,
      },
      preview,
    };
  },
});

/**
 * Preview batch pack grant operation
 * Shows what would happen before executing the grant.
 * Requires admin role or higher.
 */
export const previewBatchGrantPacks = query({
  args: {
    playerIds: v.array(v.id("users")),
    packType: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, { playerIds, packType, quantity }) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate quantity
    if (quantity <= 0 || quantity > 100) {
      throw createError(ErrorCode.VALIDATION_RANGE, {
        field: "quantity",
        min: 1,
        max: 100,
        value: quantity,
      });
    }

    // Get pack product configuration
    const packProduct = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", packType))
      .first();

    if (!packProduct) {
      throw createError(ErrorCode.NOT_FOUND_PRODUCT, {
        productId: packType,
      });
    }

    if (packProduct.productType !== "pack" || !packProduct.packConfig) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Product "${packType}" is not a valid pack type`,
      });
    }

    const preview: Array<{
      playerId: Id<"users">;
      username: string | undefined;
      email: string | undefined;
      valid: boolean;
      error?: string;
    }> = [];

    for (const playerId of playerIds) {
      const player = await ctx.db.get(playerId);
      if (!player) {
        preview.push({
          playerId,
          username: undefined,
          email: undefined,
          valid: false,
          error: "Player not found",
        });
        continue;
      }

      preview.push({
        playerId,
        username: player.username,
        email: player.email,
        valid: true,
      });
    }

    const validCount = preview.filter((p) => p.valid).length;
    const invalidCount = preview.filter((p) => !p.valid).length;
    const totalPacksToGrant = validCount * quantity;
    const cardsPerPack = packProduct.packConfig.cardCount;
    const estimatedTotalCards = totalPacksToGrant * cardsPerPack;

    return {
      operation: "batchGrantPacks",
      summary: {
        totalPlayers: playerIds.length,
        validPlayers: validCount,
        invalidPlayers: invalidCount,
        packType,
        packName: packProduct.name,
        quantityPerPlayer: quantity,
        totalPacksToGrant,
        cardsPerPack,
        estimatedTotalCards,
        guaranteedRarity: packProduct.packConfig.guaranteedRarity,
      },
      preview,
    };
  },
});

/**
 * Preview batch card grant operation
 * Shows what would happen before executing the grant.
 * Requires admin role or higher.
 */
export const previewBatchGrantCards = query({
  args: {
    playerIds: v.array(v.id("users")),
    cardIds: v.array(v.id("cardDefinitions")),
  },
  handler: async (ctx, { playerIds, cardIds }) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate inputs
    if (playerIds.length === 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No players specified",
      });
    }
    if (cardIds.length === 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No cards specified",
      });
    }

    // Pre-validate all cards exist
    const cardDefinitions: Array<{
      cardId: Id<"cardDefinitions">;
      name: string;
      rarity: string;
      valid: boolean;
      error?: string;
    }> = [];

    for (const cardId of cardIds) {
      const cardDef = await ctx.db.get(cardId);
      if (!cardDef) {
        cardDefinitions.push({
          cardId,
          name: "Unknown",
          rarity: "unknown",
          valid: false,
          error: "Card definition not found",
        });
      } else {
        cardDefinitions.push({
          cardId,
          name: cardDef.name,
          rarity: cardDef.rarity,
          valid: true,
        });
      }
    }

    const playerPreview: Array<{
      playerId: Id<"users">;
      username: string | undefined;
      email: string | undefined;
      valid: boolean;
      error?: string;
    }> = [];

    for (const playerId of playerIds) {
      const player = await ctx.db.get(playerId);
      if (!player) {
        playerPreview.push({
          playerId,
          username: undefined,
          email: undefined,
          valid: false,
          error: "Player not found",
        });
        continue;
      }

      playerPreview.push({
        playerId,
        username: player.username,
        email: player.email,
        valid: true,
      });
    }

    const validPlayers = playerPreview.filter((p) => p.valid).length;
    const invalidPlayers = playerPreview.filter((p) => !p.valid).length;
    const validCards = cardDefinitions.filter((c) => c.valid).length;
    const invalidCards = cardDefinitions.filter((c) => !c.valid).length;
    const totalCardsToGrant = validPlayers * validCards;

    // Group cards by rarity for summary
    const cardsByRarity = cardDefinitions
      .filter((c) => c.valid)
      .reduce(
        (acc, card) => {
          acc[card.rarity] = (acc[card.rarity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    return {
      operation: "batchGrantCards",
      summary: {
        totalPlayers: playerIds.length,
        validPlayers,
        invalidPlayers,
        totalCards: cardIds.length,
        validCards,
        invalidCards,
        cardsPerPlayer: validCards,
        totalCardsToGrant,
        cardsByRarity,
      },
      cardPreview: cardDefinitions,
      playerPreview,
    };
  },
});
