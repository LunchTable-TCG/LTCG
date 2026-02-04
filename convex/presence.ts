import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { mutation, internalMutation } from "./functions";
import { requireAuthMutation, requireAuthQuery } from "./lib/convexAuth";
import { ErrorCode, createError } from "./lib/errorCodes";
import type { UserStatus } from "./lib/types";

/**
 * Presence System using @convex-dev/presence
 *
 * Provides real-time user presence tracking across multiple rooms/features:
 * - Global chat
 * - Story mode chapters
 * - Tournament brackets
 * - Game lobby
 * - Marketplace listings
 * - Admin template editing
 *
 * Features:
 * - Token-based security
 * - Automatic session management
 * - Browser tab visibility handling
 * - Custom status tracking (online, in_game, idle)
 * - Multi-room support
 *
 * @see https://github.com/get-convex/presence
 */

// =============================================================================
// Presence Instance
// =============================================================================

export const presence = new Presence(components.presence);

// =============================================================================
// Types
// =============================================================================

/**
 * Room types for presence tracking
 */
export type PresenceRoomType =
  | "global_chat"
  | `story:${string}` // story:chapterId
  | `tournament:${string}` // tournament:tournamentId
  | `lobby:browse`
  | `marketplace:listing:${string}` // marketplace:listing:listingId
  | `admin:template:${string}`; // admin:template:templateId

/**
 * Extended presence user with custom metadata
 */
export interface PresenceUser {
  userId: Id<"users">;
  username: string;
  status: UserStatus;
  sessionId: string;
  lastActiveAt: number;
  roomId: string;
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Send a heartbeat to keep the user's presence alive in a room
 *
 * This mutation should be called periodically (e.g., every 30 seconds) by the client.
 * If no heartbeat is received for 2.5x the interval, the user is automatically disconnected.
 *
 * @param roomId - The room identifier (e.g., "global_chat", "story:act1-ch2")
 * @param sessionId - Unique session ID generated client-side (crypto.randomUUID())
 * @param interval - Heartbeat interval in milliseconds (default: 30000)
 * @param status - User status: "online", "in_game", or "idle" (default: "online")
 * @returns Tokens for querying presence and disconnecting
 */
export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
    status: v.optional(v.union(v.literal("online"), v.literal("in_game"), v.literal("idle"))),
  },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
    presenceId: v.string(), // For caching to avoid repeated queries
  }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);
    const status = args.status ?? "online";

    // Call the underlying presence.heartbeat with user metadata
    const tokens = await presence.heartbeat(
      ctx,
      args.roomId,
      userId, // Use userId as the presence userId
      args.sessionId,
      args.interval,
      // @ts-expect-error - Presence component API migration in progress
      {
        username,
        status,
        lastActiveAt: Date.now(),
      }
    );

    return {
      ...tokens,
      presenceId: `${args.roomId}:${userId}:${args.sessionId}`,
    };
  },
});

/**
 * Gracefully disconnect a user session from presence tracking
 *
 * This is typically called when:
 * - Component unmounts
 * - Browser tab closes (using sendBeacon)
 * - User explicitly logs out
 *
 * Note: This mutation does NOT require authentication because it's often called
 * via sendBeacon which can't include auth headers.
 *
 * @param sessionToken - Token returned from heartbeat mutation
 */
export const disconnect = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // No auth check - sendBeacon can't send auth headers
    await presence.disconnect(ctx, args.sessionToken);
  },
});

/**
 * Admin-only: Force remove a specific user from a room
 */
export const removeUserFromRoom = internalMutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await presence.removeRoomUser(ctx, args.roomId, args.userId);
  },
});

/**
 * Admin-only: Remove an entire room and all its presence data
 */
export const removeRoom = internalMutation({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    await presence.removeRoom(ctx, args.roomId);
  },
});

// =============================================================================
// Queries
// =============================================================================

/**
 * List all users present in a room
 *
 * @param roomToken - Token returned from heartbeat mutation
 * @returns Array of users in the room with their metadata
 */
export const list = query({
  args: {
    roomToken: v.string(),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      sessionId: v.string(),
      username: v.string(),
      status: v.union(v.literal("online"), v.literal("in_game"), v.literal("idle")),
      lastActiveAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const presenceList = await presence.list(ctx, args.roomToken);

    // Transform presence data to include custom metadata
    // Presence component API migration in progress - type checking presence data structure
    type PresenceData = {
      userId: string;
      sessionId: string;
      data?: {
        username?: string;
        status?: "online" | "in_game" | "idle";
        lastActiveAt?: number;
      };
    };

    return presenceList.map((p: PresenceData) => ({
      userId: p.userId,
      sessionId: p.sessionId,
      username: p.data?.username ?? "Unknown",
      status: p.data?.status ?? "online",
      lastActiveAt: p.data?.lastActiveAt ?? Date.now(),
    }));
  },
});

/**
 * List all rooms a specific user is present in
 *
 * Requires authentication to ensure users can only query their own presence
 */
export const listUserRooms = query({
  args: {},
  returns: v.array(
    v.object({
      roomId: v.string(),
      sessionId: v.string(),
      status: v.union(v.literal("online"), v.literal("in_game"), v.literal("idle")),
      lastActiveAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const userPresence = await presence.listUser(ctx, userId);

    // Presence component API migration in progress - type checking presence data structure
    type UserPresenceData = {
      roomId: string;
      sessionId: string;
      data?: {
        status?: "online" | "in_game" | "idle";
        lastActiveAt?: number;
      };
    };

    return userPresence.map((p: UserPresenceData) => ({
      roomId: p.roomId,
      sessionId: p.sessionId,
      status: p.data?.status ?? "online",
      lastActiveAt: p.data?.lastActiveAt ?? Date.now(),
    }));
  },
});

/**
 * Get the count of online users in a specific room (public query)
 *
 * @param roomId - The room identifier
 * @returns Count of users currently in the room
 */
export const getRoomUserCount = query({
  args: {
    roomId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Use listRoom with onlineOnly=true to get current users
    const roomPresence = await presence.listRoom(ctx, args.roomId, true);
    return roomPresence.length;
  },
});

/**
 * Check if a specific user is online in any room
 *
 * @param userId - The user ID to check
 * @returns Boolean indicating if user is online
 */
export const isUserOnline = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userPresence = await presence.listUser(ctx, args.userId, true);
    return userPresence.length > 0;
  },
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a room ID for a specific feature
 */
export function generateRoomId(
  type: "global_chat" | "story" | "tournament" | "lobby" | "marketplace" | "admin_template",
  resourceId?: string
): PresenceRoomType {
  switch (type) {
    case "global_chat":
      return "global_chat";
    case "lobby":
      return "lobby:browse";
    case "story":
      if (!resourceId) throw createError(ErrorCode.VALIDATION_MISSING_FIELD, { reason: "Story requires chapterId" });
      return `story:${resourceId}`;
    case "tournament":
      if (!resourceId)
        throw createError(ErrorCode.VALIDATION_MISSING_FIELD, { reason: "Tournament requires tournamentId" });
      return `tournament:${resourceId}`;
    case "marketplace":
      if (!resourceId)
        throw createError(ErrorCode.VALIDATION_MISSING_FIELD, { reason: "Marketplace requires listingId" });
      return `marketplace:listing:${resourceId}`;
    case "admin_template":
      if (!resourceId)
        throw createError(ErrorCode.VALIDATION_MISSING_FIELD, { reason: "Admin template requires templateId" });
      return `admin:template:${resourceId}`;
  }
}
