import * as generatedApi from "@convex/_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;
import { logError } from "@/lib/streaming/logging";
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

export async function GET(req: NextRequest) {
  try {
    const convex = createConvexClient();
    const sessionId = req.nextUrl.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }

    const session = await convex.query(apiAny.streaming.sessions.getSessionPublic, {
      sessionId: sessionId as Id<"streamingSessions">,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Calculate duration if live
    const duration =
      session.status === "live" && session.startedAt
        ? Date.now() - session.startedAt
        : session.stats?.duration || 0;

    return NextResponse.json({
      sessionId: session._id,
      status: session.status,
      streamType: session.streamType,
      platform: session.platform,
      streamTitle: session.streamTitle,
      entityName: session.entityName,
      entityAvatar: session.entityAvatar,
      currentLobbyId: session.currentLobbyId,
      viewerCount: session.viewerCount || 0,
      peakViewerCount: session.peakViewerCount || 0,
      duration,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      errorMessage: session.errorMessage,
    });
  } catch (error) {
    logError("Error getting stream status", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
