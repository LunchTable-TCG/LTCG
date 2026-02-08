import { v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * Get a room by name
 */
export const getRoom = query({
  args: { roomName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_roomName", (q) => q.eq("roomName", args.roomName))
      .first();
  },
});

/**
 * List active rooms
 */
export const listActiveRooms = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    return await ctx.db
      .query("rooms")
      .withIndex("by_status_lastEventAt", (q) => q.eq("status", "started"))
      .order("desc")
      .take(limit);
  },
});

/**
 * List participants in a room
 */
export const listParticipants = query({
  args: { roomName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("participants")
      .withIndex("by_roomName_state", (q) => q.eq("roomName", args.roomName).eq("state", "active"))
      .collect();
  },
});

/**
 * List tracks in a room
 */
export const listTracks = query({
  args: { roomName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tracks")
      .withIndex("by_roomName_state", (q) =>
        q.eq("roomName", args.roomName).eq("state", "published")
      )
      .collect();
  },
});

/**
 * List recent events for a room
 */
export const listRoomEvents = query({
  args: {
    roomName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    return await ctx.db
      .query("events")
      .withIndex("by_roomName_receivedAt", (q) => q.eq("roomName", args.roomName))
      .order("desc")
      .take(limit);
  },
});
