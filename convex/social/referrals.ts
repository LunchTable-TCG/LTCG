import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";

// ============================================================================
// Constants
// ============================================================================

const CODE_LENGTH = 8;
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// ============================================================================
// Helpers
// ============================================================================

function generateCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get the current user's active referral link.
 * Returns null if no active link exists.
 */
export const getMyReferralLink = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      code: v.string(),
      uses: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    const link = await ctx.db
      .query("userReferralLinks")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId).eq("isActive", true))
      .first();

    if (!link) return null;

    return {
      code: link.code,
      uses: link.uses,
      createdAt: link.createdAt,
    };
  },
});

/**
 * Get referral stats for the current user.
 * Returns total referrals and a list of referred users.
 */
export const getReferralStats = query({
  args: {},
  returns: v.object({
    totalReferrals: v.number(),
    referrals: v.array(
      v.object({
        username: v.optional(v.string()),
        image: v.optional(v.string()),
        joinedAt: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    const referralRecords = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", auth.userId))
      .collect();

    const referrals = await Promise.all(
      referralRecords.map(async (ref) => {
        const user = await ctx.db.get(ref.referredUserId);
        return {
          username: user?.username,
          image: user?.image,
          joinedAt: ref.createdAt,
        };
      })
    );

    return {
      totalReferrals: referrals.length,
      referrals,
    };
  },
});

/**
 * Get public referrer info by referral code (no auth required).
 * Used by the referral landing page to show who's inviting.
 */
export const getReferrerByCode = query({
  args: {
    code: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      username: v.optional(v.string()),
      image: v.optional(v.string()),
      level: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("userReferralLinks")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!link || !link.isActive) {
      return null;
    }

    const user = await ctx.db.get(link.userId);
    if (!user) {
      return null;
    }

    // Get user level from playerXP
    const playerXP = await ctx.db
      .query("playerXP")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const imageUrl = user.image;

    return {
      username: user.username,
      image: imageUrl,
      level: playerXP?.currentLevel ?? 1,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Generate a new referral link for the current user.
 * Deactivates any existing link first.
 */
export const generateReferralLink = mutation({
  args: {},
  returns: v.object({ code: v.string() }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // Deactivate existing links from this user
    const existingLinks = await ctx.db
      .query("userReferralLinks")
      .withIndex("by_user", (q) => q.eq("userId", userId).eq("isActive", true))
      .collect();

    for (const link of existingLinks) {
      await ctx.db.patch(link._id, { isActive: false });
    }

    // Generate unique code
    let code = generateCode();
    let existing = await ctx.db
      .query("userReferralLinks")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    while (existing) {
      code = generateCode();
      existing = await ctx.db
        .query("userReferralLinks")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    const now = Date.now();

    await ctx.db.insert("userReferralLinks", {
      userId,
      code,
      uses: 0,
      isActive: true,
      createdAt: now,
    });

    return { code };
  },
});
