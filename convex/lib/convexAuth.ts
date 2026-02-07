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

  // Generate a default username if none exists
  // Format: Player_{last8CharOfPrivyId}
  let username = user.username || user.name;
  if (!username || username.trim() === "") {
    const privyIdSuffix = privyId.slice(-8);
    username = `Player_${privyIdSuffix}`;
  }

  return {
    userId: user._id,
    username,
    privyId, // Include Privy DID for wallet operations
  };
}

/**
 * Get authenticated user by userId (for internal mutations called from httpActions)
 * Constructs AuthenticatedUser from a known userId without requiring Privy session auth.
 * Use this when the caller has already verified the user's identity (e.g., via API key).
 */
export async function getAuthForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<AuthenticatedUser> {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw createError(ErrorCode.AUTH_REQUIRED);
  }

  let username = user.username || user.name;
  if (!username || username.trim() === "") {
    username = `Player_${userId.slice(-8)}`;
  }

  return {
    userId,
    username,
    privyId: user.privyId || "",
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

/**
 * Require admin authentication in a mutation
 * Throws an error if not authenticated or not an admin
 */
export async function requireAdminMutation(ctx: MutationCtx): Promise<AuthenticatedUser> {
  const auth = await getCurrentUser(ctx);
  if (!auth) {
    throw createError(ErrorCode.AUTH_REQUIRED);
  }

  // Check if user has an active admin role
  const adminRole = await ctx.db
    .query("adminRoles")
    .withIndex("by_user", (q) => q.eq("userId", auth.userId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!adminRole) {
    throw createError(ErrorCode.AUTHZ_ADMIN_REQUIRED);
  }

  // Check if role has expired
  if (adminRole.expiresAt && adminRole.expiresAt < Date.now()) {
    throw createError(ErrorCode.AUTHZ_ADMIN_REQUIRED);
  }

  return auth;
}
