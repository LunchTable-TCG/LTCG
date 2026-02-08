import { logError } from "@/lib/streaming/logging";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import * as generatedApi from "@convex/_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;
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

/**
 * Link a game lobby to an active streaming session
 * Called by agents when they start playing a game during an active stream
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveStreamingAuth(req);
    if (!auth.isInternal && !auth.isAgentApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const internalAuth = process.env.INTERNAL_API_SECRET?.trim();
    if (!internalAuth) {
      return NextResponse.json({ error: "INTERNAL_API_SECRET is not configured" }, { status: 500 });
    }

    const convex = createConvexClient();
    const body = await req.json();
    const { sessionId, lobbyId, gameId } = body;

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const targetLobbyId = lobbyId || gameId;
    if (!targetLobbyId) {
      return NextResponse.json({ error: "Missing lobbyId or gameId" }, { status: 400 });
    }

    // Verify session exists
    const session = await convex.query(apiAny.streaming.sessions.getSession, {
      sessionId: sessionId as Id<"streamingSessions">,
      internalAuth,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Link game to session
    await convex.mutation(apiAny.streaming.sessions.linkLobby, {
      sessionId: sessionId as Id<"streamingSessions">,
      lobbyId: targetLobbyId,
      internalAuth,
    });

    return NextResponse.json({
      success: true,
      message: "Game linked to streaming session",
      sessionId,
      lobbyId: targetLobbyId,
    });
  } catch (error) {
    logError("Error linking game to stream", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
