import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * LiveKit webhook handler for egress events
 * Configure webhook URL in LiveKit dashboard: https://your-domain.com/api/webhooks/livekit
 */
export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    console.log("LiveKit webhook received:", event.event, event.egress_info?.egress_id);

    // Get egress ID from the event
    const egressId = event.egress_info?.egress_id;
    if (!egressId) {
      return NextResponse.json({ error: "No egress ID in event" }, { status: 400 });
    }

    // Find session by egress ID
    const session = await convex.query(api.streaming.sessions.getByEgressId, {
      egressId,
    });

    if (!session) {
      console.warn("No session found for egress:", egressId);
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
        console.log("Stream started:", session._id);
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
            endReason: event.egress_info?.status || "egress_ended",
          },
        });
        console.log("Stream ended:", session._id);
        break;

      case "egress_error":
        await convex.mutation(api.streaming.sessions.updateSession, {
          sessionId: session._id as Id<"streamingSessions">,
          updates: {
            status: "error",
            errorMessage: event.egress_info?.error || "Unknown egress error",
          },
        });
        console.error("Stream error:", session._id, event.egress_info?.error);
        break;

      default:
        console.log("Unhandled LiveKit event:", event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing LiveKit webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
