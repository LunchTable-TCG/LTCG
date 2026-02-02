/**
 * HTTP Handlers for Agent Decision History
 *
 * Endpoints for saving and retrieving agent gameplay decisions.
 * Used by ElizaOS agents to track and analyze their decision-making.
 *
 * @module http/decisions
 */

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { authHttpAction } from "./middleware/auth";
import {
  corsPreflightResponse,
  errorResponse,
  getQueryParam,
  parseJsonBody,
  successResponse,
} from "./middleware/responses";
import {
  type Decision,
  type DecisionStats,
  type SaveDecisionRequest,
  SaveDecisionRequestSchema,
  formatValidationErrors,
} from "./types";

// =============================================================================
// Module-scope typed helpers to avoid TS2589 "Type instantiation is excessively deep"
// =============================================================================

// biome-ignore lint/suspicious/noExplicitAny: Required to break TS2589 deep type instantiation
const internalAny: any = internal;

// =============================================================================
// Endpoints
// =============================================================================

/**
 * POST /api/agents/decisions
 *
 * Save a decision record for the authenticated agent.
 * Tracks gameplay decisions with reasoning for later analysis.
 *
 * @body gameId - The game the decision was made in
 * @body turnNumber - The turn number when the decision was made
 * @body phase - The game phase (optional, defaults to "unknown")
 * @body action - The action taken
 * @body reasoning - The agent's reasoning for the action
 * @body parameters - Optional action parameters
 * @body executionTimeMs - Optional execution time
 * @body result - Optional result of the action
 */
export const saveDecision = authHttpAction(async (ctx, request, auth) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const rawBody = await parseJsonBody<SaveDecisionRequest>(request);
    if (rawBody instanceof Response) return rawBody;

    // Validate with Zod schema
    const parseResult = SaveDecisionRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, {
        fields: formatValidationErrors(parseResult.error),
      });
    }

    const body = parseResult.data;

    // Save the decision using internal mutation
    interface SaveDecisionResult {
      decisionId: Id<"agentDecisions">;
    }

    const result: SaveDecisionResult = await ctx.runMutation(
      internalAny.agents.decisions.saveDecision,
      {
        agentId: auth.agentId,
        gameId: body.gameId,
        turnNumber: body.turnNumber,
        phase: body.phase ?? "unknown",
        action: body.action,
        reasoning: body.reasoning,
        parameters: body.parameters,
        executionTimeMs: body.executionTimeMs,
        result: body.result,
      }
    );

    return successResponse({ success: true, decisionId: result.decisionId }, 201);
  } catch (error) {
    return errorResponse("SAVE_DECISION_FAILED", "Failed to save decision", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/decisions
 *
 * Get decisions for the authenticated agent.
 * Can be filtered by gameId or returns recent decisions.
 *
 * @param gameId - Optional game ID to filter decisions
 * @param limit - Maximum number of decisions (default 50)
 */
export const getDecisions = authHttpAction(async (ctx, request, auth) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const gameId = getQueryParam(request, "gameId");
    const limitParam = getQueryParam(request, "limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse("INVALID_LIMIT", "Limit must be a number between 1 and 100", 400);
    }

    let decisions: Decision[];

    if (gameId) {
      // Get decisions for a specific game
      decisions = await ctx.runQuery(internalAny.agents.decisions.getGameDecisions, {
        gameId,
        limit,
      });
    } else {
      // Get recent decisions for this agent
      decisions = await ctx.runQuery(internalAny.agents.decisions.getAgentDecisions, {
        agentId: auth.agentId,
        limit,
      });
    }

    return successResponse({ decisions });
  } catch (error) {
    return errorResponse("FETCH_DECISIONS_FAILED", "Failed to fetch decisions", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/decisions/stats
 *
 * Get decision statistics for the authenticated agent.
 * Provides insights into decision patterns and performance.
 */
export const getDecisionStats = authHttpAction(async (ctx, request, auth) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const stats: DecisionStats = await ctx.runQuery(
      internalAny.agents.decisions.getAgentDecisionStats,
      { agentId: auth.agentId }
    );

    return successResponse(stats);
  } catch (error) {
    return errorResponse("FETCH_STATS_FAILED", "Failed to fetch decision statistics", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
