// @ts-nocheck - TODO: Add proper types
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
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "./convexAuth";
import { requireRole } from "./roles";
import type { Id, Doc } from "../_generated/dataModel";

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
const authenticatedQueryCtx = customCtx(query, {
  async auth(ctx) {
    // Use existing requireAuthQuery for consistent auth logic
    const { userId, privyId, username } = await requireAuthQuery(ctx);

    // Get full user document
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found in database");
    }

    return {
      userId,
      user,
      privyId,
      username,
    };
  },
});

/**
 * Custom context for authenticated mutations
 * Injects ctx.auth with { userId, user, privyId, username }
 */
const authenticatedMutationCtx = customCtx(mutation, {
  async auth(ctx) {
    // Use existing requireAuthMutation for consistent auth logic
    const { userId, privyId, username } = await requireAuthMutation(ctx);

    // Get full user document
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found in database");
    }

    return {
      userId,
      user,
      privyId,
      username,
    };
  },
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

/**
 * Custom context for admin-only queries
 * Injects ctx.auth with full user info + admin role validation
 */
const adminQueryCtx = customCtx(query, {
  async auth(ctx) {
    // First, authenticate the user
    const { userId, privyId, username } = await requireAuthQuery(ctx);

    // Get full user document
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found in database");
    }

    // Require admin role (throws if not admin)
    await requireRole(ctx, userId, "admin");

    // Get admin role details
    const adminRole = await ctx.db
      .query("adminRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!adminRole) {
      throw new Error("Admin role not found");
    }

    // Check if role has expired
    if (adminRole.expiresAt && adminRole.expiresAt < Date.now()) {
      throw new Error("Admin role has expired");
    }

    return {
      userId,
      user,
      privyId,
      username,
      adminRole,
      role: adminRole.role as "admin" | "superadmin",
    };
  },
});

/**
 * Custom context for admin-only mutations
 * Injects ctx.auth with full user info + admin role validation
 */
const adminMutationCtx = customCtx(mutation, {
  async auth(ctx) {
    // First, authenticate the user
    const { userId, privyId, username } = await requireAuthMutation(ctx);

    // Get full user document
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found in database");
    }

    // Require admin role (throws if not admin)
    await requireRole(ctx, userId, "admin");

    // Get admin role details
    const adminRole = await ctx.db
      .query("adminRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!adminRole) {
      throw new Error("Admin role not found");
    }

    // Check if role has expired
    if (adminRole.expiresAt && adminRole.expiresAt < Date.now()) {
      throw new Error("Admin role has expired");
    }

    return {
      userId,
      user,
      privyId,
      username,
      adminRole,
      role: adminRole.role as "admin" | "superadmin",
    };
  },
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
