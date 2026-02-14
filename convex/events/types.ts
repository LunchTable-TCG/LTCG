/**
 * Domain Event Types
 *
 * Defines all domain events emitted by game lifecycle code.
 * These events decouple gameplay from economy, progression, and stats concerns.
 *
 * Events are dispatched asynchronously via ctx.scheduler.runAfter(0, ...)
 * so the originating mutation completes before handlers execute.
 */

import type { Id } from "../_generated/dataModel";

// ============================================================================
// GAME LIFECYCLE EVENTS
// ============================================================================

/**
 * Emitted when a game ends via any path (completion, surrender, forfeit, timeout).
 *
 * Downstream handlers use this to:
 * - Award XP to winner/loser (progression)
 * - Update ELO ratings (stats)
 * - Update win/loss counters (stats)
 * - Record match history (stats)
 * - Process wager payouts (economy)
 * - Complete story stages (progression)
 * - Update quest/achievement progress (progression)
 * - Update agent stats (stats)
 */
export interface GameEndedEvent {
  type: "game:ended";
  gameId: string;
  lobbyId: Id<"gameLobbies">;
  winnerId: Id<"users">;
  loserId: Id<"users">;
  endReason: "completed" | "surrender" | "forfeit" | "timeout";
  gameMode: "ranked" | "casual" | "story";
  turnCount: number;
  /** Wager amount if the game had a wager, 0 otherwise */
  wagerAmount: number;
  /** Whether wager was already paid (to prevent double-pay) */
  wagerPaid: boolean;
  /** Story stage ID if story mode */
  stageId?: Id<"storyStages">;
  /** Host's final LP (for story mode completion) */
  hostFinalLP: number;
  /** Whether the host is the winner */
  hostIsWinner: boolean;
  /** Host user ID (needed for story mode — always the human player) */
  hostId: Id<"users">;
  timestamp: number;
}

/**
 * Emitted when a player wins via LP reaching zero (state-based action).
 *
 * This is the SBA-specific game end path. Downstream handlers can
 * differentiate from surrender/forfeit if needed.
 */
export interface PlayerDefeatedByLPEvent {
  type: "player:defeated_by_lp";
  gameId: string;
  lobbyId: Id<"gameLobbies">;
  winnerId: Id<"users">;
  loserId: Id<"users">;
  gameMode: "ranked" | "casual" | "story";
  turnNumber: number;
  timestamp: number;
}

/**
 * Emitted when a player wins via deck-out (state-based action).
 */
export interface PlayerDefeatedByDeckOutEvent {
  type: "player:defeated_by_deckout";
  gameId: string;
  lobbyId: Id<"gameLobbies">;
  winnerId: Id<"users">;
  loserId: Id<"users">;
  gameMode: "ranked" | "casual" | "story";
  turnNumber: number;
  timestamp: number;
}

/**
 * Emitted when a player wins via Breakdown condition (3+ breakdowns caused).
 */
export interface PlayerDefeatedByBreakdownEvent {
  type: "player:defeated_by_breakdown";
  gameId: string;
  lobbyId: Id<"gameLobbies">;
  winnerId: Id<"users">;
  loserId: Id<"users">;
  gameMode: "ranked" | "casual" | "story";
  breakdownsCaused: number;
  turnNumber: number;
  timestamp: number;
}

// ============================================================================
// MATCH EVENTS
// ============================================================================

/**
 * Emitted when a match is fully completed (post-game processing done).
 * Used for analytics, leaderboard updates, etc.
 */
export interface MatchCompletedEvent {
  type: "match:completed";
  gameId: string;
  lobbyId: Id<"gameLobbies">;
  hostId: Id<"users">;
  opponentId: Id<"users">;
  winnerId: Id<"users">;
  loserId: Id<"users">;
  mode: "ranked" | "casual" | "story";
  turnCount: number;
  timestamp: number;
}

// ============================================================================
// STORY MODE EVENTS
// ============================================================================

/**
 * Emitted when a story stage should be completed.
 * Decouples game end from progression.storyStages.completeStageInternal.
 */
export interface StoryStageCompletedEvent {
  type: "story:stage_completed";
  userId: Id<"users">;
  stageId: Id<"storyStages">;
  won: boolean;
  finalLP: number;
  timestamp: number;
}

// ============================================================================
// WAGER EVENTS
// ============================================================================

/**
 * Emitted when a wager payout should be processed.
 */
export interface WagerPayoutEvent {
  type: "wager:payout";
  lobbyId: Id<"gameLobbies">;
  winnerId: Id<"users">;
  loserId: Id<"users">;
  wagerAmount: number;
  timestamp: number;
}

/**
 * Emitted when a crypto escrow should be settled.
 */
export interface CryptoEscrowSettleEvent {
  type: "crypto:escrow_settle";
  lobbyId: Id<"gameLobbies">;
  winnerId: Id<"users">;
  loserId: Id<"users">;
  timestamp: number;
}

// ============================================================================
// UNION TYPE
// ============================================================================

export type DomainEvent =
  | GameEndedEvent
  | PlayerDefeatedByLPEvent
  | PlayerDefeatedByDeckOutEvent
  | PlayerDefeatedByBreakdownEvent
  | MatchCompletedEvent
  | StoryStageCompletedEvent
  | WagerPayoutEvent
  | CryptoEscrowSettleEvent;
