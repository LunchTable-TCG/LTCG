/**
 * CRUD Builders with Role-Based Access Control
 *
 * Custom query and mutation builders that wrap convex-helpers `crud`
 * with authentication and role-based authorization.
 *
 * NOTE: These builders do NOT include database triggers because
 * triggers wrap the db object which causes type incompatibility with crud().
 * CRUD operations are meant for simple admin tables that don't need
 * complex trigger logic anyway.
 *
 * Usage:
 * ======
 * import { crud } from "convex-helpers/server/crud";
 * import { adminQuery, adminMutation } from "./lib/crudBuilders";
 * import schema from "./schema";
 *
 * export const { create, read, update, destroy, paginate } = crud(
 *   schema,
 *   "newsArticles",
 *   adminQuery,
 *   adminMutation
 * );
 */

import { customCtx, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { mutation as rawMutation, query as rawQuery } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "./convexAuth";
import { ErrorCode, createError } from "./errorCodes";
import { getUserRole } from "./roles";
import type { UserRole } from "./roles";

// ============================================================================
// Auth Context Helpers
// ============================================================================

/**
 * Verify authentication (throws if not authenticated)
 */
async function verifyAuth(ctx: QueryCtx | MutationCtx) {
  const auth = await getCurrentUser(ctx);
  if (!auth) {
    throw createError(ErrorCode.AUTH_REQUIRED);
  }
}

/**
 * Verify authentication + role (throws if insufficient permissions)
 */
async function verifyRole(ctx: QueryCtx | MutationCtx, minRole: UserRole) {
  const auth = await getCurrentUser(ctx);
  if (!auth) {
    throw createError(ErrorCode.AUTH_REQUIRED);
  }

  const role = await getUserRole(ctx, auth.userId);
  const roleHierarchy: Record<UserRole, number> = {
    user: 0,
    moderator: 1,
    admin: 2,
    superadmin: 3,
  };

  if (roleHierarchy[role] < roleHierarchy[minRole]) {
    throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
      reason: `Role '${minRole}' or higher required (current: '${role}')`,
      requiredRole: minRole,
      currentRole: role,
    });
  }
}

// ============================================================================
// Query Builders
// ============================================================================

/**
 * Query builder that requires authentication
 */
export const authQuery = customQuery(
  rawQuery,
  customCtx(async (ctx) => {
    await verifyAuth(ctx);
    return {};
  })
);

/**
 * Query builder that requires moderator role or higher
 */
export const moderatorQuery = customQuery(
  rawQuery,
  customCtx(async (ctx) => {
    await verifyRole(ctx, "moderator");
    return {};
  })
);

/**
 * Query builder that requires admin role or higher
 */
export const adminQuery = customQuery(
  rawQuery,
  customCtx(async (ctx) => {
    await verifyRole(ctx, "admin");
    return {};
  })
);

/**
 * Query builder that requires superadmin role
 */
export const superadminQuery = customQuery(
  rawQuery,
  customCtx(async (ctx) => {
    await verifyRole(ctx, "superadmin");
    return {};
  })
);

// ============================================================================
// Mutation Builders
// ============================================================================

/**
 * Mutation builder that requires authentication
 * NOTE: Does not include triggers for crud() compatibility
 */
export const authMutation = customMutation(
  rawMutation,
  customCtx(async (ctx) => {
    await verifyAuth(ctx);
    return {};
  })
);

/**
 * Mutation builder that requires moderator role or higher
 * NOTE: Does not include triggers for crud() compatibility
 */
export const moderatorMutation = customMutation(
  rawMutation,
  customCtx(async (ctx) => {
    await verifyRole(ctx, "moderator");
    return {};
  })
);

/**
 * Mutation builder that requires admin role or higher
 * NOTE: Does not include triggers for crud() compatibility
 */
export const adminMutation = customMutation(
  rawMutation,
  customCtx(async (ctx) => {
    await verifyRole(ctx, "admin");
    return {};
  })
);

/**
 * Mutation builder that requires superadmin role
 * NOTE: Does not include triggers for crud() compatibility
 */
export const superadminMutation = customMutation(
  rawMutation,
  customCtx(async (ctx) => {
    await verifyRole(ctx, "superadmin");
    return {};
  })
);

// ============================================================================
// Public Read Query Builder
// ============================================================================

/**
 * Query builder for public read access (no auth required)
 * Use this for read-only CRUD operations that should be publicly accessible
 */
export const publicQuery = rawQuery;
