import { literals } from "convex-helpers/validators";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

// Overlay config validator (reused across functions)
const overlayConfigValidator = v.object({
  showDecisions: v.boolean(),
  showAgentInfo: v.boolean(),
  showEventFeed: v.boolean(),
  showPlayerCam: v.boolean(),
  theme: literals("dark", "light"),
});

/**
 * Create a new streaming session
 */
export const createSession = mutation({
  args: {
    streamType: literals("user", "agent"),
    userId: v.optional(v.id("users")),
    agentId: v.optional(v.id("agents")),
    platform: literals("twitch", "youtube", "custom"),
    streamTitle: v.string(),
    overlayConfig: overlayConfigValidator,
  },
  handler: async (ctx, args) => {
    // Validate that we have the right identity for the stream type
    if (args.streamType === "user" && !args.userId) {
      throw new Error("userId required for user streams");
    }
    // Note: agentId is optional for external agents (e.g., ElizaOS agents)
    // that aren't registered in the LTCG system

    // Check for any active, pending, or initializing sessions
    let activeSessions: Doc<"streamingSessions">[] = [];
    if (args.streamType === "user" && args.userId) {
      const existingQuery = ctx.db
        .query("streamingSessions")
        .withIndex("by_user_status", (q) => q.eq("userId", args.userId!));

      activeSessions = await existingQuery
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "live"),
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "initializing")
          )
        )
        .collect();
    } else if (args.streamType === "agent" && args.agentId) {
      const existingQuery = ctx.db
        .query("streamingSessions")
        .withIndex("by_agent_status", (q) => q.eq("agentId", args.agentId!));

      activeSessions = await existingQuery
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "live"),
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "initializing")
          )
        )
        .collect();
    }

    if (activeSessions.length > 0) {
      throw new Error(
        `Already has an active streaming session (status: ${activeSessions[0].status})`
      );
    }

    // Create the session
    const sessionId = await ctx.db.insert("streamingSessions", {
      streamType: args.streamType,
      userId: args.userId,
      agentId: args.agentId,
      platform: args.platform,
      streamTitle: args.streamTitle,
      status: "initializing",
      overlayConfig: args.overlayConfig,
      createdAt: Date.now(),
    });

    return sessionId;
  },
});

/**
 * Update streaming session fields
 */
export const updateSession = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    updates: v.object({
      status: v.optional(literals("initializing", "pending", "live", "ended", "error")),
      egressId: v.optional(v.string()),
      overlayUrl: v.optional(v.string()),
      currentLobbyId: v.optional(v.union(v.id("gameLobbies"), v.string())),
      streamKeyHash: v.optional(v.string()),
      viewerCount: v.optional(v.number()),
      peakViewerCount: v.optional(v.number()),
      startedAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      endReason: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Track peak viewers - auto-update if viewerCount is provided
    const updates = { ...args.updates };
    if (updates.viewerCount !== undefined && updates.peakViewerCount === undefined) {
      const peak = Math.max(updates.viewerCount, session.peakViewerCount || 0);
      updates.peakViewerCount = peak;
    }

    await ctx.db.patch(args.sessionId, updates);
  },
});

/**
 * End a streaming session with final stats
 */
export const endSession = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const duration = Date.now() - session.createdAt;

    // Get decision count if agent stream
    let decisionsLogged = 0;
    if (session.agentId) {
      const decisions = await ctx.db
        .query("agentDecisions")
        .filter((q) => q.eq(q.field("agentId"), session.agentId))
        .filter((q) => q.gte(q.field("createdAt"), session.createdAt))
        .collect();
      decisionsLogged = decisions.length;
    }

    await ctx.db.patch(args.sessionId, {
      status: "ended",
      endedAt: Date.now(),
      endReason: args.reason,
      stats: {
        duration,
        decisionsLogged,
        eventsRecorded: 0, // Could count game events here
      },
    });

    return { duration, decisionsLogged };
  },
});

/**
 * Get a streaming session with enriched entity info
 */
export const getSession = query({
  args: { sessionId: v.id("streamingSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Enrich with entity info
    let entityName = "";
    let entityAvatar = "";

    if (session.agentId) {
      const agent = await ctx.db.get(session.agentId);
      entityName = agent?.name || "Unknown Agent";
      entityAvatar = agent?.profilePictureUrl || "";
    } else if (session.userId) {
      const user = await ctx.db.get(session.userId);
      entityName = user?.username || user?.name || "Unknown User";
      entityAvatar = user?.image || "";
    }

    return { ...session, entityName, entityAvatar };
  },
});

/**
 * Get session by egress ID (for webhooks)
 */
export const getByEgressId = query({
  args: { egressId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streamingSessions")
      .withIndex("by_egress", (q) => q.eq("egressId", args.egressId))
      .first();
  },
});

/**
 * Get all currently active streaming sessions
 */
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("streamingSessions")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();

    // Enrich with entity names
    return Promise.all(
      sessions.map(async (session) => {
        let entityName = "";
        if (session.agentId) {
          const agent = await ctx.db.get(session.agentId);
          entityName = agent?.name || "Unknown Agent";
        } else if (session.userId) {
          const user = await ctx.db.get(session.userId);
          entityName = user?.username || user?.name || "Unknown User";
        }
        return { ...session, entityName };
      })
    );
  },
});

/**
 * Get sessions for a specific agent
 */
export const getAgentSessions = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streamingSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit || 10);
  },
});

/**
 * Get sessions for a specific user
 */
export const getUserSessions = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streamingSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 10);
  },
});

/**
 * Get all streaming sessions (admin only)
 */
export const getAllSessions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streamingSessions")
      .order("desc")
      .take(args.limit || 100);
  },
});

/**
 * Alias for getActiveSessions (for backward compatibility)
 */
export const getActiveStreams = getActiveSessions;

/**
 * Link a game lobby to an active streaming session
 * Accepts both gameLobbies IDs and story game string IDs
 */
export const linkLobby = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    lobbyId: v.union(v.id("gameLobbies"), v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      currentLobbyId: args.lobbyId,
    });
  },
});

/**
 * Create an overlay access code for a streaming session
 * Used to generate secure, short-lived codes for overlay URLs
 */
export const createOverlayAccess = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    accessCode: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify session exists
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Create access code entry
    await ctx.db.insert("overlayAccessCodes", {
      sessionId: args.sessionId,
      code: args.accessCode,
      expiresAt: args.expiresAt,
      used: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Validate and consume an overlay access code
 * Returns session ID if valid, throws error if invalid/expired/used
 */
export const validateOverlayAccess = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Find access code
    const access = await ctx.db
      .query("overlayAccessCodes")
      .withIndex("by_session_code", (q) =>
        q.eq("sessionId", args.sessionId).eq("code", args.code)
      )
      .first();

    // Validate access code
    if (!access) {
      throw new Error("Invalid access code");
    }

    if (access.used) {
      throw new Error("Access code already used");
    }

    if (access.expiresAt < Date.now()) {
      throw new Error("Access code expired");
    }

    // Mark as used
    await ctx.db.patch(access._id, { used: true });

    // Return session validation
    return { valid: true, sessionId: args.sessionId };
  },
});
