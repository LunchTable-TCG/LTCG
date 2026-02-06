/**
 * External Control API Routes
 *
 * Provides HTTP endpoints for external systems to command the ElizaOS agent.
 * Enables triggering story mode gameplay, live streaming, and agent control.
 *
 * Security: Bearer token authentication with rate limiting (10 req/min per IP)
 */

import type { IAgentRuntime, RouteRequest, RouteResponse } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { validateControlRequest } from "./authMiddleware";
import { type IPollingService, SERVICE_TYPES } from "../services/types";

// Validation patterns for IDs
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Add CORS and cache headers to response
 */
function setCorsHeaders(res: RouteResponse) {
  if (res.setHeader) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }
}

/**
 * Helper to get runtime from request
 */
function getRuntime(req: RouteRequest): IAgentRuntime | null {
  try {
    const extendedReq = req as RouteRequest & { runtime?: IAgentRuntime };
    const runtime = extendedReq.runtime;
    if (!runtime) {
      logger.warn("Runtime not available in request context");
      return null;
    }
    return runtime;
  } catch (error) {
    logger.error({ error }, "Error getting runtime");
    return null;
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
  return process.env.LTCG_CONTROL_API_KEY;
}


/**
 * POST /ltcg/control/story-mode
 *
 * Trigger story mode gameplay with optional difficulty/chapter selection.
 * Automatically starts streaming if agent has streaming configured.
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
 * - streaming: { autoStartConfigured: boolean, willAutoStart: boolean }
 * - polling: { started: boolean, intervalMs: number }
 */
async function handleStoryMode(req: RouteRequest, res: RouteResponse, runtime: IAgentRuntime) {
  setCorsHeaders(res);

  try {
    // Validate authentication FIRST
    const apiKey = getApiKey();
    const authError = validateControlRequest(req, apiKey);
    if (authError) {
      return sendError(res, 401, authError);
    }

    // Parse request body
    const body = (req.body as {
      difficulty?: "easy" | "medium" | "hard" | "boss";
      chapterId?: string;
      stageNumber?: number;
    }) || {};

    logger.info({ body }, "Control API: Story mode trigger received");

    // Get polling service
    const pollingService = runtime.getService(
      SERVICE_TYPES.POLLING
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
        `Agent is already in a game (${currentGameId}). Use /control/surrender or /control/stop first.`
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
        "Starting specific story battle"
      );
      result = await client.startStoryBattle(body.chapterId, body.stageNumber);
    } else {
      // Quick play with difficulty
      logger.info({ difficulty: body.difficulty || "easy" }, "Starting quick play story battle");
      result = await client.quickPlayStory(body.difficulty);
    }

    logger.info({ gameId: result.gameId, lobbyId: result.lobbyId }, "Story battle started");

    // Start polling for this game
    pollingService.startPollingGame(result.gameId);

    logger.info({ gameId: result.gameId }, "Polling started for story mode game");

    // Return response with streaming info
    res.json({
      success: true,
      gameId: result.gameId,
      lobbyId: result.lobbyId,
      stageId: result.stageId,
      chapter: result.chapter,
      stage: result.stage,
      aiOpponent: result.aiOpponent,
      difficulty: result.difficulty || body.difficulty,
      streaming: {
        autoStartConfigured: true,
        willAutoStart: true,
        note: "Streaming will auto-start if agent has streaming configured in Convex",
      },
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
 * - Streaming configuration
 * - Recent activity
 *
 * Response:
 * - success: boolean
 * - isInGame: boolean
 * - currentGameId: string | null
 * - gameState?: { turnNumber, phase, currentTurn, lifePoints, status }
 * - polling: { active: boolean, intervalMs: number }
 * - streaming: { configured: boolean, autoStart: boolean }
 * - uptime: number (ms)
 */
async function handleStatus(req: RouteRequest, res: RouteResponse, runtime: IAgentRuntime) {
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
      SERVICE_TYPES.POLLING
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
      streaming: {
        note: "Check agent record in Convex for actual streaming configuration",
        autoStartEnabled: true,
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
            fieldCount: gameState.myBoard?.filter((c) => c !== null).length || 0,
          },
          opponent: {
            lifePoints: gameState.opponentLifePoints,
            handCount: 0, // Not exposed in API
            fieldCount: gameState.opponentBoard?.filter((c) => c !== null).length || 0,
          },
        };
      } catch (error) {
        logger.warn({ error, gameId: currentGameId }, "Failed to fetch game state for status");
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
async function handleFindGame(req: RouteRequest, res: RouteResponse, runtime: IAgentRuntime) {
  setCorsHeaders(res);

  try {
    // Validate authentication FIRST
    const apiKey = getApiKey();
    const authError = validateControlRequest(req, apiKey);
    if (authError) {
      return sendError(res, 401, authError);
    }

    const body = (req.body as { deckId?: string }) || {};

    logger.info({ deckId: body.deckId }, "Control API: Find game trigger received");

    // Get polling service
    const pollingService = runtime.getService(
      SERVICE_TYPES.POLLING
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
        `Agent is already in a game (${currentGameId}). Use /control/surrender first.`
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

    logger.info({ lobbyId: result.lobbyId, status: result.status }, "Entered matchmaking");

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
async function handleSurrender(req: RouteRequest, res: RouteResponse, runtime: IAgentRuntime) {
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
      SERVICE_TYPES.POLLING
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
async function handleStop(req: RouteRequest, res: RouteResponse, runtime: IAgentRuntime) {
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
      SERVICE_TYPES.POLLING
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
 * POST /ltcg/control/start-stream
 *
 * Start Retake.tv streaming with LiveKit egress.
 * This properly integrates with the LTCG streaming system.
 *
 * Response:
 * - success: boolean
 * - sessionId: string
 * - status: string
 * - message: string
 */
async function handleStartStream(req: RouteRequest, res: RouteResponse, runtime: IAgentRuntime) {
  setCorsHeaders(res);

  try {
    // Validate authentication FIRST
    const apiKey = getApiKey();
    const authError = validateControlRequest(req, apiKey);
    if (authError) {
      return sendError(res, 401, authError);
    }

    logger.info("Control API: Start stream trigger received");

    // Get Retake credentials
    const accessToken =
      process.env.DIZZY_RETAKE_ACCESS_TOKEN ||
      process.env.RETAKE_ACCESS_TOKEN;

    const userDbId =
      process.env.DIZZY_RETAKE_USER_DB_ID ||
      process.env.RETAKE_USER_DB_ID;

    const agentId =
      process.env.DIZZY_RETAKE_AGENT_ID ||
      process.env.RETAKE_AGENT_ID;

    if (!accessToken || !userDbId) {
      return sendError(res, 400, "Retake.tv credentials not configured (DIZZY_RETAKE_ACCESS_TOKEN and DIZZY_RETAKE_USER_DB_ID required)");
    }

    // 1. Signal Retake.tv that we're going live
    const retakeStartResponse = await fetch("https://chat.retake.tv/api/agent/stream/start", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!retakeStartResponse.ok) {
      const errorText = await retakeStartResponse.text();
      logger.error({ error: errorText }, "Retake.tv API error");
      return sendError(res, 502, `Retake.tv API error: ${errorText}`);
    }

    // 2. Get RTMP credentials from Retake.tv
    const rtmpResponse = await fetch("https://chat.retake.tv/api/agent/rtmp", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!rtmpResponse.ok) {
      return sendError(res, 502, "Failed to get Retake RTMP credentials");
    }

    const rtmpData = await rtmpResponse.json();
    logger.info("Got Retake.tv RTMP credentials", { url: rtmpData.url });

    // 3. Start LTCG streaming system with LiveKit egress
    const appUrl = process.env.LTCG_APP_URL || "https://lunchtable.cards";

    const streamingResponse = await fetch(`${appUrl}/api/streaming/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId: agentId || "agent_dizzy",
        streamType: "agent",
        platform: "custom", // Retake.tv is custom RTMP
        streamKey: rtmpData.key,
        customRtmpUrl: rtmpData.url,
        streamTitle: "Dizzy plays LTCG",
        overlayConfig: {
          showDecisions: true,
          showAgentInfo: true,
          showEventFeed: true,
          showPlayerCam: false,
          theme: "dark",
        },
      }),
    });

    if (!streamingResponse.ok) {
      const errorText = await streamingResponse.text();
      logger.error({ error: errorText }, "LTCG streaming API error");
      return sendError(res, 502, `LTCG streaming error: ${errorText}`);
    }

    const streamingData = await streamingResponse.json();
    logger.info("LTCG streaming started", { sessionId: streamingData.sessionId });

    res.json({
      success: true,
      sessionId: streamingData.sessionId,
      status: streamingData.status,
      platform: "retake",
      message: "Stream is starting! LiveKit is capturing the overlay and streaming to Retake.tv. Check https://retake.tv/Dizzy in 10-15 seconds.",
      url: "https://retake.tv/Dizzy",
      overlayUrl: streamingData.overlayUrl,
    });
  } catch (error) {
    logger.error({ error }, "Error starting Retake stream");
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendError(res, 500, `Failed to start stream: ${errorMessage}`);
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
  {
    name: "ltcg-control-start-stream",
    path: "/control/start-stream",
    type: "POST" as const,
    handler: handleStartStream,
  },
];
