/**
 * Agent Streaming Integration
 *
 * Handles auto-streaming for AI agents when they play games
 */

import { literals } from "convex-helpers/validators";
import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { internalAction, internalMutation, mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";

import { streamingPlatformValidator } from "../lib/streamingPlatforms";

function hasValidInternalAuth(internalAuth?: string): boolean {
  const expectedSecret = process.env["INTERNAL_API_SECRET"]?.trim();
  const providedSecret = internalAuth?.trim();
  if (!expectedSecret || !providedSecret) {
    return false;
  }
  return expectedSecret === providedSecret;
}

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
    keepAlive: v.optional(v.boolean()),
    voiceTrackUrl: v.optional(v.string()),
    voiceVolume: v.optional(v.number()),
    voiceLoop: v.optional(v.boolean()),
    visualMode: v.optional(literals("webcam", "profile-picture")),
    profilePictureUrl: v.optional(v.string()),
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    if (!hasValidInternalAuth(args.internalAuth)) {
      const auth = await requireAuthMutation(ctx);
      if (agent.userId !== auth.userId) {
        throw new Error("Unauthorized to configure this agent");
      }
    }

    // Update agent with streaming config
    await ctx.db.patch(args.agentId, {
      streamingEnabled: args.enabled,
      ...(args.platform !== undefined ? { streamingPlatform: args.platform } : {}),
      ...(args.streamKeyHash !== undefined ? { streamingKeyHash: args.streamKeyHash } : {}),
      ...(args.rtmpUrl !== undefined ? { streamingRtmpUrl: args.rtmpUrl } : {}),
      streamingAutoStart: args.autoStart ?? true,
      streamingPersistent: args.enabled ? (args.keepAlive ?? true) : false,
      ...(args.voiceTrackUrl !== undefined
        ? { streamingVoiceTrackUrl: args.voiceTrackUrl.trim() || undefined }
        : {}),
      ...(args.voiceVolume !== undefined
        ? { streamingVoiceVolume: Math.max(0, Math.min(1, args.voiceVolume)) }
        : {}),
      ...(args.voiceLoop !== undefined ? { streamingVoiceLoop: args.voiceLoop } : {}),
      ...(args.visualMode !== undefined ? { streamingVisualMode: args.visualMode } : {}),
      ...(args.profilePictureUrl !== undefined
        ? { streamingProfilePictureUrl: args.profilePictureUrl.trim() || undefined }
        : {}),
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
    const auth = await requireAuthQuery(ctx);
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;

    if (agent.userId !== auth.userId) {
      return null;
    }

    return {
      enabled: agent.streamingEnabled ?? false,
      platform: agent.streamingPlatform ?? null,
      hasStreamKey: Boolean(agent.streamingKeyHash),
      rtmpUrl: agent.streamingRtmpUrl ?? null,
      autoStart: agent.streamingAutoStart ?? false,
      keepAlive: agent.streamingPersistent ?? true,
      voiceTrackUrl: agent.streamingVoiceTrackUrl ?? null,
      voiceVolume: agent.streamingVoiceVolume ?? null,
      voiceLoop: agent.streamingVoiceLoop ?? false,
      visualMode: agent.streamingVisualMode ?? "profile-picture",
      profilePictureUrl: agent.streamingProfilePictureUrl ?? null,
    };
  },
});

/**
 * Get streaming configuration for an agent (API key / internal auth).
 * Used by the plugin to check if UI-configured streaming is available.
 * Never returns plaintext stream key — only hasStreamKey boolean.
 */
export const getAgentStreamingConfigByAuth = query({
  args: {
    agentId: v.id("agents"),
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate auth: either internal auth or user auth
    let isAuthorized = false;

    if (args.internalAuth && hasValidInternalAuth(args.internalAuth)) {
      isAuthorized = true;
    } else {
      try {
        const auth = await requireAuthQuery(ctx);
        const agent = await ctx.db.get(args.agentId);
        if (agent && agent.userId === auth.userId) {
          isAuthorized = true;
        }
      } catch {
        // Not authenticated via user auth
      }
    }

    if (!isAuthorized) {
      return null;
    }

    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;

    return {
      enabled: agent.streamingEnabled ?? false,
      platform: agent.streamingPlatform ?? null,
      hasStreamKey: Boolean(agent.streamingKeyHash),
      rtmpUrl: agent.streamingRtmpUrl ?? null,
      autoStart: agent.streamingAutoStart ?? false,
      keepAlive: agent.streamingPersistent ?? true,
      voiceTrackUrl: agent.streamingVoiceTrackUrl ?? null,
      voiceVolume: agent.streamingVoiceVolume ?? null,
      voiceLoop: agent.streamingVoiceLoop ?? false,
      visualMode: agent.streamingVisualMode ?? "profile-picture",
      profilePictureUrl: agent.streamingProfilePictureUrl ?? null,
    };
  },
});

