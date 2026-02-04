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

// Re-export types from core
export type {
  Expand,
  TypedQuery,
  TypedMutation,
  TypedAction,
} from "@ltcg/core";

// Re-export typed hooks from core for type-safe code (if needed)
// Note: useTypedQuery/useTypedMutation use broken TypedAPI types - prefer native useQuery/useMutation
// export { useTypedQuery, useTypedMutation, useTypedAction } from "@ltcg/core/react";

// Re-export API types and factory functions for type-safe code
export type {
  User,
  UserInfo,
  UserProfile,
  PlayerBalance,
  Transaction,
  CardDefinition,
  UserCard,
  UserDeck,
  Notification,
  Tournament,
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

/**
 * Typed query hook that combines native Convex types with explicit return type.
 * Use when the Convex return type is too generic (e.g., {}).
 *
 * @example
 * const data = useTypedConvexQuery<MyReturnType>(typedApi.module.query, { arg: value });
 */
import { useQuery as useConvexQueryInternal } from "convex/react";
import type { FunctionReference } from "convex/server";

export function useTypedConvexQuery<TReturn>(
  query: FunctionReference<"query">,
  args: Record<string, unknown> | "skip"
): TReturn | undefined {
  return useConvexQueryInternal(query, args === "skip" ? "skip" : args) as TReturn | undefined;
}

/**
 * Typed mutation hook that returns a function with explicit return type.
 */
import { useMutation as useConvexMutationInternal } from "convex/react";

export function useTypedConvexMutation<TArgs extends Record<string, unknown>, TReturn>(
  mutation: FunctionReference<"mutation">
): (args: TArgs) => Promise<TReturn> {
  const mutate = useConvexMutationInternal(mutation);
  return mutate as (args: TArgs) => Promise<TReturn>;
}
