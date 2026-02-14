/**
 * External Control API Routes
 *
 * Provides HTTP endpoints for external systems to command the ElizaOS agent.
 * Enables triggering story mode gameplay and agent control.
 *
 * Security: Bearer token authentication with rate limiting (10 req/min per IP)
 */

import type { IAgentRuntime, RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { validateControlRequest } from "./authMiddleware";
import { type IPollingService, SERVICE_TYPES } from "../services/types";

const AGENT_ID_CACHE_TTL_MS = 5 * 60 * 1000;
let resolvedAgentIdCache: { agentId: string; resolvedAt: number } | null = null;
let didWarnControlKeyFallback = false;

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * Add CORS and cache headers to response
 */
function setCorsHeaders(res: RouteResponse) {
  if (res.setHeader) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }
}

/**
 * Helper to send error response
 */
function sendError(res: RouteResponse, status: number, message: string) {
  res.status(status).json({
    success: false,
    error: message,
    timestamp: Date.now(),
  });
}

/**
 * Get API key from environment
 */
function getApiKey(): string | undefined {
  const controlKey = process.env.LTCG_CONTROL_API_KEY?.trim();
  if (controlKey) {
    return controlKey;
  }

  // Backward-compatible fallback: reuse LTCG_API_KEY when dedicated control key is missing.
  const fallbackKey = process.env.LTCG_API_KEY?.trim();
  if (fallbackKey) {
    if (!didWarnControlKeyFallback) {
      didWarnControlKeyFallback = true;
      logger.warn(
        "LTCG_CONTROL_API_KEY is not configured; using LTCG_API_KEY as control-route auth key",
      );
    }
    return fallbackKey;
  }

  return undefined;
}

async function resolveAgentId(
  runtime: IAgentRuntime,
  pollingService?: IPollingService | null,
): Promise<string> {
  const runtimeSetting = runtime.getSetting("LTCG_AGENT_ID");
  const runtimeAgentId =
    typeof runtimeSetting === "string" ? runtimeSetting.trim() : undefined;

  const characterSettings =
    runtime.character?.settings &&
    typeof runtime.character.settings === "object"
      ? (runtime.character.settings as Record<string, unknown>)
      : undefined;
  const characterAgentId =
    typeof characterSettings?.LTCG_AGENT_ID === "string"
      ? characterSettings.LTCG_AGENT_ID.trim()
      : undefined;

  const configuredAgentId = firstNonEmpty(
    process.env.LTCG_AGENT_ID,
    runtimeAgentId,
    characterAgentId,
  );
  if (configuredAgentId) {
    return configuredAgentId;
  }

  if (
    resolvedAgentIdCache &&
    Date.now() - resolvedAgentIdCache.resolvedAt < AGENT_ID_CACHE_TTL_MS
  ) {
    return resolvedAgentIdCache.agentId;
  }

  const client = pollingService?.getClient();
  if (client) {
    const profile = await client.getAgentProfile();
    if (profile?.agentId) {
      resolvedAgentIdCache = {
        agentId: profile.agentId,
        resolvedAt: Date.now(),
      };
      return profile.agentId;
    }
  }

  throw new Error(
    "LTCG agent ID is not configured. Set LTCG_AGENT_ID in environment or character settings.",
  );
}

/**
 * POST /ltcg/control/story-mode
 *
 * Trigger story mode gameplay with optional difficulty/chapter selection.
 *
 * Request body:
 * - difficulty?: "easy" | "medium" | "hard" | "boss" (for quick play)
 * - chapterId?: string (for specific chapter)
 * - stageNumber?: number (for specific stage, requires chapterId)
 *
 * Response:
 * - success: boolean
 * - gameId: string
 * - lobbyId: string
 * - stageId: string
 * - chapter: string
 * - stage: { name: string, number: number }
 * - aiOpponent: string
 * - difficulty?: string
 * - polling: { started: boolean, intervalMs: number }
 */
