import { stopWebEgress } from "@/lib/streaming/livekit";
import { logError, logWarn } from "@/lib/streaming/logging";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    // Verify internal auth when called from Convex actions
    const internalAuth = req.headers.get("X-Internal-Auth");
    if (internalAuth) {
      if (internalAuth !== process.env.INTERNAL_API_SECRET?.trim()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { sessionId, reason } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Get session to find egress ID
    const session = await convex.query(api.streaming.sessions.getSession, {
      sessionId: sessionId as Id<"streamingSessions">,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if already ended (idempotent)
    if (session.status === "ended") {
      return NextResponse.json({
        success: true,
        message: "Session already ended",
        sessionId,
        alreadyEnded: true,
      });
    }

    // Stop LiveKit egress if active
    if (session.egressId) {
      try {
        await stopWebEgress(session.egressId);
      } catch (error) {
        // Log but don't fail - egress might already be stopped
        logWarn("Error stopping egress", { error: error instanceof Error ? error.message : String(error) });
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
    logError("Error stopping stream", { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
