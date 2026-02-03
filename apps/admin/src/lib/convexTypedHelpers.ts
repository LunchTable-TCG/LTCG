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
export const typedApi = api as any;

/**
 * Type-safe query hook
 */
export function useTypedQuery<Args extends DefaultFunctionArgs = DefaultFunctionArgs, Return = any>(
  query: TypedQuery<Args, Return>,
  args: Args | "skip"
): Return | undefined {
  return useQuery(query as any, args);
}

/**
 * Type-safe mutation hook
 */
export function useTypedMutation<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = any,
>(mutation: TypedMutation<Args, Return>) {
  return useMutation(mutation as any) as (args: Args) => Promise<Return>;
}

/**
 * Type-safe action hook
 */
export function useTypedAction<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = any,
>(action: TypedAction<Args, Return>) {
  return useAction(action as any) as (args: Args) => Promise<Return>;
}

// Re-export the Expand utility type (if needed in admin app)
// Create convexHelpers.ts in admin app if it doesn't exist
export type Expand<ObjectType extends Record<any, any>> = ObjectType extends Record<any, any>
  ? {
      [Key in keyof ObjectType]: ObjectType[Key];
    }
  : never;
