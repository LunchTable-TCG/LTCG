/**
 * LiveKit Integration Stubs for Convex
 *
 * NOTE: The actual LiveKit API calls happen in Next.js API routes
 * because livekit-server-sdk can't be bundled in Convex actions.
 *
 * These are placeholder exports for the api type generation.
 * The real implementation is in /apps/web/app/api/streaming/
 */

import { v } from "convex/values";
import { api } from "../_generated/api";
import { action } from "../_generated/server";

/**
 * Placeholder for starting LiveKit egress
 * Actual implementation is in Next.js API route
 *
 * This action just updates session state - the API route handles LiveKit calls
 */
export const markEgressStarted = action({
  args: {
    sessionId: v.id("streamingSessions"),
    egressId: v.string(),
    overlayUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.streaming.sessions.updateSession, {
      sessionId: args.sessionId,
      updates: {
        egressId: args.egressId,
        overlayUrl: args.overlayUrl,
        status: "pending",
      },
    });
    return { success: true };
  },
});

/**
 * Mark egress as live (called from LiveKit webhook)
 */
export const markEgressLive = action({
  args: {
    sessionId: v.id("streamingSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.streaming.sessions.updateSession, {
      sessionId: args.sessionId,
      updates: {
        status: "live",
        startedAt: Date.now(),
      },
    });
    return { success: true };
  },
});

/**
 * Mark egress as ended
 */
export const markEgressEnded = action({
  args: {
    sessionId: v.id("streamingSessions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.streaming.sessions.endSession, {
      sessionId: args.sessionId,
      reason: args.reason || "egress_ended",
    });
    return { success: true };
  },
});

/**
 * Mark egress as errored
 */
export const markEgressError = action({
  args: {
    sessionId: v.id("streamingSessions"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.streaming.sessions.updateSession, {
      sessionId: args.sessionId,
      updates: {
        status: "error",
        errorMessage: args.errorMessage,
      },
    });
    return { success: true };
  },
});
