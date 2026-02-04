/**
 * Convex Helper Utilities
 *
 * Provides type-safe helpers for Convex API access.
 * Uses TypedAPI from @ltcg/core for full type safety.
 *
 * IMPORTANT: Always use `typedApi` for all Convex queries/mutations.
 * Never use raw `api` - it lacks type safety.
 */

// Re-export Convex React hooks directly for full type inference
export { useAction, useMutation, useQuery } from "convex/react";

// Re-export types from core API types
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

/**
 * Export API with type bypass to avoid TS2589 "Type instantiation is excessively deep" errors.
 * The Convex API types are deeply nested and can exceed TypeScript's recursion limits.
 *
 * Usage pattern:
 * - Import typedApi for path references: typedApi.module.function
 * - Cast results to expected types where needed: useQuery(...) as ResultType
 * - For mutations, use the wrapper hooks or cast results
 *
 * NOTE: We use require() to prevent TypeScript from analyzing the deeply nested types.
 * This is the only reliable way to avoid TS2589 with Convex's complex API types.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required to prevent TS2589 type recursion errors
// biome-ignore lint/style/noVar: Using var for module-level declaration
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
export const typedApi: any = require("@convex/_generated/api").api;

// Legacy aliases for backward compatibility - use typedApi instead
export { useQuery as useConvexQuery } from "convex/react";
export { useMutation as useConvexMutation } from "convex/react";
export { useAction as useConvexAction } from "convex/react";
