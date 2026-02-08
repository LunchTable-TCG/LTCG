import { literals } from "convex-helpers/validators";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
  mutation,
  query,
} from "../_generated/server";
import { getCurrentUser, requireAuthMutation } from "../lib/convexAuth";
import { streamingPlatformValidator } from "../lib/streamingPlatforms";

// Overlay config validator (reused across functions).
// Keep in sync with OverlayConfig in apps/web/src/lib/streaming/types.ts.
const overlayConfigValidator = v.object({
  showDecisions: v.boolean(),
  showAgentInfo: v.boolean(),
  showEventFeed: v.boolean(),
  showPlayerCam: v.boolean(),
  webcamPosition: literals("top-left", "top-right", "bottom-left", "bottom-right"),
  webcamSize: literals("small", "medium", "large"),
  playerVisualMode: v.optional(literals("webcam", "profile-picture")),
  profilePictureUrl: v.optional(v.string()),
  matchOverHoldMs: v.number(),
  showSceneLabel: v.boolean(),
  sceneTransitions: v.boolean(),
  voiceTrackUrl: v.optional(v.string()),
  voiceVolume: v.optional(v.number()),
  voiceLoop: v.optional(v.boolean()),
  theme: literals("dark", "light"),
});

type StreamWriteAccess = { kind: "internal" } | { kind: "user"; userId: Id<"users"> };

function hasValidInternalAuth(internalAuth?: string): boolean {
  const expectedSecret = process.env["INTERNAL_API_SECRET"]?.trim();
  const providedSecret = internalAuth?.trim();
  if (!expectedSecret || !providedSecret) {
    return false;
  }
  return providedSecret === expectedSecret;
}

async function resolveWriteAccess(
  ctx: MutationCtx,
  internalAuth?: string
): Promise<StreamWriteAccess> {
  if (hasValidInternalAuth(internalAuth)) {
    return { kind: "internal" };
  }

  const auth = await requireAuthMutation(ctx);
  return { kind: "user", userId: auth.userId };
}

