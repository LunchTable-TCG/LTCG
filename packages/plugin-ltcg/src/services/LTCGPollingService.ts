/**
 * LTCG Polling Service
 *
 * Provides real-time game updates via HTTP polling for agents running locally
 * without a public webhook URL. Automatically activates when LTCG_CALLBACK_URL
 * is not configured.
 *
 * This is a fallback mechanism that allows local development without ngrok or
 * similar tunneling services.
 */

import { type IAgentRuntime, Service, logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import { LTCG_PRODUCTION_CONFIG } from "../constants";
import { LTCGEventType, emitLTCGEvent } from "../events/types";
import type { MatchmakingEvent, MatchmakingStatus } from "../frontend/types/panel";
import type { GameStateResponse } from "../types/api";
import {
  type GameWebhookPayload,
  type WebhookEventType,
  handleGameWebhook,
} from "../webhooks/gameEventHandler";
import { type ITurnOrchestrator, SERVICE_TYPES } from "./types";

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

type StoryDifficulty = "easy" | "medium" | "hard" | "boss";

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function parseStoryDifficulty(value: string | undefined): StoryDifficulty | undefined {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "easy" ||
    normalized === "medium" ||
    normalized === "hard" ||
    normalized === "boss"
  ) {
    return normalized;
  }
  return undefined;
}

export interface PollingConfig {
  /** Polling interval in milliseconds (default: 1500ms) */
  intervalMs?: number;
  /** Discovery interval in milliseconds for checking pending games (default: 5000ms) */
  discoveryIntervalMs?: number;
  /** Matchmaking interval in milliseconds for auto-joining lobbies (default: 10000ms) */
  matchmakingIntervalMs?: number;
  /** Enable auto-matchmaking (default: false) */
  autoMatchmaking?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Enable adaptive polling (default: true) */
  adaptivePolling?: boolean;
  /** Idle timeout before increasing polling interval (milliseconds, default: 30000) */
  idleTimeoutMs?: number;
  /** Multiplier to increase polling interval when idle (default: 1.5) */
  idleMultiplier?: number;
  /** Maximum polling interval multiplier cap (default: 5) */
  maxIntervalMultiplier?: number;
  /** Automatically queue the next story-mode game when a story game ends (default: true) */
  autoContinueStoryMode?: boolean;
  /** Delay before auto-queueing the next story-mode game (default: 2500ms) */
  storyRequeueDelayMs?: number;
  /** Preferred quick-play story difficulty for auto-queued games */
  storyDifficulty?: StoryDifficulty;
}

interface GameStateSnapshot {
  turnNumber: number;
  phase: string;
  currentTurn: string;
  isChainWaiting: boolean;
  status: string;
  lastEventId?: string;
}

interface AdaptivePollingState {
  isIdle: boolean;
  lastActivityTime: number;
  currentIntervalMultiplier: number;
  baseInterval: number;
}

// Circuit breaker states
type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreaker {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

// Error recovery configuration
interface ErrorRecoveryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
}

const DEFAULT_ERROR_RECOVERY: ErrorRecoveryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60000,
};

export class LTCGPollingService extends Service {
  static serviceType = SERVICE_TYPES.POLLING;

  // Note: runtime is inherited from Service base class as protected
  private client: LTCGApiClient | null = null;
  private pollingInterval: ReturnType<typeof setTimeout> | null = null;
  private discoveryInterval: ReturnType<typeof setTimeout> | null = null;
  private matchmakingInterval: ReturnType<typeof setTimeout> | null = null;
  private currentGameId: string | null = null;
  /** Story stage ID for the current game (set via startPollingGame metadata) */
  private currentStageId: string | null = null;
  /** Active streaming session ID (set via startPollingGame metadata) */
  private currentStreamingSessionId: string | null = null;
  private lastKnownGameState: GameStateResponse | null = null;
  private lastSnapshot: GameStateSnapshot | null = null;
  private intervalMs: number;
  private discoveryIntervalMs: number;
  private matchmakingIntervalMs: number;
  private autoMatchmaking: boolean;
  private debug: boolean;
  private isPolling = false;
  private isDiscoveryRunning = false;
  private isMatchmakingRunning = false;

  // Adaptive polling state
  private adaptivePollingEnabled: boolean;
  private idleTimeoutMs: number;
  private idleMultiplier: number;
  private maxIntervalMultiplier: number;
  private adaptivePollingState: {
    game: AdaptivePollingState;
    discovery: AdaptivePollingState;
    matchmaking: AdaptivePollingState;
  };

  // Error recovery state
  private errorRecovery: ErrorRecoveryConfig = DEFAULT_ERROR_RECOVERY;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryDelays: Map<string, number> = new Map();

  // Matchmaking event tracking
  private matchmakingEvents: MatchmakingEvent[] = [];
  private matchmakingStats = {
    lobbiesJoined: 0,
    gamesStarted: 0,
    lastScanAt: 0,
  };
  private readonly maxEventHistory = 50;
  private cachedDeckId: string | null = null;
  private readonly autoContinueStoryMode: boolean;
  private readonly storyRequeueDelayMs: number;
  private readonly preferredStoryDifficulty: StoryDifficulty | undefined;
  private storyContinuationInFlight = false;

  capabilityDescription = "Provides real-time game updates via HTTP polling for local development";

  constructor(runtime: IAgentRuntime, config?: PollingConfig) {
    super(runtime);
    // runtime is set by super(runtime)
    this.intervalMs = config?.intervalMs ?? 1500;
    this.discoveryIntervalMs = config?.discoveryIntervalMs ?? 5000;
    this.matchmakingIntervalMs = config?.matchmakingIntervalMs ?? 10000;
    this.autoMatchmaking = config?.autoMatchmaking ?? false;
    this.debug = config?.debug ?? false;

    // Adaptive polling config
    this.adaptivePollingEnabled = config?.adaptivePolling ?? true;
    this.idleTimeoutMs = config?.idleTimeoutMs ?? 30000;
    this.idleMultiplier = config?.idleMultiplier ?? 1.5;
    this.maxIntervalMultiplier = config?.maxIntervalMultiplier ?? 5;
    this.autoContinueStoryMode =
      config?.autoContinueStoryMode ?? process.env.LTCG_AUTO_CONTINUE_STORY_MODE !== "false";
    this.storyRequeueDelayMs =
      config?.storyRequeueDelayMs ??
      parseNonNegativeInt(process.env.LTCG_STORY_REQUEUE_DELAY_MS, 2500);
    this.preferredStoryDifficulty =
      config?.storyDifficulty ??
      parseStoryDifficulty(
        firstNonEmpty(
          process.env.LTCG_STORY_MODE_DIFFICULTY,
          process.env.LTCG_STORY_QUICK_PLAY_DIFFICULTY
        ) ?? undefined
      );

    // Initialize adaptive polling state
    this.adaptivePollingState = {
      game: {
        isIdle: false,
        lastActivityTime: Date.now(),
        currentIntervalMultiplier: 1,
        baseInterval: this.intervalMs,
      },
      discovery: {
        isIdle: false,
        lastActivityTime: Date.now(),
        currentIntervalMultiplier: 1,
        baseInterval: this.discoveryIntervalMs,
      },
      matchmaking: {
        isIdle: false,
        lastActivityTime: Date.now(),
        currentIntervalMultiplier: 1,
        baseInterval: this.matchmakingIntervalMs,
      },
    };
  }

