import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId parameter" },
        { status: 400 }
      );
    }

    const session = await convex.query(api.streaming.sessions.getSession, {
      sessionId: sessionId as Id<"streamingSessions">,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
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
    console.error("Error getting stream status:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
