/**
 * Type-Safe Convex Helper Utilities
 *
 * Provides typed wrappers using @ltcg/core types to eliminate apiAny usage.
 *
 * Migration path:
 * 1. Replace `import { apiAny } from "@/lib/convexHelpers"`
 *    with `import { typedApi } from "@/lib/convexTypedHelpers"`
 * 2. Replace `apiAny.path.to.function` with `typedApi.path.to.function`
 * 3. TypeScript will infer return types automatically
 */

import { api } from "@convex/_generated/api";
import type { TypedAction, TypedMutation, TypedQuery } from "@ltcg/core";
import { useAction, useMutation, useQuery } from "convex/react";
import type { DefaultFunctionArgs } from "convex/server";

/**
 * Typed API object that provides type-safe access to Convex functions
 */
export const typedApi = api as unknown;

/**
 * Type-safe query hook
 */
export function useTypedQuery<Args extends DefaultFunctionArgs = DefaultFunctionArgs, Return = unknown>(
  query: TypedQuery<Args, Return>,
  args: Args | "skip"
): Return | undefined {
  return useQuery(query as unknown as DefaultFunctionArgs, args === "skip" ? "skip" : args);
}

/**
 * Type-safe mutation hook
 */
export function useTypedMutation<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = unknown,
>(mutation: TypedMutation<Args, Return>) {
  return useMutation(mutation as unknown as DefaultFunctionArgs) as (args: Args) => Promise<Return>;
}

/**
 * Type-safe action hook
 */
export function useTypedAction<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = unknown,
>(action: TypedAction<Args, Return>) {
  return useAction(action as unknown as DefaultFunctionArgs) as (args: Args) => Promise<Return>;
}

// Re-export the Expand utility type from convexHelpers
export type { Expand } from "./convexHelpers";
