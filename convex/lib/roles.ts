/**
 * Role-Based Access Control (RBAC) System
 *
 * Comprehensive role hierarchy and permission management system.
 * Supports role-based authorization with granular permissions.
 */

import type { Id } from "../_generated/dataModel";
import { ErrorCode, createError } from "./errorCodes";
import type { SharedCtx } from "./types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User role hierarchy (lowest to highest privilege)
 */
export type UserRole = "user" | "moderator" | "admin" | "superadmin";

/**
 * Role hierarchy levels (higher number = more permissions)
 */
export const roleHierarchy: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  superadmin: 3,
};

/**
 * Permission types for granular access control
 */
export type Permission =
  // User Management
  | "read:users"
  | "write:users"
  | "delete:users"
  | "ban:users"
  // Role Management
  | "manage:moderators"
  | "manage:admins"
  | "view:roles"
  // Analytics & Reports
  | "view:analytics"
  | "view:reports"
  | "manage:reports"
  // Economy & Shop
  | "manage:shop"
  | "manage:economy"
  | "view:transactions"
  // Content Management
  | "manage:cards"
  | "manage:quests"
  | "manage:achievements"
  // System Administration
  | "manage:system"
  | "view:logs"
  | "execute:cleanup";

/**
 * Role-to-permission mapping
 * Each role inherits all permissions from roles below it in the hierarchy
 */
export const rolePermissions: Record<UserRole, Permission[]> = {
  user: [],
  moderator: ["read:users", "view:reports", "manage:reports", "view:analytics"],
  admin: [
    "read:users",
    "write:users",
    "delete:users",
    "ban:users",
    "manage:moderators",
    "view:roles",
    "view:analytics",
    "view:reports",
    "manage:reports",
    "manage:shop",
    "manage:economy",
    "view:transactions",
    "manage:cards",
    "manage:quests",
    "manage:achievements",
    "view:logs",
  ],
  superadmin: [
    "read:users",
    "write:users",
    "delete:users",
    "ban:users",
    "manage:moderators",
    "manage:admins",
    "view:roles",
    "view:analytics",
    "view:reports",
    "manage:reports",
    "manage:shop",
    "manage:economy",
    "view:transactions",
    "manage:cards",
    "manage:quests",
    "manage:achievements",
    "manage:system",
    "view:logs",
    "execute:cleanup",
  ],
};

// ============================================================================
// ROLE HELPER FUNCTIONS
// ============================================================================

/**
 * Get user's role from database
 * Returns "user" if no admin role is found
 */
export async function getUserRole(ctx: SharedCtx, userId: Id<"users">): Promise<UserRole> {
  const adminRole = await ctx.db
    .query("adminRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!adminRole) {
    return "user";
  }

  // Map database role to UserRole type
  if (adminRole.role === "superadmin") {
    return "superadmin";
  }
  if (adminRole.role === "admin") {
    return "admin";
  }
  if (adminRole.role === "moderator") {
    return "moderator";
  }

  return "user";
}

/**
 * Check if a role has sufficient privilege level
 */
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole) {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission) {
  const permissions = rolePermissions[role];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return [...rolePermissions[role]];
}

/**
 * Check if a user can grant/revoke a specific role
 * Rules:
 * - Only superadmin can manage admin and superadmin roles
 * - Admins can manage moderator roles
 * - Cannot manage roles equal to or higher than your own
 */
export function canManageRole(actorRole: UserRole, targetRole: UserRole) {
  // Superadmin can manage all roles
  if (actorRole === "superadmin") {
    return true;
  }

  // Admin can manage moderators only
  if (actorRole === "admin" && targetRole === "moderator") {
    return true;
  }

  return false;
}

// ============================================================================
// AUTHORIZATION FUNCTIONS
// ============================================================================

/**
 * Require user to have a minimum role level
 * Throws error if insufficient permissions
 *
 * @param ctx - Convex context
 * @param userId - User ID to check
 * @param minRole - Minimum required role
 * @returns User's actual role and userId
 */
export async function requireRole(
  ctx: SharedCtx,
  userId: Id<"users">,
  minRole: UserRole
): Promise<{ role: UserRole; userId: Id<"users"> }> {
  const userRole = await getUserRole(ctx, userId);

  if (!hasRoleLevel(userRole, minRole)) {
    throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
      reason: `Role '${minRole}' or higher required (current: '${userRole}')`,
      requiredRole: minRole,
      currentRole: userRole,
    });
  }

  return { role: userRole, userId };
}

/**
 * Require user to have a specific permission
 * Throws error if permission not granted
 *
 * @param ctx - Convex context
 * @param userId - User ID to check
 * @param permission - Required permission
 * @returns User's role and userId
 */
export async function requirePermission(
  ctx: SharedCtx,
  userId: Id<"users">,
  permission: Permission
): Promise<{ role: UserRole; userId: Id<"users"> }> {
  const userRole = await getUserRole(ctx, userId);

  if (!hasPermission(userRole, permission)) {
    throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
      reason: `Permission '${permission}' required (current role: '${userRole}')`,
      requiredPermission: permission,
      currentRole: userRole,
    });
  }

  return { role: userRole, userId };
}

/**
 * Check if user has permission without throwing
 * Useful for conditional UI rendering
 *
 * @param ctx - Convex context
 * @param userId - User ID to check
 * @param permission - Permission to check
 * @returns true if user has permission
 */
export async function checkPermission(
  ctx: SharedCtx,
  userId: Id<"users">,
  permission: Permission
): Promise<boolean> {
  const userRole = await getUserRole(ctx, userId);
  return hasPermission(userRole, permission);
}

/**
 * Check if user has role level without throwing
 *
 * @param ctx - Convex context
 * @param userId - User ID to check
 * @param minRole - Minimum role to check
 * @returns true if user has role level
 */
export async function checkRole(
  ctx: SharedCtx,
  userId: Id<"users">,
  minRole: UserRole
): Promise<boolean> {
  const userRole = await getUserRole(ctx, userId);
  return hasRoleLevel(userRole, minRole);
}
