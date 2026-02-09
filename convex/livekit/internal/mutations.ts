import { v } from "convex/values";
import { type MutationCtx, internalMutation } from "../../_generated/server";

interface LiveKitParticipantPayload {
  name?: string;
  metadata?: string;
  kind?: "human" | "agent" | "service";
}

interface LiveKitTrackPayload {
  source?: "camera" | "microphone" | "screen_share" | "data";
  mimeType?: string;
  name?: string;
}

interface LiveKitWebhookPayload {
  participant?: LiveKitParticipantPayload;
  track?: LiveKitTrackPayload;
}

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
    egressId: v.optional(v.string()),
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
        if (args.roomName) {
          await handleRoomStarted(ctx, args.roomName, now);
        }
        break;

      case "room_finished":
        if (args.roomName) {
          await handleRoomFinished(ctx, args.roomName, now);
        }
        break;

      case "participant_joined":
        if (args.roomName && args.participantIdentity) {
          await handleParticipantJoined(
            ctx,
            args.roomName,
            args.participantIdentity,
            args.payload,
            now
          );
        }
        break;

      case "participant_left":
        if (args.roomName && args.participantIdentity) {
          await handleParticipantLeft(ctx, args.roomName, args.participantIdentity, now);
        }
        break;

      case "track_published":
        if (args.roomName && args.participantIdentity && args.trackSid) {
          await handleTrackPublished(
            ctx,
            args.roomName,
            args.participantIdentity,
            args.trackSid,
            args.payload,
            now
          );
        }
        break;

      case "track_unpublished":
        if (args.roomName && args.trackSid) {
          await handleTrackUnpublished(ctx, args.roomName, args.trackSid, now);
        }
        break;

      case "egress_started":
        if (args.egressId) {
          await handleEgressStarted(ctx, args.egressId, now);
        }
        break;

      case "egress_ended":
        if (args.egressId) {
          await handleEgressEnded(ctx, args.egressId, args.payload, now);
        }
        break;
    }

    return { applied: true };
  },
});

// Event handlers

async function handleRoomStarted(ctx: MutationCtx, roomName: string, now: number) {
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_roomName", (q) => q.eq("roomName", roomName))
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

async function handleRoomFinished(ctx: MutationCtx, roomName: string, now: number) {
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_roomName", (q) => q.eq("roomName", roomName))
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
      .withIndex("by_roomName_state", (q) => q.eq("roomName", roomName).eq("state", "active"))
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
      .withIndex("by_roomName_state", (q) => q.eq("roomName", roomName).eq("state", "published"))
      .collect();

    for (const track of tracks) {
      await ctx.db.patch(track._id, {
        state: "unpublished",
        unpublishedAt: now,
      });
    }
  }
}

async function handleParticipantJoined(
  ctx: MutationCtx,
  roomName: string,
  identity: string,
  payload: unknown,
  now: number
) {
  const parsedPayload = normalizeWebhookPayload(payload);
  const participantPayload = parsedPayload.participant;
  const existing = await ctx.db
    .query("participants")
    .withIndex("by_roomName_identity", (q) => q.eq("roomName", roomName).eq("identity", identity))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      state: "active",
      joinedAt: now,
      leftAt: undefined,
      name: participantPayload?.name,
      metadata: participantPayload?.metadata,
    });
  } else {
    await ctx.db.insert("participants", {
      roomName,
      identity,
      name: participantPayload?.name,
      kind: coerceParticipantKind(participantPayload?.kind),
      state: "active",
      joinedAt: now,
      metadata: participantPayload?.metadata,
    });
  }

  // Increment active participant count
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_roomName", (q) => q.eq("roomName", roomName))
    .first();

  if (room) {
    await ctx.db.patch(room._id, {
      activeParticipantCount: room.activeParticipantCount + 1,
      lastEventAt: now,
    });
  }
}

async function handleParticipantLeft(
  ctx: MutationCtx,
  roomName: string,
  identity: string,
  now: number
) {
  const participant = await ctx.db
    .query("participants")
    .withIndex("by_roomName_identity", (q) => q.eq("roomName", roomName).eq("identity", identity))
    .first();

  if (participant && participant.state === "active") {
    await ctx.db.patch(participant._id, {
      state: "left",
      leftAt: now,
    });

    // Decrement active participant count
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomName", (q) => q.eq("roomName", roomName))
      .first();

    if (room && room.activeParticipantCount > 0) {
      await ctx.db.patch(room._id, {
        activeParticipantCount: room.activeParticipantCount - 1,
        lastEventAt: now,
      });
    }
  }
}

