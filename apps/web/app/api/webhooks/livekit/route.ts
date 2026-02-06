import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { WebhookReceiver } from "livekit-server-sdk";
import { logError, logWarn, logInfo } from "@/lib/streaming/logging";
import { type NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * LiveKit webhook handler for egress events
 * Configure webhook URL in LiveKit dashboard: https://your-domain.com/api/webhooks/livekit
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.LIVEKIT_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logError("LIVEKIT_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Read request body as text for signature verification
  const body = await req.text();
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }

  // Verify webhook signature
  const receiver = new WebhookReceiver(process.env.LIVEKIT_API_KEY!, webhookSecret);

  let event;
  try {
    event = await receiver.receive(body, authHeader);
  } catch (error) {
    logError("Invalid webhook signature", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {

    logInfo("LiveKit webhook received", { event: event.event, egressId: event.egressInfo?.egressId });

    // Get egress ID from the event
    const egressId = event.egressInfo?.egressId;
    if (!egressId) {
      return NextResponse.json({ error: "No egress ID in event" }, { status: 400 });
    }

    // Find session by egress ID
    const session = await convex.query(api.streaming.sessions.getByEgressId, {
      egressId,
    });

    if (!session) {
      logWarn("No session found for egress", { egressId });
      return NextResponse.json({ received: true, warning: "Session not found" });
    }

    // Handle different event types
    switch (event.event) {
      case "egress_started":
        await convex.mutation(api.streaming.sessions.updateSession, {
          sessionId: session._id as Id<"streamingSessions">,
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

      case "egress_ended":
        await convex.mutation(api.streaming.sessions.updateSession, {
          sessionId: session._id as Id<"streamingSessions">,
          updates: {
            status: "ended",
            endedAt: Date.now(),
            endReason: event.egressInfo?.status || "egress_ended",
          },
        });
        logInfo("Stream ended", { sessionId: session._id });
        break;

      case "egress_error":
        await convex.mutation(api.streaming.sessions.updateSession, {
          sessionId: session._id as Id<"streamingSessions">,
          updates: {
            status: "error",
            errorMessage: event.egressInfo?.error || "Unknown egress error",
          },
        });
        logError("Stream error", { sessionId: session._id, error: event.egressInfo?.error });
        break;

      default:
        logInfo("Unhandled LiveKit event", { event: event.event });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logError("Error processing LiveKit webhook", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
