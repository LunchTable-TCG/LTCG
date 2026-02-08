/**
 * Custom Function Builders with Built-in Authentication
 *
 * This module provides custom query and mutation builders that automatically
 * inject authenticated user context using convex-helpers' customCtx.
 *
 * Benefits:
 * - No more repetitive auth checks at the start of every function
 * - Type-safe access to user info via ctx.auth
 * - Separation of concerns: auth logic lives here, business logic in handlers
 * - Consistent error handling for unauthenticated requests
 * - Admin-specific builders with role validation built-in
 *
 * Usage Example:
 *
 * ```typescript
 * // Before (manual auth):
 * export const getProfile = query({
 *   args: {},
 *   handler: async (ctx) => {
 *     const { userId } = await requireAuthQuery(ctx);
 *     const user = await ctx.db.get(userId);
 *     // ... business logic
 *   }
 * });
 *
 * // After (automatic auth):
 * export const getProfile = authedQuery({
 *   args: {},
 *   handler: async (ctx) => {
 *     // ctx.auth is already populated with { userId, user, privyId, username }
 *     const profile = await ctx.db.get(ctx.auth.userId);
 *     // ... business logic
 *   }
 * });
 *
 * // Admin-only endpoint:
 * export const deleteUser = adminMutation({
 *   args: { targetUserId: v.id("users") },
 *   handler: async (ctx, args) => {
 *     // ctx.auth includes { adminRole } with full admin record
 *     await ctx.db.delete(args.targetUserId);
 *   }
 * });
 * ```
 */

