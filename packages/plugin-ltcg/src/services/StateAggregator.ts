/**
 * State Aggregator Service
 *
 * Aggregates data from all LTCG services into API-friendly formats.
 * This service collects state from LTCGPollingService, TurnOrchestrator,
 * and LTCGApiClient to provide a unified view of agent state for the UI panels.
 */

import { type IAgentRuntime, Service, logger } from "@elizaos/core";
import { ConvexHttpClient } from "convex/browser";
import type {
  AgentMetrics,
  AgentStatus,
  Decision,
  GameSnapshot,
  MatchmakingStatus,
} from "../frontend/types/panel";
import type { GameStateResponse } from "../types/api";
import { type IPollingService, type ITurnOrchestrator, SERVICE_TYPES } from "./types";

interface CachedGameState {
  gameState: GameStateResponse;
  timestamp: number;
}

interface CacheStats {
  gameState: { hits: number; misses: number };
  matchmaking: { hits: number; misses: number };
  metrics: { hits: number; misses: number };
}

interface DataTypeTTLConfig {
  gameState: number; // 2 seconds (more real-time)
  matchmaking: number; // 5 seconds
  metrics: number; // 10 seconds (less frequently updated)
}

export class StateAggregator extends Service {
  static serviceType = SERVICE_TYPES.STATE_AGGREGATOR;

  private runtime: IAgentRuntime | null = null;
  private pollingService: IPollingService | null = null;
  private orchestrator: ITurnOrchestrator | null = null;
  private convexClient: ConvexHttpClient | null = null;

  // Cache layers
  private gameStateCache = new Map<string, CachedGameState>();
  private matchmakingCache: { status: MatchmakingStatus; timestamp: number } | null = null;
  private metricsCache: { metrics: AgentMetrics; timestamp: number } | null = null;

  // Cache TTL configuration (in milliseconds)
  private ttlConfig!: DataTypeTTLConfig;
  private cacheStats: CacheStats = {
    gameState: { hits: 0, misses: 0 },
    matchmaking: { hits: 0, misses: 0 },
    metrics: { hits: 0, misses: 0 },
  };

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info("*** Initializing State Aggregator Service ***");

    this.runtime = runtime;

    // Initialize TTL configuration from environment or defaults
    this.ttlConfig = this.initializeTTLConfig(runtime);
    logger.info(
      `Cache TTL configured - gameState: ${this.ttlConfig.gameState}ms, ` +
        `matchmaking: ${this.ttlConfig.matchmaking}ms, metrics: ${this.ttlConfig.metrics}ms`
    );

    // Initialize Convex client
    const convexUrl = runtime.getSetting("CONVEX_URL") as string | undefined;
    if (convexUrl) {
      this.convexClient = new ConvexHttpClient(convexUrl);
      logger.info("Convex client initialized for State Aggregator");
    } else {
      logger.warn("CONVEX_URL not found - metrics will be limited");
    }

