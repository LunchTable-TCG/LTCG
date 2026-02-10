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

type RecentStreamStart = {
  sessionId: string;
  status: string;
  overlayUrl?: string;
  platform: string;
  startedAt: number;
};

const recentStreamStarts = new Map<string, RecentStreamStart>();
const STREAM_START_DEDUPE_WINDOW_MS = Math.max(
  5000,
  Number.parseInt(process.env.LTCG_STREAM_START_DEDUPE_WINDOW_MS || "30000", 10) || 30000
);

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
 * Start streaming to a given platform via the LTCG streaming API.
 *
 * For Retake: fetches RTMP creds from Retake.tv API, passes to backend.
 * For all other platforms: backend resolves creds from its own env vars.
 */
async function startStreamForPlatform(
  platform: string,
  ids: { gameId: string; lobbyId?: string },
  _runtime: IAgentRuntime,
): Promise<{ sessionId: string; status: string; overlayUrl?: string; platform: string }> {
  const { gameId, lobbyId } = ids;
  const configuredAppUrl =
    process.env.LTCG_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.lunchtable.cards";
  const appUrl = configuredAppUrl.includes(".convex.site")
    ? "https://www.lunchtable.cards"
    : configuredAppUrl;
  const agentId = process.env.LTCG_AGENT_ID || "agent_dizzy";
  const ltcgApiKey = process.env.LTCG_API_KEY;
  const forceRestart = process.env.LTCG_STREAM_FORCE_RESTART === "true";
  const authHeaders: Record<string, string> = {};
  if (ltcgApiKey) {
    authHeaders.Authorization = `Bearer ${ltcgApiKey}`;
    authHeaders["x-api-key"] = ltcgApiKey;
  }

  const dedupeKey = `${agentId}:${lobbyId || gameId}:${platform}`;
  const recentStart = recentStreamStarts.get(dedupeKey);
  if (recentStart && Date.now() - recentStart.startedAt < STREAM_START_DEDUPE_WINDOW_MS) {
    logger.info(
      { dedupeKey, sessionId: recentStart.sessionId, windowMs: STREAM_START_DEDUPE_WINDOW_MS },
      "Returning deduped recent stream start result"
    );
    return {
      sessionId: recentStart.sessionId,
      status: recentStart.status,
      overlayUrl: recentStart.overlayUrl,
      platform: recentStart.platform,
    };
  }

  // For Retake, pass access token and let backend resolve RTMP creds + go-live handshake once.
  let retakeAccessToken: string | undefined;
  let streamPlatform = platform;

  if (platform === "retake") {
    retakeAccessToken =
      process.env.DIZZY_RETAKE_ACCESS_TOKEN ||
      process.env.RETAKE_ACCESS_TOKEN;

    if (!retakeAccessToken) {
      throw new Error("Retake.tv credentials not configured (DIZZY_RETAKE_ACCESS_TOKEN required)");
    }
    streamPlatform = "retake";
  }

  // Call the LTCG streaming API — backend resolves env-var creds for non-Retake platforms
  const streamingResponse = await fetch(`${appUrl}/api/streaming/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      agentId,
      gameId,
      lobbyId,
      streamType: "agent",
      platform: streamPlatform,
      ...(retakeAccessToken ? { retakeAccessToken } : {}),
      streamTitle: "Dizzy plays LTCG",
      forceRestart,
    }),
  });

  if (!streamingResponse.ok) {
    const errorText = await streamingResponse.text();
    throw new Error(`LTCG streaming API error: ${errorText}`);
  }

  const streamingData = await streamingResponse.json();
  logger.info({ sessionId: streamingData.sessionId, platform }, "Stream started via control API");

  recentStreamStarts.set(dedupeKey, {
    sessionId: streamingData.sessionId,
    status: streamingData.status,
    overlayUrl: streamingData.overlayUrl,
    platform,
    startedAt: Date.now(),
  });

  return {
    sessionId: streamingData.sessionId,
    status: streamingData.status,
    overlayUrl: streamingData.overlayUrl,
    platform,
  };
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

    // Auto-start streaming if configured
    const streamingPlatform =
      (body as { platform?: string }).platform ||
      process.env.STREAMING_PLATFORM;
    const autoStart = process.env.STREAMING_AUTO_START !== "false";

    let streamingResult: {
      sessionId?: string;
      status?: string;
      platform?: string;
      error?: string;
      skipped?: boolean;
      reason?: string;
    } = {
      error: "No streaming platform configured",
    };

    const preferBackendAutoStart = process.env.LTCG_PREFER_BACKEND_STREAM_AUTOSTART !== "false";
    let skipControlAutoStart = false;

    if (streamingPlatform && autoStart && preferBackendAutoStart) {
      const configuredAgentId = process.env.LTCG_AGENT_ID;
      if (configuredAgentId) {
        try {
          const backendStreamingConfig = await client.getStreamingConfig(configuredAgentId);
          if (
            backendStreamingConfig?.enabled &&
            backendStreamingConfig.autoStart &&
            backendStreamingConfig.hasStreamKey
          ) {
            skipControlAutoStart = true;
            streamingResult = {
              skipped: true,
              reason: "backend_autostart_enabled",
              platform: backendStreamingConfig.platform || streamingPlatform,
            };
            logger.info(
              {
                agentId: configuredAgentId,
                platform: backendStreamingConfig.platform || streamingPlatform,
              },
              "Skipping control-route stream start because backend agent auto-start is enabled"
            );
          }
        } catch (configError) {
          logger.debug(
            { error: configError instanceof Error ? configError.message : String(configError) },
            "Failed to inspect backend streaming config; proceeding with control-route auto-start"
          );
        }
      }
    }

    if (streamingPlatform && autoStart && !skipControlAutoStart) {
      try {
        logger.info({ platform: streamingPlatform, gameId: result.gameId }, "Auto-starting stream for story mode");
        const streamData = await startStreamForPlatform(
          streamingPlatform,
          { gameId: result.gameId, lobbyId: result.lobbyId },
          runtime
        );
        streamingResult = {
          sessionId: streamData.sessionId,
          status: streamData.status,
          platform: streamData.platform,
        };
      } catch (streamError) {
        const msg = streamError instanceof Error ? streamError.message : String(streamError);
        logger.warn({ error: msg }, "Failed to auto-start stream (game will continue without streaming)");
        streamingResult = { error: msg };
      }
    }

    // Start polling with metadata for game-end handling
    pollingService.startPollingGame(result.gameId, {
      stageId: result.stageId,
      streamingSessionId: streamingResult.sessionId,
    });
    logger.info({ gameId: result.gameId, stageId: result.stageId, sessionId: streamingResult.sessionId }, "Polling started for story mode game");

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
      streaming: streamingResult.error
        ? { autoStarted: false, error: streamingResult.error }
        : streamingResult.skipped
          ? {
              autoStarted: false,
              skipped: true,
              reason: streamingResult.reason,
              platform: streamingResult.platform,
            }
          : {
              autoStarted: true,
              sessionId: streamingResult.sessionId,
              status: streamingResult.status,
              platform: streamingResult.platform,
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
 * Start streaming with LiveKit egress to any supported platform.
 *
 * Request body:
 * - platform?: string (default: STREAMING_PLATFORM env var)
 *   Supported: "pumpfun", "retake", "twitch", "youtube", "kick", "x", or any custom
 *
 * Response:
 * - success: boolean
 * - sessionId: string
 * - status: string
 * - platform: string
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

    const body = (req.body as { platform?: string }) || {};
    const platform = body.platform || process.env.STREAMING_PLATFORM;

    if (!platform) {
      return sendError(res, 400, "No platform specified. Pass { platform: 'pumpfun' } or set STREAMING_PLATFORM env var.");
    }

    logger.info({ platform }, "Control API: Start stream trigger received");

    // Get polling service to check for active game
    const pollingService = runtime.getService(
      SERVICE_TYPES.POLLING
    ) as unknown as IPollingService | null;

    if (!pollingService) {
      return sendError(res, 503, "Polling service not available");
    }

    const currentGameId = pollingService.getCurrentGameId();
    if (!currentGameId) {
      return sendError(res, 400, "No active game - start a game first before streaming");
    }

    const streamData = await startStreamForPlatform(platform, { gameId: currentGameId }, runtime);

    res.json({
      success: true,
      sessionId: streamData.sessionId,
      status: streamData.status,
      platform: streamData.platform,
      overlayUrl: streamData.overlayUrl,
      message: `Stream is starting on ${platform}! LiveKit egress is capturing the overlay. It may take 10-15 seconds to go live.`,
    });
  } catch (error) {
    logger.error({ error }, "Error starting stream");
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
