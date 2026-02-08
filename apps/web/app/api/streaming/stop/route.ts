import { stopWebEgress } from "@/lib/streaming/livekit";
import { logError, logWarn } from "@/lib/streaming/logging";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import type { StopStreamBody } from "@/lib/streaming/types";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveStreamingAuth(req);
    const convex = createConvexClient();
    if (auth.bearerToken && !auth.isAgentApiKey && !auth.isInternal) {
      convex.setAuth(auth.bearerToken);
    }
    const internalAuth = process.env.INTERNAL_API_SECRET?.trim();
    if ((auth.isInternal || auth.isAgentApiKey) && !internalAuth) {
      return NextResponse.json({ error: "INTERNAL_API_SECRET is not configured" }, { status: 500 });
    }

    const { sessionId, reason } = (await req.json()) as StopStreamBody;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Get session to find egress ID
    const session = await convex.query(api.streaming.sessions.getSession, {
      sessionId: sessionId as Id<"streamingSessions">,
      internalAuth,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (auth.isAgentApiKey && session.streamType !== "agent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Internal jobs and agent API key can stop any session they own operationally.
    // User requests can only stop their own stream sessions.
    if (!auth.isInternal && !auth.isAgentApiKey) {
      if (!auth.userId) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      if (!session.userId || session.userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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
        logWarn("Error stopping egress", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // End session with stats
    const stats = await convex.mutation(api.streaming.sessions.endSession, {
      sessionId: sessionId as Id<"streamingSessions">,
      reason: reason || "manual",
      internalAuth,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      stats,
    });
  } catch (error) {
    logError("Error stopping stream", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
