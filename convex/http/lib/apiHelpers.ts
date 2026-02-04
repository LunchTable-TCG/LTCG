/**
 * Type-safe API helpers for HTTP endpoints
 *
 * Provides properly typed wrappers around Convex API functions
 * to avoid TS2589 errors while maintaining type safety
 */

import type { FunctionReference } from "convex/server";
import type { Doc, Id } from "../../_generated/dataModel";

/**
 * Deck response types - matches internal query returns
 */
export interface DeckSummary {
  _id: Id<"decks">;
  name: string;
  archetype: string;
  cardCount: number;
  isValid: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DeckWithCards extends DeckSummary {
  cards: Array<{
    cardDefinitionId: Id<"cardDefinitions">;
    quantity: number;
    cardData: Doc<"cardDefinitions">;
  }>;
}

export interface CardDefinition {
  _id: Id<"cardDefinitions">;
  cardId: string;
  name: string;
  type: string;
  archetype: string;
  level?: number;
  attack?: number;
  defense?: number;
  description: string;
  effectText?: string;
  imageUrl?: string;
  rarity: string;
}

export interface ChatMessage {
  _id: Id<"globalChatMessages">;
  userId: Id<"users">;
  username: string;
  content: string;
  timestamp: number;
  isDeleted?: boolean;
}

/**
 * Game state response types
 */
export interface GameStateSummary {
  _id: Id<"games">;
  status: string;
  hostPlayerId: Id<"users">;
  guestPlayerId?: Id<"users">;
  currentTurn?: number;
  currentPhase?: string;
  winner?: Id<"users">;
  createdAt: number;
  updatedAt: number;
}

/**
 * Matchmaking queue entry
 */
export interface QueueEntry {
  userId: Id<"users">;
  username: string;
  elo: number;
  queuedAt: number;
  gameMode: string;
}

/**
 * Story mode types
 */
export interface StoryChapter {
  _id: Id<"storyChapters">;
  chapterId: string;
  title: string;
  description: string;
  isLocked: boolean;
  totalStages: number;
  completedStages: number;
}

export interface StoryStage {
  _id: Id<"storyStages">;
  stageNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isLocked: boolean;
  difficulty: string;
}

/**
 * Lobby and matchmaking types
 */
export interface LobbyInfo {
  _id: Id<"lobbies">;
  status: string;
  mode: string;
  createdAt: number;
  joinCode?: string;
  hostUsername?: string;
  hostRating?: number;
  maxRatingDiff?: number;
  deckArchetype?: string;
}

export interface User {
  _id: Id<"users">;
  username: string;
  rankedElo?: number;
  isBanned?: boolean;
  isSuspended?: boolean;
}

export interface OnlineUser {
  userId: Id<"users">;
  username: string;
  status: string;
  lastSeen: number;
}

/**
 * Deck types
 */
export interface DeckCard {
  cardDefinitionId: Id<"cardDefinitions">;
  quantity: number;
  cardData?: CardDefinition;
}

export interface DeckInfo extends DeckSummary {
  cardsWithDetails?: DeckCard[];
  validationErrors?: string[];
}

/**
 * Type-safe API function reference helpers
 */
export type QueryFunction<Args = object, Returns = unknown> = FunctionReference<
  "query",
  "public" | "internal",
  Args,
  Returns
>;

export type MutationFunction<Args = object, Returns = unknown> = FunctionReference<
  "mutation",
  "public" | "internal",
  Args,
  Returns
>;

export type ActionFunction<Args = object, Returns = unknown> = FunctionReference<
  "action",
  "public" | "internal",
  Args,
  Returns
>;