async function handleStoryMode(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
) {
  setCorsHeaders(res);

  try {
    // Validate authentication FIRST
    const apiKey = getApiKey();
    const authError = validateControlRequest(req, apiKey);
    if (authError) {
      return sendError(res, 401, authError);
    }

    // Parse request body
    const body =
      (req.body as {
        difficulty?: "easy" | "medium" | "hard" | "boss";
        chapterId?: string;
        stageNumber?: number;
      }) || {};

    logger.info({ body }, "Control API: Story mode trigger received");

    // Get polling service
    const pollingService = runtime.getService(
      SERVICE_TYPES.POLLING,
    ) as unknown as IPollingService | null;

    if (!pollingService) {
      return sendError(res, 503, "Polling service not available");
    }

    // Check if already in a game
    const currentGameId = pollingService.getCurrentGameId();
    if (currentGameId) {
      logger.warn({ currentGameId }, "Agent already in a game");
      return sendError(
        res,
        409,
        `Agent is already in a game (${currentGameId}). Use /control/surrender or /control/stop first.`,
      );
    }

    // Get API client
    const client = pollingService.getClient();
    if (!client) {
      return sendError(res, 503, "API client not initialized");
    }

    // Start story battle
    let result: {
      gameId: string;
      lobbyId: string;
      stageId: string;
      chapter: string;
      stage: { name: string; number: number };
      aiOpponent: string;
      difficulty?: string;
    };

    if (body.chapterId) {
      // Specific chapter/stage
      logger.info(
        { chapterId: body.chapterId, stageNumber: body.stageNumber },
        "Starting specific story battle",
      );
      result = await client.startStoryBattle(body.chapterId, body.stageNumber);
    } else {
      // Quick play with difficulty
      logger.info(
        { difficulty: body.difficulty || "easy" },
        "Starting quick play story battle",
      );
      result = await client.quickPlayStory(body.difficulty);
    }

    logger.info(
      { gameId: result.gameId, lobbyId: result.lobbyId },
      "Story battle started",
    );

    // Start polling with metadata for game-end handling
    pollingService.startPollingGame(result.gameId, {
      stageId: result.stageId,
    });
    logger.info(
      {
        gameId: result.gameId,
        stageId: result.stageId,
      },
      "Polling started for story mode game",
    );

    res.json({
      success: true,
      gameId: result.gameId,
      lobbyId: result.lobbyId,
      stageId: result.stageId,
      chapter: result.chapter,
      stage: result.stage,
      aiOpponent: result.aiOpponent,
      difficulty: result.difficulty || body.difficulty,
      polling: {
        started: true,
        intervalMs: 1500,
        note: "Agent will autonomously play turns via TurnOrchestrator",
      },
    });
  } catch (error) {
    logger.error({ error }, "Error starting story mode");
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendError(res, 500, `Failed to start story mode: ${errorMessage}`);
  }
}

/**
 * GET /ltcg/control/status
 *
 * Get comprehensive agent status including:
 * - Current game state
 * - Polling status
 * - Recent activity
 *
 * Response:
 * - success: boolean
 * - isInGame: boolean
 * - currentGameId: string | null
 * - gameState?: { turnNumber, phase, currentTurn, lifePoints, status }
 * - polling: { active: boolean, intervalMs: number }
 * - uptime: number (ms)
 */
async function handleStatus(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
) {
  setCorsHeaders(res);

  try {
    // Validate authentication FIRST
    const apiKey = getApiKey();
    const authError = validateControlRequest(req, apiKey);
    if (authError) {
      return sendError(res, 401, authError);
    }

    // Get services
    const pollingService = runtime.getService(
      SERVICE_TYPES.POLLING,
    ) as unknown as IPollingService | null;

    if (!pollingService) {
      return sendError(res, 503, "Polling service not available");
    }

    const currentGameId = pollingService.getCurrentGameId();
    const client = pollingService.getClient();

    // Build status response
    const status: Record<string, unknown> = {
      success: true,
      isInGame: !!currentGameId,
      currentGameId: currentGameId || null,
      polling: {
        active: !!currentGameId,
        intervalMs: 1500,
      },
      timestamp: Date.now(),
    };

    // If in a game, fetch current game state
    if (currentGameId && client) {
      try {
        const gameState = await client.getGameState(currentGameId);

        status.gameState = {
          turnNumber: gameState.turnNumber,
          phase: gameState.phase,
          currentTurn: gameState.currentTurn,
          status: gameState.status,
          player: {
            lifePoints: gameState.myLifePoints,
            handCount: gameState.hand?.length || 0,
            fieldCount:
              gameState.myBoard?.filter((c) => c !== null).length || 0,
          },
          opponent: {
            lifePoints: gameState.opponentLifePoints,
            handCount: 0, // Not exposed in API
            fieldCount:
              gameState.opponentBoard?.filter((c) => c !== null).length || 0,
          },
        };
      } catch (error) {
        logger.warn(
          { error, gameId: currentGameId },
          "Failed to fetch game state for status",
        );
        status.gameStateError = "Failed to fetch current game state";
      }
    }

    res.json(status);
  } catch (error) {
    logger.error({ error }, "Error fetching agent status");
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendError(res, 500, `Failed to fetch status: ${errorMessage}`);
  }
}

/**
 * POST /ltcg/control/find-game
 *
 * Enter matchmaking to find a PvP opponent.
 *
 * Request body:
 * - deckId?: string (optional deck to use)
 *
 * Response:
 * - success: boolean
 * - lobbyId: string
 * - status: string
 * - message: string
 */
