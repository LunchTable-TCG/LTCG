/**
 * Typed Convex Function References
 *
 * These types provide type-safe wrappers for Convex functions,
 * eliminating the need for `apiAny` and `as any` type escapes.
 */

import type { DefaultFunctionArgs, FunctionReference } from "convex/server";

/**
 * Type-safe query reference
 * @template Args - Query argument type
 * @template Return - Query return type
 */
export type TypedQuery<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = any,
> = FunctionReference<"query", "public", Args, Return>;

/**
 * Type-safe mutation reference
 * @template Args - Mutation argument type
 * @template Return - Mutation return type
 */
export type TypedMutation<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = any,
> = FunctionReference<"mutation", "public", Args, Return>;

/**
 * Type-safe action reference
 * @template Args - Action argument type
 * @template Return - Action return type
 */
export type TypedAction<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = any,
> = FunctionReference<"action", "public", Args, Return>;

/**
 * Internal query reference (admin/system functions)
 */
export type TypedInternalQuery<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = any,
> = FunctionReference<"query", "internal", Args, Return>;

/**
 * Internal mutation reference (admin/system functions)
 */
export type TypedInternalMutation<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = any,
> = FunctionReference<"mutation", "internal", Args, Return>;

/**
 * Internal action reference (admin/system functions)
 */
export type TypedInternalAction<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = any,
> = FunctionReference<"action", "internal", Args, Return>;
