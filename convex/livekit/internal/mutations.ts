import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

/**
 * Record a token grant for audit trail
 */
export const recordTokenGrant = internalMutation({
  args: {
    roomName: v.string(),
    identity: v.string(),
    grants: v.any(),
    issuedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("tokenGrants", {
      roomName: args.roomName,
      identity: args.identity,
      grants: args.grants,
      issuedAt: args.issuedAt,
      expiresAt: args.expiresAt,
    });
  },
});

/**
 * Apply a LiveKit webhook event to the database
 * Idempotent - safe to call multiple times with same event
 */
export const applyWebhookEvent = internalMutation({
  args: {
    dedupeKey: v.string(),
    eventType: v.string(),
    roomName: v.optional(v.string()),
    participantIdentity: v.optional(v.string()),
    trackSid: v.optional(v.string()),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for duplicate
    const existing = await ctx.db
      .query("events")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();

    if (existing) {
      // Already processed - idempotent
      return { alreadyProcessed: true };
    }

    // Record event
    await ctx.db.insert("events", {
      dedupeKey: args.dedupeKey,
      eventType: args.eventType,
      roomName: args.roomName,
      participantIdentity: args.participantIdentity,
      trackSid: args.trackSid,
      payload: args.payload,
      receivedAt: now,
    });

    // Apply state changes based on event type
    switch (args.eventType) {
      case "room_started":
        await handleRoomStarted(ctx, args.roomName!, now);
        break;

      case "room_finished":
        await handleRoomFinished(ctx, args.roomName!, now);
        break;

      case "participant_joined":
        await handleParticipantJoined(ctx, args.roomName!, args.participantIdentity!, args.payload, now);
        break;

      case "participant_left":
        await handleParticipantLeft(ctx, args.roomName!, args.participantIdentity!, now);
        break;

      case "track_published":
        await handleTrackPublished(ctx, args.roomName!, args.participantIdentity!, args.trackSid!, args.payload, now);
        break;

      case "track_unpublished":
        await handleTrackUnpublished(ctx, args.roomName!, args.trackSid!, now);
        break;
    }

    return { applied: true };
  },
});

// Event handlers

async function handleRoomStarted(ctx: any, roomName: string, now: number) {
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_roomName", (q: any) => q.eq("roomName", roomName))
    .first();

  if (room) {
    await ctx.db.patch(room._id, {
      status: "started",
      startedAt: now,
      lastEventAt: now,
    });
  } else {
    await ctx.db.insert("rooms", {
      roomName,
      status: "started",
      createdAt: now,
      startedAt: now,
      lastEventAt: now,
      activeParticipantCount: 0,
      activeTrackCount: 0,
    });
  }
}

async function handleRoomFinished(ctx: any, roomName: string, now: number) {
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_roomName", (q: any) => q.eq("roomName", roomName))
    .first();

  if (room) {
    await ctx.db.patch(room._id, {
      status: "finished",
      finishedAt: now,
      lastEventAt: now,
      activeParticipantCount: 0,
      activeTrackCount: 0,
    });

    // Mark all participants as left
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_roomName_state", (q: any) => q.eq("roomName", roomName).eq("state", "active"))
      .collect();

    for (const participant of participants) {
      await ctx.db.patch(participant._id, {
        state: "left",
        leftAt: now,
      });
    }

    // Mark all tracks as unpublished
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_roomName_state", (q: any) => q.eq("roomName", roomName).eq("state", "published"))
      .collect();

    for (const track of tracks) {
      await ctx.db.patch(track._id, {
        state: "unpublished",
        unpublishedAt: now,
      });
    }
  }
}

async function handleParticipantJoined(ctx: any, roomName: string, identity: string, payload: any, now: number) {
  const existing = await ctx.db
    .query("participants")
    .withIndex("by_roomName_identity", (q: any) => q.eq("roomName", roomName).eq("identity", identity))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      state: "active",
      joinedAt: now,
      leftAt: undefined,
      name: payload.participant?.name,
      metadata: payload.participant?.metadata,
    });
  } else {
    await ctx.db.insert("participants", {
      roomName,
      identity,
      name: payload.participant?.name,
      kind: payload.participant?.kind || "human",
      state: "active",
      joinedAt: now,
      metadata: payload.participant?.metadata,
    });
  }

  // Increment active participant count
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_roomName", (q: any) => q.eq("roomName", roomName))
    .first();

  if (room) {
    await ctx.db.patch(room._id, {
      activeParticipantCount: room.activeParticipantCount + 1,
      lastEventAt: now,
    });
  }
}

async function handleParticipantLeft(ctx: any, roomName: string, identity: string, now: number) {
  const participant = await ctx.db
    .query("participants")
    .withIndex("by_roomName_identity", (q: any) => q.eq("roomName", roomName).eq("identity", identity))
    .first();

  if (participant && participant.state === "active") {
    await ctx.db.patch(participant._id, {
      state: "left",
      leftAt: now,
    });

    // Decrement active participant count
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomName", (q: any) => q.eq("roomName", roomName))
      .first();

    if (room && room.activeParticipantCount > 0) {
      await ctx.db.patch(room._id, {
        activeParticipantCount: room.activeParticipantCount - 1,
        lastEventAt: now,
      });
    }
  }
}

async function handleTrackPublished(ctx: any, roomName: string, participantIdentity: string, trackSid: string, payload: any, now: number) {
  const existing = await ctx.db
    .query("tracks")
    .withIndex("by_roomName_trackSid", (q: any) => q.eq("roomName", roomName).eq("trackSid", trackSid))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      state: "published",
      publishedAt: now,
      unpublishedAt: undefined,
    });
  } else {
    await ctx.db.insert("tracks", {
      roomName,
      participantIdentity,
      trackSid,
      source: payload.track?.source || "camera",
      state: "published",
      publishedAt: now,
      mimeType: payload.track?.mimeType,
      name: payload.track?.name,
    });
  }

  // Increment active track count
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_roomName", (q: any) => q.eq("roomName", roomName))
    .first();

  if (room) {
    await ctx.db.patch(room._id, {
      activeTrackCount: room.activeTrackCount + 1,
      lastEventAt: now,
    });
  }
}

async function handleTrackUnpublished(ctx: any, roomName: string, trackSid: string, now: number) {
  const track = await ctx.db
    .query("tracks")
    .withIndex("by_roomName_trackSid", (q: any) => q.eq("roomName", roomName).eq("trackSid", trackSid))
    .first();

  if (track && track.state === "published") {
    await ctx.db.patch(track._id, {
      state: "unpublished",
      unpublishedAt: now,
    });

    // Decrement active track count
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomName", (q: any) => q.eq("roomName", roomName))
      .first();

    if (room && room.activeTrackCount > 0) {
      await ctx.db.patch(room._id, {
        activeTrackCount: room.activeTrackCount - 1,
        lastEventAt: now,
      });
    }
  }
}
