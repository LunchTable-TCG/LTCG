import * as generatedApi from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;

function createConvexClient() {
  const convexUrl = process.env["NEXT_PUBLIC_CONVEX_URL"]?.trim();
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

/**
 * POST /api/agents/events
 *
 * Allows elizaOS agents to emit events to the game stream.
 * This enables real-time visibility of agent thinking/decisions in the UI.
 *
 * Required headers:
 * - x-api-key: Agent's API key for authentication (or Authorization: Bearer <key>)
 *
 * Request body:
 * - gameId: string
 * - lobbyId: string
 * - turnNumber: number
 * - eventType: "agent_thinking" | "agent_decided" | "agent_error"
 * - agentName: string
 * - description: string
 * - metadata?: object
 */
export async function POST(req: NextRequest) {
  try {
    const convex = createConvexClient();

    // Validate API key (supports x-api-key and Authorization: Bearer)
    const authHeader = req.headers.get("Authorization");
    const apiKeyFromBearer =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const apiKey = req.headers.get("x-api-key")?.trim() || apiKeyFromBearer;
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { gameId, lobbyId, turnNumber, eventType, agentName, description, metadata } = body;

    // Validate required fields
    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 });
    }
    if (!lobbyId || typeof lobbyId !== "string") {
      return NextResponse.json({ error: "lobbyId is required" }, { status: 400 });
    }
    if (typeof turnNumber !== "number" || !Number.isFinite(turnNumber) || turnNumber < 0) {
      return NextResponse.json({ error: "turnNumber is required" }, { status: 400 });
    }
    if (!["agent_thinking", "agent_decided", "agent_error"].includes(eventType)) {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }
    if (!agentName || typeof agentName !== "string") {
      return NextResponse.json({ error: "agentName is required" }, { status: 400 });
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    // Validate API key and get associated user
    // For now, we'll use a simple validation - in production this should check against stored keys
    const agentUser = await convex.query(apiAny.agents.agents.getAgentByApiKey, { apiKey });
    if (!agentUser) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Record the event via Convex
    await convex.mutation(apiAny.gameplay.gameEvents.recordEvent, {
      lobbyId: lobbyId as Id<"gameLobbies">,
      gameId,
      turnNumber,
      eventType,
      playerId: agentUser.userId as Id<"users">,
      playerUsername: agentName,
      description,
      metadata: metadata ?? {},
    });

    return NextResponse.json({
      success: true,
      eventId: `${lobbyId}-${Date.now()}`,
    });
  } catch (error) {
    const details =
      error instanceof Error
        ? error.message.slice(0, 300)
        : String(error).slice(0, 300);
    console.error("Failed to record agent event:", error);
    return NextResponse.json({ error: "Failed to record event", details }, { status: 500 });
  }
}
