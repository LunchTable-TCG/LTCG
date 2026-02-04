/**
 * Convex Helper Utilities
 *
 * Provides type-safe helpers for Convex API access.
 * Uses TypedAPI from @ltcg/core for full type safety.
 */

// Re-export Convex React hooks directly for full type inference
export { useAction, useMutation, useQuery } from "convex/react";

// Re-export types from core
export type {
  Expand,
  TypedQuery,
  TypedMutation,
  TypedAction,
} from "@ltcg/core";

// Import TypedAPI for proper typing
import type { TypedAPI } from "@ltcg/core/api";

// Re-export typed hooks from core for type-safe code
export { useTypedQuery, useTypedMutation, useTypedAction } from "@ltcg/core/react";

// Re-export API types and factory functions for type-safe code
export type {
  User,
  UserInfo,
  UserProfile,
  PlayerBalance,
  Transaction,
  TransactionHistoryResponse,
  TokenBalance,
  GameLobby,
  GameState,
  GameMode,
  CardDefinition,
  CardInstance,
  UserCard,
  UserDeck,
  CardVariant,
  BattlePassStatus,
  Notification,
  StoryChapter,
  StoryProgress,
  Difficulty,
  Tournament,
  TutorialStatus,
  UserWallet,
  CardListing,
  MarketOverview,
  Id,
} from "@ltcg/core/types/api";

export {
  createTypedQuery,
  createTypedMutation,
  createTypedAction,
} from "@ltcg/core/api";

// Direct re-export of api for type inference
export { api } from "@convex/_generated/api";

// Import api and cast to TypedAPI for full type safety
import { api } from "@convex/_generated/api";

/**
 * Typed API with full type inference.
 * Use this for all Convex queries/mutations to get proper return type inference.
 */
export const typedApi = api as unknown as TypedAPI;

/**
 * Alias for typedApi - use when you need to bypass strict typing.
 * Prefer typedApi when possible for better type safety.
 */
export const apiAny = typedApi;

// Legacy aliases for backward compatibility
export { useQuery as useConvexQuery } from "convex/react";
export { useMutation as useConvexMutation } from "convex/react";
export { useAction as useConvexAction } from "convex/react";
