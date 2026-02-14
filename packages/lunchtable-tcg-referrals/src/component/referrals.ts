import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

// ============================================================================
// MUTATIONS
// ============================================================================

export const createReferralLink = mutation({
  args: {
    userId: v.string(),
    code: v.string(),
  },
  returns: v.id("userReferralLinks"),
  handler: async (ctx, args) => {
    const linkId = await ctx.db.insert("userReferralLinks", {
      userId: args.userId,
      code: args.code,
      uses: 0,
      isActive: true,
      createdAt: Date.now(),
    });
    return linkId;
  },
});

export const incrementLinkUses = mutation({
  args: {
    linkId: v.id("userReferralLinks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Referral link not found");
    }
    await ctx.db.patch(args.linkId, {
      uses: link.uses + 1,
    });
  },
});

export const deactivateUserLinks = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("userReferralLinks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .collect();

    for (const link of links) {
      await ctx.db.patch(link._id, { isActive: false });
    }
  },
});

export const recordReferral = mutation({
  args: {
    referrerId: v.string(),
    referredUserId: v.string(),
    referralCode: v.string(),
  },
  returns: v.id("referrals"),
  handler: async (ctx, args) => {
    const referralId = await ctx.db.insert("referrals", {
      referrerId: args.referrerId,
      referredUserId: args.referredUserId,
      referralCode: args.referralCode,
      createdAt: Date.now(),
    });
    return referralId;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

export const getReferralLink = query({
  args: {
    userId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("userReferralLinks"),
      code: v.string(),
      uses: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("userReferralLinks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .first();

    if (!link) {
      return null;
    }

    return {
      _id: link._id,
      code: link.code,
      uses: link.uses,
      createdAt: link.createdAt,
    };
  },
});

export const getReferralLinkByCode = query({
  args: {
    code: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("userReferralLinks"),
      userId: v.string(),
      code: v.string(),
      uses: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("userReferralLinks")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!link) {
      return null;
    }

    return {
      _id: link._id,
      userId: link.userId,
      code: link.code,
      uses: link.uses,
      isActive: link.isActive,
      createdAt: link.createdAt,
    };
  },
});

export const getReferralsByReferrer = query({
  args: {
    referrerId: v.string(),
  },
  returns: v.array(
    v.object({
      referredUserId: v.string(),
      referralCode: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", args.referrerId))
      .collect();

    return referrals.map((r) => ({
      referredUserId: r.referredUserId,
      referralCode: r.referralCode,
      createdAt: r.createdAt,
    }));
  },
});

export const getReferralCount = query({
  args: {
    referrerId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", args.referrerId))
      .collect();

    return referrals.length;
  },
});
