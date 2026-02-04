/**
 * Convex Helper Utilities
 *
 * Provides type-safe wrappers for Convex hooks that avoid TS2589 errors
 * while maintaining type safety through proper generic constraints.
 *
 * Uses patterns from convex-helpers: https://github.com/get-convex/convex-helpers
 */

import { api } from "@convex/_generated/api";
import type { FunctionReference } from "convex/server";
import { useMutation, useQuery } from "convex/react";

/**
 * Expand utility type from convex-helpers
 * Forces TypeScript to expand complex intersection types (A & B) into flattened objects.
 * This helps avoid "Type instantiation is excessively deep" errors.
 *
 * @see https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/utils.ts
 */
export type Expand<ObjectType extends Record<string, unknown>> = ObjectType extends Record<
  string,
  unknown
>
  ? {
      [Key in keyof ObjectType]: ObjectType[Key];
    }
  : never;

/**
 * Re-export api for components that need the full typed API
 * Use useConvexQuery/useConvexMutation wrappers to avoid TS2589 errors
 */
export { api };

/**
 * Wrapper for useMutation that avoids TS2589 errors
 * Accepts any Convex mutation function reference
 */
export function useConvexMutation<Args extends Record<string, unknown>, Returns>(
  mutation: FunctionReference<"mutation", "public" | "internal", Args, Returns>,
) {
  return useMutation(mutation);
}

/**
 * Wrapper for useQuery that avoids TS2589 errors
 * Accepts any Convex query function reference with optional args
 */
export function useConvexQuery<Args extends Record<string, unknown>, Returns>(
  query: FunctionReference<"query", "public" | "internal", Args, Returns>,
  args?: Args,
) {
  return useQuery(query, args);
}