async function handleFindGame(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
) {
  setCorsHeaders(res);

  try {
    // Validate authentication FIRST
    const apiKey = getApiKey();
    const authError = validateControlRequest(req, apiKey);
    if (authError) {
      return sendError(res, 401, authError);
    }

    const body = (req.body as { deckId?: string }) || {};

    logger.info(
      { deckId: body.deckId },
      "Control API: Find game trigger received",
    );

    // Get polling service
    const pollingService = runtime.getService(
      SERVICE_TYPES.POLLING,
    ) as unknown as IPollingService | null;

    if (!pollingService) {
      return sendError(res, 503, "Polling service not available");
    }

    // Check if already in a game
    const currentGameId = pollingService.getCurrentGameId();
    if (currentGameId) {
      return sendError(
        res,
        409,
        `Agent is already in a game (${currentGameId}). Use /control/surrender first.`,
      );
    }

    // Get API client
    const client = pollingService.getClient();
    if (!client) {
      return sendError(res, 503, "API client not initialized");
    }

    // Enter matchmaking - provide defaults for required fields
    const result = await client.enterMatchmaking({
      deckId: body.deckId || "", // Empty string means use default deck
      mode: "casual", // Default to casual mode
    });

    logger.info(
      { lobbyId: result.lobbyId, status: result.status },
      "Entered matchmaking",
    );

    res.json({
      success: true,
      lobbyId: result.lobbyId,
      status: result.status,
      gameId: result.gameId,
      joinCode: result.joinCode,
      note: "Polling service will auto-detect when game starts and begin autonomous play",
    });
  } catch (error) {
    logger.error({ error }, "Error entering matchmaking");
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendError(res, 500, `Failed to enter matchmaking: ${errorMessage}`);
  }
}

/**
 * POST /ltcg/control/surrender
 *
 * Surrender the current game (if in one).
 *
 * Response:
 * - success: boolean
 * - message: string
 */
async function handleSurrender(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
) {
  setCorsHeaders(res);

  try {
    // Validate authentication FIRST
    const apiKey = getApiKey();
    const authError = validateControlRequest(req, apiKey);
    if (authError) {
      return sendError(res, 401, authError);
    }

    logger.info("Control API: Surrender trigger received");

    // Get polling service
    const pollingService = runtime.getService(
      SERVICE_TYPES.POLLING,
    ) as unknown as IPollingService | null;

    if (!pollingService) {
      return sendError(res, 503, "Polling service not available");
    }

    const currentGameId = pollingService.getCurrentGameId();
    if (!currentGameId) {
      return sendError(res, 400, "Agent is not currently in a game");
    }

    // Get API client
    const client = pollingService.getClient();
    if (!client) {
      return sendError(res, 503, "API client not initialized");
    }

    // Surrender the game
    await client.surrender({ gameId: currentGameId });

    logger.info({ gameId: currentGameId }, "Game surrendered");

    // Stop polling (will clean up automatically)
    pollingService.stopPolling();

    res.json({
      success: true,
      message: `Successfully surrendered game ${currentGameId}`,
      gameId: currentGameId,
    });
  } catch (error) {
    logger.error({ error }, "Error surrendering game");
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendError(res, 500, `Failed to surrender: ${errorMessage}`);
  }
}

/**
 * POST /ltcg/control/stop
 *
 * Stop all agent activity (stop polling, clear state).
 * Does not surrender the game, just stops monitoring it.
 *
 * Response:
 * - success: boolean
 * - message: string
 */
async function handleStop(
  req: RouteRequest,
  res: RouteResponse,
  runtime: IAgentRuntime,
) {
  setCorsHeaders(res);

  try {
    // Validate authentication FIRST
    const apiKey = getApiKey();
    const authError = validateControlRequest(req, apiKey);
    if (authError) {
      return sendError(res, 401, authError);
    }

    logger.info("Control API: Stop trigger received");

    // Get polling service
    const pollingService = runtime.getService(
      SERVICE_TYPES.POLLING,
    ) as unknown as IPollingService | null;

    if (!pollingService) {
      return sendError(res, 503, "Polling service not available");
    }

    const wasPolling = !!pollingService.getCurrentGameId();

    // Stop polling
    pollingService.stopPolling();

    logger.info("Polling stopped, agent activity halted");

    res.json({
      success: true,
      message: wasPolling
        ? "Agent activity stopped (game not surrendered, just stopped monitoring)"
        : "Agent was not active",
      wasActive: wasPolling,
    });
  } catch (error) {
    logger.error({ error }, "Error stopping agent");
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendError(res, 500, `Failed to stop agent: ${errorMessage}`);
  }
}

/**
 * Control API routes export
 *
 * Note: CORS headers are set in each handler via setCorsHeaders().
 * ElizaOS doesn't support OPTIONS routes, but CORS preflight is handled
 * automatically by the framework when CORS headers are present.
 */
export const controlRoutes = [
  {
    name: "ltcg-control-story-mode",
    path: "/control/story-mode",
    type: "POST" as const,
    handler: handleStoryMode,
  },
  {
    name: "ltcg-control-status",
    path: "/control/status",
    type: "GET" as const,
    handler: handleStatus,
  },
  {
    name: "ltcg-control-find-game",
    path: "/control/find-game",
    type: "POST" as const,
    handler: handleFindGame,
  },
  {
    name: "ltcg-control-surrender",
    path: "/control/surrender",
    type: "POST" as const,
    handler: handleSurrender,
  },
  {
    name: "ltcg-control-stop",
    path: "/control/stop",
    type: "POST" as const,
    handler: handleStop,
  },
];
