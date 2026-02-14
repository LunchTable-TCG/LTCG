import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const actionTypeValidator = v.union(
  v.literal("mute"),
  v.literal("unmute"),
  v.literal("warn"),
  v.literal("suspend"),
  v.literal("unsuspend"),
  v.literal("ban"),
  v.literal("unban")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a moderation action record.
 */
export const createModerationAction = mutation({
  args: {
    userId: v.string(),
    adminId: v.string(),
    actionType: actionTypeValidator,
    reason: v.optional(v.string()),
    duration: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("moderationActions", {
      userId: args.userId,
      adminId: args.adminId,
      actionType: args.actionType,
      reason: args.reason,
      duration: args.duration,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
    return id;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get moderation history for a user.
 */
export const getModerationHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("moderationActions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get active moderations for a user (bans, suspensions that haven't expired).
 */
export const getActiveModerations = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();

    const actions = await ctx.db
      .query("moderationActions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Find active bans and suspensions
    const activeActions = actions.filter((action) => {
      if (action.actionType === "ban") {
        // Check no subsequent unban
        const unbanned = actions.some(
          (a) =>
            a.actionType === "unban" &&
            a.createdAt > action.createdAt
        );
        return !unbanned;
      }
      if (action.actionType === "suspend") {
        // Check not expired and no subsequent unsuspend
        const unsuspended = actions.some(
          (a) =>
            a.actionType === "unsuspend" &&
            a.createdAt > action.createdAt
        );
        if (unsuspended) return false;
        if (action.expiresAt && action.expiresAt <= now) return false;
        return true;
      }
      if (action.actionType === "mute") {
        const unmuted = actions.some(
          (a) =>
            a.actionType === "unmute" &&
            a.createdAt > action.createdAt
        );
        if (unmuted) return false;
        if (action.expiresAt && action.expiresAt <= now) return false;
        return true;
      }
      return false;
    });

    return activeActions;
  },
});
