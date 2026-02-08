/**
 * @ltcg/core/react - Type-safe Convex React hooks
 *
 * Provides typed wrapper around Convex useAction hook.
 *
 * Note: useTypedQuery and useTypedMutation were removed because they
 * trigger TS2589 in practice. Use native useQuery/useMutation with
 * typedApi pattern instead.
 */

import { useAction } from "convex/react";
import type { DefaultFunctionArgs, FunctionReference } from "convex/server";
import type { TypedAction } from "../types/convex";

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
  const act = useAction(action as FunctionReference<"action">);
  return act as unknown as (args: Args) => Promise<Return>;
}
