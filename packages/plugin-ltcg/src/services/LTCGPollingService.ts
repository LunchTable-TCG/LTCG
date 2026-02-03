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
import type { MatchmakingEvent, MatchmakingStatus } from "../frontend/types/panel";
import type { GameStateResponse } from "../types/api";
import {
  type GameWebhookPayload,
  type WebhookEventType,
  handleGameWebhook,
} from "../webhooks/gameEventHandler";
import { type ITurnOrchestrator, SERVICE_TYPES } from "./types";

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
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private discoveryInterval: ReturnType<typeof setInterval> | null = null;
  private matchmakingInterval: ReturnType<typeof setInterval> | null = null;
  private currentGameId: string | null = null;
  private lastSnapshot: GameStateSnapshot | null = null;
  private intervalMs: number;
  private discoveryIntervalMs: number;
  private matchmakingIntervalMs: number;
  private autoMatchmaking: boolean;
  private debug: boolean;
  private isPolling = false;

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
    const callbackUrl = runtime.getSetting("LTCG_CALLBACK_URL");
    const debugMode = runtime.getSetting("LTCG_DEBUG_MODE") === "true";
    // LTCG_AUTO_MATCHMAKING is already transformed to boolean by config schema
    const autoMatchmaking = runtime.getSetting("LTCG_AUTO_MATCHMAKING") === "true";

    // Load polling intervals from environment variables
    const pollIntervalMs =
      Number.parseInt(runtime.getSetting("LTCG_POLL_INTERVAL_MS") as string) || 1500;
    const discoveryIntervalMs =
      Number.parseInt(runtime.getSetting("LTCG_DISCOVERY_INTERVAL_MS") as string) || 5000;
    const matchmakingIntervalMs =
      Number.parseInt(runtime.getSetting("LTCG_MATCHMAKING_INTERVAL_MS") as string) || 10000;
    const adaptivePolling = runtime.getSetting("LTCG_ADAPTIVE_POLLING") !== "false";
    const idleTimeoutMs =
      Number.parseInt(runtime.getSetting("LTCG_IDLE_TIMEOUT_MS") as string) || 30000;
    const idleMultiplier =
      Number.parseFloat(runtime.getSetting("LTCG_IDLE_MULTIPLIER") as string) || 1.5;
    const maxIntervalMultiplier =
      Number.parseInt(runtime.getSetting("LTCG_MAX_INTERVAL_MULTIPLIER") as string) || 5;

    logger.debug(
      {
        autoMatchmakingSetting: runtime.getSetting("LTCG_AUTO_MATCHMAKING"),
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
    });

    // Initialize API client
    const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
    const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

    if (apiKey && apiUrl) {
      service.client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
        debug: debugMode,
      });
      logger.info("Polling service initialized with API client");

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
    this.stopPolling();
    this.stopDiscovery();
    this.stopMatchmaking();
    this.client = null;
    // Clear circuit breaker and retry state to prevent memory leaks
    this.circuitBreakers.clear();
    this.retryDelays.clear();
    logger.info("Polling service stopped");
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start polling for a specific game
   */
  startPollingGame(gameId: string): void {
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

    // Start polling loop with adaptive intervals
    this.pollingInterval = setInterval(() => {
      this.pollGameState().catch((error) => {
        logger.error({ error, gameId }, "Polling error");
      });
    }, this.getCurrentGamePollingInterval());

    // Do an immediate poll
    this.pollGameState().catch((error) => {
      logger.error({ error, gameId }, "Initial poll error");
    });
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    this.currentGameId = null;
    this.lastSnapshot = null;

    if (this.debug) {
      logger.debug("Polling stopped");
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
        isDiscoveryRunning: this.discoveryInterval !== null,
        isMatchmakingRunning: this.matchmakingInterval !== null,
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
      nextScanIn: this.matchmakingInterval ? this.matchmakingIntervalMs : 0,
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

    if (this.discoveryInterval) {
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

    // Start discovery loop with adaptive intervals
    this.discoveryInterval = setInterval(() => {
      this.checkForPendingGames().catch((error) => {
        logger.error({ error }, "Discovery error");
      });
    }, this.getCurrentDiscoveryInterval());

    // Do an immediate check
    this.checkForPendingGames().catch((error) => {
      logger.error({ error }, "Initial discovery error");
    });
  }

  /**
   * Stop auto-discovery
   */
  stopDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
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

    if (this.matchmakingInterval) {
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

    // Start matchmaking loop with adaptive intervals
    this.matchmakingInterval = setInterval(() => {
      this.checkForAvailableLobbies().catch((error) => {
        logger.error({ error }, "Matchmaking error");
      });
    }, this.getCurrentMatchmakingInterval());

    // Do an immediate check
    this.checkForAvailableLobbies().catch((error) => {
      logger.error({ error }, "Initial matchmaking check error");
    });
  }

  /**
   * Stop auto-matchmaking
   */
  stopMatchmaking(): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
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
    const gameState = await this.executeWithRecovery(
      `poll_game_${gameId}`,
      async () => this.client?.getGameState(gameId),
      { silent: true }
    );

    if (!gameState) {
      // Failed to get game state - error recovery handles logging
      return;
    }

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
      logger.info(
        { gameId: this.currentGameId, status: gameState.status },
        "Game ended, stopping polling"
      );
      this.stopPolling();
    }
  }

  /**
   * Create a snapshot of game state for comparison
   */
  private createSnapshot(state: GameStateResponse): GameStateSnapshot {
    return {
      turnNumber: state.turnNumber ?? 0,
      phase: state.phase ?? "",
      currentTurn: state.currentTurn ?? "",
      // biome-ignore lint/suspicious/noExplicitAny: Extended state property access
      isChainWaiting: (state as any).chainState?.isWaiting ?? false,
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
      const agentWon = this.didAgentWin(fullState);
      events.push({
        type: "game_ended",
        data: {
          gameResult: {
            winner: agentWon ? "agent" : "opponent",
            // biome-ignore lint/suspicious/noExplicitAny: Extended state property access
            reason: (fullState as any).endReason ?? "unknown",
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
      events.push({
        type: "chain_waiting",
        data: {
          chainState: {
            isWaiting: true,
            // biome-ignore lint/suspicious/noExplicitAny: Extended state property access
            timeoutMs: (fullState as any).chainState?.timeoutMs ?? 30000,
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
    // Check extended state for winner info
    // biome-ignore lint/suspicious/noExplicitAny: Extended state property access
    const extState = state as any;
    if (extState.winner) {
      const agentPlayerId = state.hostPlayer?.playerId;
      return extState.winner === agentPlayerId;
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

    // Create a state object for the handler
    const state = {
      values: {} as Record<string, unknown>,
    };

    try {
      // biome-ignore lint/suspicious/noExplicitAny: Webhook handler expects flexible state type
      await handleGameWebhook(payload, this.runtime, state as any);
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
      if (this.debug) {
        logger.debug("TurnOrchestrator not available, skipping autonomous action");
      }
      return;
    }

    try {
      switch (event.type) {
        case "turn_started":
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
    return this.circuitBreakers.get(operationName)!;
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
    options?: { silent?: boolean }
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
