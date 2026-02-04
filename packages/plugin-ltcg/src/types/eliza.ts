/**
 * Eliza-specific type definitions
 *
 * Types for ElizaOS framework integration, including State extensions,
 * Memory extensions, and other Eliza-specific structures.
 */

import type { Memory, State } from "@elizaos/core";

/**
 * Extended State with LTCG-specific values
 */
export interface LTCGState extends State {
  values: {
    LTCG_EMOTIONAL_STATE?: string;
    LTCG_EMOTIONAL_INTENSITY?: number;
    LTCG_FILTERED_ACTIONS?: string[];
    LTCG_EMOTIONAL_ALLOWED?: boolean;
    gameState?: unknown;
    boardAnalysis?: unknown;
    hand?: unknown;
    [key: string]: unknown;
  };
  currentAction?: string;
}

/**
 * Extended Memory with action metadata
 */
export interface ActionMemory extends Memory {
  content: {
    text: string;
    action?: string;
    [key: string]: unknown;
  };
}

/**
 * Error details type for consistent error handling
 */
export interface ErrorDetails {
  gameId?: string;
  phase?: string;
  turnPlayer?: string;
  retryAfter?: number;
  remaining?: number;
  limit?: number;
  resetAt?: number;
  missingFields?: string[];
  invalidFields?: string[];
  [key: string]: unknown;
}

/**
 * Board analysis result structure
 */
export interface BoardAnalysisData {
  advantage?: string;
  myMonsterCount?: number;
  opponentMonsterCount?: number;
  myBackrowCount?: number;
  opponentBackrowCount?: number;
  threats?: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  opportunities?: Array<{
    type: string;
    description: string;
  }>;
  [key: string]: unknown;
}

/**
 * Emotional state analysis result
 */
export interface EmotionalState {
  state: string;
  intensity: number;
  shouldFilter: string[];
  filterReason?: string;
}

/**
 * LLM decision structure for game actions
 */
export interface LLMDecision {
  reasoning: string;
  action: string;
  cardIndex?: number;
  position?: string;
  targetIndex?: number;
  tributeIndices?: number[];
  [key: string]: unknown;
}

/**
 * Chat message content structure
 */
export interface ChatMessageContent {
  text: string;
  gameId?: string;
  playerId?: string;
  action?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * ConvexClient query/mutation argument types
 */
export interface ConvexQueryArgs {
  gameId?: string;
  playerId?: string;
  [key: string]: unknown;
}

/**
 * Event handler types
 */
export type EventHandler<T = unknown> = (data: T) => void;

export interface EventHandlerMap {
  [eventType: string]: EventHandler[];
}

/**
 * Test utilities types
 */
export interface MockRuntime {
  getSetting: (key: string) => string | undefined;
  character?: {
    settings?: {
      voice?: string;
      model?: string;
    };
  };
  [key: string]: unknown;
}

export interface MockMessage extends Memory {
  content: {
    text: string;
    [key: string]: unknown;
  };
}

export interface MockState extends State {
  values: Record<string, unknown>;
}

/**
 * API response body type (used in error parsing)
 */
export interface ApiResponseBody {
  error?: {
    code?: string;
    message?: string;
    details?: ErrorDetails;
  };
  [key: string]: unknown;
}

/**
 * Cypress component mount options
 */
export interface CypressComponentOptions {
  [key: string]: unknown;
}

/**
 * LLM prompt context for game decisions
 */
export interface PromptContext {
  gameState: string;
  hand: string;
  boardAnalysis: string;
  availableActions: string;
  [key: string]: unknown;
}

/**
 * Generic callback function type
 */
export type Callback<T = void> = (result: T) => void;

/**
 * Subscription cleanup function
 */
export type Unsubscribe = () => void;

/**
 * Generic event data
 */
export interface GenericEventData {
  type: string;
  timestamp: number;
  [key: string]: unknown;
}

/**
 * Card selection for actions
 */
export interface CardSelection {
  cardId?: string;
  cardIndex?: number;
  location?: "hand" | "field";
  index?: number;
  targets?: number[];
  [key: string]: unknown;
}

/**
 * Generic selected card type (used in action handlers)
 */
export interface SelectedCard {
  cardId?: string;
  name?: string;
  type?: string;
  cardType?: string;
  [key: string]: unknown;
}

/**
 * Card ability structure
 */
export interface CardAbility {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Monster card type with attack/defense
 */
export interface MonsterCardData {
  currentAttack?: number;
  attack?: number;
  currentDefense?: number;
  defense?: number;
  name?: string;
  [key: string]: number | string | undefined;
}

/**
 * Convex match history entry
 */
export interface ConvexMatchHistoryEntry {
  id?: string | number;
  result?: "victory" | "defeat" | "draw";
  timestamp?: number;
  duration?: number;
  turns?: number;
  opponentId?: string;
  [key: string]: string | number | undefined;
}

/**
 * Board card with flexible positioning
 */
export interface FlexibleBoardCard {
  _id?: string;
  name?: string;
  cardType?: string;
  attack?: number;
  defense?: number;
  currentAttack?: number;
  currentDefense?: number;
  position?: number | string;
  hasAttacked?: boolean;
  isFaceDown?: boolean;
  element?: string;
  cost?: number;
  [key: string]: string | number | boolean | undefined;
}
