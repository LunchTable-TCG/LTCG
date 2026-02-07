/**
 * Agent Streaming Integration
 *
 * Handles auto-streaming for AI agents when they play games
 */

import { literals } from "convex-helpers/validators";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, mutation, query } from "../_generated/server";

const streamingPlatformValidator = literals("twitch", "youtube", "custom", "retake", "x", "pumpfun");

/**
 * Configure streaming settings for an agent
 */
export const configureAgentStreaming = mutation({
  args: {
    agentId: v.id("agents"),
    enabled: v.boolean(),
    platform: v.optional(streamingPlatformValidator),
    streamKeyHash: v.optional(v.string()),
    rtmpUrl: v.optional(v.string()),
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
      streamingRtmpUrl: args.rtmpUrl,
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
      hasRtmpUrl: Boolean(agent.streamingRtmpUrl),
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

    // X and Pump.fun require a custom RTMP URL
    if ((agent.streamingPlatform === "x" || agent.streamingPlatform === "pumpfun") && !agent.streamingRtmpUrl) {
      console.warn("Agent streaming requires RTMP URL for platform:", agent.streamingPlatform);
      return { started: false, reason: "rtmp_url_required" };
    }

    // Trigger streaming via HTTP endpoint
    // This is done via scheduler to avoid blocking the game start
    await ctx.scheduler.runAfter(0, internal.agents.streaming.triggerAgentStreamStart, {
      agentId: args.agentId,
      lobbyId: args.lobbyId,
      platform: agent.streamingPlatform,
      streamKeyHash: agent.streamingKeyHash,
      customRtmpUrl: agent.streamingRtmpUrl,
    });

    return { started: true };
  },
});

/**
 * Internal action to trigger stream start via HTTP API
 */
export const triggerAgentStreamStart = internalAction({
  args: {
    agentId: v.id("agents"),
    lobbyId: v.id("gameLobbies"),
    platform: streamingPlatformValidator,
    streamKeyHash: v.string(),
    customRtmpUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Get agent info
    const internalApi = getInternalApi();
    const agent = await ctx.runQuery(internalApi.agents.agents.getAgentByIdInternal, {
      agentId: args.agentId,
    });

    if (!agent) {
      throw new Error("Agent not found");
    }

    // 2. Call streaming API
    const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000";

    try {
      const response = await fetch(`${baseUrl}/api/streaming/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Auth": process.env["INTERNAL_API_SECRET"]!,
        },
        body: JSON.stringify({
          agentId: args.agentId,
          streamType: "agent",
          platform: args.platform,
          streamKeyHash: args.streamKeyHash, // API will decrypt
          customRtmpUrl: args.customRtmpUrl,
          streamTitle: `${agent.name} - LTCG Tournament`,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to start agent stream:", error);
        throw new Error(`Failed to start agent stream: ${error}`);
      }

      const { sessionId } = await response.json();

      // 3. Link session to lobby (uses internal variant since this is an internalAction)
      await ctx.runMutation(internalApi.streaming.sessions.linkLobbyInternal, {
        sessionId,
        lobbyId: args.lobbyId,
      });

      return { success: true, sessionId };
    } catch (error) {
      console.error("Error starting agent stream:", error);
      throw error;
    }
  },
});

// Helper to get internal API without triggering TS2589
// eslint-disable-next-line @typescript-eslint/no-require-imports
function getInternalApi() {
  return require("../_generated/api").internal;
}

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
export const triggerAgentStreamStop = internalAction({
  args: {
    sessionId: v.id("streamingSessions"),
  },
  handler: async (_ctx, args) => {
    const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000";

    try {
      const response = await fetch(`${baseUrl}/api/streaming/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Auth": process.env["INTERNAL_API_SECRET"]!,
        },
        body: JSON.stringify({
          sessionId: args.sessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to stop agent stream:", error);
        // Don't throw - game should continue even if stream stop fails
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error("Error stopping agent stream:", error);
      // Don't throw - allow game to continue
      return { success: false, error: String(error) };
    }
  },
});
