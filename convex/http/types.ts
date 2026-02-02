/**
 * HTTP API Type Definitions
 *
 * Centralized type definitions and Zod schemas for all HTTP endpoints.
 * Provides runtime validation and compile-time type safety.
 */

import { z } from "zod";
import type { Id } from "../_generated/dataModel";

// =============================================================================
// Common Types
// =============================================================================

/**
 * Position for monster cards on the field
 */
export const CardPositionSchema = z.enum(["attack", "defense"]);
export type CardPosition = z.infer<typeof CardPositionSchema>;

/**
 * Game phases
 */
export const GamePhaseSchema = z.enum([
  "draw",
  "standby",
  "main1",
  "battle",
  "main2",
  "end",
]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

/**
 * Card types in the game
 */
export const CardTypeSchema = z.enum(["creature", "spell", "trap"]);
export type CardType = z.infer<typeof CardTypeSchema>;

// =============================================================================
// Request Body Schemas
// =============================================================================

/**
 * Base schema for all game action requests
 */
export const GameIdRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
});
export type GameIdRequest = z.infer<typeof GameIdRequestSchema>;

/**
 * Summon monster request
 */
export const SummonRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  cardId: z.string().min(1, "cardId is required"),
  position: CardPositionSchema,
  tributeCardIds: z.array(z.string()).optional(),
});
export type SummonRequest = z.infer<typeof SummonRequestSchema>;

/**
 * Set card request (monsters)
 */
export const SetCardRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  cardId: z.string().min(1, "cardId is required"),
  tributeCardIds: z.array(z.string()).optional(),
});
export type SetCardRequest = z.infer<typeof SetCardRequestSchema>;

/**
 * Flip summon request
 */
export const FlipSummonRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  cardId: z.string().min(1, "cardId is required"),
  newPosition: CardPositionSchema,
});
export type FlipSummonRequest = z.infer<typeof FlipSummonRequestSchema>;

/**
 * Change position request
 */
export const ChangePositionRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  cardId: z.string().min(1, "cardId is required"),
});
export type ChangePositionRequest = z.infer<typeof ChangePositionRequestSchema>;

/**
 * Set spell/trap request
 */
export const SetSpellTrapRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  cardId: z.string().min(1, "cardId is required"),
});
export type SetSpellTrapRequest = z.infer<typeof SetSpellTrapRequestSchema>;

/**
 * Activate spell/trap request
 */
export const ActivateCardRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  cardId: z.string().min(1, "cardId is required"),
  targets: z.array(z.string()).optional(),
});
export type ActivateCardRequest = z.infer<typeof ActivateCardRequestSchema>;

/**
 * Chain response request
 */
export const ChainResponseRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  pass: z.boolean(),
  cardId: z.string().optional(),
  targets: z.array(z.string()).optional(),
});
export type ChainResponseRequest = z.infer<typeof ChainResponseRequestSchema>;

/**
 * Attack request
 */
export const AttackRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  attackerCardId: z.string().min(1, "attackerCardId is required"),
  targetCardId: z.string().optional(), // undefined = direct attack
});
export type AttackRequest = z.infer<typeof AttackRequestSchema>;

// =============================================================================
// Response Types
// =============================================================================

/**
 * Card in hand (visible to player)
 */
export interface HandCard {
  _id: string;
  name: string;
  cardType: CardType;
  cost?: number;
  attack?: number;
  defense?: number;
  effect?: string;
  element?: string;
}

/**
 * Monster on the field
 */
export interface FieldMonster {
  _id: string;
  name: string;
  cardType: "creature";
  attack: number;
  defense: number;
  position: 1 | 2; // 1 = attack, 2 = defense
  isFaceDown: boolean;
  hasAttacked: boolean;
  hasChangedPosition: boolean;
  element?: string;
}

/**
 * Spell/Trap on the field
 */
export interface FieldSpellTrap {
  _id: string;
  name: string;
  cardType: "spell" | "trap";
  isFaceDown: boolean;
  setTurn?: number;
}

/**
 * Complete game state response
 */
export interface GameStateResponse {
  gameId: string;
  lobbyId: string;
  phase: GamePhase;
  turnNumber: number;
  currentTurnPlayer: string;
  isMyTurn: boolean;
  myLifePoints: number;
  opponentLifePoints: number;
  hand: HandCard[];
  myBoard: FieldMonster[];
  opponentBoard: FieldMonster[];
  myDeckCount: number;
  opponentDeckCount: number;
  myGraveyardCount: number;
  opponentGraveyardCount: number;
  opponentHandCount: number;
  normalSummonedThisTurn: boolean;
}

/**
 * Pending turn info
 */
export interface PendingTurn {
  gameId: string;
  lobbyId: string;
  currentPhase: GamePhase;
  turnNumber: number;
  opponent: {
    username: string;
  };
  timeRemaining: number | null;
}

/**
 * Available action info
 */
