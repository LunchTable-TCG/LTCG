import { literals } from "convex-helpers/validators";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, mutation, query } from "../_generated/server";

// Overlay config validator (reused across functions)
const overlayConfigValidator = v.object({
  showDecisions: v.boolean(),
  showAgentInfo: v.boolean(),
  showEventFeed: v.boolean(),
  showPlayerCam: v.boolean(),
  theme: literals("dark", "light"),
});

/**
 * Create a new streaming session (supports retake, x, pumpfun platforms)
 */
export const createSession = mutation({
  args: {
    streamType: literals("user", "agent"),
    userId: v.optional(v.id("users")),
    agentId: v.optional(v.id("agents")),
    platform: literals("twitch", "youtube", "custom", "retake", "x", "pumpfun"),
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
 * Internal variant of linkLobby for use from internalAction/internalMutation.
 * Public mutations are not accessible via the `internal` API reference.
 */
export const linkLobbyInternal = internalMutation({
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

/**
 * Cleanup stale streaming sessions.
 * - Ends sessions stuck in "initializing" or "pending" for over 1 hour
 * - Ends sessions stuck in "live" for over 12 hours (safety limit)
 * - Cleans up expired overlay access codes older than 1 hour
 */
export const cleanupStaleSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;

    let cleaned = 0;

    // Find and end stale "initializing" or "pending" sessions (>1 hour old)
    const stalePending = await ctx.db
      .query("streamingSessions")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "initializing"),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    for (const session of stalePending) {
      if (now - session.createdAt > ONE_HOUR) {
        await ctx.db.patch(session._id, {
          status: "ended",
          endedAt: now,
          endReason: "auto-cleanup: stale session",
        });
        cleaned++;
      }
    }

    // Find and end stale "error" sessions (just mark them ended)
    const staleError = await ctx.db
      .query("streamingSessions")
      .filter((q) => q.eq(q.field("status"), "error"))
      .collect();

    for (const session of staleError) {
      if (now - session.createdAt > ONE_HOUR) {
        await ctx.db.patch(session._id, {
          status: "ended",
          endedAt: now,
          endReason: "auto-cleanup: error session",
        });
        cleaned++;
      }
    }

    // Safety: end "live" sessions older than 12 hours
    const staleLive = await ctx.db
      .query("streamingSessions")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();

    for (const session of staleLive) {
      if (now - session.createdAt > TWELVE_HOURS) {
        await ctx.db.patch(session._id, {
          status: "ended",
          endedAt: now,
          endReason: "auto-cleanup: exceeded max duration",
        });
        cleaned++;
      }
    }

    // Cleanup expired overlay access codes (>1 hour past expiry)
    const expiredCodes = await ctx.db
      .query("overlayAccessCodes")
      .filter((q) => q.lt(q.field("expiresAt"), now - ONE_HOUR))
      .collect();

    for (const code of expiredCodes) {
      await ctx.db.delete(code._id);
    }

    return { cleanedSessions: cleaned, cleanedCodes: expiredCodes.length };
  },
});

// ============================================================================
// MULTI-DESTINATION MUTATIONS
// ============================================================================

/**
 * Add a streaming destination to a session
 */
export const addDestination = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    platform: literals("twitch", "youtube", "custom", "retake", "x", "pumpfun"),
    rtmpUrl: v.string(),
    streamKeyHash: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    return await ctx.db.insert("streamingDestinations", {
      sessionId: args.sessionId,
      platform: args.platform,
      rtmpUrl: args.rtmpUrl,
      streamKeyHash: args.streamKeyHash,
      status: "active",
      addedAt: Date.now(),
    });
  },
});

/**
 * Remove a streaming destination from a session (mark as removed)
 */
export const removeDestination = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    platform: literals("twitch", "youtube", "custom", "retake", "x", "pumpfun"),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db
      .query("streamingDestinations")
      .withIndex("by_session_status", (q) =>
        q.eq("sessionId", args.sessionId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();

    if (!dest) {
      throw new Error("Active destination not found");
    }

    await ctx.db.patch(dest._id, {
      status: "removed",
      removedAt: Date.now(),
    });
  },
});

/**
 * Get all active destinations for a session
 */
export const getSessionDestinations = query({
  args: {
    sessionId: v.id("streamingSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streamingDestinations")
      .withIndex("by_session_status", (q) =>
        q.eq("sessionId", args.sessionId).eq("status", "active")
      )
      .collect();
  },
});
