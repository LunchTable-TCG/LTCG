/**
 * Player Moderation Module
 *
 * Admin operations for moderating players: bans, suspensions, warnings, and moderation history.
 * All actions are logged to adminAuditLogs for accountability.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Ban Operations
// =============================================================================

/**
 * Ban a player permanently
 * Requires moderator role or higher
 */
export const banPlayer = mutation({
  args: {
    playerId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, { playerId, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    let errorMessage: string | undefined;

    try {
      // Get player
      const player = await ctx.db.get(playerId);
      if (!player) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: playerId,
        });
      }

      // Check if already banned
      if (player.isBanned) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Player is already banned",
        });
      }

      // Ban the player
      await ctx.db.patch(playerId, {
        isBanned: true,
        banReason: reason,
        bannedAt: Date.now(),
        bannedBy: adminId,
      });

      // Log action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "ban_player",
        targetUserId: playerId,
        targetEmail: player.email,
        metadata: {
          reason,
          playerUsername: player.username,
        },
        success: true,
      });

      return {
        success: true,
        message: `Banned player ${player.username || player.email}`,
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      const player = await ctx.db.get(playerId);
      await scheduleAuditLog(ctx, {
        adminId,
        action: "ban_player",
        targetUserId: playerId,
        targetEmail: player?.email,
        metadata: {
          reason,
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

/**
 * Unban a player
 * Requires moderator role or higher
 */
export const unbanPlayer = mutation({
  args: {
    playerId: v.id("users"),
  },
  handler: async (ctx, { playerId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    let errorMessage: string | undefined;

    try {
      // Get player
      const player = await ctx.db.get(playerId);
      if (!player) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: playerId,
        });
      }

      // Check if banned
      if (!player.isBanned) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Player is not banned",
        });
      }

      // Unban the player
      await ctx.db.patch(playerId, {
        isBanned: false,
        banReason: undefined,
        bannedAt: undefined,
        bannedBy: undefined,
      });

      // Log action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "unban_player",
        targetUserId: playerId,
        targetEmail: player.email,
        metadata: {
          playerUsername: player.username,
          previousBanReason: player.banReason,
        },
        success: true,
      });

      return {
        success: true,
        message: `Unbanned player ${player.username || player.email}`,
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      const player = await ctx.db.get(playerId);
      await scheduleAuditLog(ctx, {
        adminId,
        action: "unban_player",
        targetUserId: playerId,
        targetEmail: player?.email,
        metadata: {
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

// =============================================================================
// Suspension Operations
// =============================================================================

/**
 * Suspend a player temporarily
 * Requires moderator role or higher
 */
export const suspendPlayer = mutation({
  args: {
    playerId: v.id("users"),
    reason: v.string(),
    durationDays: v.number(),
  },
  handler: async (ctx, { playerId, reason, durationDays }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    let errorMessage: string | undefined;

    try {
      // Get player
      const player = await ctx.db.get(playerId);
      if (!player) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: playerId,
        });
      }

      // Check if already suspended
      if (player.isSuspended && player.suspendedUntil && player.suspendedUntil > Date.now()) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Player is already suspended",
        });
      }

      const suspendedUntil = Date.now() + durationDays * 24 * 60 * 60 * 1000;

      // Suspend the player
      await ctx.db.patch(playerId, {
        isSuspended: true,
        suspensionReason: reason,
        suspendedUntil,
        suspendedBy: adminId,
      });

      // Log action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "suspend_player",
        targetUserId: playerId,
        targetEmail: player.email,
        metadata: {
          reason,
          durationDays,
          suspendedUntil,
          playerUsername: player.username,
        },
        success: true,
      });

      return {
        success: true,
        message: `Suspended player ${player.username || player.email} for ${durationDays} days`,
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      const player = await ctx.db.get(playerId);
      await scheduleAuditLog(ctx, {
        adminId,
        action: "suspend_player",
        targetUserId: playerId,
        targetEmail: player?.email,
        metadata: {
          reason,
          durationDays,
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

/**
 * Remove suspension from a player
 * Requires moderator role or higher
 */
export const unsuspendPlayer = mutation({
  args: {
    playerId: v.id("users"),
  },
  handler: async (ctx, { playerId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    let errorMessage: string | undefined;

    try {
      // Get player
      const player = await ctx.db.get(playerId);
      if (!player) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: playerId,
        });
      }

      // Check if suspended
      if (!player.isSuspended) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Player is not suspended",
        });
      }

      // Unsuspend the player
      await ctx.db.patch(playerId, {
        isSuspended: false,
        suspensionReason: undefined,
        suspendedUntil: undefined,
        suspendedBy: undefined,
      });

      // Log action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "unsuspend_player",
        targetUserId: playerId,
        targetEmail: player.email,
        metadata: {
          playerUsername: player.username,
          previousSuspensionReason: player.suspensionReason,
        },
        success: true,
      });

      return {
        success: true,
        message: `Removed suspension from player ${player.username || player.email}`,
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      const player = await ctx.db.get(playerId);
      await scheduleAuditLog(ctx, {
        adminId,
        action: "unsuspend_player",
        targetUserId: playerId,
        targetEmail: player?.email,
        metadata: {
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

// =============================================================================
// Warning Operations
// =============================================================================

/**
 * Issue a warning to a player
 * Requires moderator role or higher
 */
export const warnPlayer = mutation({
  args: {
    playerId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, { playerId, reason }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    let errorMessage: string | undefined;

    try {
      // Get player
      const player = await ctx.db.get(playerId);
      if (!player) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: playerId,
        });
      }

      const currentWarnings = player.warningCount || 0;
      const newWarningCount = currentWarnings + 1;

      // Update warning count
      await ctx.db.patch(playerId, {
        warningCount: newWarningCount,
      });

      // Log action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "warn_player",
        targetUserId: playerId,
        targetEmail: player.email,
        metadata: {
          reason,
          warningCount: newWarningCount,
          playerUsername: player.username,
        },
        success: true,
      });

      return {
        success: true,
        message: `Warned player ${player.username || player.email} (Total warnings: ${newWarningCount})`,
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      const player = await ctx.db.get(playerId);
      await scheduleAuditLog(ctx, {
        adminId,
        action: "warn_player",
        targetUserId: playerId,
        targetEmail: player?.email,
        metadata: {
          reason,
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

// =============================================================================
// Query Operations
// =============================================================================

/**
 * Get moderation status for a player
 * Requires moderator role or higher
 */
export const getPlayerModerationStatus = query({
  args: {
    playerId: v.id("users"),
  },
  handler: async (ctx, { playerId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const player = await ctx.db.get(playerId);
    if (!player) {
      throw createError(ErrorCode.NOT_FOUND_USER, {
        userId: playerId,
      });
    }

    return {
      playerId: player._id,
      playerName: player.username || player.email || "Unknown",
      isBanned: player.isBanned || false,
      banReason: player.banReason,
      bannedAt: player.bannedAt,
      isSuspended: player.isSuspended || false,
      suspendedUntil: player.suspendedUntil,
      suspensionReason: player.suspensionReason,
      warningCount: player.warningCount || 0,
      recentActions: [], // Will be populated by getModerationHistory
    };
  },
});

/**
 * Get moderation history for a player
 * Requires moderator role or higher
 */
export const getModerationHistory = query({
  args: {
    playerId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { playerId, limit = 50 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const player = await ctx.db.get(playerId);
    if (!player) {
      throw createError(ErrorCode.NOT_FOUND_USER, {
        userId: playerId,
      });
    }

    // Get moderation actions from audit logs
    const actions = await ctx.db
      .query("adminAuditLogs")
      .withIndex("by_target_user", (q) => q.eq("targetUserId", playerId))
      .order("desc")
      .take(limit);

    // Filter for moderation-related actions
    const moderationActions = actions.filter((a) =>
      [
        "ban_player",
        "unban_player",
        "suspend_player",
        "unsuspend_player",
        "warn_player",
        "moderation_note",
      ].includes(a.action)
    );

    // Enrich with admin info
    const enrichedActions = await Promise.all(
      moderationActions.map(async (action) => {
        const admin = await ctx.db.get(action.adminId);
        return {
          action: action.action,
          reason: action.metadata?.reason,
          adminUsername: admin?.username || admin?.email || "Unknown",
          timestamp: action.timestamp,
          success: action.success,
          metadata: action.metadata,
        };
      })
    );

    return enrichedActions;
  },
});

/**
 * List all banned players
 * Requires moderator role or higher
 */
export const listBannedPlayers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 100 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const bannedPlayers = await ctx.db
      .query("users")
      .withIndex("isBanned", (q) => q.eq("isBanned", true))
      .take(limit);

    return bannedPlayers.map((player) => ({
      playerId: player._id,
      playerName: player.username || player.email || "Unknown",
      banReason: player.banReason || "No reason provided",
      bannedAt: player.bannedAt || 0,
    }));
  },
});

/**
 * List all currently suspended players
 * Requires moderator role or higher
 */
export const listSuspendedPlayers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 100 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const suspendedPlayers = await ctx.db
      .query("users")
      .withIndex("isSuspended", (q) => q.eq("isSuspended", true))
      .take(limit);

    const now = Date.now();

    // Filter to only include players whose suspension hasn't expired
    return suspendedPlayers
      .filter((player) => player.suspendedUntil && player.suspendedUntil > now)
      .map((player) => ({
        playerId: player._id,
        playerName: player.username || player.email || "Unknown",
        suspensionReason: player.suspensionReason || "No reason provided",
        suspendedUntil: player.suspendedUntil || 0,
      }));
  },
});

/**
 * Add a moderation note to a player's record
 * Requires moderator role or higher
 */
export const addModerationNote = mutation({
  args: {
    playerId: v.id("users"),
    note: v.string(),
  },
  handler: async (ctx, { playerId, note }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    let errorMessage: string | undefined;

    try {
      // Get player
      const player = await ctx.db.get(playerId);
      if (!player) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: playerId,
        });
      }

      // Log note as audit action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "moderation_note",
        targetUserId: playerId,
        targetEmail: player.email,
        metadata: {
          note,
          playerUsername: player.username,
        },
        success: true,
      });

      return {
        success: true,
        message: "Note added to player record",
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      const player = await ctx.db.get(playerId);
      await scheduleAuditLog(ctx, {
        adminId,
        action: "moderation_note",
        targetUserId: playerId,
        targetEmail: player?.email,
        metadata: {
          note,
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});
