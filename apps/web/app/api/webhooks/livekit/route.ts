import { logError, logInfo, logWarn } from "@/lib/streaming/logging";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { WebhookReceiver } from "livekit-server-sdk";
import { type NextRequest, NextResponse } from "next/server";

/**
 * LiveKit webhook handler for egress events
 * Configure webhook URL in LiveKit dashboard: https://your-domain.com/api/webhooks/livekit
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.LIVEKIT_WEBHOOK_SECRET;
  const livekitApiKey = process.env.LIVEKIT_API_KEY?.trim();
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  const internalAuth = process.env.INTERNAL_API_SECRET?.trim();

  if (!webhookSecret || !livekitApiKey || !convexUrl) {
    logError("LiveKit webhook environment is not fully configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!internalAuth) {
    logError("INTERNAL_API_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Read request body as text for signature verification
  const body = await req.text();
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }

  // Verify webhook signature
  const receiver = new WebhookReceiver(livekitApiKey, webhookSecret);
  const convex = new ConvexHttpClient(convexUrl);

  let event: Awaited<ReturnType<WebhookReceiver["receive"]>>;
  try {
    event = await receiver.receive(body, authHeader);
  } catch (error) {
    logError("Invalid webhook signature", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    logInfo("LiveKit webhook received", {
      event: event.event,
      egressId: event.egressInfo?.egressId,
    });

    // Get egress ID from the event
    const egressId = event.egressInfo?.egressId;
    if (!egressId) {
      return NextResponse.json({ error: "No egress ID in event" }, { status: 400 });
    }

    // Find session by egress ID
    const session = await convex.query(api.streaming.sessions.getByEgressId, {
      egressId,
      internalAuth,
    });

    if (!session) {
      logWarn("No session found for egress", { egressId });
      // Return 404 to trigger LiveKit retry mechanism
      return NextResponse.json({ error: "Session not found", egressId }, { status: 404 });
    }

    // Add idempotency check for already-ended sessions
    if (session.status === "ended" && event.event !== "egress_ended") {
      logInfo("Session already ended, ignoring event", {
        sessionId: session._id,
        event: event.event,
      });
      return NextResponse.json({
        received: true,
        note: "Session already ended",
        egressId,
      });
    }

    // Handle different event types
    switch (event.event) {
      case "egress_started":
        await convex.mutation(api.streaming.sessions.updateSession, {
          sessionId: session._id as Id<"streamingSessions">,
          internalAuth,
          updates: {
            status: "live",
            startedAt: Date.now(),
          },
        });
        logInfo("Stream started", { sessionId: session._id });
        break;

      case "egress_updated":
        // Could update viewer count or other metrics here
        break;

      case "egress_ended": {
        const egressStatus = event.egressInfo?.status;
        const egressError = event.egressInfo?.error;
        await convex.mutation(api.streaming.sessions.updateSession, {
          sessionId: session._id as Id<"streamingSessions">,
          internalAuth,
          updates: {
            status: egressError ? "error" : "ended",
            endedAt: Date.now(),
            endReason: egressStatus !== undefined ? String(egressStatus) : "egress_ended",
            errorMessage: egressError || undefined,
          },
        });
        logInfo("Stream ended", { sessionId: session._id, egressStatus });
        break;
      }
      default:
        logInfo("Unhandled LiveKit event", { event: event.event });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logError("Error processing LiveKit webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