  static async start(runtime: IAgentRuntime): Promise<Service> {
    // Read from process.env (set by plugin init)
    const callbackUrl = process.env.LTCG_CALLBACK_URL;
    const debugMode = process.env.LTCG_DEBUG_MODE === "true";
    const autoMatchmaking = process.env.LTCG_AUTO_MATCHMAKING === "true";

    // Load polling intervals from environment variables
    const pollIntervalMs = Number.parseInt(process.env.LTCG_POLL_INTERVAL_MS || "1500");
    const discoveryIntervalMs = Number.parseInt(
      process.env.LTCG_DISCOVERY_INTERVAL_MS || "5000"
    );
    const matchmakingIntervalMs = Number.parseInt(
      process.env.LTCG_MATCHMAKING_INTERVAL_MS || "10000"
    );
    const adaptivePolling = process.env.LTCG_ADAPTIVE_POLLING !== "false";
    const idleTimeoutMs = Number.parseInt(process.env.LTCG_IDLE_TIMEOUT_MS || "30000");
    const idleMultiplier = Number.parseFloat(process.env.LTCG_IDLE_MULTIPLIER || "1.5");
    const maxIntervalMultiplier = Number.parseInt(
      process.env.LTCG_MAX_INTERVAL_MULTIPLIER || "5"
    );
    const autoContinueStoryMode = process.env.LTCG_AUTO_CONTINUE_STORY_MODE !== "false";
    const storyRequeueDelayMs = parseNonNegativeInt(process.env.LTCG_STORY_REQUEUE_DELAY_MS, 2500);
    const storyDifficulty = parseStoryDifficulty(
      firstNonEmpty(
        process.env.LTCG_STORY_MODE_DIFFICULTY,
        process.env.LTCG_STORY_QUICK_PLAY_DIFFICULTY
      ) ?? undefined
    );

    logger.debug(
      {
        autoMatchmakingSetting: process.env.LTCG_AUTO_MATCHMAKING,
        parsed: autoMatchmaking,
      },
      "Matchmaking config"
    );

    // Only start polling if no webhook URL is configured
    if (callbackUrl) {
      logger.info("LTCG_CALLBACK_URL configured - polling service not needed");
      const service = new LTCGPollingService(runtime, { debug: debugMode });
      return service;
    }

    logger.info("*** Starting LTCG polling service (no webhook URL configured) ***");

    const service = new LTCGPollingService(runtime, {
      intervalMs: pollIntervalMs,
      discoveryIntervalMs,
      matchmakingIntervalMs,
      autoMatchmaking,
      debug: debugMode,
      adaptivePolling,
      idleTimeoutMs,
      idleMultiplier,
      maxIntervalMultiplier,
      autoContinueStoryMode,
      storyRequeueDelayMs,
      storyDifficulty,
    });

    // Initialize API client (read from process.env set by plugin init)
    const apiKey = process.env.LTCG_API_KEY;
    const apiUrl = process.env.LTCG_API_URL;

    if (apiKey && apiUrl) {
      service.client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
        debug: debugMode,
      });
      try {
        const profile = await service.client.getAgentProfile();
        logger.info(
          { agentId: profile.agentId, name: profile.name },
          "Polling service initialized with verified API client"
        );
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : String(error) },
          "LTCG API key validation failed; polling service will stay idle"
        );
        service.client = null;
        return service;
      }

      // Start auto-discovery loop
      service.startDiscovery();

      // Start auto-matchmaking if enabled
      if (autoMatchmaking) {
        service.startMatchmaking();
      }
    } else {
      logger.warn("API credentials not configured - polling will not fetch game state");
    }

    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info("*** Stopping LTCG polling service ***");

    const service = runtime.getService(
      LTCGPollingService.serviceType
    ) as unknown as LTCGPollingService | null;
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    // Cleanup active game and stream before stopping
    await this.cleanupActiveResources();

    this.storyContinuationInFlight = false;
    this.stopPolling();
    this.stopDiscovery();
    this.stopMatchmaking();
    this.client = null;
    // Clear circuit breaker and retry state to prevent memory leaks
    this.circuitBreakers.clear();
    this.retryDelays.clear();
    logger.info("Polling service stopped");
  }

  /**
   * Cleanup active game and streaming resources on shutdown.
   * Surrenders any active game and ends any active streaming session
   * to prevent stale processes from blocking future sessions.
   */
  private async cleanupActiveResources(): Promise<void> {
    if (!this.client) return;

    // Surrender active game if one exists
    if (this.currentGameId) {
      try {
        logger.info({ gameId: this.currentGameId }, "Surrendering active game on shutdown");
        await this.client.surrender({ gameId: this.currentGameId });
        logger.info({ gameId: this.currentGameId }, "Game surrendered successfully");
      } catch (error) {
        // Non-fatal: game may have already ended
        logger.warn({ error, gameId: this.currentGameId }, "Failed to surrender game on shutdown (may have already ended)");
      }
    }

    // End active streaming session via app API
    const appUrl = process.env.LTCG_APP_URL;
    const apiKey = process.env.LTCG_API_KEY;
    const agentId = process.env.LTCG_AGENT_ID;

    if (appUrl && agentId) {
      try {
        logger.info("Ending streaming session on shutdown via app API");
        await fetch(`${appUrl}/api/streaming/stop`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey
              ? {
                  Authorization: `Bearer ${apiKey}`,
                  "x-api-key": apiKey,
                }
              : {}),
          },
          body: JSON.stringify({ agentId, reason: "agent_shutdown" }),
        });
        logger.info("Streaming stop request sent successfully");
      } catch (error) {
        // Non-fatal: streaming may not be active
        logger.warn({ error }, "Failed to stop streaming on shutdown (may not be active)");
      }
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start polling for a specific game
   */
  startPollingGame(gameId: string, meta?: { stageId?: string; streamingSessionId?: string }): void {
    if (!this.client) {
      logger.warn("Cannot start polling - API client not initialized");
      return;
    }

    if (this.isPolling && this.currentGameId === gameId) {
      logger.debug("Already polling this game");
      return;
    }

    // Stop any existing polling
    this.stopPolling();

    this.currentGameId = gameId;
    this.currentStageId = meta?.stageId ?? null;
    this.currentStreamingSessionId = meta?.streamingSessionId ?? null;
    this.lastSnapshot = null;
    this.isPolling = true;

    logger.info(
      {
        gameId,
        intervalMs: this.intervalMs,
        adaptivePolling: this.adaptivePollingEnabled,
      },
      "Starting game polling"
    );

    // Schedule next poll using setTimeout so interval adapts each cycle
    const scheduleNextPoll = () => {
      if (!this.isPolling) return;
      const interval = this.getCurrentGamePollingInterval();
      this.pollingInterval = setTimeout(() => {
        this.pollGameState()
          .catch((error) => {
            logger.error({ error, gameId }, "Polling error");
          })
          .finally(() => {
            scheduleNextPoll();
          });
      }, interval);
    };

    // Do an immediate poll, then start the adaptive schedule
    this.pollGameState()
      .catch((error) => {
        logger.error({ error, gameId }, "Initial poll error");
      })
      .finally(() => {
        scheduleNextPoll();
      });
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    const activeGameId = this.currentGameId;

    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    this.currentGameId = null;
    this.currentStageId = null;
    this.currentStreamingSessionId = null;
    this.lastSnapshot = null;
    this.lastKnownGameState = null;

    // Clear per-game recovery state to avoid stale open circuits after game completion.
    if (activeGameId) {
      const operationName = `poll_game_${activeGameId}`;
      this.circuitBreakers.delete(operationName);
      this.retryDelays.delete(operationName);
    }

    if (this.debug) {
      logger.debug("Polling stopped");
    }
  }

  /**
   * Handle game end: complete story stage and update streaming session with match result.
   * Called before stopPolling clears state.
   */
  private async handleGameEnd(gameState: GameStateResponse | null): Promise<void> {
    const agentWon = gameState ? this.didAgentWin(gameState) : false;
    const playerLP = gameState?.myLifePoints ?? gameState?.hostPlayer?.lifePoints ?? 0;
    const result: "win" | "loss" = agentWon ? "win" : "loss";

    logger.info({
      myLP: gameState?.myLifePoints,
      oppLP: gameState?.opponentLifePoints,
      agentWon,
      result,
      status: gameState?.status,
    }, "Game ended — evaluating result");

    // 1. Story completion fallback.
    // Primary completion/reward handling is performed by core gameplay on match end.
    // Keep this path opt-in only for emergency fallback scenarios.
    const shouldFallbackCompleteStory =
      process.env.LTCG_POLLING_COMPLETE_STORY_STAGE_FALLBACK?.trim().toLowerCase() === "true";
    if (this.currentStageId && this.client && shouldFallbackCompleteStory) {
      try {
        const completion = await this.client.completeStoryStage(this.currentStageId, agentWon, playerLP);
        logger.info(
          { stageId: this.currentStageId, won: agentWon, unlockedNextStage: completion.unlockedNextStage },
          "Story stage completed via polling fallback"
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn({ error: msg, stageId: this.currentStageId }, "Polling fallback failed to complete story stage");
      }
    }

    // 2. Update streaming session with match result (shows win/loss overlay)
    if (this.currentStreamingSessionId && this.client) {
      try {
        const appBaseUrl = (process.env.LTCG_APP_URL || LTCG_PRODUCTION_CONFIG.APP_URL).replace(/\/$/, "");
        const internalAuth = process.env.INTERNAL_API_SECRET?.trim();
        if (internalAuth) {
          const response = await fetch(`${appBaseUrl}/api/streaming/match-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": internalAuth },
            body: JSON.stringify({
              sessionId: this.currentStreamingSessionId,
              lastMatchEndedAt: Date.now(),
              lastMatchResult: result,
              lastMatchSummary: agentWon ? "Match over: victory secured." : "Match over: tough loss. Reviewing lines.",
              clearCurrentLobby: true,
            }),
          });
          if (!response.ok) {
            const text = await response.text().catch(() => `status ${response.status}`);
            throw new Error(`match-result API failed (${response.status}): ${text}`);
          }
          const cleared = await this.ensureLobbyLinkCleared(
            this.currentStreamingSessionId,
            appBaseUrl,
            internalAuth
          );
          if (!cleared) {
            logger.warn(
              { sessionId: this.currentStreamingSessionId },
              "Match result updated but lobby linkage may still be present"
            );
          }
          logger.info(
            { sessionId: this.currentStreamingSessionId, result, clearedLobbyLink: cleared },
            "Updated streaming session with match result"
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.warn({ error: msg }, "Failed to update streaming session with match result");
      }
    }
  }

  private shouldAutoContinueStoryGame(): boolean {
    return this.autoContinueStoryMode && Boolean(this.currentStageId);
  }

  private async continueStoryModeAfterGameEnd(params: {
    reason: "completed" | "game_not_found";
    previousStreamingSessionId: string | null;
  }): Promise<void> {
    if (!this.client) {
      return;
    }

    if (this.storyContinuationInFlight) {
      logger.debug(
        { reason: params.reason },
        "Story continuation already in progress; skipping duplicate continuation trigger"
      );
      return;
    }

    this.storyContinuationInFlight = true;

    try {
      if (this.storyRequeueDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.storyRequeueDelayMs));
      }

      const nextStoryGame = await this.executeWithRecovery("story_quick_play", async () => {
        if (!this.client) {
          throw new Error("API client not initialized");
        }
        return this.client.quickPlayStory(this.preferredStoryDifficulty);
      });

      if (!nextStoryGame) {
        logger.warn(
          { reason: params.reason },
          "Failed to queue next story game after game end; will rely on discovery/autonomy fallback"
        );
        return;
      }

      const linkedStreamingSessionId = await this.relinkStoryStreamToLobby(
        nextStoryGame.lobbyId,
        params.previousStreamingSessionId
      );

      this.startPollingGame(nextStoryGame.gameId, {
        stageId: nextStoryGame.stageId,
        streamingSessionId: linkedStreamingSessionId ?? undefined,
      });

      logger.info(
        {
          previousGameEndReason: params.reason,
          gameId: nextStoryGame.gameId,
          lobbyId: nextStoryGame.lobbyId,
          stageId: nextStoryGame.stageId,
          difficulty: nextStoryGame.difficulty,
        },
        "Started next story game automatically"
      );
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error), reason: params.reason },
        "Auto story continuation failed after game end"
      );
    } finally {
      this.storyContinuationInFlight = false;
    }
  }

  private async relinkStoryStreamToLobby(
    lobbyId: string,
    previousStreamingSessionId: string | null
  ): Promise<string | null> {
    if (!previousStreamingSessionId) {
      return null;
    }

    const apiKey = firstNonEmpty(process.env.LTCG_API_KEY);
    const agentId = firstNonEmpty(process.env.LTCG_AGENT_ID);
    const configuredAppUrl =
      firstNonEmpty(process.env.LTCG_APP_URL, process.env.NEXT_PUBLIC_APP_URL) ??
      LTCG_PRODUCTION_CONFIG.APP_URL;
    const appBaseUrl = configuredAppUrl.includes(".convex.site")
      ? LTCG_PRODUCTION_CONFIG.APP_URL
      : configuredAppUrl.replace(/\/+$/, "");

    if (!apiKey || !agentId) {
      return previousStreamingSessionId;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
    };

    const platform = firstNonEmpty(process.env.STREAMING_PLATFORM);
    const body: Record<string, unknown> = {
      agentId,
      streamType: "agent",
      lobbyId,
      useStoredCredentials: true,
    };
    if (platform) {
      body.platform = platform;
    }

    try {
      const response = await fetch(`${appBaseUrl}/api/streaming/start`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        logger.warn(
          {
            sessionId: previousStreamingSessionId,
            lobbyId,
            status: response.status,
            error: text,
          },
          "Failed to relink stream to next story lobby; preserving previous session reference"
        );
        return previousStreamingSessionId;
      }

      const payload = await response.json().catch(() => null);
      const linkedSessionId =
        payload && typeof payload === "object" && typeof payload.sessionId === "string"
          ? payload.sessionId
          : null;

      return linkedSessionId ?? previousStreamingSessionId;
    } catch (error) {
      logger.warn(
        {
          sessionId: previousStreamingSessionId,
          lobbyId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Stream relink request failed while continuing story mode"
      );
      return previousStreamingSessionId;
    }
  }

  private async ensureLobbyLinkCleared(
    sessionId: string,
    appBaseUrl: string,
    internalAuth: string
  ): Promise<boolean> {
    const statusCheck = await this.fetchStreamingStatus(appBaseUrl, sessionId);
    if (statusCheck && !statusCheck.currentLobbyId) {
      return true;
    }

    const clearedViaConvex = await this.clearLobbyLinkDirectlyInConvex(sessionId, internalAuth);
    if (!clearedViaConvex) {
      return false;
    }

    const afterDirectClear = await this.fetchStreamingStatus(appBaseUrl, sessionId);
    return afterDirectClear ? !afterDirectClear.currentLobbyId : true;
  }

  private async fetchStreamingStatus(
    appBaseUrl: string,
    sessionId: string
  ): Promise<{ currentLobbyId?: unknown } | null> {
    try {
      const response = await fetch(
        `${appBaseUrl}/api/streaming/status?sessionId=${encodeURIComponent(sessionId)}`
      );
      if (!response.ok) {
        return null;
      }
      const body = await response.json();
      if (!body || typeof body !== "object") {
        return null;
      }
      return body as { currentLobbyId?: unknown };
    } catch {
      return null;
    }
  }

  private async clearLobbyLinkDirectlyInConvex(
    sessionId: string,
    internalAuth: string
  ): Promise<boolean> {
    const convexBaseUrl = firstNonEmpty(
      process.env.LTCG_CONVEX_URL,
      process.env.NEXT_PUBLIC_CONVEX_URL,
      process.env.CONVEX_URL
    );
    if (!convexBaseUrl) {
      return false;
    }

    const convexMutationUrl = `${convexBaseUrl.replace(/\/+$/, "")}/api/mutation`;

    const runMutation = async (path: string, args: Record<string, unknown>) => {
      const response = await fetch(convexMutationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path, args }),
      });
      const text = await response.text().catch(() => "");
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
      const hasConvexError =
        parsed &&
        typeof parsed === "object" &&
        ((parsed as { status?: string }).status === "error" ||
          typeof (parsed as { errorMessage?: unknown }).errorMessage === "string");
      return {
        ok: response.ok && !hasConvexError,
        status: response.status,
        body: parsed,
      };
    };

    try {
      const clearLobbyResult = await runMutation("streaming/sessions:clearLobbyLink", {
        sessionId,
        internalAuth,
      });
      if (clearLobbyResult.ok) {
        return true;
      }

      const legacyFallbackResult = await runMutation("streaming/sessions:updateSession", {
        sessionId,
        internalAuth,
        updates: {
          currentLobbyId: "",
        },
      });
      if (!legacyFallbackResult.ok) {
        logger.warn(
          {
            sessionId,
            primaryStatus: clearLobbyResult.status,
            primaryBody: clearLobbyResult.body,
            fallbackStatus: legacyFallbackResult.status,
            fallbackBody: legacyFallbackResult.body,
          },
          "Direct Convex lobby clear mutation failed (primary + fallback)"
        );
        return false;
      }

      return true;
    } catch (error) {
      logger.warn(
        { sessionId, error: error instanceof Error ? error.message : String(error) },
        "Direct Convex clearLobbyLink mutation errored"
      );
      return false;
    }
  }

  /**
   * Check if polling is active
   */
  isActive(): boolean {
    return this.isPolling;
  }

  /**
   * Get current game being polled
   */
  getCurrentGameId(): string | null {
    return this.currentGameId;
  }

  /**
   * Get current lobby ID if known from latest game state.
   */
  getCurrentLobbyId(): string | null {
    return this.lastKnownGameState?.lobbyId ?? null;
  }

  /**
   * Check if auto-matchmaking is enabled
   */
  isMatchmakingEnabled(): boolean {
    return this.autoMatchmaking;
  }

  /**
   * Get the API client instance
   */
  getClient(): LTCGApiClient | null {
    return this.client;
  }

  /**
   * Get current polling statistics for monitoring
   */
  getPollingStats() {
    return {
      adaptive: {
        enabled: this.adaptivePollingEnabled,
        idleTimeoutMs: this.idleTimeoutMs,
        idleMultiplier: this.idleMultiplier,
        maxIntervalMultiplier: this.maxIntervalMultiplier,
      },
      game: {
        baseIntervalMs: this.adaptivePollingState.game.baseInterval,
        currentIntervalMs: this.getCurrentGamePollingInterval(),
        isIdle: this.adaptivePollingState.game.isIdle,
        currentMultiplier: this.adaptivePollingState.game.currentIntervalMultiplier,
        lastActivityTime: this.adaptivePollingState.game.lastActivityTime,
        timeSinceActivityMs: Date.now() - this.adaptivePollingState.game.lastActivityTime,
      },
      discovery: {
        baseIntervalMs: this.adaptivePollingState.discovery.baseInterval,
        currentIntervalMs: this.getCurrentDiscoveryInterval(),
        isIdle: this.adaptivePollingState.discovery.isIdle,
        currentMultiplier: this.adaptivePollingState.discovery.currentIntervalMultiplier,
        lastActivityTime: this.adaptivePollingState.discovery.lastActivityTime,
        timeSinceActivityMs: Date.now() - this.adaptivePollingState.discovery.lastActivityTime,
      },
      matchmaking: {
        baseIntervalMs: this.adaptivePollingState.matchmaking.baseInterval,
        currentIntervalMs: this.getCurrentMatchmakingInterval(),
        isIdle: this.adaptivePollingState.matchmaking.isIdle,
        currentMultiplier: this.adaptivePollingState.matchmaking.currentIntervalMultiplier,
        lastActivityTime: this.adaptivePollingState.matchmaking.lastActivityTime,
        timeSinceActivityMs: Date.now() - this.adaptivePollingState.matchmaking.lastActivityTime,
      },
      active: {
        isPolling: this.isPolling,
        isDiscoveryRunning: this.isDiscoveryRunning,
        isMatchmakingRunning: this.isMatchmakingRunning,
      },
    };
  }

  /**
   * Get current matchmaking status and recent events
   */
  getMatchmakingStatus(): MatchmakingStatus {
    const status: "idle" | "scanning" | "joining" | "in_game" = this.currentGameId
      ? "in_game"
      : this.autoMatchmaking
        ? "scanning"
        : "idle";

    return {
      enabled: this.autoMatchmaking,
      status,
      lobbiesScanned: this.matchmakingStats.lastScanAt > 0 ? 1 : 0,
      recentJoins: this.matchmakingEvents.slice(-10),
      stats: {
        lobbiesJoined: this.matchmakingStats.lobbiesJoined,
        gamesStarted: this.matchmakingStats.gamesStarted,
        lastScanAt: this.matchmakingStats.lastScanAt,
      },
      nextScanIn: this.isMatchmakingRunning ? this.matchmakingIntervalMs : 0,
    };
  }

  /**
   * Get deck ID for auto-matchmaking
   */
  private async getDeckId(): Promise<string | null> {
    if (this.cachedDeckId) {
      return this.cachedDeckId;
    }

    if (!this.client) {
      return null;
    }

    try {
      // Try to get preferred deck ID from settings
      const preferredDeckId = this.runtime.getSetting("LTCG_PREFERRED_DECK_ID") as string;
      if (preferredDeckId) {
        this.cachedDeckId = preferredDeckId;
        return preferredDeckId;
      }

      // Fall back to first available deck
      const decks = await this.client.getDecks();
      if (decks.length > 0) {
        this.cachedDeckId = decks[0]?.deckId ?? null;
        return this.cachedDeckId;
      }

      logger.warn("No decks available for auto-matchmaking");
      return null;
    } catch (error) {
      logger.error({ error }, "Failed to get deck ID");
      return null;
    }
  }

  /**
   * Start auto-discovery of pending games
   */
  startDiscovery(): void {
    if (!this.client) {
      logger.warn("Cannot start discovery - API client not initialized");
      return;
    }

    if (this.isDiscoveryRunning) {
      logger.debug("Discovery already running");
      return;
    }

    logger.info(
      {
        discoveryIntervalMs: this.discoveryIntervalMs,
        adaptivePolling: this.adaptivePollingEnabled,
      },
      "Starting game discovery"
    );

    this.isDiscoveryRunning = true;

    // Schedule next discovery using setTimeout so interval adapts each cycle
    const scheduleNextDiscovery = () => {
      if (!this.isDiscoveryRunning) return;
      const interval = this.getCurrentDiscoveryInterval();
      this.discoveryInterval = setTimeout(() => {
        this.checkForPendingGames()
          .catch((error) => {
            logger.error({ error }, "Discovery error");
          })
          .finally(() => {
            scheduleNextDiscovery();
          });
      }, interval);
    };

    // Do an immediate check, then start the adaptive schedule
    this.checkForPendingGames()
      .catch((error) => {
        logger.error({ error }, "Initial discovery error");
      })
      .finally(() => {
        scheduleNextDiscovery();
      });
  }

  /**
   * Stop auto-discovery
   */
  stopDiscovery(): void {
    this.isDiscoveryRunning = false;
    if (this.discoveryInterval) {
      clearTimeout(this.discoveryInterval);
      this.discoveryInterval = null;
      logger.debug("Discovery stopped");
    }
  }

  /**
   * Start auto-matchmaking to join available lobbies
   */
  startMatchmaking(): void {
    if (!this.client) {
      logger.warn("Cannot start matchmaking - API client not initialized");
      return;
    }

    if (this.isMatchmakingRunning) {
      logger.debug("Matchmaking already running");
      return;
    }

    if (!this.autoMatchmaking) {
      logger.debug("Auto-matchmaking is disabled");
      return;
    }

    logger.info(
      {
        matchmakingIntervalMs: this.matchmakingIntervalMs,
        adaptivePolling: this.adaptivePollingEnabled,
      },
      "🎯 Starting auto-matchmaking"
    );

    this.isMatchmakingRunning = true;

    // Schedule next matchmaking using setTimeout so interval adapts each cycle
    const scheduleNextMatchmaking = () => {
      if (!this.isMatchmakingRunning) return;
      const interval = this.getCurrentMatchmakingInterval();
      this.matchmakingInterval = setTimeout(() => {
        this.checkForAvailableLobbies()
          .catch((error) => {
            logger.error({ error }, "Matchmaking error");
          })
          .finally(() => {
            scheduleNextMatchmaking();
          });
      }, interval);
    };

    // Do an immediate check, then start the adaptive schedule
    this.checkForAvailableLobbies()
      .catch((error) => {
        logger.error({ error }, "Initial matchmaking check error");
      })
      .finally(() => {
        scheduleNextMatchmaking();
      });
  }

  /**
   * Stop auto-matchmaking
   */
  stopMatchmaking(): void {
    this.isMatchmakingRunning = false;
    if (this.matchmakingInterval) {
      clearTimeout(this.matchmakingInterval);
      this.matchmakingInterval = null;
      logger.debug("Matchmaking stopped");
    }
  }

  // ============================================================================
  // Adaptive Polling Methods
  // ============================================================================

  /**
   * Calculate current polling interval based on adaptive state
   */
  private getCurrentGamePollingInterval(): number {
    if (!this.adaptivePollingEnabled) {
      return this.intervalMs;
    }

    this.updateAdaptiveState("game");
    return Math.round(
      this.adaptivePollingState.game.baseInterval *
        this.adaptivePollingState.game.currentIntervalMultiplier
    );
  }

  /**
   * Calculate current discovery interval based on adaptive state
   */
  private getCurrentDiscoveryInterval(): number {
    if (!this.adaptivePollingEnabled) {
      return this.discoveryIntervalMs;
    }

    this.updateAdaptiveState("discovery");
    return Math.round(
      this.adaptivePollingState.discovery.baseInterval *
        this.adaptivePollingState.discovery.currentIntervalMultiplier
    );
  }

  /**
   * Calculate current matchmaking interval based on adaptive state
   */
  private getCurrentMatchmakingInterval(): number {
    if (!this.adaptivePollingEnabled) {
      return this.matchmakingIntervalMs;
    }

    this.updateAdaptiveState("matchmaking");
    return Math.round(
      this.adaptivePollingState.matchmaking.baseInterval *
        this.adaptivePollingState.matchmaking.currentIntervalMultiplier
    );
  }

  /**
   * Update adaptive polling state based on idle timeout
   */
  private updateAdaptiveState(poolType: "game" | "discovery" | "matchmaking"): void {
    const state = this.adaptivePollingState[poolType];
    const timeSinceActivity = Date.now() - state.lastActivityTime;
    const wasIdle = state.isIdle;

    if (timeSinceActivity > this.idleTimeoutMs) {
      // Idle threshold exceeded - increase polling interval
      if (!state.isIdle) {
        state.isIdle = true;
        if (this.debug) {
          logger.debug(
            { poolType, timeSinceActivityMs: timeSinceActivity, idleTimeoutMs: this.idleTimeoutMs },
            "Polling entered idle mode"
          );
        }
      }

      // Gradually increase multiplier up to max
      const targetMultiplier = Math.min(
        state.currentIntervalMultiplier * this.idleMultiplier,
        this.maxIntervalMultiplier
      );

      state.currentIntervalMultiplier = Math.min(
        state.currentIntervalMultiplier + (this.idleMultiplier - 1) * 0.1,
        targetMultiplier
      );
    } else {
      // Activity detected - reset to normal
      if (wasIdle && state.isIdle) {
        state.isIdle = false;
        state.currentIntervalMultiplier = 1;
        if (this.debug) {
          logger.debug({ poolType }, "Polling exited idle mode - activity detected");
        }
      }
    }
  }

  /**
   * Record activity to reset idle timeout
   */
  private recordActivity(poolType: "game" | "discovery" | "matchmaking"): void {
    this.adaptivePollingState[poolType].lastActivityTime = Date.now();

    // Reset multiplier if transitioning from idle
    if (this.adaptivePollingState[poolType].isIdle) {
      this.adaptivePollingState[poolType].isIdle = false;
      this.adaptivePollingState[poolType].currentIntervalMultiplier = 1;

      if (this.debug) {
        logger.debug({ poolType }, "Activity recorded - resetting polling interval");
      }
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Check for pending games that need the agent's turn
   */
  private async checkForPendingGames(): Promise<void> {
    if (!this.client) {
      logger.warn("Cannot check pending games - API client not initialized");
      return;
    }

    const pendingGames = await this.executeWithRecovery("check_pending_games", async () =>
      this.client?.getPendingTurns()
    );

    if (!pendingGames) {
      // Failed - error recovery handles logging and backoff
      return;
    }

    logger.debug({ count: pendingGames.length }, "Checked for pending games");

    for (const game of pendingGames) {
      // Only start polling if we're not already polling this game
      if (this.currentGameId !== game.gameId) {
        logger.info(
          { gameId: game.gameId, turnNumber: game.turnNumber },
          "Auto-detected game requiring turn"
        );
        this.recordActivity("discovery");
        this.startPollingGame(game.gameId);
        // Only poll one game at a time
        break;
      }
    }
  }

  /**
   * Check for available lobbies and auto-join
   */
  private async checkForAvailableLobbies(): Promise<void> {
    if (!this.client) {
      logger.warn("Cannot check lobbies - API client not initialized");
      return;
    }

    // Don't join new lobbies if already in a game
    if (this.currentGameId) {
      logger.debug("Already in a game, skipping matchmaking");
      return;
    }

    // Get available lobbies with error recovery
    const lobbies = await this.executeWithRecovery("check_lobbies", async () =>
      this.client?.getLobbies("all")
    );

    if (!lobbies) {
      // Failed - error recovery handles logging and backoff
      return;
    }

    // Update last scan timestamp
    this.matchmakingStats.lastScanAt = Date.now();

    // Emit matchmaking scanning event
    await emitLTCGEvent(this.runtime, LTCGEventType.MATCHMAKING_SCANNING, {
      lobbiesFound: lobbies.length,
    });

    logger.debug({ count: lobbies.length }, "Checked for available lobbies");

    if (lobbies.length > 0) {
      // Join the first available lobby
      const lobby = lobbies[0];
      if (!lobby) {
        return;
      }

      logger.info(
        { lobbyId: lobby.lobbyId, host: lobby.hostPlayerName },
        "🎯 Auto-joining available lobby"
      );

      // Get deck ID for joining
      const deckId = await this.getDeckId();
      if (!deckId) {
        logger.warn("No deck available for auto-matchmaking");
        return;
      }

      // Join with error recovery
      const joinResult = await this.executeWithRecovery(`join_lobby_${lobby.lobbyId}`, async () =>
        this.client?.joinLobby({ lobbyId: lobby.lobbyId, deckId })
      );

      if (!joinResult) {
        logger.warn({ lobbyId: lobby.lobbyId }, "Failed to join lobby");
        return;
      }

      logger.info(
        {
          gameId: joinResult.gameId,
          opponent: lobby.hostPlayerName,
        },
        "✅ Successfully joined lobby - game starting!"
      );

      // Emit matchmaking joined event
      await emitLTCGEvent(this.runtime, LTCGEventType.MATCHMAKING_JOINED, {
        gameId: joinResult.gameId,
        lobbyId: lobby.lobbyId,
        opponent: lobby.hostPlayerName,
      });

      // Record activity
      this.recordActivity("matchmaking");

      // Record the join event
      this.matchmakingEvents.push({
        timestamp: Date.now(),
        lobbyId: lobby.lobbyId,
        hostUsername: lobby.hostPlayerName,
        gameId: joinResult.gameId,
      });

      // Update stats
      this.matchmakingStats.lobbiesJoined++;
      this.matchmakingStats.gamesStarted++;

      // Trim event history
      if (this.matchmakingEvents.length > this.maxEventHistory) {
        this.matchmakingEvents.shift();
      }

      // The discovery loop will detect when it's our turn
    }
  }

  /**
   * Poll game state and detect changes
   */
  private async pollGameState(): Promise<void> {
    if (!this.client || !this.currentGameId) {
      return;
    }

    const gameId = this.currentGameId;
    let gameNotFound = false;
    const gameState = await this.executeWithRecovery(
      `poll_game_${gameId}`,
      async () => this.client?.getGameState(gameId),
      {
        silent: true,
        onError: (error) => {
          if (this.isGameNotFoundError(error)) {
            gameNotFound = true;
          }
        },
      }
    );

    if (gameNotFound) {
      const shouldContinueStory = this.shouldAutoContinueStoryGame();
      const previousStreamingSessionId = this.currentStreamingSessionId;
      logger.info({ gameId }, "Game no longer exists, stopping polling and clearing active game");
      // Use last known game state for win detection (LP values)
      await this.handleGameEnd(this.lastKnownGameState);
      this.stopPolling();
      if (shouldContinueStory) {
        await this.continueStoryModeAfterGameEnd({
          reason: "game_not_found",
          previousStreamingSessionId,
        });
      }
      return;
    }

    if (!gameState) {
      // Failed to get game state - error recovery handles logging
      return;
    }

    // Save for win detection when game becomes 404
    this.lastKnownGameState = gameState;

    const newSnapshot = this.createSnapshot(gameState);

    // Detect changes and emit events
    const events = this.detectChanges(this.lastSnapshot, newSnapshot, gameState);

    logger.debug({ gameId: this.currentGameId, eventCount: events.length }, "Polled game state");

    // Record activity if events detected
    if (events.length > 0) {
      this.recordActivity("game");
    }

    for (const event of events) {
      await this.emitEvent(event, gameState);
    }

    this.lastSnapshot = newSnapshot;

    // Check if game ended
    if (gameState.status === "completed") {
      const shouldContinueStory = this.shouldAutoContinueStoryGame();
      const previousStreamingSessionId = this.currentStreamingSessionId;
      logger.info(
        { gameId: this.currentGameId, status: gameState.status },
        "Game ended, stopping polling"
      );
      await this.handleGameEnd(gameState);
      this.stopPolling();
      if (shouldContinueStory) {
        await this.continueStoryModeAfterGameEnd({
          reason: "completed",
          previousStreamingSessionId,
        });
      }
    }
  }

  /**
   * Create a snapshot of game state for comparison
   */
  private createSnapshot(state: GameStateResponse): GameStateSnapshot {
    interface ExtendedGameState extends GameStateResponse {
      chainState?: {
        isWaiting?: boolean;
        [key: string]: boolean | number | string | undefined;
      };
    }
    const extendedState = state as ExtendedGameState;

    return {
      turnNumber: state.turnNumber ?? 0,
      phase: state.phase ?? "",
      currentTurn: state.currentTurn ?? "",
      isChainWaiting: extendedState.chainState?.isWaiting ?? false,
      status: state.status ?? "unknown",
    };
  }

  /**
   * Detect changes between snapshots and return events to emit
   */
  private detectChanges(
    prev: GameStateSnapshot | null,
    curr: GameStateSnapshot,
    fullState: GameStateResponse
  ): Array<{ type: WebhookEventType; data: GameWebhookPayload["data"] }> {
    const events: Array<{ type: WebhookEventType; data: GameWebhookPayload["data"] }> = [];

    // First poll - game started
    if (prev === null) {
      events.push({
        type: "game_started",
        data: { phase: curr.phase, turnNumber: curr.turnNumber },
      });

      // If it's our turn, also emit turn_started
      if (this.isAgentTurn(fullState)) {
        events.push({
          type: "turn_started",
          data: { phase: curr.phase, turnNumber: curr.turnNumber },
        });
      }

      return events;
    }

    // Game ended
    if (prev.status !== "completed" && curr.status === "completed") {
      interface ExtendedGameState extends GameStateResponse {
        endReason?: string;
        [key: string]: string | number | boolean | undefined | unknown;
      }
      const extendedState = fullState as ExtendedGameState;
      const agentWon = this.didAgentWin(fullState);
      events.push({
        type: "game_ended",
        data: {
          gameResult: {
            winner: agentWon ? "agent" : "opponent",
            reason: extendedState.endReason ?? "unknown",
          },
        },
      });
      return events;
    }

    // Turn changed
    if (prev.turnNumber !== curr.turnNumber || prev.currentTurn !== curr.currentTurn) {
      if (this.isAgentTurn(fullState)) {
        events.push({
          type: "turn_started",
          data: { phase: curr.phase, turnNumber: curr.turnNumber },
        });
      } else {
        // Opponent's turn started - they took an action
        events.push({
          type: "opponent_action",
          data: {
            opponentAction: {
              type: "turn_passed",
              description: "Opponent ended their turn",
            },
          },
        });
      }
    }

    // Phase changed
    if (prev.phase !== curr.phase) {
      events.push({
        type: "phase_changed",
        data: { phase: curr.phase, turnNumber: curr.turnNumber },
      });
    }

    // Chain waiting
    if (!prev.isChainWaiting && curr.isChainWaiting) {
      interface ExtendedGameState extends GameStateResponse {
        chainState?: {
          timeoutMs?: number;
          isWaiting?: boolean;
          [key: string]: number | boolean | undefined;
        };
      }
      const extendedState = fullState as ExtendedGameState;

      events.push({
        type: "chain_waiting",
        data: {
          chainState: {
            isWaiting: true,
            timeoutMs: extendedState.chainState?.timeoutMs ?? 30000,
          },
        },
      });
    }

    return events;
  }

  /**
   * Check if it's the agent's turn
   */
  private isAgentTurn(state: GameStateResponse): boolean {
    // Use the API's isMyTurn field which correctly identifies whose turn it is
    // regardless of whether agent is host or opponent
    return state.isMyTurn === true;
  }

  /**
   * Check if agent won the game
   */
  private didAgentWin(state: GameStateResponse): boolean {
    // Check explicit winner field if present
    interface ExtendedGameState extends GameStateResponse {
      winner?: string;
      [key: string]: string | number | boolean | undefined | unknown;
    }
    const extState = state as ExtendedGameState;
    if (extState.winner) {
      const agentPlayerId = state.myPlayerId ?? state.hostPlayer?.playerId;
      return extState.winner === agentPlayerId;
    }

    // Fallback: compare life points — agent wins if opponent LP is 0
    if (state.opponentLifePoints !== undefined && state.myLifePoints !== undefined) {
      if (state.opponentLifePoints <= 0 && state.myLifePoints > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Emit an event using the webhook handler
   */
  private async emitEvent(
    event: { type: WebhookEventType; data: GameWebhookPayload["data"] },
    _fullState: GameStateResponse
  ): Promise<void> {
    if (!this.currentGameId) return;

    const agentId = this.runtime.getSetting("LTCG_AGENT_ID") as string;

    const payload: GameWebhookPayload = {
      eventType: event.type,
      gameId: this.currentGameId,
      agentId: agentId ?? "unknown",
      timestamp: Date.now(),
      signature: "polling_generated",
      data: event.data,
    };

    logger.info({ eventType: event.type, gameId: this.currentGameId }, "Polling detected event");

    // Create a state object for the handler with required State interface properties
    const state = {
      values: {},
      data: {},
      text: "",
    };

    try {
      await handleGameWebhook(payload, this.runtime, state);
    } catch (error) {
      logger.error({ error, eventType: event.type }, "Error handling polled event");
    }

    // Trigger TurnOrchestrator for autonomous gameplay
    await this.triggerOrchestrator(event, _fullState);
  }

  /**
   * Trigger the TurnOrchestrator for autonomous gameplay
   * Uses lazy service lookup to avoid circular dependencies
   */
  private async triggerOrchestrator(
    event: { type: WebhookEventType; data: GameWebhookPayload["data"] },
    fullState: GameStateResponse
  ): Promise<void> {
    if (!this.currentGameId) return;

    // Get the orchestrator service via runtime lookup (avoids circular import)
    const orchestrator = this.runtime.getService(
      SERVICE_TYPES.ORCHESTRATOR
    ) as ITurnOrchestrator | null;
    if (!orchestrator) {
      logger.warn("TurnOrchestrator not available via runtime.getService, skipping autonomous action");
      return;
    }

    try {
      switch (event.type) {
        case "turn_started":
          logger.info({ gameId: this.currentGameId, phase: fullState.phase, turnNumber: fullState.turnNumber }, "Triggering TurnOrchestrator.onTurnStarted");
          await orchestrator.onTurnStarted(
            this.currentGameId,
            fullState.phase,
            fullState.turnNumber
          );
          break;

        case "chain_waiting": {
          const chainData = event.data as { chainState?: { timeoutMs?: number } };
          await orchestrator.onChainWaiting(
            this.currentGameId,
            chainData.chainState?.timeoutMs ?? 30000
          );
          break;
        }
      }
    } catch (error) {
      logger.error({ error, eventType: event.type }, "Error triggering orchestrator");
    }
  }

  // ============================================================================
  // Error Recovery Methods
  // ============================================================================

  /**
   * Get or create a circuit breaker for an operation
   */
  private getCircuitBreaker(operationName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(operationName, {
        state: "closed",
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
      });
    }
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) {
      throw new Error(`Circuit breaker for ${operationName} not found after initialization`);
    }
    return breaker;
  }

  /**
   * Check if an operation should be allowed by the circuit breaker
   */
  private isCircuitOpen(operationName: string): boolean {
    const breaker = this.getCircuitBreaker(operationName);

    if (breaker.state === "open") {
      // Check if enough time has passed to try again (half-open)
      const timeSinceFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceFailure >= this.errorRecovery.circuitBreakerResetMs) {
        breaker.state = "half-open";
        breaker.successCount = 0;
        logger.info({ operationName }, "Circuit breaker moving to half-open state");
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record a successful operation for the circuit breaker
   */
  private recordSuccess(operationName: string): void {
    const breaker = this.getCircuitBreaker(operationName);

    if (breaker.state === "half-open") {
      breaker.successCount++;
      // After 3 successful calls, close the circuit
      if (breaker.successCount >= 3) {
        breaker.state = "closed";
        breaker.failureCount = 0;
        logger.info({ operationName }, "Circuit breaker closed after successful recovery");
      }
    } else {
      breaker.failureCount = 0;
    }

    // Reset retry delay on success
    this.retryDelays.delete(operationName);
  }

  /**
   * Record a failed operation for the circuit breaker
   */
  private recordFailure(operationName: string): void {
    const breaker = this.getCircuitBreaker(operationName);
    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    if (breaker.state === "half-open") {
      // Failed during half-open, go back to open
      breaker.state = "open";
      logger.warn(
        { operationName, failureCount: breaker.failureCount },
        "Circuit breaker re-opened after half-open failure"
      );
    } else if (breaker.failureCount >= this.errorRecovery.circuitBreakerThreshold) {
      breaker.state = "open";
      logger.warn(
        { operationName, failureCount: breaker.failureCount },
        "Circuit breaker opened due to repeated failures"
      );
    }
  }

  /**
   * Get the current retry delay for an operation (exponential backoff)
   */
  private getRetryDelay(operationName: string): number {
    const currentDelay = this.retryDelays.get(operationName) ?? this.errorRecovery.baseDelayMs;
    // Exponential backoff with jitter
    const nextDelay = Math.min(
      currentDelay * 2 + Math.random() * 500,
      this.errorRecovery.maxDelayMs
    );
    this.retryDelays.set(operationName, nextDelay);
    return currentDelay;
  }

  /**
   * Execute an operation with error recovery (circuit breaker + exponential backoff)
   */
  private async executeWithRecovery<T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: { silent?: boolean; onError?: (error: unknown) => void }
  ): Promise<T | null> {
    // Check circuit breaker
    if (this.isCircuitOpen(operationName)) {
      if (!options?.silent) {
        logger.debug({ operationName }, "Circuit breaker open, skipping operation");
      }
      return null;
    }

    try {
      const result = await operation();
      this.recordSuccess(operationName);
      return result;
    } catch (error) {
      options?.onError?.(error);
      this.recordFailure(operationName);
      const delay = this.getRetryDelay(operationName);

      if (!options?.silent) {
        logger.warn(
          { error, operationName, nextRetryDelayMs: delay },
          "Operation failed, will retry with backoff"
        );
      }

      return null;
    }
  }

  private isGameNotFoundError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /game[_\s-]?not[_\s-]?found/i.test(message);
  }

  /**
   * Get health status of the service
   */
  getHealthStatus(): {
    isHealthy: boolean;
    circuitBreakers: Record<string, { state: CircuitState; failureCount: number }>;
    isPolling: boolean;
    currentGameId: string | null;
  } {
    const breakers: Record<string, { state: CircuitState; failureCount: number }> = {};

    for (const [name, breaker] of this.circuitBreakers) {
      breakers[name] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
      };
    }

    // Service is healthy if no circuits are open
    const hasOpenCircuit = Array.from(this.circuitBreakers.values()).some(
      (b) => b.state === "open"
    );

    return {
      isHealthy: !hasOpenCircuit,
      circuitBreakers: breakers,
      isPolling: this.isPolling,
      currentGameId: this.currentGameId,
    };
  }
}
