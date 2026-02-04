/**
 * Convex Helper Utilities
 *
 * Isolates TS2589 "Type instantiation is excessively deep" errors
 * caused by Convex's deeply nested generated API types.
 *
 * Uses patterns from convex-helpers: https://github.com/get-convex/convex-helpers
 */

import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { DefaultFunctionArgs } from "convex/server";

/**
 * Expand utility type from convex-helpers
 * Forces TypeScript to expand complex intersection types (A & B) into flattened objects.
 * This helps avoid "Type instantiation is excessively deep" errors.
 *
 * @see https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/utils.ts
 */
export type Expand<ObjectType extends Record<string, unknown>> = ObjectType extends Record<string, unknown>
  ? {
      [Key in keyof ObjectType]: ObjectType[Key];
    }
  : never;

// @ts-ignore - Suppress TS2589 for api cast
export const apiAny = api as unknown;

/**
 * Wrapper for useMutation that avoids TS2589 errors
 * Use this instead of calling useMutation directly with deep api paths
 */
export function useConvexMutation(path: unknown) {
  return useMutation(path as DefaultFunctionArgs);
}

/**
 * Wrapper for useQuery that avoids TS2589 errors
 * Use this instead of calling useQuery directly with deep api paths
 */
export function useConvexQuery(path: unknown, args?: DefaultFunctionArgs) {
  return useQuery(path as DefaultFunctionArgs, args);
}
