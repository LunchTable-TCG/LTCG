import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const badgeTypeValidator = v.union(
  v.literal("archetype_complete"),
  v.literal("act_complete"),
  v.literal("difficulty_complete"),
  v.literal("perfect_chapter"),
  v.literal("speed_run"),
  v.literal("milestone")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Award a badge to a user.
 */
export const awardBadge = mutation({
  args: {
    userId: v.string(),
    badgeType: badgeTypeValidator,
    badgeId: v.string(),
    displayName: v.string(),
    description: v.string(),
    archetype: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Check if user already has this badge
    const existing = await ctx.db
      .query("playerBadges")
      .withIndex("by_badge", (q) => q.eq("badgeId", args.badgeId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      return existing._id as string;
    }

    const id = await ctx.db.insert("playerBadges", {
      userId: args.userId,
      badgeType: args.badgeType,
      badgeId: args.badgeId,
      displayName: args.displayName,
      description: args.description,
      archetype: args.archetype,
      iconUrl: args.iconUrl,
      earnedAt: Date.now(),
    });

    return id;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all badges for a user.
 */
export const getUserBadges = query({
  args: {
    userId: v.string(),
    badgeType: v.optional(badgeTypeValidator),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.badgeType) {
      return await ctx.db
        .query("playerBadges")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", args.userId).eq("badgeType", args.badgeType!)
        )
        .collect();
    }

    return await ctx.db
      .query("playerBadges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get a specific badge by its badge ID.
 */
export const getByBadgeId = query({
  args: {
    badgeId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerBadges")
      .withIndex("by_badge", (q) => q.eq("badgeId", args.badgeId))
      .collect();
  },
});

/**
 * Check if a user has a specific badge.
 */
export const hasBadge = query({
  args: {
    userId: v.string(),
    badgeId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const badge = await ctx.db
      .query("playerBadges")
      .withIndex("by_badge", (q) => q.eq("badgeId", args.badgeId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    return badge !== null;
  },
});
