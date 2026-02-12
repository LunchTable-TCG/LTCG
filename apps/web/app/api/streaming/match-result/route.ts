import * as generatedApi from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround
const apiAny = (generatedApi as any).api;

function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

/**
 * POST /api/streaming/match-result
 *
 * Updates a streaming session with match result data (win/loss overlay).
 * Called by the agent plugin when a game ends.
 */
export async function POST(req: NextRequest) {
  try {
    const internalAuth = process.env.INTERNAL_API_SECRET?.trim();
    const apiKey = req.headers.get("x-api-key")?.trim();
    if (!internalAuth || apiKey !== internalAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      sessionId,
      lastMatchEndedAt,
      lastMatchResult,
      lastMatchSummary,
      clearCurrentLobby,
    } = await req.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const convex = createConvexClient();
    await convex.mutation(apiAny.streaming.sessions.updateSession, {
      sessionId: sessionId as Id<"streamingSessions">,
      internalAuth,
      updates: {
        lastMatchEndedAt: lastMatchEndedAt ?? Date.now(),
        lastMatchResult: lastMatchResult ?? "unknown",
        lastMatchSummary: lastMatchSummary ?? "Match over.",
      },
    });

    if (clearCurrentLobby !== false) {
      await convex.mutation(apiAny.streaming.sessions.clearLobbyLink, {
        sessionId: sessionId as Id<"streamingSessions">,
        internalAuth,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to update match result:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
