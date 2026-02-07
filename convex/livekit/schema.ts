import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * LiveKit Component Schema
 * Mirrors LiveKit room/participant/track state into Convex for reactive UIs
 */

export const livekitTables = {
  // Rooms table - LiveKit room lifecycle
  rooms: defineTable({
    roomName: v.string(),
    status: v.union(v.literal("created"), v.literal("started"), v.literal("finished")),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    activeParticipantCount: v.number(),
    activeTrackCount: v.number(),
    lastEventAt: v.number(),
  })
    .index("by_roomName", ["roomName"])
    .index("by_status_lastEventAt", ["status", "lastEventAt"]),

  // Participants table - who's in the room
  participants: defineTable({
    roomName: v.string(),
    identity: v.string(),
    name: v.optional(v.string()),
    kind: v.union(v.literal("human"), v.literal("agent"), v.literal("service")),
    state: v.union(v.literal("active"), v.literal("left")),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    permissions: v.optional(v.any()),
  })
    .index("by_roomName_state", ["roomName", "state"])
    .index("by_roomName_identity", ["roomName", "identity"]),

  // Tracks table - audio/video/screen/data streams
  tracks: defineTable({
    roomName: v.string(),
    participantIdentity: v.string(),
    trackSid: v.string(),
    source: v.union(
      v.literal("camera"),
      v.literal("microphone"),
      v.literal("screen_share"),
      v.literal("data")
    ),
    state: v.union(v.literal("published"), v.literal("unpublished")),
    publishedAt: v.number(),
    unpublishedAt: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    name: v.optional(v.string()),
  })
    .index("by_roomName_state", ["roomName", "state"])
    .index("by_roomName_trackSid", ["roomName", "trackSid"]),

  // Events table - append-only audit log
  events: defineTable({
    dedupeKey: v.string(),
    eventType: v.string(),
    roomName: v.optional(v.string()),
    participantIdentity: v.optional(v.string()),
    trackSid: v.optional(v.string()),
    payload: v.any(),
    receivedAt: v.number(),
  })
    .index("by_roomName_receivedAt", ["roomName", "receivedAt"])
    .index("by_dedupeKey", ["dedupeKey"]),

  // Token grants - audit trail of issued access tokens
  tokenGrants: defineTable({
    roomName: v.string(),
    identity: v.string(),
    grants: v.any(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    issuedBy: v.optional(v.string()),
  }).index("by_roomName_identity_issuedAt", ["roomName", "identity", "issuedAt"]),
};
