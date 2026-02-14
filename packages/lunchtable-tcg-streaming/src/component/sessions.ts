import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { mutation, query } from "./_generated/server.js";

export const createSession = mutation({
  args: {
    streamType: literals("user", "agent"),
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    platform: literals("twitch", "youtube", "kick", "custom", "retake", "x", "pumpfun"),
    streamTitle: v.string(),
    overlayConfig: v.object({
      showDecisions: v.boolean(),
      showAgentInfo: v.boolean(),
      showEventFeed: v.boolean(),
      showPlayerCam: v.boolean(),
      webcamPosition: v.optional(literals("top-left", "top-right", "bottom-left", "bottom-right")),
      webcamSize: v.optional(literals("small", "medium", "large")),
      playerVisualMode: v.optional(literals("webcam", "profile-picture")),
      profilePictureUrl: v.optional(v.string()),
      matchOverHoldMs: v.optional(v.number()),
      showSceneLabel: v.optional(v.boolean()),
      sceneTransitions: v.optional(v.boolean()),
      voiceTrackUrl: v.optional(v.string()),
      voiceVolume: v.optional(v.number()),
      voiceLoop: v.optional(v.boolean()),
      theme: literals("dark", "light"),
    }),
    egressId: v.optional(v.string()),
    overlayUrl: v.optional(v.string()),
    currentLobbyId: v.optional(v.string()),
    streamKeyHash: v.optional(v.string()),
    retakeAccessToken: v.optional(v.string()),
    retakeUserDbId: v.optional(v.string()),
    pumpfunMintAddress: v.optional(v.string()),
  },
  returns: v.id("streamingSessions"),
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("streamingSessions", {
      ...args,
      status: "initializing",
      createdAt: Date.now(),
    });
    return sessionId;
  },
});

export const getSession = query({
  args: { sessionId: v.id("streamingSessions") },
  returns: v.any(),
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

export const getSessionByEgress = query({
  args: { egressId: v.string() },
  returns: v.any(),
  handler: async (ctx, { egressId }) => {
    return await ctx.db
      .query("streamingSessions")
      .withIndex("by_egress", (q) => q.eq("egressId", egressId))
      .first();
  },
});

export const getActiveSessions = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db
      .query("streamingSessions")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();
  },
});

export const getSessionsByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { userId, limit }) => {
    const query = ctx.db
      .query("streamingSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    return limit ? await query.take(limit) : await query.collect();
  },
});

export const getSessionsByAgent = query({
  args: {
    agentId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { agentId, limit }) => {
    const query = ctx.db
      .query("streamingSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc");

    return limit ? await query.take(limit) : await query.collect();
  },
});

export const updateSession = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, updates }) => {
    await ctx.db.patch(sessionId, updates);
    return null;
  },
});

export const endSession = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    endReason: v.optional(v.string()),
    stats: v.optional(
      v.object({
        duration: v.number(),
        decisionsLogged: v.number(),
        eventsRecorded: v.number(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, endReason, stats }) => {
    await ctx.db.patch(sessionId, {
      status: "ended",
      endedAt: Date.now(),
      ...(endReason && { endReason }),
      ...(stats && { stats }),
    });
    return null;
  },
});
