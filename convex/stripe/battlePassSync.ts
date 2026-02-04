import { v } from "convex/values";
import { internalMutation } from "../functions";

/**
 * Grant premium access to all active battle passes for a user.
 * Called when subscription becomes active via @convex-dev/stripe component.
 */
export const grantPremiumAccess = internalMutation({
  args: {
    privyId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by Privy ID
    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", args.privyId))
      .unique();

    if (!user) {
      console.warn(`[Stripe] User not found for privyId: ${args.privyId}`);
      return;
    }

    // Get all active battle pass seasons
    const activeSeasons = await ctx.db
      .query("battlePassSeasons")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const season of activeSeasons) {
      // Check if user has progress for this season
      const existingProgress = await ctx.db
        .query("battlePassProgress")
        .withIndex("by_user_battlepass", (q) =>
          q.eq("userId", user._id).eq("battlePassId", season._id)
        )
        .unique();

      if (existingProgress) {
        // Update existing progress to premium
        await ctx.db.patch(existingProgress._id, {
          isPremium: true,
          premiumPurchasedAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        // Create new progress with premium
        await ctx.db.insert("battlePassProgress", {
          userId: user._id,
          battlePassId: season._id,
          currentXP: 0,
          currentTier: 0,
          isPremium: true,
          premiumPurchasedAt: Date.now(),
          claimedFreeTiers: [],
          claimedPremiumTiers: [],
          lastXPGainAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    console.log(`[Stripe] Granted premium access to user ${user._id}`);
  },
});

/**
 * Revoke premium access from all battle passes for a user.
 * Called when subscription is canceled or deleted via @convex-dev/stripe component.
 */
export const revokePremiumAccess = internalMutation({
  args: {
    privyId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by Privy ID
    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", args.privyId))
      .unique();

    if (!user) {
      console.warn(`[Stripe] User not found for privyId: ${args.privyId}`);
      return;
    }

    // Get all battle pass progress for this user
    const allProgress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const progress of allProgress) {
      await ctx.db.patch(progress._id, {
        isPremium: false,
        updatedAt: Date.now(),
      });
    }

    console.log(`[Stripe] Revoked premium access from user ${user._id}`);
  },
});
