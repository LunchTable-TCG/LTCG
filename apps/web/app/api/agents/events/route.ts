import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

// Initialize Convex HTTP client for server-side mutations
const convex = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"]!);

/**
 * POST /api/agents/events
 *
 * Allows elizaOS agents to emit events to the game stream.
 * This enables real-time visibility of agent thinking/decisions in the UI.
 *
 * Required headers:
 * - x-api-key: Agent's API key for authentication
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
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
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
    if (typeof turnNumber !== "number") {
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
    const agentUser = await convex.query(api.agents.agents.getAgentByApiKey, { apiKey });
    if (!agentUser) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Record the event via Convex
    await convex.mutation(api.gameplay.gameEvents.recordEvent, {
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
    console.error("Failed to record agent event:", error);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
