/**
 * @ltcg/core/react - Type-safe Convex React hooks
 *
 * Provides typed wrappers around Convex React hooks that work with
 * the typed function references from @ltcg/core/types.
 *
 * @example
 * ```typescript
 * import { useTypedQuery, useTypedMutation } from "@ltcg/core/react";
 * import type { TypedQuery } from "@ltcg/core";
 * import { api } from "@convex/_generated/api";
 *
 * // Define typed reference
 * const getUser: TypedQuery<{ id: string }, User> = api.users.get;
 *
 * // Use with typed hooks
 * const user = useTypedQuery(getUser, { id: "123" });
 * ```
 */

import { useAction, useMutation, useQuery } from "convex/react";
import type { DefaultFunctionArgs, FunctionReference } from "convex/server";
import type { TypedAction, TypedMutation, TypedQuery } from "../types/convex";

/**
 * Type-safe wrapper for Convex useQuery hook.
 *
 * Accepts a TypedQuery reference and returns properly typed results.
 * Supports "skip" to conditionally disable the query.
 *
 * @template Args - Query argument type
 * @template Return - Query return type
 */
export function useTypedQuery<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = unknown,
>(
  query: TypedQuery<Args, Return> | FunctionReference<"query">,
  args: Args | "skip"
): Return | undefined {
  // Internal cast required to bridge TypedQuery to Convex's complex generic constraints
  return useQuery(query as FunctionReference<"query">, args === "skip" ? "skip" : args);
}

/**
 * Type-safe wrapper for Convex useMutation hook.
 *
 * Accepts a TypedMutation reference and returns a properly typed mutation function.
 *
 * @template Args - Mutation argument type
 * @template Return - Mutation return type
 */
export function useTypedMutation<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = unknown,
>(
  mutation: TypedMutation<Args, Return> | FunctionReference<"mutation">
): (args: Args) => Promise<Return> {
  // Internal cast required to bridge TypedMutation to Convex's complex generic constraints
  const mutate = useMutation(mutation as FunctionReference<"mutation">);
  return mutate as unknown as (args: Args) => Promise<Return>;
}

/**
 * Type-safe wrapper for Convex useAction hook.
 *
 * Accepts a TypedAction reference and returns a properly typed action function.
 *
 * @template Args - Action argument type
 * @template Return - Action return type
 */
export function useTypedAction<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = unknown,
>(
  action: TypedAction<Args, Return> | FunctionReference<"action">
): (args: Args) => Promise<Return> {
  // Internal cast required to bridge TypedAction to Convex's complex generic constraints
  const act = useAction(action as FunctionReference<"action">);
  return act as unknown as (args: Args) => Promise<Return>;
}