async function handleTrackPublished(
  ctx: MutationCtx,
  roomName: string,
  participantIdentity: string,
  trackSid: string,
  payload: unknown,
  now: number
) {
  const parsedPayload = normalizeWebhookPayload(payload);
  const trackPayload = parsedPayload.track;
  const existing = await ctx.db
    .query("tracks")
    .withIndex("by_roomName_trackSid", (q) => q.eq("roomName", roomName).eq("trackSid", trackSid))
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
      source: coerceTrackSource(trackPayload?.source),
      state: "published",
      publishedAt: now,
      mimeType: trackPayload?.mimeType,
      name: trackPayload?.name,
    });
  }

  // Increment active track count
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_roomName", (q) => q.eq("roomName", roomName))
    .first();

  if (room) {
    await ctx.db.patch(room._id, {
      activeTrackCount: room.activeTrackCount + 1,
      lastEventAt: now,
    });
  }
}

async function handleTrackUnpublished(
  ctx: MutationCtx,
  roomName: string,
  trackSid: string,
  now: number
) {
  const track = await ctx.db
    .query("tracks")
    .withIndex("by_roomName_trackSid", (q) => q.eq("roomName", roomName).eq("trackSid", trackSid))
    .first();

  if (track && track.state === "published") {
    await ctx.db.patch(track._id, {
      state: "unpublished",
      unpublishedAt: now,
    });

    // Decrement active track count
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomName", (q) => q.eq("roomName", roomName))
      .first();

    if (room && room.activeTrackCount > 0) {
      await ctx.db.patch(room._id, {
        activeTrackCount: room.activeTrackCount - 1,
        lastEventAt: now,
      });
    }
  }
}

function normalizeWebhookPayload(payload: unknown): LiveKitWebhookPayload {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  return payload as LiveKitWebhookPayload;
}

function coerceParticipantKind(
  kind: LiveKitParticipantPayload["kind"] | string | undefined
): "human" | "agent" | "service" {
  if (kind === "agent" || kind === "service" || kind === "human") {
    return kind;
  }
  return "human";
}

function coerceTrackSource(
  source: LiveKitTrackPayload["source"] | string | undefined
): "camera" | "microphone" | "screen_share" | "data" {
  if (
    source === "camera" ||
    source === "microphone" ||
    source === "screen_share" ||
    source === "data"
  ) {
    return source;
  }
  return "camera";
}

// ============================================================================
// Egress Event Handlers
// ============================================================================

/**
 * Handle egress_started - transition streaming session from "pending" to "live"
 */
async function handleEgressStarted(ctx: MutationCtx, egressId: string, now: number) {
  // Look up streaming session by egressId
  const session = await ctx.db
    .query("streamingSessions")
    .withIndex("by_egress", (q) => q.eq("egressId", egressId))
    .first();

  if (!session) {
    console.log(`[Egress] No streaming session found for egressId: ${egressId}`);
    return;
  }

  if (session.status === "live") {
    console.log(`[Egress] Session ${session._id} already live, skipping`);
    return;
  }

  console.log(`[Egress] Transitioning session ${session._id} from "${session.status}" to "live"`);
  await ctx.db.patch(session._id, {
    status: "live",
    startedAt: now,
  });
}

/**
 * Handle egress_ended - transition streaming session to "ended"
 */
async function handleEgressEnded(
  ctx: MutationCtx,
  egressId: string,
  payload: unknown,
  now: number
) {
  const session = await ctx.db
    .query("streamingSessions")
    .withIndex("by_egress", (q) => q.eq("egressId", egressId))
    .first();

  if (!session) {
    console.log(`[Egress] No streaming session found for egressId: ${egressId}`);
    return;
  }

  if (session.status === "ended") {
    console.log(`[Egress] Session ${session._id} already ended, skipping`);
    return;
  }

  // Check if egress ended with an error
  const egressInfo =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)["egressInfo"]
      : undefined;
  const error =
    egressInfo && typeof egressInfo === "object"
      ? (egressInfo as Record<string, unknown>)["error"]
      : undefined;
  const errorMessage = error && typeof error === "string" ? error : undefined;

  console.log(`[Egress] Ending session ${session._id}${errorMessage ? ` (error: ${errorMessage})` : ""}`);
  await ctx.db.patch(session._id, {
    status: errorMessage ? "error" : "ended",
    endedAt: now,
    ...(errorMessage ? { errorMessage } : {}),
  });
}
