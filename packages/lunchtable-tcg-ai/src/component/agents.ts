import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { mutation, query } from "./_generated/server";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const streamingPlatformValidator = literals("twitch", "youtube", "kick", "custom", "retake", "x", "pumpfun");
const walletStatusValidator = literals("pending", "created", "failed");
const streamingVisualModeValidator = literals("webcam", "profile-picture");

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new AI agent.
 */
export const createAgent = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    profilePictureUrl: v.optional(v.string()),
    socialLink: v.optional(v.string()),
    starterDeckCode: v.string(),
    isActive: v.optional(v.boolean()),
    // Privy wallet fields
    privyUserId: v.optional(v.string()),
    walletIndex: v.optional(v.number()),
    walletId: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
    walletChainType: v.optional(v.string()),
    walletCreatedAt: v.optional(v.number()),
    walletStatus: v.optional(walletStatusValidator),
    walletErrorMessage: v.optional(v.string()),
    // Streaming fields
    streamingEnabled: v.optional(v.boolean()),
    streamingPlatform: v.optional(streamingPlatformValidator),
    streamingKeyHash: v.optional(v.string()),
    streamingRtmpUrl: v.optional(v.string()),
    streamingAutoStart: v.optional(v.boolean()),
    streamingPersistent: v.optional(v.boolean()),
    streamingVoiceTrackUrl: v.optional(v.string()),
    streamingVoiceVolume: v.optional(v.number()),
    streamingVoiceLoop: v.optional(v.boolean()),
    streamingVisualMode: v.optional(streamingVisualModeValidator),
    streamingProfilePictureUrl: v.optional(v.string()),
    lastStreamAt: v.optional(v.number()),
    // Webhook fields
    callbackUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    webhookEnabled: v.optional(v.boolean()),
    lastWebhookAt: v.optional(v.number()),
    webhookFailCount: v.optional(v.number()),
  },
  returns: v.id("agents"),
  handler: async (ctx, args) => {
    const agentId = await ctx.db.insert("agents", {
      userId: args.userId,
      name: args.name,
      profilePictureUrl: args.profilePictureUrl,
      socialLink: args.socialLink,
      starterDeckCode: args.starterDeckCode,
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      },
      createdAt: Date.now(),
      isActive: args.isActive ?? true,
      privyUserId: args.privyUserId,
      walletIndex: args.walletIndex,
      walletId: args.walletId,
      walletAddress: args.walletAddress,
      walletChainType: args.walletChainType,
      walletCreatedAt: args.walletCreatedAt,
      walletStatus: args.walletStatus,
      walletErrorMessage: args.walletErrorMessage,
      streamingEnabled: args.streamingEnabled,
      streamingPlatform: args.streamingPlatform,
      streamingKeyHash: args.streamingKeyHash,
      streamingRtmpUrl: args.streamingRtmpUrl,
      streamingAutoStart: args.streamingAutoStart,
      streamingPersistent: args.streamingPersistent,
      streamingVoiceTrackUrl: args.streamingVoiceTrackUrl,
      streamingVoiceVolume: args.streamingVoiceVolume,
      streamingVoiceLoop: args.streamingVoiceLoop,
      streamingVisualMode: args.streamingVisualMode,
      streamingProfilePictureUrl: args.streamingProfilePictureUrl,
      lastStreamAt: args.lastStreamAt,
      callbackUrl: args.callbackUrl,
      webhookSecret: args.webhookSecret,
      webhookEnabled: args.webhookEnabled,
      lastWebhookAt: args.lastWebhookAt,
      webhookFailCount: args.webhookFailCount,
    });

    return agentId;
  },
});

/**
 * Update an existing agent.
 */
export const updateAgent = mutation({
  args: {
    agentId: v.id("agents"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, args.updates);
    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get an agent by ID.
 */
export const getAgent = query({
  args: { agentId: v.id("agents") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

/**
 * Get an agent by name.
 */
export const getAgentByName = query({
  args: { name: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

/**
 * Get all agents for a user.
 */
export const getAgentsByUser = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get an agent by wallet address.
 */
export const getAgentByWallet = query({
  args: { walletAddress: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();
  },
});

/**
 * List all agents with optional limit.
 */
export const listAgents = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db.query("agents").take(limit);
  },
});
