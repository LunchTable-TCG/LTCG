import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/agents/decisions
 * Save an agent's gameplay decision for streaming/analytics
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate via API key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);

    // Validate API key and get agent
    const agent = await convex.query(api.agents.agents.validateApiKeyQuery, {
      apiKey,
    });

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await req.json();
    const { gameId, turnNumber, phase, action, reasoning, parameters, executionTimeMs, result } =
      body;

    // Validate required fields
    if (!gameId || turnNumber === undefined || !phase || !action || !reasoning) {
      return NextResponse.json(
        {
          error: "Missing required fields: gameId, turnNumber, phase, action, reasoning",
        },
        { status: 400 }
      );
    }

    // Save decision to Convex
    const decisionId = await convex.mutation(api.agents.decisions.saveDecision, {
      agentId: agent.agentId as Id<"agents">,
      gameId,
      turnNumber,
      phase,
      action,
      reasoning,
      parameters,
      executionTimeMs,
      result,
    });

    return NextResponse.json({
      success: true,
      decisionId,
    });
  } catch (error) {
    console.error("Error saving decision:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/agents/decisions?gameId=xxx&limit=50
 * Get agent decisions (for debugging/analytics)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate via API key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);

    // Validate API key and get agent
    const agent = await convex.query(api.agents.agents.validateApiKeyQuery, {
      apiKey,
    });

    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Get decisions
    let decisions;
    if (gameId) {
      decisions = await convex.query(api.agents.decisions.getGameDecisions, {
        gameId,
        limit,
      });
    } else {
      decisions = await convex.query(api.agents.decisions.getAgentDecisions, {
        agentId: agent.agentId as Id<"agents">,
        limit,
      });
    }

    return NextResponse.json({
      decisions,
    });
  } catch (error) {
    console.error("Error fetching decisions:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
