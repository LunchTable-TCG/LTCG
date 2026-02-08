import * as generatedApi from "../../_generated/api";
import { httpAction } from "../../_generated/server";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { jwtVerify } from "jose";
import { createDedupeKey } from "../internal/dedupe";

/**
 * LiveKit Webhook Endpoint
 * Receives and verifies webhook events from LiveKit, then applies them to Convex state
 *
 * CRITICAL: Must use raw body for signature verification
 *
 * We implement LiveKit's webhook verification manually using jose instead of
 * livekit-server-sdk to avoid Node.js dependencies in Convex
 */
export const livekitWebhook = httpAction(async (ctx, request) => {
  try {
    // Get webhook secret from environment (note: LiveKit uses API secret for webhooks)
    const webhookSecret = process.env["LIVEKIT_API_SECRET"]?.trim();
    if (!webhookSecret) {
      console.error("LIVEKIT_API_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract JWT from "Bearer <token>" format
    const token = authHeader.replace(/^Bearer\s+/i, "");

    // Read raw body (CRITICAL: must be raw for signature verification)
    const body = await request.text();

    // Verify JWT signature
    const secretKey = new TextEncoder().encode(webhookSecret);
    let payload: Record<string, unknown>;

    try {
      const verified = await jwtVerify(token, secretKey);
      payload = verified.payload as Record<string, unknown>;
    } catch (error) {
      console.error("JWT verification failed:", error);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify body hash (LiveKit includes SHA256 hash of body in JWT)
    const payloadHash = typeof payload["sha256"] === "string" ? payload["sha256"] : undefined;
    if (payloadHash) {
      const bodyEncoder = new TextEncoder();
      const bodyData = bodyEncoder.encode(body);
      const hashBuffer = await crypto.subtle.digest("SHA-256", bodyData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const bodyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      if (bodyHash !== payloadHash) {
        console.error("Body hash mismatch");
        return new Response(JSON.stringify({ error: "Body hash mismatch" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Parse the webhook event
    const event = JSON.parse(body) as Record<string, unknown>;

    // Extract event details
    const eventType = getNestedString(event, ["event"]) ?? "unknown";
    const roomName = getNestedString(event, ["room", "name"]);
    const participantIdentity = getNestedString(event, ["participant", "identity"]);
    const trackSid = getNestedString(event, ["track", "sid"]);
    const createdAt = typeof event["createdAt"] === "number" ? event["createdAt"] : undefined;

    // Generate dedupe key
    const dedupeKey = await createDedupeKey({
      eventType,
      roomName,
      participantIdentity,
      trackSid,
      createdAt,
      payload: event,
    });

    // Apply event to database (idempotent)
    await ctx.runMutation(internalAny.livekit.internal.mutations.applyWebhookEvent, {
      dedupeKey,
      eventType,
      roomName,
      participantIdentity,
      trackSid,
      payload: event,
    });

    // Enqueue async work hooks (workpool/workflow)
    await enqueueAsyncHooks(ctx, eventType, {
      roomName,
      participantIdentity,
      trackSid,
      event,
    });

    // Return 200 OK fast
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Enqueue async work based on webhook events
 * These run in background workpools/workflows without blocking the webhook response
 */
async function enqueueAsyncHooks(
  _ctx: unknown, // Reserved for future workpool/workflow integration
  eventType: string,
  data: {
    roomName?: string;
    participantIdentity?: string;
    trackSid?: string;
    event: unknown;
  }
) {
  // TODO: Integrate with workpool/workflow when ready
  // For now, this is a stub that shows where hooks would go

  switch (eventType) {
    case "participant_joined":
      // Hook: onParticipantJoined - could trigger agent attachment
      console.log("[Hook] participant_joined:", data.participantIdentity);
      break;

    case "track_published":
      // Hook: onTrackPublished - could trigger transcription pipeline
      if (getNestedString(data.event, ["track", "source"]) === "microphone") {
        console.log("[Hook] audio track published:", data.trackSid);
        // Example: workpool.enqueue("media_pipeline", "startAudioPipeline", { ... })
      }
      break;

    case "room_finished":
      // Hook: onRoomFinished - could trigger summary workflow
      console.log("[Hook] room_finished:", data.roomName);
      // Example: workflow.start("finalizeRoom", { roomName: data.roomName })
      break;
  }
}

function getNestedString(source: unknown, path: string[]): string | undefined {
  let current: unknown = source;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}
