/**
 * Agent Streaming Integration
 *
 * Handles auto-streaming for AI agents when they play games
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";

/**
 * Configure streaming settings for an agent
 */
export const configureAgentStreaming = mutation({
  args: {
    agentId: v.id("agents"),
    enabled: v.boolean(),
    platform: v.optional(v.union(v.literal("twitch"), v.literal("youtube"))),
    streamKeyHash: v.optional(v.string()),
    autoStart: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Update agent with streaming config
    await ctx.db.patch(args.agentId, {
      streamingEnabled: args.enabled,
      streamingPlatform: args.platform,
      streamingKeyHash: args.streamKeyHash,
      streamingAutoStart: args.autoStart ?? true,
    });

    return { success: true };
  },
});

/**
 * Get streaming configuration for an agent
 */
export const getAgentStreamingConfig = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;

    return {
      enabled: agent.streamingEnabled ?? false,
      platform: agent.streamingPlatform,
      autoStart: agent.streamingAutoStart ?? false,
      hasStreamKey: Boolean(agent.streamingKeyHash),
    };
  },
});

/**
 * Auto-start streaming when an agent's game begins
 * Called from game lifecycle webhooks
 */
export const autoStartAgentStream = internalMutation({
  args: {
    agentId: v.id("agents"),
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      console.warn("Agent not found for auto-streaming:", args.agentId);
      return { started: false, reason: "agent_not_found" };
    }

    // Check if streaming is enabled and configured
    if (!agent.streamingEnabled) {
      return { started: false, reason: "streaming_disabled" };
    }

    if (!agent.streamingAutoStart) {
      return { started: false, reason: "autostart_disabled" };
    }

    if (!agent.streamingPlatform || !agent.streamingKeyHash) {
      console.warn("Agent streaming not configured:", args.agentId);
      return { started: false, reason: "not_configured" };
    }

    // Trigger streaming via HTTP endpoint
    // This is done via scheduler to avoid blocking the game start
    await ctx.scheduler.runAfter(0, internal.agents.streaming.triggerAgentStreamStart, {
      agentId: args.agentId,
      lobbyId: args.lobbyId,
      platform: agent.streamingPlatform,
      streamKeyHash: agent.streamingKeyHash,
    });

    return { started: true };
  },
});

/**
 * Internal action to trigger stream start via HTTP API
 */
export const triggerAgentStreamStart = internalMutation({
  args: {
    agentId: v.id("agents"),
    lobbyId: v.id("gameLobbies"),
    platform: v.union(v.literal("twitch"), v.literal("youtube")),
    streamKeyHash: v.string(),
  },
  handler: async (_ctx, args) => {
    // This will be implemented to call the streaming API
    // For now, just log the intent
    console.log("Would start stream for agent:", args.agentId, "in lobby:", args.lobbyId);

    // In production, this would:
    // 1. Decrypt the stream key
    // 2. Call /api/streaming/start with agent credentials
    // 3. Link the session to the lobby

    return { success: true };
  },
});

/**
 * Stop agent stream when game ends
 */
export const autoStopAgentStream = internalMutation({
  args: {
    agentId: v.id("agents"),
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // Find active streaming session for this agent and lobby
    const session = await ctx.db
      .query("streamingSessions")
      .withIndex("by_agent_status", (q) => q.eq("agentId", args.agentId).eq("status", "live"))
      .filter((q) => q.eq(q.field("currentLobbyId"), args.lobbyId))
      .first();

    if (!session) {
      return { stopped: false, reason: "no_active_session" };
    }

    // Trigger stop via scheduler
    await ctx.scheduler.runAfter(0, internal.agents.streaming.triggerAgentStreamStop, {
      sessionId: session._id,
    });

    return { stopped: true };
  },
});

/**
 * Internal action to trigger stream stop via HTTP API
 */
export const triggerAgentStreamStop = internalMutation({
  args: {
    sessionId: v.id("streamingSessions"),
  },
  handler: async (_ctx, args) => {
    console.log("Would stop stream session:", args.sessionId);

    // In production, this would:
    // 1. Call /api/streaming/stop with session ID
    // 2. Update session status

    return { success: true };
  },
});
