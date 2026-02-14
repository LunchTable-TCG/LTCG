/**
 * Service Interfaces
 *
 * Shared interfaces for LTCG services to avoid circular dependencies.
 * Services should depend on these interfaces rather than importing
 * concrete implementations directly.
 */

import type { LTCGApiClient } from "../client/LTCGApiClient";
import type {
  AgentMetrics,
  AgentStatus,
  Decision,
  GameSnapshot,
  MatchmakingStatus,
} from "../frontend/types/panel";
import type { GameStateResponse } from "../types/api";

// ============================================================================
// Service Type Constants
// ============================================================================

export const SERVICE_TYPES = {
  POLLING: "ltcg-polling",
  ORCHESTRATOR: "ltcg-turn-orchestrator",
  STATE_AGGREGATOR: "ltcg-state-aggregator",
} as const;

// ============================================================================
// Polling Service Interface
// ============================================================================

/**
 * Interface for the LTCG Polling Service
 * Provides real-time game updates via HTTP polling
 */
export interface IPollingService {
  /**
   * Start polling for a specific game
   */
  startPollingGame(gameId: string, meta?: { stageId?: string }): void;

  /**
   * Stop polling
   */
  stopPolling(): void;

  /**
   * Check if polling is active
   */
  isActive(): boolean;

  /**
   * Get current game being polled
   */
  getCurrentGameId(): string | null;

  /**
   * Get current lobby ID for the active game, if known
   */
  getCurrentLobbyId(): string | null;

  /**
   * Check if auto-matchmaking is enabled
   */
  isMatchmakingEnabled(): boolean;

  /**
   * Get the API client instance
   */
  getClient(): LTCGApiClient | null;

  /**
   * Get current matchmaking status and recent events
   */
  getMatchmakingStatus(): MatchmakingStatus;

  /**
   * Get health status of the service
   */
  getHealthStatus(): {
    isHealthy: boolean;
    circuitBreakers: Record<string, { state: string; failureCount: number }>;
    isPolling: boolean;
    currentGameId: string | null;
  };
}

// ============================================================================
// Turn Orchestrator Interface
// ============================================================================

/**
 * Interface for the Turn Orchestrator Service
 * Handles autonomous turn-by-turn gameplay decisions
 */
export interface ITurnOrchestrator {
  /**
   * Handle turn started event - begin autonomous turn execution
   */
  onTurnStarted(gameId: string, phase: string, turnNumber: number): Promise<void>;

  /**
   * Handle chain waiting event - decide whether to chain or pass
   */
  onChainWaiting(gameId: string, timeoutMs: number): Promise<void>;

  /**
   * Get decision history for a game (for panel display)
   */
  getDecisionHistory(gameId: string, limit?: number): Decision[];
}

// ============================================================================
// State Aggregator Interface
// ============================================================================

/**
 * Interface for the State Aggregator Service
 * Aggregates data from all LTCG services into API-friendly formats
 */
export interface IStateAggregator {
  /**
   * Get overall agent status
   */
  getAgentStatus(agentId: string): Promise<AgentStatus>;

  /**
   * Get matchmaking status and recent events
   */
  getMatchmakingStatus(agentId: string): Promise<MatchmakingStatus>;

  /**
   * Get current game state snapshot
   */
  getGameState(agentId: string, gameId: string): Promise<GameSnapshot>;

  /**
   * Get decision history for a game
   */
  getDecisionHistory(
    agentId: string,
    gameId: string,
    limit?: number
  ): Promise<{ decisions: Decision[] }>;

  /**
   * Get performance metrics
   */
  getMetrics(agentId: string): Promise<AgentMetrics>;
}

// ============================================================================
// Event Types for Inter-Service Communication
// ============================================================================

/**
 * Events emitted by the polling service
 */
export type PollingEventType =
  | "turn_started"
  | "chain_waiting"
  | "game_started"
  | "game_ended"
  | "phase_changed"
  | "opponent_action";

/**
 * Event payload for turn started
 */
export interface TurnStartedEvent {
  type: "turn_started";
  gameId: string;
  phase: string;
  turnNumber: number;
  gameState: GameStateResponse;
}

/**
 * Event payload for chain waiting
 */
export interface ChainWaitingEvent {
  type: "chain_waiting";
  gameId: string;
  timeoutMs: number;
  gameState: GameStateResponse;
}

/**
 * Union type for all orchestrator events
 */
export type OrchestratorEvent = TurnStartedEvent | ChainWaitingEvent;

// ============================================================================
// Service Getter Utility Type
// ============================================================================

/**
 * Type-safe service getter result
 */
export type ServiceGetter<T> = () => T | null;
