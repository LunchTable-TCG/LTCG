/**
 * HTTP Handlers for Agent Decision History
 *
 * Endpoints for saving and retrieving agent gameplay decisions.
 */

import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { withAuth } from "./middleware/auth";

/**
 * POST /api/agents/decisions - Save a decision
 */
export const saveDecision = httpAction(async (ctx, request) => {
  return withAuth(ctx, request, async (authCtx, agentId) => {
    const body = await request.json();

    // Validate required fields
    if (!body.gameId || !body.turnNumber || !body.action || !body.reasoning) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: gameId, turnNumber, action, reasoning",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save the decision
    const decisionId = await ctx.runMutation(internal.agents.decisions.saveDecision, {
      agentId: agentId as Id<"agents">,
      gameId: body.gameId,
      turnNumber: body.turnNumber,
      phase: body.phase ?? "unknown",
      action: body.action,
      reasoning: body.reasoning,
      parameters: body.parameters,
      executionTimeMs: body.executionTimeMs,
      result: body.result,
    });

    return new Response(
      JSON.stringify({ success: true, decisionId }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  });
});

/**
 * GET /api/agents/decisions - Get agent's decisions
 */
export const getDecisions = httpAction(async (ctx, request) => {
  return withAuth(ctx, request, async (authCtx, agentId) => {
    const url = new URL(request.url);
    const gameId = url.searchParams.get("gameId");
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

    let decisions;
    if (gameId) {
      // Get decisions for a specific game
      decisions = await ctx.runQuery(internal.agents.decisions.getGameDecisions, {
        gameId,
        limit,
      });
    } else {
      // Get recent decisions for this agent
      decisions = await ctx.runQuery(internal.agents.decisions.getAgentDecisions, {
        agentId: agentId as Id<"agents">,
        limit,
      });
    }

    return new Response(
      JSON.stringify({ decisions }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });
});

/**
 * GET /api/agents/decisions/stats - Get decision statistics
 */
export const getDecisionStats = httpAction(async (ctx, request) => {
  return withAuth(ctx, request, async (authCtx, agentId) => {
    const stats = await ctx.runQuery(internal.agents.decisions.getAgentDecisionStats, {
      agentId: agentId as Id<"agents">,
    });

    return new Response(
      JSON.stringify(stats),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });
});
