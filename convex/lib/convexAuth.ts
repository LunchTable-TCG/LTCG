import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ErrorCode, createError } from "./errorCodes";

export interface AuthenticatedUser {
  userId: Id<"users">;
  username: string;
}

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedUser | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    return null;
  }

  return {
    userId: user._id,
    username: user.username || user.name || "",
  };
}

/**
 * Require authentication in a query
 * Throws an error if not authenticated
 */
export async function requireAuthQuery(ctx: QueryCtx): Promise<AuthenticatedUser> {
  const auth = await getCurrentUser(ctx);
  if (!auth) {
    throw createError(ErrorCode.AUTH_REQUIRED);
  }
  return auth;
}

/**
 * Require authentication in a mutation
 * Throws an error if not authenticated
 */
export async function requireAuthMutation(ctx: MutationCtx): Promise<AuthenticatedUser> {
  const auth = await getCurrentUser(ctx);
  if (!auth) {
    throw createError(ErrorCode.AUTH_REQUIRED);
  }
  return auth;
}
