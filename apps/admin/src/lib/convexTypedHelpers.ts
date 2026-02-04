/**
 * Type-Safe Convex Helper Utilities
 *
 * Provides typed wrappers using @ltcg/core types to eliminate apiAny usage.
 *
 * Migration path:
 * 1. Replace `import  from "@/lib/convexHelpers"`
 *    with `import { typedApi } from "@/lib/convexTypedHelpers"`
 * 2. Replace `api.path.to.function` with `typedApi.path.to.function`
 * 3. TypeScript will infer return types automatically
 */

import { api } from "@convex/_generated/api";
import type { TypedAction, TypedMutation, TypedQuery } from "@ltcg/core";
import { useAction, useMutation, useQuery } from "convex/react";
import type { DefaultFunctionArgs } from "convex/server";

/**
 * Typed API object that provides type-safe access to Convex functions
 */
export const typedApi = api as unknown as typeof api;

/**
 * Type-safe query hook
 */
export function useTypedQuery<Args extends DefaultFunctionArgs = DefaultFunctionArgs, Return = unknown>(
  query: TypedQuery<Args, Return>,
  args: Args | "skip"
): Return | undefined {
  return useQuery(query as unknown as TypedQuery<Args, Return>, args);
}

/**
 * Type-safe mutation hook
 */
export function useTypedMutation<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = unknown,
>(mutation: TypedMutation<Args, Return>) {
  return useMutation(mutation as unknown as TypedMutation<Args, Return>) as (args: Args) => Promise<Return>;
}

/**
 * Type-safe action hook
 */
export function useTypedAction<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = unknown,
>(action: TypedAction<Args, Return>) {
  return useAction(action as unknown as TypedAction<Args, Return>) as (args: Args) => Promise<Return>;
}

// Re-export the Expand utility type (if needed in admin app)
// Create convexHelpers.ts in admin app if it doesn't exist
export type Expand<ObjectType extends Record<string | number | symbol, unknown>> = ObjectType extends Record<string | number | symbol, unknown>
  ? {
      [Key in keyof ObjectType]: ObjectType[Key];
    }
  : never;