export interface AvailableAction {
  action: string;
  description: string;
  availableCards?: string[];
  availableMonsters?: number;
  attackableMonsters?: number;
  chainLink?: number;
}

/**
 * Available actions response
 */
export interface AvailableActionsResponse {
  actions: AvailableAction[];
  phase: GamePhase;
  turnNumber: number;
  reason?: string;
}

/**
 * Summon result
 */
export interface SummonResult {
  success: boolean;
  cardSummoned: string;
  position: CardPosition;
  tributesUsed?: string[];
  triggerEffect?: boolean;
}

/**
 * Set card result
 */
export interface SetCardResult {
  success: boolean;
  cardSet: string;
  tributesUsed?: string[];
}

/**
 * Flip summon result
 */
export interface FlipSummonResult {
  success: boolean;
  cardFlipped: string;
  position: CardPosition;
  flipEffect?: boolean;
}

/**
 * Position change result
 */
export interface ChangePositionResult {
  success: boolean;
  cardName: string;
  newPosition: CardPosition;
}

/**
 * Spell/trap activation result
 */
export interface ActivationResult {
  success: boolean;
  spellName?: string;
  trapName?: string;
  chainStarted: boolean;
  chainLinkNumber?: number;
  currentChainLength?: number;
  priorityPassed?: boolean;
}

/**
 * Attack result
 */
export interface AttackResult {
  success: boolean;
  attackType: "direct" | "monster";
  attackerName: string;
  targetName?: string;
  damage: number;
  destroyed?: string[];
  newLifePoints?: {
    attacker: number;
    defender: number;
  };
}

/**
 * Phase transition result
 */
export interface PhaseTransitionResult {
  success: boolean;
  phase: GamePhase;
  message: string;
}

/**
 * End turn result
 */
export interface EndTurnResult {
  success: boolean;
  gameEnded: boolean;
  winnerId?: string;
  newTurnPlayer?: string;
  newTurnNumber?: number;
}

/**
 * Chain response result
 */
export interface ChainResponseResult {
  success: boolean;
  action: "passed_priority" | "added_to_chain";
  priorityHolder?: string;
  chainResolved?: boolean;
}

// =============================================================================
// Decision Types (for decisions.ts)
// =============================================================================

/**
 * Save decision request
 */
export const SaveDecisionRequestSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  turnNumber: z.number().int().positive(),
  phase: z.string().optional().default("unknown"),
  action: z.string().min(1, "action is required"),
  reasoning: z.string().min(1, "reasoning is required"),
  parameters: z.record(z.string(), z.unknown()).optional(),
  executionTimeMs: z.number().optional(),
  result: z.record(z.string(), z.unknown()).optional(),
});
export type SaveDecisionRequest = z.infer<typeof SaveDecisionRequestSchema>;

/**
 * Decision record
 */
export interface Decision {
  _id: string;
  agentId: string;
  gameId: string;
  turnNumber: number;
  phase: string;
  action: string;
  reasoning: string;
  parameters?: Record<string, unknown>;
  executionTimeMs?: number;
  result?: Record<string, unknown>;
  _creationTime: number;
}

/**
 * Decision statistics
 */
export interface DecisionStats {
  totalDecisions: number;
  decisionsByAction: Record<string, number>;
  averageExecutionTimeMs: number;
  successRate: number;
}

// =============================================================================
// Internal Query Result Types
// =============================================================================

/**
 * Internal game state from queries (raw from DB)
 * This matches what getGameStateForPlayerInternal returns
 */
export interface InternalGameState {
  gameId: string;
  lobbyId: string;
  currentPhase: GamePhase;
  turnNumber: number;
  currentTurnPlayerId: string;
  myLifePoints: number;
  opponentLifePoints: number;
  hand: HandCard[];
  myBoard: FieldMonster[];
  opponentBoard: FieldMonster[];
  mySpellTrapZone?: FieldSpellTrap[];
  myDeckCount: number;
  opponentDeckCount: number;
  myGraveyardCount: number;
  opponentGraveyardCount: number;
  opponentHandCount: number;
  normalSummonedThisTurn: boolean;
  chainState?: {
    waitingForResponse: boolean;
    currentChain: unknown[];
  };
}

/**
 * Lobby info from getActiveLobby query
 */
export interface ActiveLobby {
  _id: Id<"gameLobbies">;
  hostId: string;
  hostUsername: string;
  opponentId?: string;
  opponentUsername?: string;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Parse and validate a request body using a Zod schema
 * Returns the validated data or an error response
 */
export function parseAndValidate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> | { error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return { error: result.error };
}

/**
 * Check if a parse result is an error
 */
export function isValidationError<T>(
  result: T | { error: z.ZodError }
): result is { error: z.ZodError } {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    result.error instanceof z.ZodError
  );
}

/**
 * Format Zod validation errors for API response
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "root";
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  return formatted;
}
