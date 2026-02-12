/**
 * Real-Time Event Definitions
 *
 * Type-safe event definitions for Convex real-time subscriptions.
 * These events represent notifications from the LTCG backend about
 * game state changes, turn notifications, and game events.
 */

import type { GameEvent, GameStateResponse } from "../types/api";

// ============================================================================
// Event Types
// ============================================================================

/**
 * Game state has been updated
 * Emitted whenever any aspect of the game state changes
 */
export interface GameStateUpdatedEvent {
  type: "game_state_updated";
  gameId: string;
  state: GameStateResponse;
  timestamp: number;
}

/**
 * It's the agent's turn to act
 * Emitted when the current turn player changes to this agent
 */
export interface TurnNotificationEvent {
  type: "turn_notification";
  gameId: string;
  phase: string;
  isMyTurn: boolean;
  timestamp: number;
}

/**
 * A game action occurred
 * Emitted when a player takes an action (summon, attack, spell activation, etc.)
 */
export interface GameEventOccurredEvent {
  type: "game_event_occurred";
  gameId: string;
  event: GameEvent;
  timestamp: number;
}

/**
 * Game has completed
 * Emitted when the game reaches a terminal state (win/loss/draw)
 */
export interface GameEndedEvent {
  type: "game_ended";
  gameId: string;
  winner?: "host" | "opponent";
  reason: "victory" | "surrender" | "timeout" | "draw";
  timestamp: number;
}

/**
 * Chain window is open for response
 * Emitted when the agent can respond to the opponent's chain
 */
export interface ChainWindowOpenEvent {
  type: "chain_window_open";
  gameId: string;
  chainLength: number;
  timeRemaining: number; // milliseconds
  canRespond: boolean;
  timestamp: number;
}

/**
 * Union type of all possible events
 */
export type GameRealtimeEvent =
  | GameStateUpdatedEvent
  | TurnNotificationEvent
  | GameEventOccurredEvent
  | GameEndedEvent
  | ChainWindowOpenEvent;

// ============================================================================
// Event Callbacks
// ============================================================================

/**
 * Callback for game state updates
 */
export type GameStateCallback = (state: GameStateResponse) => void;

/**
 * Callback for turn notifications
 */
export type TurnNotificationCallback = (gameIds: string[]) => void;

/**
 * Callback for game events
 */
export type GameEventCallback = (event: GameEvent) => void;

/**
 * Callback for chain window notifications
 */
export type ChainWindowCallback = (
  gameId: string,
  timeRemaining: number,
) => void;

/**
 * Generic event callback
 */
export type EventCallback<T = unknown> = (data: T) => void;

// ============================================================================
// Event Emitter Interface
// ============================================================================

/**
 * Type-safe event emitter for real-time game events
 */
export interface GameEventEmitter {
  /**
   * Subscribe to a specific event type
   */
  on(
    event: "game_state_updated",
    callback: EventCallback<GameStateUpdatedEvent>,
  ): () => void;
  on(
    event: "turn_notification",
    callback: EventCallback<TurnNotificationEvent>,
  ): () => void;
  on(
    event: "game_event_occurred",
    callback: EventCallback<GameEventOccurredEvent>,
  ): () => void;
  on(event: "game_ended", callback: EventCallback<GameEndedEvent>): () => void;
  on(
    event: "chain_window_open",
    callback: EventCallback<ChainWindowOpenEvent>,
  ): () => void;
  on(event: string, callback: EventCallback): () => void;

  /**
   * Emit an event to all subscribers
   */
  emit(event: "game_state_updated", data: GameStateUpdatedEvent): void;
  emit(event: "turn_notification", data: TurnNotificationEvent): void;
  emit(event: "game_event_occurred", data: GameEventOccurredEvent): void;
  emit(event: "game_ended", data: GameEndedEvent): void;
  emit(event: "chain_window_open", data: ChainWindowOpenEvent): void;
  emit(event: string, data: unknown): void;

  /**
   * Remove all listeners for a specific event or all events
   */
  removeAllListeners(event?: string): void;
}

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Represents an active subscription
 */
export interface Subscription {
  id: string;
  type: "game" | "turns" | "events";
  gameId?: string;
  userId?: string;
  unsubscribe: () => void;
  createdAt: number;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /**
   * Called when subscription is established
   */
  onConnect?: () => void;

  /**
   * Called when subscription encounters an error
   */
  onError?: (error: Error) => void;

  /**
   * Called when subscription is closed
   */
  onClose?: () => void;

  /**
   * Automatic reconnection on failure (default: true)
   */
  autoReconnect?: boolean;
}
