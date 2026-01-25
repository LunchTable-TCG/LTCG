import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Auth Helper Utilities
 *
 * Shared authentication functions for validating session tokens
 * and retrieving authenticated user information.
 *
 * Uses the existing token-based authentication system from /convex/auth.ts
 */

/**
 * Validate a session token and return the authenticated user
 *
 * @param ctx - Query or Mutation context
 * @param token - Session token from client
 * @returns User info if authenticated, null otherwise
 *
 * @example
 * const user = await getUserFromToken(ctx, args.token);
 * if (!user) throw new Error("Not authenticated");
 */
export async function getUserFromToken(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined
): Promise<{ userId: Id<"users">; username: string } | null> {
  if (!token) return null;

  // Look up session by token
  const session = await ctx.db
    .query("sessions")
    .withIndex("token", (q) => q.eq("token", token))
    .first();

  // Capture timestamp once for consistency
  const now = Date.now();

  // Check if session exists and is not expired
  if (!session || session.expiresAt < now) {
    return null;
  }

  // Get user record
  const user = await ctx.db.get(session.userId);
  if (!user) return null;

  return {
    userId: user._id,
    username: user.username || user.name || "",
  };
}

/**
 * Require authentication and return user, or throw error
 *
 * @param ctx - Query or Mutation context
 * @param token - Session token from client
 * @returns User info if authenticated
 * @throws Error if not authenticated
 *
 * @example
 * const { userId, username } = await requireAuth(ctx, args.token);
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined
): Promise<{ userId: Id<"users">; username: string }> {
  const user = await getUserFromToken(ctx, token);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}
