import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { literals } from "convex-helpers/validators";

const streamingPlatformValidator = literals("twitch", "youtube", "kick", "custom", "retake", "x", "pumpfun");

export default defineSchema({
  streamingSessions: defineTable({
    userId: v.optional(v.string()), // external ref → v.string()
    agentId: v.optional(v.string()), // external ref → v.string()
    streamType: literals("user", "agent"),
    platform: streamingPlatformValidator,
    streamTitle: v.string(),
    status: literals("initializing", "pending", "live", "ended", "error"),
    egressId: v.optional(v.string()),
    overlayUrl: v.optional(v.string()),
    currentLobbyId: v.optional(v.string()), // simplified from v.union(v.id("gameLobbies"), v.string())
    streamKeyHash: v.optional(v.string()),
    retakeAccessToken: v.optional(v.string()),
    retakeUserDbId: v.optional(v.string()),
    pumpfunMintAddress: v.optional(v.string()),
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
    lastMatchEndedAt: v.optional(v.number()),
    lastMatchResult: v.optional(literals("win", "loss", "draw", "unknown")),
    lastMatchReason: v.optional(v.string()),
    lastMatchSummary: v.optional(v.string()),
    viewerCount: v.optional(v.number()),
    peakViewerCount: v.optional(v.number()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    endReason: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    stats: v.optional(
      v.object({
        duration: v.number(),
        decisionsLogged: v.number(),
        eventsRecorded: v.number(),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"])
    .index("by_agent_status", ["agentId", "status"])
    .index("by_lobby", ["currentLobbyId"])
    .index("by_egress", ["egressId"]),

  streamingDestinations: defineTable({
    sessionId: v.id("streamingSessions"), // intra-component ref
    platform: streamingPlatformValidator,
    rtmpUrl: v.string(),
    streamKeyHash: v.string(),
    status: literals("active", "failed", "removed"),
    addedAt: v.number(),
    removedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_status", ["sessionId", "status"]),
});