    logger.info("State Aggregator initialized successfully");
    // Note: Service references (pollingService, orchestrator) are retrieved lazily when needed
  }

  /**
   * Stop and cleanup the service
   */
  async stop(): Promise<void> {
    logger.info("*** Stopping State Aggregator Service ***");
    // Clear all caches to prevent memory leaks
    this.gameStateCache.clear();
    this.matchmakingCache = null;
    this.metricsCache = null;
    this.pollingService = null;
    this.orchestrator = null;
    this.runtime = null;
    logger.info("State Aggregator stopped");
  }

  /**
   * Initialize TTL configuration from environment variables or use defaults
   */
  private initializeTTLConfig(runtime: IAgentRuntime): DataTypeTTLConfig {
    return {
      gameState:
        Number.parseInt(runtime.getSetting("LTCG_CACHE_TTL_GAME_STATE_MS") as string) || 2000,
      matchmaking:
        Number.parseInt(runtime.getSetting("LTCG_CACHE_TTL_MATCHMAKING_MS") as string) || 5000,
      metrics: Number.parseInt(runtime.getSetting("LTCG_CACHE_TTL_METRICS_MS") as string) || 10000,
    };
  }

  /**
   * Lazy-load polling service reference
   * Uses SERVICE_TYPES constant to avoid hardcoded strings
   */
  private getPollingService(): IPollingService | null {
    if (!this.pollingService && this.runtime) {
      try {
        this.pollingService = this.runtime.getService(SERVICE_TYPES.POLLING) as IPollingService;
      } catch (_error) {
        // Service not available yet
      }
    }
    return this.pollingService;
  }

  /**
   * Lazy-load orchestrator service reference
   * Uses SERVICE_TYPES constant to avoid hardcoded strings
   */
  private getOrchestrator(): ITurnOrchestrator | null {
    if (!this.orchestrator && this.runtime) {
      try {
        this.orchestrator = this.runtime.getService(
          SERVICE_TYPES.ORCHESTRATOR
        ) as ITurnOrchestrator;
      } catch (_error) {
        // Service not available yet
      }
    }
    return this.orchestrator;
  }

  /**
   * Get overall agent status
   */
  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    const pollingService = this.getPollingService();
    if (!pollingService) {
      throw new Error("Polling service not available");
    }

    return {
      agentId,
      isRunning: true,
      pollingActive: pollingService.isActive(),
      currentGameId: pollingService.getCurrentGameId(),
      autoMatchmaking: pollingService.isMatchmakingEnabled(),
      uptime: process.uptime() * 1000,
      lastActivity: Date.now(),
    };
  }

  /**
   * Get matchmaking status and recent events
   */
  async getMatchmakingStatus(_agentId: string): Promise<MatchmakingStatus> {
    // Check cache first
    if (
      this.matchmakingCache &&
      Date.now() - this.matchmakingCache.timestamp < this.ttlConfig.matchmaking
    ) {
      this.cacheStats.matchmaking.hits++;
      return this.matchmakingCache.status;
    }

    this.cacheStats.matchmaking.misses++;

    const pollingService = this.getPollingService();
    if (!pollingService) {
      throw new Error("Polling service not available");
    }

    const status = pollingService.getMatchmakingStatus();

    // Cache the result
    this.matchmakingCache = {
      status,
      timestamp: Date.now(),
    };

    return status;
  }

  /**
   * Get current game state snapshot
   */
  async getGameState(_agentId: string, gameId: string): Promise<GameSnapshot> {
    // Check cache first
    const cached = this.gameStateCache.get(gameId);
    if (cached && Date.now() - cached.timestamp < this.ttlConfig.gameState) {
      this.cacheStats.gameState.hits++;
      return this.transformGameState(cached.gameState, gameId);
    }

    this.cacheStats.gameState.misses++;

    // Fetch fresh state from API client if available
    const pollingService = this.getPollingService();
    if (pollingService) {
      const client = pollingService.getClient();
      if (!client) {
        throw new Error("API client not available");
      }
      const gameState = await client.getGameState(gameId);

      // Cache the result
      this.gameStateCache.set(gameId, {
        gameState,
        timestamp: Date.now(),
      });

      return this.transformGameState(gameState, gameId);
    }

    throw new Error("Game state unavailable - API client not initialized");
  }

  /**
   * Get decision history for a game
   */
  async getDecisionHistory(
    _agentId: string,
    gameId: string,
    limit = 20
  ): Promise<{ decisions: Decision[] }> {
    const orchestrator = this.getOrchestrator();
    if (!orchestrator) {
      return { decisions: [] };
    }

    const decisions = orchestrator.getDecisionHistory(gameId, limit);
    return { decisions };
  }

  /**
   * Get performance metrics
   */
  async getMetrics(_agentId: string): Promise<AgentMetrics> {
    // Check cache first
    if (this.metricsCache && Date.now() - this.metricsCache.timestamp < this.ttlConfig.metrics) {
      this.cacheStats.metrics.hits++;
      return this.metricsCache.metrics;
    }

    this.cacheStats.metrics.misses++;

    // Collect metrics from various sources
    const metrics: AgentMetrics = {
      lifetime: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
      },
      performance: {
        avgTurnTimeMs: 0,
        avgActionsPerTurn: 0,
        apiCallCount: 0,
        apiErrorRate: 0,
      },
      recentGames: [],
    };

    try {
      // Get real match history from Convex if available
      if (this.convexClient && this.runtime) {
        const userId = this.runtime.getSetting("LTCG_USER_ID") as string | undefined;

        if (userId) {
          try {
            // Query match history from Convex
            // Using string path to avoid importing from convex directory
            const matchHistory: any = await this.convexClient.query(
              "progression/matchHistory:getMatchHistory" as any,
              { limit: 50 }
            );

            if (matchHistory && Array.isArray(matchHistory)) {
              // Calculate lifetime stats from real data
              metrics.lifetime.gamesPlayed = matchHistory.length;
              metrics.lifetime.wins = matchHistory.filter(
                (m: any) => m.result === "victory"
              ).length;
              metrics.lifetime.losses = matchHistory.filter(
                (m: any) => m.result === "defeat"
              ).length;
              metrics.lifetime.winRate =
                metrics.lifetime.gamesPlayed > 0
                  ? metrics.lifetime.wins / metrics.lifetime.gamesPlayed
                  : 0;

              // Map to recent games format
              metrics.recentGames = matchHistory.slice(0, 10).map((match: any) => ({
                gameId: String(match.id || "unknown"),
                timestamp: match.timestamp || Date.now(),
                result: match.result === "victory" ? ("win" as const) : ("loss" as const),
                duration: 0, // Not available in match history
                turns: 0, // Not available in match history
              }));

              logger.info(`Fetched ${matchHistory.length} matches from Convex for metrics`);
            }
          } catch (convexError) {
            logger.warn({ convexError }, "Failed to fetch match history from Convex");
            // Fall back to matchmaking stats
          }
        } else {
          logger.warn("LTCG_USER_ID not found - cannot fetch match history");
        }
      }

      // Fallback: Get stats from matchmaking events if Convex data unavailable
      const pollingService = this.getPollingService();
      if (metrics.lifetime.gamesPlayed === 0 && pollingService) {
        const matchmakingStatus = pollingService.getMatchmakingStatus();
        metrics.lifetime.gamesPlayed = matchmakingStatus.stats.gamesStarted;

        // Placeholder win/loss calculation when no real data
        if (metrics.lifetime.gamesPlayed > 0) {
          metrics.lifetime.wins = Math.floor(metrics.lifetime.gamesPlayed * 0.5);
          metrics.lifetime.losses = metrics.lifetime.gamesPlayed - metrics.lifetime.wins;
          metrics.lifetime.winRate = 0.5;
        }
      }

      // Get decision history to calculate performance metrics
      const orchestrator = this.getOrchestrator();
      if (orchestrator && pollingService) {
        const currentGameId = pollingService.getCurrentGameId();
        if (currentGameId) {
          const decisions = orchestrator.getDecisionHistory(currentGameId, 100);

          if (decisions.length > 0) {
            // Calculate average turn execution time
            const totalTime = decisions.reduce((sum, d) => sum + d.executionTimeMs, 0);
            metrics.performance.avgTurnTimeMs = Math.round(totalTime / decisions.length);

            // Calculate average actions per turn
            const turnCounts = new Map<number, number>();
            decisions.forEach((d) => {
              turnCounts.set(d.turnNumber, (turnCounts.get(d.turnNumber) || 0) + 1);
            });
            const avgActions =
              Array.from(turnCounts.values()).reduce((sum, count) => sum + count, 0) /
              turnCounts.size;
            metrics.performance.avgActionsPerTurn = Math.round(avgActions * 10) / 10; // Round to 1 decimal
          }
        }
      }

      // Cache the result
      this.metricsCache = {
        metrics,
        timestamp: Date.now(),
      };

      return metrics;
    } catch (error) {
      logger.error({ error }, "Error collecting metrics");
      return metrics; // Return default metrics on error
    }
  }

  /**
   * Transform API game state into dashboard-friendly snapshot
   */
  private transformGameState(gameState: GameStateResponse, gameId: string): GameSnapshot {
    // Count monsters and spell/traps from board arrays
    const myMonsters = (gameState.myBoard || []).filter(
      (card) => card.cardType === "creature"
    ).length;
    const mySpellTraps = (gameState.myBoard || []).filter(
      (card) =>
        card.cardType === "spell" || card.cardType === "trap" || card.cardType === "equipment"
    ).length;
    const opponentMonsters = (gameState.opponentBoard || []).filter(
      (card) => card.cardType === "creature"
    ).length;
    const opponentSpellTraps = (gameState.opponentBoard || []).filter(
      (card) =>
        card.cardType === "spell" || card.cardType === "trap" || card.cardType === "equipment"
    ).length;

    // Map cardType to panel-friendly types
    const mapCardType = (cardType: string): "monster" | "spell" | "trap" => {
      if (cardType === "creature") return "monster";
      if (cardType === "spell" || cardType === "equipment") return "spell";
      if (cardType === "trap") return "trap";
      return "spell"; // default
    };

    return {
      gameId,
      phase: gameState.phase || "unknown",
      turnNumber: gameState.turnNumber || 0,
      isMyTurn: gameState.isMyTurn || false,
      lifePoints: {
        agent: gameState.myLifePoints || 0,
        opponent: gameState.opponentLifePoints || 0,
      },
      board: {
        agentMonsters: myMonsters,
        agentSpellTraps: mySpellTraps,
        opponentMonsters: opponentMonsters,
        opponentSpellTraps: opponentSpellTraps,
      },
      hand: {
        count: gameState.hand?.length || 0,
        cards: (gameState.hand || []).map((card) => ({
          type: mapCardType(card.cardType || "spell"),
          name: card.name || "Unknown Card",
        })),
      },
      status: gameState.status || "waiting",
      winner: this.determineWinner(gameState),
    };
  }

  /**
   * Determine winner from game state
   */
  private determineWinner(gameState: GameStateResponse): "agent" | "opponent" | undefined {
    if (gameState.status !== "completed") {
      return undefined;
    }

    // Determine winner based on life points
    if (gameState.myLifePoints <= 0) {
      return "opponent";
    }
    if (gameState.opponentLifePoints <= 0) {
      return "agent";
    }

    return undefined;
  }

  /**
   * Invalidate cache for a specific game when events occur
   * Call this method when significant game state changes happen
   */
  invalidateGameStateCache(gameId: string): void {
    if (this.gameStateCache.has(gameId)) {
      this.gameStateCache.delete(gameId);
      logger.info(`Game state cache invalidated for gameId: ${gameId}`);
    }
  }

  /**
   * Invalidate matchmaking cache
   * Call this method when matchmaking status changes
   */
  invalidateMatchmakingCache(): void {
    if (this.matchmakingCache) {
      this.matchmakingCache = null;
      logger.info("Matchmaking cache invalidated");
    }
  }

  /**
   * Invalidate metrics cache
   * Call this method when agent metrics significantly change
   */
  invalidateMetricsCache(): void {
    if (this.metricsCache) {
      this.metricsCache = null;
      logger.info("Metrics cache invalidated");
    }
  }

  /**
   * Invalidate all caches
   * Useful for testing or when state needs full refresh
   */
  invalidateAllCaches(): void {
    this.gameStateCache.clear();
    this.matchmakingCache = null;
    this.metricsCache = null;
    logger.info("All caches invalidated");
  }

  /**
   * Get cache statistics for debugging and monitoring
   * Returns hit/miss rates for each cache type
   */
  getCacheStats(): {
    stats: CacheStats;
    hitRates: {
      gameState: string;
      matchmaking: string;
      metrics: string;
    };
    config: DataTypeTTLConfig;
  } {
    const calculateHitRate = (hits: number, misses: number): string => {
      const total = hits + misses;
      if (total === 0) return "N/A";
      const rate = ((hits / total) * 100).toFixed(2);
      return `${rate}% (${hits}/${total})`;
    };

    return {
      stats: this.cacheStats,
      hitRates: {
        gameState: calculateHitRate(
          this.cacheStats.gameState.hits,
          this.cacheStats.gameState.misses
        ),
        matchmaking: calculateHitRate(
          this.cacheStats.matchmaking.hits,
          this.cacheStats.matchmaking.misses
        ),
        metrics: calculateHitRate(this.cacheStats.metrics.hits, this.cacheStats.metrics.misses),
      },
      config: this.ttlConfig,
    };
  }

  /**
   * Reset cache statistics (useful for performance testing)
   */
  resetCacheStats(): void {
    this.cacheStats = {
      gameState: { hits: 0, misses: 0 },
      matchmaking: { hits: 0, misses: 0 },
      metrics: { hits: 0, misses: 0 },
    };
    logger.info("Cache statistics reset");
  }

  /**
   * Update cache TTL configuration at runtime
   * Useful for performance tuning without restart
   */
  updateTTLConfig(newConfig: Partial<DataTypeTTLConfig>): void {
    this.ttlConfig = {
      ...this.ttlConfig,
      ...newConfig,
    };
    logger.info(
      `Cache TTL updated - gameState: ${this.ttlConfig.gameState}ms, ` +
        `matchmaking: ${this.ttlConfig.matchmaking}ms, metrics: ${this.ttlConfig.metrics}ms`
    );
  }
}
