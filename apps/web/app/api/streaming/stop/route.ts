import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { stopWebEgress } from "@/lib/streaming/livekit";
import type { Id } from "@convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { sessionId, reason } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    // Get session to find egress ID
    const session = await convex.query(api.streaming.sessions.getSession, {
      sessionId: sessionId as Id<"streamingSessions">,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Stop LiveKit egress if active
    if (session.egressId) {
      try {
        await stopWebEgress(session.egressId);
      } catch (error) {
        // Log but don't fail - egress might already be stopped
        console.warn("Error stopping egress:", error);
      }
    }

    // End session with stats
    const stats = await convex.mutation(api.streaming.sessions.endSession, {
      sessionId: sessionId as Id<"streamingSessions">,
      reason: reason || "manual",
    });

    return NextResponse.json({
      success: true,
      sessionId,
      stats,
    });
  } catch (error) {
    console.error("Error stopping stream:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
