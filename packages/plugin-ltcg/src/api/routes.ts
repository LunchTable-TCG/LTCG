/**
 * REST API routes for LTCG panel system
 *
 * Exposes agent state from StateAggregator service to frontend panels
 * via REST endpoints with 5-second polling intervals.
 */

import type { IAgentRuntime, RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { type IStateAggregator, SERVICE_TYPES } from "../services/types";

// Validation patterns for IDs (alphanumeric, dash, underscore, max 64 chars)
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Validate an ID parameter (agentId or gameId)
 */
function isValidId(id: string | undefined): id is string {
  return typeof id === "string" && ID_PATTERN.test(id);
}

/**
 * Add CORS and cache headers to response
 */
function setCorsHeaders(res: RouteResponse) {
  if (res.setHeader) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }
}

/**
 * Helper to get StateAggregator service from runtime
 * Uses SERVICE_TYPES constant to avoid hardcoded strings
 */
function getAggregator(req: RouteRequest): IStateAggregator | null {
  try {
    const extendedReq = req as RouteRequest & { runtime?: IAgentRuntime };
    const runtime = extendedReq.runtime;
    if (!runtime) {
      logger.warn("Runtime not available in request context");
      return null;
    }

    const aggregator = runtime.getService(SERVICE_TYPES.STATE_AGGREGATOR) as IStateAggregator;
    if (!aggregator) {
      logger.warn("StateAggregator service not found");
      return null;
    }

    return aggregator;
  } catch (error) {
    logger.error({ error }, "Error getting StateAggregator service");
    return null;
  }
}

/**
 * Helper to send error response
 */
function sendError(res: RouteResponse, status: number, message: string) {
  res.status(status).json({
    error: message,
    timestamp: Date.now(),
  });
}

/**
 * GET /api/ltcg/status?agentId=...
 *
 * Returns overall agent runtime status
 */
export async function handleAgentStatus(req: RouteRequest, res: RouteResponse) {
  setCorsHeaders(res);

  try {
    const agentId = req.query?.agentId as string | undefined;

    if (!isValidId(agentId)) {
      return sendError(res, 400, "Missing or invalid agentId parameter");
    }

    const aggregator = getAggregator(req);
    if (!aggregator) {
      return sendError(res, 503, "StateAggregator service not available");
    }

    const status = await aggregator.getAgentStatus(agentId);
    res.json(status);
  } catch (error) {
    logger.error({ error }, "Error fetching agent status");
    sendError(res, 500, "Internal server error");
  }
}

/**
 * GET /api/ltcg/matchmaking?agentId=...
 *
 * Returns matchmaking status and recent events
 */
export async function handleMatchmakingStatus(req: RouteRequest, res: RouteResponse) {
  setCorsHeaders(res);

  try {
    const agentId = req.query?.agentId as string | undefined;

    if (!isValidId(agentId)) {
      return sendError(res, 400, "Missing or invalid agentId parameter");
    }

    const aggregator = getAggregator(req);
    if (!aggregator) {
      return sendError(res, 503, "StateAggregator service not available");
    }

    const status = await aggregator.getMatchmakingStatus(agentId);
    res.json(status);
  } catch (error) {
    logger.error({ error }, "Error fetching matchmaking status");
    sendError(res, 500, "Internal server error");
  }
}

/**
 * GET /api/ltcg/game?agentId=...&gameId=...
 *
 * Returns current game state snapshot
 */
export async function handleGameState(req: RouteRequest, res: RouteResponse) {
  setCorsHeaders(res);

  try {
    const agentId = req.query?.agentId as string | undefined;
    const gameId = req.query?.gameId as string | undefined;

    if (!isValidId(agentId) || !isValidId(gameId)) {
      return sendError(res, 400, "Missing or invalid agentId/gameId parameter");
    }

    const aggregator = getAggregator(req);
    if (!aggregator) {
      return sendError(res, 503, "StateAggregator service not available");
    }

    const gameState = await aggregator.getGameState(agentId, gameId);
    res.json(gameState);
  } catch (error) {
    logger.error({ error }, "Error fetching game state");
    sendError(res, 500, "Internal server error");
  }
}

/**
 * GET /api/ltcg/decisions?agentId=...&gameId=...&limit=20
 *
 * Returns AI decision history for a game
 */
export async function handleDecisionHistory(req: RouteRequest, res: RouteResponse) {
  setCorsHeaders(res);

  try {
    const query = req.query;
    const agentId = query?.agentId as string | undefined;
    const gameId = query?.gameId as string | undefined;
    const limitStr = query?.limit as string | undefined;
    const limit = limitStr ? Number.parseInt(limitStr, 10) : 20;

    if (!isValidId(agentId) || !isValidId(gameId)) {
      return sendError(res, 400, "Missing or invalid agentId/gameId parameter");
    }

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return sendError(res, 400, "Invalid limit parameter (must be 1-100)");
    }

    const aggregator = getAggregator(req);
    if (!aggregator) {
      return sendError(res, 503, "StateAggregator service not available");
    }

    const decisions = await aggregator.getDecisionHistory(agentId, gameId, limit);
    res.json(decisions);
  } catch (error) {
    logger.error({ error }, "Error fetching decision history");
    sendError(res, 500, "Internal server error");
  }
}

/**
 * GET /api/ltcg/metrics?agentId=...
 *
 * Returns performance metrics for the agent
 */
export async function handleMetrics(req: RouteRequest, res: RouteResponse) {
  setCorsHeaders(res);

  try {
    const query = req.query;
    const agentId = query?.agentId as string | undefined;

    if (!isValidId(agentId)) {
      return sendError(res, 400, "Missing or invalid agentId parameter");
    }

    const aggregator = getAggregator(req);
    if (!aggregator) {
      return sendError(res, 503, "StateAggregator service not available");
    }

    const metrics = await aggregator.getMetrics(agentId);
    res.json(metrics);
  } catch (error) {
    logger.error({ error }, "Error fetching metrics");
    sendError(res, 500, "Internal server error");
  }
}

/**
 * Panel API routes export
 */
export const panelRoutes = [
  {
    name: "ltcg-status",
    path: "/ltcg/status",
    type: "GET" as const,
    handler: handleAgentStatus,
  },
  {
    name: "ltcg-matchmaking",
    path: "/ltcg/matchmaking",
    type: "GET" as const,
    handler: handleMatchmakingStatus,
  },
  {
    name: "ltcg-game",
    path: "/ltcg/game",
    type: "GET" as const,
    handler: handleGameState,
  },
  {
    name: "ltcg-decisions",
    path: "/ltcg/decisions",
    type: "GET" as const,
    handler: handleDecisionHistory,
  },
  {
    name: "ltcg-metrics",
    path: "/ltcg/metrics",
    type: "GET" as const,
    handler: handleMetrics,
  },
];
