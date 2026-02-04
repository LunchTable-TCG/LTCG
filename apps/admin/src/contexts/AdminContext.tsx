"use client";

/**
 * Admin Context
 *
 * Provides admin role and permission checking throughout the app.
 * Reusable, typesafe context for RBAC.
 */

import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import type { AdminRole } from "../types";
import { ROLE_PERMISSIONS } from "../types";

// =============================================================================
// Context Types
// =============================================================================

type AdminRoleData =
  | {
      role: AdminRole;
      roleLevel: number;
      isAdmin: boolean;
      isModerator: boolean;
      isFullAdmin: boolean;
      isSuperAdmin: boolean;
      permissions: string[];
      grantedAt?: number;
      grantedBy?: Id<"users">;
    }
  | null
  | undefined;

interface AdminContextValue {
  /** Current admin role data, null if not admin or loading */
  adminRole: AdminRoleData;
  /** Current player ID (for mutations that require it) */
  playerId: Id<"users"> | null;
  /** Whether the admin data is still loading */
  isLoading: boolean;
  /** Whether the user is authenticated (has a user account) */
  isAuthenticated: boolean;
  /** Whether the user is authenticated as an admin */
  isAdmin: boolean;
  /** The role type (superadmin, admin, moderator) */
  role: AdminRole | null;
  /** Check if the current admin has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if the current admin can manage other admins */
  canManageAdmins: boolean;
  /** Check if the current admin can perform moderation actions */
  canModerate: boolean;
  /** Check if the current admin can perform batch operations */
  canBatchOperate: boolean;
  /** All permissions for the current role */
  permissions: string[];
}

// =============================================================================
// Context Creation
// =============================================================================

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

// =============================================================================
// Provider Component
// =============================================================================

interface AdminProviderProps {
  children: ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  // Use convexHelpers to avoid TS2589 type instantiation errors
  const currentUser = useConvexQuery(typedApi.core.users.currentUser);
  // Only query admin role if user is authenticated (skip query if not)
  const adminRoleData = useConvexQuery(
    typedApi.admin.admin.getMyAdminRole,
    currentUser ? {} : "skip"
  ) as AdminRoleData | undefined;

  // Player ID is the same as user ID
  const playerId: Id<"users"> | null = currentUser?._id ?? null;

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AdminContextValue>(() => {
    // Loading states:
    // - currentUser === undefined: still loading user data
    // - currentUser exists AND adminRoleData === undefined: still loading admin role
    // NOT loading when currentUser is null (user not found/not authenticated)
    const isLoading =
      currentUser === undefined || (currentUser !== null && adminRoleData === undefined);
    // Authenticated if we have a user (not null, not undefined)
    const isAuthenticated = currentUser !== null && currentUser !== undefined;
    // Admin if we have an admin role (not null, not undefined)
    const isAdmin = adminRoleData !== null && adminRoleData !== undefined;
    const role: AdminRole | null = adminRoleData?.role ?? null;

    // Get all permissions for the role (including explicit permissions)
    const rolePermissions = role ? ROLE_PERMISSIONS[role] : [];
    const explicitPermissions = adminRoleData?.permissions ?? [];
    const permissions = [...new Set([...rolePermissions, ...explicitPermissions])];

    // Permission checker function
    const hasPermission = (permission: string): boolean => {
      if (!isAdmin) return false;
      return permissions.includes(permission);
    };

    return {
      adminRole: adminRoleData,
      playerId,
      isLoading,
      isAuthenticated,
      isAdmin,
      role,
      hasPermission,
      canManageAdmins: hasPermission("admin.manage"),
      canModerate: hasPermission("player.ban") || hasPermission("player.suspend"),
      canBatchOperate: hasPermission("batch.operations"),
      permissions,
    };
  }, [currentUser, adminRoleData, playerId]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access admin context
 * @throws Error if used outside AdminProvider
 */
export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);

  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }

  return context;
}

// =============================================================================
// Guard Component
// =============================================================================

interface RoleGuardProps {
  /** Required permission to view children */
  permission?: string;
  /** Required role level (superadmin has highest priority) */
  minRole?: AdminRole;
  /** Content to show when access is denied */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Component that guards content based on admin permissions
 * Reusable across the entire admin dashboard
 */
export function RoleGuard({ permission, minRole, fallback = null, children }: RoleGuardProps) {
  const { hasPermission, role, isLoading, isAdmin } = useAdmin();

  // Show nothing while loading
  if (isLoading) return null;

  // Not an admin
  if (!isAdmin) return fallback;

  // Check permission if specified
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  // Check minimum role if specified
  if (minRole) {
    const roleHierarchy: AdminRole[] = ["moderator", "admin", "superadmin"];
    const currentRoleIndex = role ? roleHierarchy.indexOf(role) : -1;
    const requiredRoleIndex = roleHierarchy.indexOf(minRole);

    if (currentRoleIndex < requiredRoleIndex) {
      return fallback;
    }
  }

  return children;
}

// =============================================================================
// Higher-Order Component
// =============================================================================

/**
 * HOC to wrap a component with role guard
 * Useful for protecting entire pages
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    permission?: string;
    minRole?: AdminRole;
    fallback?: ReactNode;
  } = {}
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard {...options}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}
