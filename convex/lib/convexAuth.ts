import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ErrorCode, createError } from "./errorCodes";

export interface AuthenticatedUser {
  userId: Id<"users">;
  username: string;
  privyId: string; // Privy DID (did:privy:xxx) for HD wallet operations
}

/**
 * Get the current authenticated user
 * Uses Privy JWT verification via ctx.auth.getUserIdentity()
 * Returns null if not authenticated or user not found in DB
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // identity.subject is the Privy DID (did:privy:xxx)
  const privyId = identity.subject;
  const user = await ctx.db
    .query("users")
    .withIndex("privyId", (q) => q.eq("privyId", privyId))
    .first();

  if (!user) {
    return null;
  }

  return {
    userId: user._id,
    username: user.username || user.name || "",
    privyId, // Include Privy DID for wallet operations
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
