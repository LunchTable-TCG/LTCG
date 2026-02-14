import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { mutation, query } from "./_generated/server.js";

export const addDestination = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    platform: literals("twitch", "youtube", "kick", "custom", "retake", "x", "pumpfun"),
    rtmpUrl: v.string(),
    streamKeyHash: v.string(),
    status: v.optional(literals("active", "failed", "removed")),
    errorMessage: v.optional(v.string()),
  },
  returns: v.id("streamingDestinations"),
  handler: async (ctx, args) => {
    const destinationId = await ctx.db.insert("streamingDestinations", {
      sessionId: args.sessionId,
      platform: args.platform,
      rtmpUrl: args.rtmpUrl,
      streamKeyHash: args.streamKeyHash,
      status: args.status ?? "active",
      addedAt: Date.now(),
      ...(args.errorMessage && { errorMessage: args.errorMessage }),
    });
    return destinationId;
  },
});

export const removeDestination = mutation({
  args: {
    destinationId: v.id("streamingDestinations"),
  },
  returns: v.null(),
  handler: async (ctx, { destinationId }) => {
    await ctx.db.patch(destinationId, {
      status: "removed",
      removedAt: Date.now(),
    });
    return null;
  },
});

export const getDestinations = query({
  args: {
    sessionId: v.id("streamingSessions"),
  },
  returns: v.any(),
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("streamingDestinations")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});

export const getActiveDestinations = query({
  args: {
    sessionId: v.id("streamingSessions"),
  },
  returns: v.any(),
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("streamingDestinations")
      .withIndex("by_session_status", (q) =>
        q.eq("sessionId", sessionId).eq("status", "active")
      )
      .collect();
  },
});
