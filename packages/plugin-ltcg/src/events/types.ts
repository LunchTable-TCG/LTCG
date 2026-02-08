/**
 * Custom LTCG Platform Event Types
 *
 * Defines platform-specific events emitted by LTCG services (TurnOrchestrator,
 * LTCGPollingService, gameEventHandler) via runtime.emitEvent().
 *
 * These extend the standard 27 ElizaOS events with game-specific lifecycle events.
 * The runtime accepts custom string event keys via RuntimeEventStorage.
 */

import type { EventPayload, IAgentRuntime } from "@elizaos/core";
import { logger } from "../utils/logger";

// =============================================================================
// Custom Event Type Constants
// =============================================================================

export const LTCGEventType = {
  // Game lifecycle
  GAME_STARTED: "LTCG_GAME_STARTED",
  GAME_ENDED: "LTCG_GAME_ENDED",

  // Turn lifecycle
  TURN_STARTED: "LTCG_TURN_STARTED",
  TURN_COMPLETED: "LTCG_TURN_COMPLETED",

  // Gameplay events
  CHAIN_WAITING: "LTCG_CHAIN_WAITING",
  PHASE_CHANGED: "LTCG_PHASE_CHANGED",
  OPPONENT_ACTION: "LTCG_OPPONENT_ACTION",

  // AI decision events
  ACTION_DECIDED: "LTCG_ACTION_DECIDED",
  ACTION_EXECUTED: "LTCG_ACTION_EXECUTED",

  // Matchmaking events
  MATCHMAKING_SCANNING: "LTCG_MATCHMAKING_SCANNING",
  MATCHMAKING_JOINED: "LTCG_MATCHMAKING_JOINED",
} as const;

export type LTCGEventTypeName = (typeof LTCGEventType)[keyof typeof LTCGEventType];

// =============================================================================
// Custom Event Payloads
// =============================================================================

/** Base payload for all LTCG custom events */
export interface LTCGEventPayload extends EventPayload {
  source: "ltcg";
  gameId?: string;
  timestamp: number;
}

export interface LTCGGameStartedPayload extends LTCGEventPayload {
  gameId: string;
}

export interface LTCGGameEndedPayload extends LTCGEventPayload {
  gameId: string;
  winner: "agent" | "opponent";
  reason: string;
}

export interface LTCGTurnStartedPayload extends LTCGEventPayload {
  gameId: string;
  phase: string;
  turnNumber: number;
}

export interface LTCGTurnCompletedPayload extends LTCGEventPayload {
  gameId: string;
  actionCount: number;
  turnNumber: number;
}

export interface LTCGChainWaitingPayload extends LTCGEventPayload {
  gameId: string;
  timeoutMs: number;
}

export interface LTCGPhaseChangedPayload extends LTCGEventPayload {
  gameId: string;
  phase: string;
  turnNumber: number;
}

export interface LTCGOpponentActionPayload extends LTCGEventPayload {
  gameId: string;
  actionType: string;
  description: string;
}

export interface LTCGActionDecidedPayload extends LTCGEventPayload {
  gameId: string;
  action: string;
  reasoning: string;
  turnNumber: number;
  phase: string;
}

export interface LTCGActionExecutedPayload extends LTCGEventPayload {
  gameId: string;
  action: string;
  success: boolean;
  executionTimeMs: number;
}

export interface LTCGMatchmakingScanningPayload extends LTCGEventPayload {
  lobbiesFound: number;
}

export interface LTCGMatchmakingJoinedPayload extends LTCGEventPayload {
  gameId: string;
  lobbyId: string;
  opponent: string;
}

// =============================================================================
// Event Emitter Utility
// =============================================================================

/**
 * Emit a custom LTCG platform event via the ElizaOS runtime.
 *
 * Wraps runtime.emitEvent() with:
 * - Consistent "ltcg" source
 * - Automatic timestamp
 * - Error handling (never throws)
 */
export async function emitLTCGEvent(
  runtime: IAgentRuntime,
  event: LTCGEventTypeName,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const payload = {
      runtime,
      source: "ltcg" as const,
      timestamp: Date.now(),
      ...data,
    };
    await runtime.emitEvent(event, payload);
  } catch (err) {
    logger.debug(
      `Failed to emit LTCG event ${event}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