/**
 * Get agent's encrypted stream key hash (internal auth only).
 * Used by /api/streaming/start when useStoredCredentials is true.
 * The encrypted key is decrypted server-side in the API route — never exposed to clients.
 */
export const getAgentStreamKeyHash = query({
  args: {
    agentId: v.id("agents"),
    internalAuth: v.string(),
  },
  handler: async (ctx, args) => {
    if (!hasValidInternalAuth(args.internalAuth)) {
      return null;
    }

    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;

    return {
      streamingKeyHash: agent.streamingKeyHash ?? null,
      streamingRtmpUrl: agent.streamingRtmpUrl ?? null,
      streamingPlatform: agent.streamingPlatform ?? null,
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

    const existingSessions = await Promise.all([
      ctx.db
        .query("streamingSessions")
        .withIndex("by_agent_status", (q) => q.eq("agentId", args.agentId).eq("status", "live"))
        .first(),
      ctx.db
        .query("streamingSessions")
        .withIndex("by_agent_status", (q) => q.eq("agentId", args.agentId).eq("status", "pending"))
        .first(),
      ctx.db
        .query("streamingSessions")
        .withIndex("by_agent_status", (q) =>
          q.eq("agentId", args.agentId).eq("status", "initializing")
        )
        .first(),
    ]);

    const existingActiveSession = existingSessions.find(Boolean);

    if (existingActiveSession) {
      await ctx.db.patch(existingActiveSession._id, {
        currentLobbyId: args.lobbyId,
      });
      const lobby = await ctx.db.get(args.lobbyId);
      if (lobby) {
        await ctx.db.patch(args.lobbyId, {
          isPrivate: false,
          allowSpectators: true,
        });
      }
      return { started: false, reason: "already_active_linked_to_lobby" };
    }

    if (!agent.streamingPlatform || !agent.streamingKeyHash) {
      console.warn("Agent streaming not configured:", args.agentId);
      return { started: false, reason: "not_configured" };
    }

    const requiresCustomRtmp =
      agent.streamingPlatform === "custom" ||
      agent.streamingPlatform === "retake" ||
      agent.streamingPlatform === "x" ||
      agent.streamingPlatform === "pumpfun";

    // Providers with external ingest endpoints require a configured base RTMP URL.
    if (requiresCustomRtmp && !agent.streamingRtmpUrl) {
      console.warn("Agent streaming requires RTMP URL for platform:", agent.streamingPlatform);
      return { started: false, reason: "rtmp_url_required" };
    }

    // Trigger streaming via HTTP endpoint
    // This is done via scheduler to avoid blocking the game start
    await ctx.scheduler.runAfter(0, internalAny.agents.streaming.triggerAgentStreamStart, {
      agentId: args.agentId,
      lobbyId: args.lobbyId,
      platform: agent.streamingPlatform,
      streamKeyHash: agent.streamingKeyHash,
      customRtmpUrl: agent.streamingRtmpUrl,
      voiceTrackUrl: agent.streamingVoiceTrackUrl,
      voiceVolume: agent.streamingVoiceVolume,
      voiceLoop: agent.streamingVoiceLoop ?? false,
      visualMode: agent.streamingVisualMode ?? "profile-picture",
      profilePictureUrl: agent.streamingProfilePictureUrl,
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
    voiceTrackUrl: v.optional(v.string()),
    voiceVolume: v.optional(v.number()),
    voiceLoop: v.optional(v.boolean()),
    visualMode: v.optional(literals("webcam", "profile-picture")),
    profilePictureUrl: v.optional(v.string()),
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
    const configuredAppUrl =
      process.env["LTCG_APP_URL"] ||
      process.env["NEXT_PUBLIC_APP_URL"] ||
      "http://localhost:3333";
    const baseUrl = configuredAppUrl.includes(".convex.site")
      ? "https://www.lunchtable.cards"
      : configuredAppUrl;
    const internalAuthSecret = process.env["INTERNAL_API_SECRET"];
    if (!internalAuthSecret) {
      throw new Error("INTERNAL_API_SECRET is required");
    }

    try {
      const retakeAccessToken =
        args.platform === "retake"
          ? process.env["RETAKE_ACCESS_TOKEN"] || process.env["DIZZY_RETAKE_ACCESS_TOKEN"]
          : undefined;

      const response = await fetch(`${baseUrl}/api/streaming/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Auth": internalAuthSecret,
        },
        body: JSON.stringify({
          agentId: args.agentId,
          streamType: "agent",
          platform: args.platform,
          streamKeyHash: args.streamKeyHash, // API will decrypt
          customRtmpUrl: args.customRtmpUrl,
          lobbyId: args.lobbyId,
          ...(retakeAccessToken ? { retakeAccessToken } : {}),
          streamTitle: `${agent.name} - LTCG Tournament`,
          overlayConfig: {
            showDecisions: true,
            showAgentInfo: true,
            showEventFeed: true,
            showPlayerCam: (args.visualMode ?? "profile-picture") === "profile-picture",
            webcamPosition: "bottom-right",
            webcamSize: "medium",
            playerVisualMode: args.visualMode ?? "profile-picture",
            profilePictureUrl: args.profilePictureUrl,
            matchOverHoldMs: 45000,
            showSceneLabel: true,
            sceneTransitions: true,
            voiceTrackUrl: args.voiceTrackUrl,
            voiceVolume: args.voiceVolume,
            voiceLoop: args.voiceLoop ?? false,
            theme: "dark",
          },
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
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return { stopped: false, reason: "agent_not_found" };
    }

    // Find active streaming session for this agent and lobby
    const sessionCandidates = await Promise.all([
      ctx.db
        .query("streamingSessions")
        .withIndex("by_agent_status", (q) => q.eq("agentId", args.agentId).eq("status", "live"))
        .filter((q) => q.eq(q.field("currentLobbyId"), args.lobbyId))
        .first(),
      ctx.db
        .query("streamingSessions")
        .withIndex("by_agent_status", (q) => q.eq("agentId", args.agentId).eq("status", "pending"))
        .filter((q) => q.eq(q.field("currentLobbyId"), args.lobbyId))
        .first(),
      ctx.db
        .query("streamingSessions")
        .withIndex("by_agent_status", (q) =>
          q.eq("agentId", args.agentId).eq("status", "initializing")
        )
        .filter((q) => q.eq(q.field("currentLobbyId"), args.lobbyId))
        .first(),
    ]);

    const session = sessionCandidates.find(Boolean);

    if (!session) {
      return { stopped: false, reason: "no_active_session" };
    }

    const lobby = await ctx.db.get(args.lobbyId);
    const now = Date.now();
    const result =
      lobby?.winnerId === agent.userId
        ? "win"
        : lobby?.winnerId
          ? "loss"
          : lobby?.status === "completed"
            ? "draw"
            : "unknown";

    await ctx.db.patch(session._id, {
      currentLobbyId: undefined,
      lastMatchEndedAt: now,
      lastMatchResult: result,
      lastMatchReason: lobby?.status ?? "unknown",
      lastMatchSummary:
        result === "win"
          ? "Match over: victory secured."
          : result === "loss"
            ? "Match over: tough loss. Reviewing lines."
            : result === "draw"
              ? "Match over: draw."
              : "Match over.",
    });

    if (agent.streamingPersistent ?? true) {
      return { stopped: false, reason: "persistent_stream_kept_live" };
    }

    // Trigger stop via scheduler when persistent mode is disabled
    await ctx.scheduler.runAfter(0, internalAny.agents.streaming.triggerAgentStreamStop, {
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
    const configuredAppUrl =
      process.env["LTCG_APP_URL"] ||
      process.env["NEXT_PUBLIC_APP_URL"] ||
      "http://localhost:3333";
    const baseUrl = configuredAppUrl.includes(".convex.site")
      ? "https://www.lunchtable.cards"
      : configuredAppUrl;
    const internalAuthSecret = process.env["INTERNAL_API_SECRET"];
    if (!internalAuthSecret) {
      return { success: false, error: "INTERNAL_API_SECRET is required" };
    }

    try {
      const response = await fetch(`${baseUrl}/api/streaming/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Auth": internalAuthSecret,
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