import { customCtx, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { wrapDatabaseReader, wrapDatabaseWriter } from "convex-helpers/server/rowLevelSecurity";
import type { Doc, Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "./convexAuth";
import { ErrorCode, createError } from "./errorCodes";
import { requireRole } from "./roles";
import { createRLSRules } from "./rowLevelSecurity";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Authenticated user context available in authedQuery and authedMutation
 */
export interface AuthContext {
  /** User's database ID */
  userId: Id<"users">;
  /** Full user document from database */
  user: Doc<"users">;
  /** Privy DID (did:privy:xxx) for wallet operations */
  privyId: string;
  /** User's display name (username or name) */
  username: string;
}

/**
 * Admin-authenticated context with role validation
 * Extends AuthContext with admin role information
 */
export interface AdminAuthContext extends AuthContext {
  /** Admin role document with permissions and expiry */
  adminRole: Doc<"adminRoles">;
  /** Admin role type: "admin" or "superadmin" */
  role: "admin" | "superadmin";
}

// =============================================================================
// AUTHENTICATED USER CONTEXT BUILDERS
// =============================================================================

/**
 * Custom context for regular authenticated users
 * Injects ctx.auth with { userId, user, privyId, username }
 */
// biome-ignore lint/suspicious/noExplicitAny: convex-helpers customCtx requires generic ctx
const authenticatedQueryCtx = customCtx(async (ctx: any) => {
  const { userId, privyId, username } = await requireAuthQuery(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw createError(ErrorCode.NOT_FOUND_USER);
  return { auth: { userId, user, privyId, username } };
});

/**
 * Custom context for authenticated mutations
 * Injects ctx.auth with { userId, user, privyId, username }
 */
// biome-ignore lint/suspicious/noExplicitAny: convex-helpers customCtx requires generic ctx
const authenticatedMutationCtx = customCtx(async (ctx: any) => {
  const { userId, privyId, username } = await requireAuthMutation(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw createError(ErrorCode.NOT_FOUND_USER);
  return { auth: { userId, user, privyId, username } };
});

/**
 * Query builder with automatic authentication
 *
 * All queries using this builder will have ctx.auth populated with:
 * - userId: Id<"users">
 * - user: Doc<"users">
 * - privyId: string
 * - username: string
 *
 * Throws AUTH_REQUIRED error if user is not authenticated.
 *
 * @example
 * ```typescript
 * export const myQuery = authedQuery({
 *   args: { gameId: v.id("games") },
 *   handler: async (ctx, args) => {
 *     // ctx.auth is automatically populated
 *     const userId = ctx.auth.userId;
 *     const username = ctx.auth.username;
 *     // ... your logic
 *   }
 * });
 * ```
 */
export const authedQuery = customQuery(query, authenticatedQueryCtx);

/**
 * Mutation builder with automatic authentication
 *
 * All mutations using this builder will have ctx.auth populated with:
 * - userId: Id<"users">
 * - user: Doc<"users">
 * - privyId: string
 * - username: string
 *
 * Throws AUTH_REQUIRED error if user is not authenticated.
 *
 * @example
 * ```typescript
 * export const updateProfile = authedMutation({
 *   args: { bio: v.string() },
 *   handler: async (ctx, args) => {
 *     // ctx.auth is automatically populated
 *     await ctx.db.patch(ctx.auth.userId, { bio: args.bio });
 *   }
 * });
 * ```
 */
export const authedMutation = customMutation(mutation, authenticatedMutationCtx);

// =============================================================================
// ADMIN-ONLY CONTEXT BUILDERS
// =============================================================================

/** Shared admin role lookup to avoid repeating untyped query builder code */
// biome-ignore lint/suspicious/noExplicitAny: ctx is untyped in customCtx callback
async function getAdminRole(ctx: any, userId: Id<"users">) {
  await requireRole(ctx, userId, "admin");
  const adminRole = await ctx.db
    .query("adminRoles")
    .withIndex("by_user", (q: { eq: (field: string, value: Id<"users">) => unknown }) =>
      q.eq("userId", userId)
    )
    .filter((q: { eq: (a: unknown, b: boolean) => unknown; field: (name: string) => unknown }) =>
      q.eq(q.field("isActive"), true)
    )
    .first();
  if (!adminRole) throw createError(ErrorCode.AUTHZ_ADMIN_REQUIRED);
  if (adminRole.expiresAt && adminRole.expiresAt < Date.now()) {
    throw createError(ErrorCode.AUTHZ_ADMIN_REQUIRED);
  }
  return adminRole;
}

/**
 * Custom context for admin-only queries
 * Injects ctx.auth with full user info + admin role validation
 */
// biome-ignore lint/suspicious/noExplicitAny: convex-helpers customCtx requires generic ctx
const adminQueryCtx = customCtx(async (ctx: any) => {
  const { userId, privyId, username } = await requireAuthQuery(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw createError(ErrorCode.NOT_FOUND_USER);
  const adminRole = await getAdminRole(ctx, userId);
  return {
    auth: {
      userId,
      user,
      privyId,
      username,
      adminRole,
      role: adminRole.role as "admin" | "superadmin",
    },
  };
});

/**
 * Custom context for admin-only mutations
 * Injects ctx.auth with full user info + admin role validation
 */
// biome-ignore lint/suspicious/noExplicitAny: convex-helpers customCtx requires generic ctx
const adminMutationCtx = customCtx(async (ctx: any) => {
  const { userId, privyId, username } = await requireAuthMutation(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw createError(ErrorCode.NOT_FOUND_USER);
  const adminRole = await getAdminRole(ctx, userId);
  return {
    auth: {
      userId,
      user,
      privyId,
      username,
      adminRole,
      role: adminRole.role as "admin" | "superadmin",
    },
  };
});

/**
 * Query builder with automatic admin authentication and role validation
 *
 * All queries using this builder will have ctx.auth populated with:
 * - userId: Id<"users">
 * - user: Doc<"users">
 * - privyId: string
 * - username: string
 * - adminRole: Doc<"adminRoles">
 * - role: "admin" | "superadmin"
 *
 * Throws AUTH_REQUIRED if not authenticated.
 * Throws AUTHZ_INSUFFICIENT_PERMISSIONS if user is not an admin.
 *
 * @example
 * ```typescript
 * export const getAdminStats = adminQuery({
 *   args: {},
 *   handler: async (ctx) => {
 *     // Only admins can reach this point
 *     const adminRole = ctx.auth.role; // "admin" | "superadmin"
 *     // ... admin logic
 *   }
 * });
 * ```
 */
export const adminQuery = customQuery(query, adminQueryCtx);

/**
 * Mutation builder with automatic admin authentication and role validation
 *
 * All mutations using this builder will have ctx.auth populated with:
 * - userId: Id<"users">
 * - user: Doc<"users">
 * - privyId: string
 * - username: string
 * - adminRole: Doc<"adminRoles">
 * - role: "admin" | "superadmin"
 *
 * Throws AUTH_REQUIRED if not authenticated.
 * Throws AUTHZ_INSUFFICIENT_PERMISSIONS if user is not an admin.
 *
 * @example
 * ```typescript
 * export const banUser = adminMutation({
 *   args: { targetUserId: v.id("users") },
 *   handler: async (ctx, args) => {
 *     // Only admins can reach this point
 *     const adminId = ctx.auth.userId;
 *     const adminRole = ctx.auth.role;
 *     // ... ban logic with audit trail
 *   }
 * });
 * ```
 */
export const adminMutation = customMutation(mutation, adminMutationCtx);

// =============================================================================
// ROW-LEVEL SECURITY (RLS) CONTEXT BUILDERS
// =============================================================================

/**
 * Custom context for authenticated queries with Row-Level Security
 * Injects ctx.auth and wraps ctx.db with RLS rules
 *
 * RLS automatically filters query results based on user permissions:
 * - Users only see their own data
 * - Admins can view more but cannot modify user data
 * - Superadmins have unrestricted access
 *
 * See lib/rowLevelSecurity.ts for rule definitions.
 */
// biome-ignore lint/suspicious/noExplicitAny: convex-helpers customCtx requires generic ctx
const rlsQueryCtx = customCtx(async (ctx: any) => {
  const { userId, privyId, username } = await requireAuthQuery(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw createError(ErrorCode.NOT_FOUND_USER);
  const rules = await createRLSRules(ctx, userId);
  return {
    auth: { userId, user, privyId, username },
    db: wrapDatabaseReader(ctx, ctx.db, rules),
  };
});

/**
 * Custom context for authenticated mutations with Row-Level Security
 * Injects ctx.auth and wraps ctx.db with RLS rules
 */
// biome-ignore lint/suspicious/noExplicitAny: convex-helpers customCtx requires generic ctx
const rlsMutationCtx = customCtx(async (ctx: any) => {
  const { userId, privyId, username } = await requireAuthMutation(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw createError(ErrorCode.NOT_FOUND_USER);
  const rules = await createRLSRules(ctx, userId);
  return {
    auth: { userId, user, privyId, username },
    db: wrapDatabaseWriter(ctx, ctx.db, rules),
  };
});

/**
 * Query builder with automatic authentication and Row-Level Security
 *
 * All queries using this builder will have:
 * - ctx.auth populated with { userId, user, privyId, username }
 * - ctx.db wrapped with RLS enforcement
 *
 * Database operations are automatically filtered by RLS rules:
 * - Read operations only return documents the user is allowed to see
 * - Unauthorized documents are silently filtered from query results
 *
 * Use this for tables with sensitive data that requires access control:
 * - apiKeys (users see only their own keys)
 * - playerCards (users see only their own cards)
 * - deckCards (users see only their own deck configurations)
 * - adminRoles (users cannot see admin role assignments)
 *
 * @example
 * ```typescript
 * export const getMyApiKeys = rlsQuery({
 *   args: {},
 *   handler: async (ctx) => {
 *     // RLS automatically filters to only this user's keys
 *     const keys = await ctx.db
 *       .query("apiKeys")
 *       .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
 *       .collect();
 *     return keys;
 *   }
 * });
 * ```
 */
export const rlsQuery = customQuery(query, rlsQueryCtx);

/**
 * Mutation builder with automatic authentication and Row-Level Security
 *
 * All mutations using this builder will have:
 * - ctx.auth populated with { userId, user, privyId, username }
 * - ctx.db wrapped with RLS enforcement
 *
 * Database operations are automatically validated by RLS rules:
 * - Insert operations fail if user cannot create the document
 * - Update/delete operations fail if user cannot modify the document
 * - Errors are thrown immediately on unauthorized operations
 *
 * Use this for tables with sensitive data that requires access control:
 * - apiKeys (users can only create/modify their own keys)
 * - playerCards (users can only modify their own card collections)
 * - deckCards (users can only modify their own deck configurations)
 * - adminRoles (only superadmins can grant/revoke roles)
 *
 * @example
 * ```typescript
 * export const createApiKey = rlsMutation({
 *   args: { agentId: v.id("agents") },
 *   handler: async (ctx, args) => {
 *     // RLS automatically validates the user can create this key
 *     const keyId = await ctx.db.insert("apiKeys", {
 *       userId: ctx.auth.userId,
 *       agentId: args.agentId,
 *       keyHash: generateHash(),
 *       keyPrefix: generatePrefix(),
 *       isActive: true,
 *       createdAt: Date.now(),
 *     });
 *     return keyId;
 *   }
 * });
 * ```
 */
export const rlsMutation = customMutation(mutation, rlsMutationCtx);
