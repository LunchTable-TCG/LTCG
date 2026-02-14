import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a user's daily reward claim status.
 * Returns recent claims so the host app can determine what's claimable.
 */
export const getDailyRewardStatus = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Get most recent claims by type
    const recentClaims = await ctx.db
      .query("dailyRewards")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);

    return recentClaims;
  },
});

/**
 * Get reward history for a user.
 */
export const getRewardHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("dailyRewards")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Record a reward claim.
 * The host app handles reward generation logic; this records the result.
 */
export const recordRewardClaim = mutation({
  args: {
    userId: v.string(),
    rewardType: v.union(
      v.literal("daily_pack"),
      v.literal("weekly_jackpot"),
      v.literal("login_streak"),
      v.literal("season_end"),
      v.literal("event")
    ),
    reward: v.object({
      type: v.union(
        v.literal("pack"),
        v.literal("gold"),
        v.literal("gems"),
        v.literal("card"),
        v.literal("lottery_ticket")
      ),
      amount: v.optional(v.number()),
      packId: v.optional(v.string()),
      cardId: v.optional(v.string()),
      variant: v.optional(v.string()),
      serialNumber: v.optional(v.number()),
    }),
    jackpotResult: v.optional(
      v.object({
        won: v.boolean(),
        prizeType: v.optional(v.string()),
        rollValue: v.optional(v.number()),
      })
    ),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("dailyRewards", {
      userId: args.userId,
      rewardType: args.rewardType,
      claimedAt: Date.now(),
      reward: args.reward,
      jackpotResult: args.jackpotResult,
    });
    return id;
  },
});
