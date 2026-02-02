/**
 * State Aggregator Service
 *
 * Aggregates data from all LTCG services into API-friendly formats.
 * This service collects state from LTCGPollingService, TurnOrchestrator,
 * and LTCGApiClient to provide a unified view of agent state for the UI panels.
 */

import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { ConvexHttpClient } from 'convex/browser';
import {
  SERVICE_TYPES,
  type IPollingService,
  type ITurnOrchestrator,
} from './types';
import type {
  AgentStatus,
  MatchmakingStatus,
  GameSnapshot,
  Decision,
  AgentMetrics,
} from '../frontend/types/panel';
import type { GameStateResponse } from '../types/api';

interface CachedGameState {
  gameState: GameStateResponse;
  timestamp: number;
}

export class StateAggregator extends Service {
  static serviceType = SERVICE_TYPES.STATE_AGGREGATOR;

  private runtime: IAgentRuntime | null = null;
  private pollingService: IPollingService | null = null;
  private orchestrator: ITurnOrchestrator | null = null;
  private convexClient: ConvexHttpClient | null = null;

  // Cache layers
  private gameStateCache = new Map<string, CachedGameState>();
  private readonly CACHE_TTL = 5000; // 5 seconds

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info('*** Initializing State Aggregator Service ***');

    this.runtime = runtime;

    // Initialize Convex client
    const convexUrl = runtime.getSetting('CONVEX_URL') as string | undefined;
    if (convexUrl) {
      this.convexClient = new ConvexHttpClient(convexUrl);
      logger.info('Convex client initialized for State Aggregator');
    } else {
      logger.warn('CONVEX_URL not found - metrics will be limited');
    }

    logger.info('State Aggregator initialized successfully');
    // Note: Service references (pollingService, orchestrator) are retrieved lazily when needed
  }

  /**
   * Lazy-load polling service reference
   * Uses SERVICE_TYPES constant to avoid hardcoded strings
   */
  private getPollingService(): IPollingService | null {
    if (!this.pollingService && this.runtime) {
      try {
        this.pollingService = this.runtime.getService(SERVICE_TYPES.POLLING) as IPollingService;
      } catch (error) {
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
        this.orchestrator = this.runtime.getService(SERVICE_TYPES.ORCHESTRATOR) as ITurnOrchestrator;
      } catch (error) {
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
      throw new Error('Polling service not available');
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
  async getMatchmakingStatus(agentId: string): Promise<MatchmakingStatus> {
    const pollingService = this.getPollingService();
    if (!pollingService) {
      throw new Error('Polling service not available');
    }

    return pollingService.getMatchmakingStatus();
  }

  /**
   * Get current game state snapshot
   */
  async getGameState(agentId: string, gameId: string): Promise<GameSnapshot> {
    // Check cache first
    const cached = this.gameStateCache.get(gameId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return this.transformGameState(cached.gameState, gameId);
    }

    // Fetch fresh state from API client if available
    const pollingService = this.getPollingService();
    if (pollingService) {
      const client = pollingService.getClient();
      if (!client) {
        throw new Error('API client not available');
      }
      const gameState = await client.getGameState(gameId);

      // Cache the result
      this.gameStateCache.set(gameId, {
        gameState,
        timestamp: Date.now(),
      });

      return this.transformGameState(gameState, gameId);
    }

    throw new Error('Game state unavailable - API client not initialized');
  }

  /**
   * Get decision history for a game
   */
  async getDecisionHistory(
    agentId: string,
    gameId: string,
    limit: number = 20
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
  async getMetrics(agentId: string): Promise<AgentMetrics> {
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
        const userId = this.runtime.getSetting('LTCG_USER_ID') as string | undefined;

        if (userId) {
          try {
            // Query match history from Convex
            // Using string path to avoid importing from convex directory
            const matchHistory: any = await this.convexClient.query(
              'progression/matchHistory:getMatchHistory' as any,
              { limit: 50 }
            );

            if (matchHistory && Array.isArray(matchHistory)) {
              // Calculate lifetime stats from real data
              metrics.lifetime.gamesPlayed = matchHistory.length;
              metrics.lifetime.wins = matchHistory.filter((m: any) => m.result === 'victory').length;
              metrics.lifetime.losses = matchHistory.filter((m: any) => m.result === 'defeat').length;
              metrics.lifetime.winRate =
                metrics.lifetime.gamesPlayed > 0
                  ? metrics.lifetime.wins / metrics.lifetime.gamesPlayed
                  : 0;

              // Map to recent games format
              metrics.recentGames = matchHistory.slice(0, 10).map((match: any) => ({
                gameId: String(match.id || 'unknown'),
                timestamp: match.timestamp || Date.now(),
                result: match.result === 'victory' ? ('win' as const) : ('loss' as const),
                duration: 0, // Not available in match history
                turns: 0, // Not available in match history
              }));

              logger.info(`Fetched ${matchHistory.length} matches from Convex for metrics`);
            }
          } catch (convexError) {
            logger.warn({ convexError }, 'Failed to fetch match history from Convex');
            // Fall back to matchmaking stats
          }
        } else {
          logger.warn('LTCG_USER_ID not found - cannot fetch match history');
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

      return metrics;
    } catch (error) {
      logger.error({ error }, 'Error collecting metrics');
      return metrics; // Return default metrics on error
    }
  }

  /**
   * Transform API game state into dashboard-friendly snapshot
   */
  private transformGameState(gameState: GameStateResponse, gameId: string): GameSnapshot {
    // Count monsters and spell/traps from board arrays
    const myMonsters = (gameState.myBoard || []).filter(
      (card) => card.cardType === 'creature'
    ).length;
    const mySpellTraps = (gameState.myBoard || []).filter(
      (card) => card.cardType === 'spell' || card.cardType === 'trap' || card.cardType === 'equipment'
    ).length;
    const opponentMonsters = (gameState.opponentBoard || []).filter(
      (card) => card.cardType === 'creature'
    ).length;
    const opponentSpellTraps = (gameState.opponentBoard || []).filter(
      (card) => card.cardType === 'spell' || card.cardType === 'trap' || card.cardType === 'equipment'
    ).length;

    // Map cardType to panel-friendly types
    const mapCardType = (cardType: string): 'monster' | 'spell' | 'trap' => {
      if (cardType === 'creature') return 'monster';
      if (cardType === 'spell' || cardType === 'equipment') return 'spell';
      if (cardType === 'trap') return 'trap';
      return 'spell'; // default
    };

    return {
      gameId,
      phase: gameState.phase || 'unknown',
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
          type: mapCardType(card.cardType || 'spell'),
          name: card.name || 'Unknown Card',
        })),
      },
      status: gameState.status || 'waiting',
      winner: this.determineWinner(gameState),
    };
  }

  /**
   * Determine winner from game state
   */
  private determineWinner(gameState: GameStateResponse): 'agent' | 'opponent' | undefined {
    if (gameState.status !== 'completed') {
      return undefined;
    }

    // Determine winner based on life points
    if (gameState.myLifePoints <= 0) {
      return 'opponent';
    }
    if (gameState.opponentLifePoints <= 0) {
      return 'agent';
    }

    return undefined;
  }
}
