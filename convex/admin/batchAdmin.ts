/**
 * Batch Admin Operations Module
 *
 * Bulk operations for admin convenience: grant currency, reset ratings, and manage cards.
 * All operations are logged individually for accountability.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { requireRole } from "../lib/roles";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";

/**
 * Local helper to schedule audit logging without triggering TS2589
 */
async function scheduleAuditLog(
  ctx: MutationCtx,
  params: {
    adminId: Id<"users">;
    action: string;
    targetUserId?: Id<"users">;
    targetEmail?: string;
    metadata?: any;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
  }
) {
  // @ts-ignore - TS2589: Type instantiation is excessively deep with internal.lib references
  await ctx.scheduler.runAfter(0, internal.lib.adminAudit.logAdminAction, params);
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
 * TODO: Implement when premium system exists
 */
export const batchGrantPremium = mutation({
  args: {
    playerIds: v.array(v.id("users")),
    durationDays: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, { playerIds, durationDays, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // TODO: Implement premium grant logic when premium system exists
    throw createError(ErrorCode.NOT_IMPLEMENTED, {
      reason: "Premium system not yet implemented",
    });
  },
});

/**
 * Grant card packs to multiple players
 * TODO: Implement when pack system exists
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

    // TODO: Implement pack grant logic when pack system exists
    throw createError(ErrorCode.NOT_IMPLEMENTED, {
      reason: "Pack system not yet implemented",
    });
  },
});

/**
 * Grant specific cards to a player
 * TODO: Implement when card inventory system is available
 */
export const grantCardsToPlayer = mutation({
  args: {
    playerId: v.id("users"),
    cardIds: v.array(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, { playerId, cardIds, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // TODO: Implement card grant logic
    throw createError(ErrorCode.NOT_IMPLEMENTED, {
      reason: "Card inventory management not yet implemented",
    });
  },
});

/**
 * Remove specific cards from a player
 * TODO: Implement when card inventory system is available
 */
export const removeCardsFromPlayer = mutation({
  args: {
    playerId: v.id("users"),
    cardIds: v.array(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, { playerId, cardIds, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // TODO: Implement card removal logic
    throw createError(ErrorCode.NOT_IMPLEMENTED, {
      reason: "Card inventory management not yet implemented",
    });
  },
});

/**
 * Grant specific cards to multiple players
 * TODO: Implement when card inventory system is available
 */
export const batchGrantCards = mutation({
  args: {
    playerIds: v.array(v.id("users")),
    cardIds: v.array(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, { playerIds, cardIds, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // TODO: Implement batch card grant logic
    throw createError(ErrorCode.NOT_IMPLEMENTED, {
      reason: "Card inventory management not yet implemented",
    });
  },
});
