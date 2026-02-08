/**
 * @module @ltcg/core/api
 *
 * Factory functions for creating typed Convex function references.
 *
 * @example
 * ```typescript
 * import { createTypedQuery } from "@ltcg/core/api";
 * const getUser = createTypedQuery<{ id: string }, User>(api.users.get);
 * ```
 */

import type { TypedAction, TypedMutation, TypedQuery } from "../types/convex";

/**
 * Create a typed query reference from an untyped API path.
 */
export function createTypedQuery<Args extends Record<string, unknown>, Return>(
  ref: unknown
): TypedQuery<Args, Return> {
  return ref as TypedQuery<Args, Return>;
}

/**
 * Create a typed mutation reference from an untyped API path.
 */
export function createTypedMutation<Args extends Record<string, unknown>, Return>(
  ref: unknown
): TypedMutation<Args, Return> {
  return ref as TypedMutation<Args, Return>;
}

/**
 * Create a typed action reference from an untyped API path.
 */
export function createTypedAction<Args extends Record<string, unknown>, Return>(
  ref: unknown
): TypedAction<Args, Return> {
  return ref as TypedAction<Args, Return>;
}
