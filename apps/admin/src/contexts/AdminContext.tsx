"use client";

/**
 * Admin Context
 *
 * Provides admin role and permission checking throughout the app.
 * Reusable, typesafe context for RBAC.
 */

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import type { AdminRole, AdminRoleData } from "../types";
import { ROLE_PERMISSIONS } from "../types";

// =============================================================================
// Context Types
// =============================================================================

interface AdminContextValue {
  /** Current admin role data, null if not admin or loading */
  adminRole: AdminRoleData | null | undefined;
  /** Current player ID (for mutations that require it) */
  playerId: import("@convex/_generated/dataModel").Id<"players"> | null;
  /** Whether the admin data is still loading */
  isLoading: boolean;
  /** Whether the user is authenticated (has a user account) */
  isAuthenticated: boolean;
  /** Whether the user is authenticated as an admin */
  isAdmin: boolean;
  /** The role type (super_admin, admin, moderator, support) */
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
  // Fetch the current user to check authentication status
  const currentUser = useQuery(api.auth.currentUser);
  // Fetch the current user's admin role from Convex
  const adminRole = useQuery(api.admin.admin.getMyAdminRole);
  // Fetch the current user's player data (for mutations that require playerId)
  const currentPlayer = useQuery(api.core.users.me);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AdminContextValue>(() => {
    // Loading if any query is still undefined
    const isLoading = currentUser === undefined || adminRole === undefined;
    // Authenticated if we have a user
    const isAuthenticated = currentUser !== null && currentUser !== undefined;
    // Admin if we have an admin role
    const isAdmin = !!adminRole;
    const role = (adminRole?.role as AdminRole | null) ?? null;
    const playerId = currentPlayer?._id ?? null;

    // Get all permissions for the role (including explicit permissions)
    const rolePermissions = role ? ROLE_PERMISSIONS[role] : [];
    const explicitPermissions = adminRole?.permissions ?? [];
    const permissions = [...new Set([...rolePermissions, ...explicitPermissions])];

    // Permission checker function
    const hasPermission = (permission: string): boolean => {
      if (!isAdmin) return false;
      return permissions.includes(permission);
    };

    return {
      adminRole,
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
  }, [currentUser, adminRole, currentPlayer]);

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
  /** Required role level (super_admin has highest priority) */
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
    const roleHierarchy: AdminRole[] = ["support", "moderator", "admin", "super_admin"];
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
