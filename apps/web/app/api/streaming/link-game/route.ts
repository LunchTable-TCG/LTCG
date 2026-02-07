import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Link a game lobby to an active streaming session
 * Called by agents when they start playing a game during an active stream
 */
export async function POST(req: NextRequest) {
  try {
    // Check internal auth header for agent requests
    const authHeader = req.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== process.env.LTCG_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const session = await convex.query(api.streaming.sessions.getSession, {
      sessionId: sessionId as Id<"streamingSessions">,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Link game to session
    await convex.mutation(api.streaming.sessions.linkLobby, {
      sessionId: sessionId as Id<"streamingSessions">,
      lobbyId: targetLobbyId,
    });

    return NextResponse.json({
      success: true,
      message: "Game linked to streaming session",
      sessionId,
      lobbyId: targetLobbyId,
    });
  } catch (error) {
    console.error("Error linking game to stream:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