async function assertSessionWriteAccess(
  ctx: MutationCtx,
  sessionId: Id<"streamingSessions">,
  access: StreamWriteAccess
) {
  const session = await ctx.db.get(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  if (access.kind === "user") {
    if (!session.userId || session.userId !== access.userId) {
      throw new Error("Unauthorized");
    }
  }

  return session;
}

async function assertSessionReadAccess(
  ctx: QueryCtx,
  sessionId: Id<"streamingSessions">,
  internalAuth?: string
) {
  const session = await ctx.db.get(sessionId);
  if (!session) {
    return null;
  }

  if (hasValidInternalAuth(internalAuth)) {
    return session;
  }

  const auth = await getCurrentUser(ctx);
  if (!auth || !session.userId || session.userId !== auth.userId) {
    throw new Error("Unauthorized");
  }

  return session;
}

async function enrichSessionEntity(ctx: QueryCtx | MutationCtx, session: Doc<"streamingSessions">) {
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

  return { entityName, entityAvatar };
}

async function toPublicSession(ctx: QueryCtx, session: Doc<"streamingSessions">) {
  const { entityName, entityAvatar } = await enrichSessionEntity(ctx, session);
  return {
    _id: session._id,
    streamType: session.streamType,
    userId: session.userId,
    agentId: session.agentId,
    platform: session.platform,
    streamTitle: session.streamTitle,
    status: session.status,
    overlayConfig: session.overlayConfig,
    currentLobbyId: session.currentLobbyId,
    lastMatchEndedAt: session.lastMatchEndedAt,
    lastMatchResult: session.lastMatchResult,
    lastMatchReason: session.lastMatchReason,
    lastMatchSummary: session.lastMatchSummary,
    viewerCount: session.viewerCount,
    peakViewerCount: session.peakViewerCount,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    createdAt: session.createdAt,
    errorMessage: session.errorMessage,
    stats: session.stats,
    entityName,
    entityAvatar,
  };
}

/**
 * Create a new streaming session (supports twitch/youtube/kick and custom RTMP providers)
 */
export const createSession = mutation({
  args: {
    streamType: literals("user", "agent"),
    userId: v.optional(v.id("users")),
    agentId: v.optional(v.id("agents")),
    platform: streamingPlatformValidator,
    streamTitle: v.string(),
    overlayConfig: overlayConfigValidator,
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveWriteAccess(ctx, args.internalAuth);

    if (args.streamType === "agent" && access.kind !== "internal") {
      throw new Error("Unauthorized");
    }

    let resolvedUserId = args.userId;
    if (args.streamType === "user") {
      if (access.kind === "user") {
        if (resolvedUserId && resolvedUserId !== access.userId) {
          throw new Error("Unauthorized");
        }
        resolvedUserId = access.userId;
      } else if (!resolvedUserId) {
        throw new Error("userId required for user streams");
      }
    }

    // Validate that we have the right identity for the stream type
    if (args.streamType === "user" && !resolvedUserId) {
      throw new Error("userId required for user streams");
    }
    // Note: agentId is optional for external agents (e.g., ElizaOS agents)
    // that aren't registered in the LTCG system

    // Check for any active, pending, or initializing sessions
    let activeSessions: Doc<"streamingSessions">[] = [];
    if (args.streamType === "user" && resolvedUserId) {
      const existingQuery = ctx.db
        .query("streamingSessions")
        .withIndex("by_user_status", (q) => q.eq("userId", resolvedUserId));

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
      const { agentId } = args;
      const existingQuery = ctx.db
        .query("streamingSessions")
        .withIndex("by_agent_status", (q) => q.eq("agentId", agentId));

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
        `Already has an active streaming session (status: ${activeSessions[0]?.status})`
      );
    }

    // Create the session
    const sessionId = await ctx.db.insert("streamingSessions", {
      streamType: args.streamType,
      userId: resolvedUserId,
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
    internalAuth: v.optional(v.string()),
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
      lastMatchEndedAt: v.optional(v.number()),
      lastMatchResult: v.optional(literals("win", "loss", "draw", "unknown")),
      lastMatchReason: v.optional(v.string()),
      lastMatchSummary: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const access = await resolveWriteAccess(ctx, args.internalAuth);
    const session = await assertSessionWriteAccess(ctx, args.sessionId, access);

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
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveWriteAccess(ctx, args.internalAuth);
    const session = await assertSessionWriteAccess(ctx, args.sessionId, access);

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
  args: {
    sessionId: v.id("streamingSessions"),
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await assertSessionReadAccess(ctx, args.sessionId, args.internalAuth);
    if (!session) {
      return null;
    }
    const { entityName, entityAvatar } = await enrichSessionEntity(ctx, session);
    return { ...session, entityName, entityAvatar };
  },
});

/**
 * Public-safe session view for overlays/spectators/status pages.
 */
export const getSessionPublic = query({
  args: { sessionId: v.id("streamingSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    return await toPublicSession(ctx, session);
  },
});

/**
 * Get session by egress ID (for webhooks)
 */
export const getByEgressId = query({
  args: {
    egressId: v.string(),
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!hasValidInternalAuth(args.internalAuth)) {
      throw new Error("Unauthorized");
    }

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
  args: {
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("streamingSessions")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();

    // Internal callers get full docs (e.g., cleanup route needs egressId)
    if (hasValidInternalAuth(args.internalAuth)) {
      return Promise.all(
        sessions.map(async (session) => {
          const { entityName } = await enrichSessionEntity(ctx, session);
          return { ...session, entityName };
        })
      );
    }

    // Public callers get safe projection only
    return Promise.all(sessions.map((session) => toPublicSession(ctx, session)));
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
    const sessions = await ctx.db
      .query("streamingSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit || 10);
    return Promise.all(sessions.map((s) => toPublicSession(ctx, s)));
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
    const sessions = await ctx.db
      .query("streamingSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 10);
    return Promise.all(sessions.map((s) => toPublicSession(ctx, s)));
  },
});

/**
 * Get all streaming sessions (admin only)
 */
export const getAllSessions = query({
  args: {
    limit: v.optional(v.number()),
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!hasValidInternalAuth(args.internalAuth)) {
      throw new Error("Unauthorized");
    }

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
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveWriteAccess(ctx, args.internalAuth);
    await assertSessionWriteAccess(ctx, args.sessionId, access);

    await ctx.db.patch(args.sessionId, {
      currentLobbyId: args.lobbyId,
    });
    // Make the lobby spectatable when linked to a stream
    const lobbyDocId = args.lobbyId as Id<"gameLobbies">;
    try {
      const lobby = await ctx.db.get(lobbyDocId);
      if (lobby) {
        await ctx.db.patch(lobbyDocId, {
          isPrivate: false,
          allowSpectators: true,
        });
      }
    } catch {
      // lobbyId may be a string game ID, not a document ID
    }
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
    // Make the lobby spectatable when linked to a stream
    const lobbyDocId = args.lobbyId as Id<"gameLobbies">;
    try {
      const lobby = await ctx.db.get(lobbyDocId);
      if (lobby) {
        await ctx.db.patch(lobbyDocId, {
          isPrivate: false,
          allowSpectators: true,
        });
      }
    } catch {
      // lobbyId may be a string game ID, not a document ID
    }
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
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveWriteAccess(ctx, args.internalAuth);
    await assertSessionWriteAccess(ctx, args.sessionId, access);

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
      .withIndex("by_session_code", (q) => q.eq("sessionId", args.sessionId).eq("code", args.code))
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
        q.or(q.eq(q.field("status"), "initializing"), q.eq(q.field("status"), "pending"))
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
    platform: streamingPlatformValidator,
    rtmpUrl: v.string(),
    streamKeyHash: v.string(),
    status: v.optional(literals("active", "failed", "removed")),
    errorMessage: v.optional(v.string()),
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveWriteAccess(ctx, args.internalAuth);
    await assertSessionWriteAccess(ctx, args.sessionId, access);

    return await ctx.db.insert("streamingDestinations", {
      sessionId: args.sessionId,
      platform: args.platform,
      rtmpUrl: args.rtmpUrl,
      streamKeyHash: args.streamKeyHash,
      status: args.status ?? "active",
      addedAt: Date.now(),
      errorMessage: args.errorMessage,
    });
  },
});

/**
 * Remove a streaming destination from a session (mark as removed)
 */
export const removeDestination = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    platform: streamingPlatformValidator,
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveWriteAccess(ctx, args.internalAuth);
    await assertSessionWriteAccess(ctx, args.sessionId, access);

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
 * Get all destinations for a session (active, failed, removed)
 */
export const getSessionDestinations = query({
  args: {
    sessionId: v.id("streamingSessions"),
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await assertSessionReadAccess(ctx, args.sessionId, args.internalAuth);
    if (!session) {
      throw new Error("Session not found");
    }

    return await ctx.db
      .query("streamingDestinations")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});
