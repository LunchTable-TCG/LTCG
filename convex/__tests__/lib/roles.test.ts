/**
 * Role-Based Access Control Tests
 *
 * Tests for the RBAC system including role hierarchy,
 * permission checking, and authorization functions.
 */

import { describe, expect, it } from "vitest";
import {
  type UserRole,
  canManageRole,
  getRolePermissions,
  hasPermission,
  hasRoleLevel,
  roleHierarchy,
} from "@convex/lib/roles";

describe("Role Hierarchy", () => {
  it("should define correct hierarchy levels", () => {
    expect(roleHierarchy.user).toBe(0);
    expect(roleHierarchy.moderator).toBe(1);
    expect(roleHierarchy.admin).toBe(2);
    expect(roleHierarchy.superadmin).toBe(3);
  });

  it("should validate role level comparisons", () => {
    expect(hasRoleLevel("user", "user")).toBe(true);
    expect(hasRoleLevel("user", "moderator")).toBe(false);

    expect(hasRoleLevel("moderator", "user")).toBe(true);
    expect(hasRoleLevel("moderator", "moderator")).toBe(true);
    expect(hasRoleLevel("moderator", "admin")).toBe(false);

    expect(hasRoleLevel("admin", "moderator")).toBe(true);
    expect(hasRoleLevel("admin", "admin")).toBe(true);
    expect(hasRoleLevel("admin", "superadmin")).toBe(false);

    expect(hasRoleLevel("superadmin", "admin")).toBe(true);
    expect(hasRoleLevel("superadmin", "superadmin")).toBe(true);
  });
});

describe("Permission System", () => {
  it("should grant correct permissions to moderators", () => {
    expect(hasPermission("moderator", "read:users")).toBe(true);
    expect(hasPermission("moderator", "view:reports")).toBe(true);
    expect(hasPermission("moderator", "manage:reports")).toBe(true);
    expect(hasPermission("moderator", "view:analytics")).toBe(true);

    // Should not have admin permissions
    expect(hasPermission("moderator", "delete:users")).toBe(false);
    expect(hasPermission("moderator", "manage:economy")).toBe(false);
  });

  it("should grant correct permissions to admins", () => {
    expect(hasPermission("admin", "read:users")).toBe(true);
    expect(hasPermission("admin", "write:users")).toBe(true);
    expect(hasPermission("admin", "delete:users")).toBe(true);
    expect(hasPermission("admin", "manage:shop")).toBe(true);
    expect(hasPermission("admin", "manage:economy")).toBe(true);
    expect(hasPermission("admin", "manage:moderators")).toBe(true);

    // Should not have superadmin permissions
    expect(hasPermission("admin", "manage:admins")).toBe(false);
    expect(hasPermission("admin", "execute:cleanup")).toBe(false);
  });

  it("should grant all permissions to superadmins", () => {
    expect(hasPermission("superadmin", "read:users")).toBe(true);
    expect(hasPermission("superadmin", "delete:users")).toBe(true);
    expect(hasPermission("superadmin", "manage:admins")).toBe(true);
    expect(hasPermission("superadmin", "manage:system")).toBe(true);
    expect(hasPermission("superadmin", "execute:cleanup")).toBe(true);
  });

  it("should deny all special permissions to regular users", () => {
    expect(hasPermission("user", "read:users")).toBe(false);
    expect(hasPermission("user", "view:reports")).toBe(false);
    expect(hasPermission("user", "manage:shop")).toBe(false);
  });

  it("should return all permissions for a role", () => {
    const modPerms = getRolePermissions("moderator");
    expect(modPerms).toContain("read:users");
    expect(modPerms).toContain("view:reports");
    expect(modPerms.length).toBeGreaterThan(0);

    const userPerms = getRolePermissions("user");
    expect(userPerms.length).toBe(0);
  });
});

describe("Role Management Permissions", () => {
  it("should allow superadmin to manage all roles", () => {
    expect(canManageRole("superadmin", "moderator")).toBe(true);
    expect(canManageRole("superadmin", "admin")).toBe(true);
    expect(canManageRole("superadmin", "superadmin")).toBe(true);
  });

  it("should allow admin to manage only moderators", () => {
    expect(canManageRole("admin", "moderator")).toBe(true);
    expect(canManageRole("admin", "admin")).toBe(false);
    expect(canManageRole("admin", "superadmin")).toBe(false);
  });

  it("should not allow moderators to manage any roles", () => {
    expect(canManageRole("moderator", "moderator")).toBe(false);
    expect(canManageRole("moderator", "admin")).toBe(false);
    expect(canManageRole("moderator", "superadmin")).toBe(false);
  });

  it("should not allow users to manage any roles", () => {
    expect(canManageRole("user", "moderator")).toBe(false);
    expect(canManageRole("user", "admin")).toBe(false);
  });
});

describe("Permission Inheritance", () => {
  it("should have moderator-level permissions available to admins", () => {
    const modPerms = getRolePermissions("moderator");
    const adminPerms = getRolePermissions("admin");

    for (const perm of modPerms) {
      expect(adminPerms).toContain(perm);
    }
  });

  it("should have admin-level permissions available to superadmins", () => {
    const adminPerms = getRolePermissions("admin");
    const superadminPerms = getRolePermissions("superadmin");

    for (const perm of adminPerms) {
      expect(superadminPerms).toContain(perm);
    }
  });
});

describe("Specific Permission Checks", () => {
  const testCases: Array<{
    permission: string;
    roles: { [key in UserRole]: boolean };
  }> = [
    {
      permission: "delete:users",
      roles: {
        user: false,
        moderator: false,
        admin: true,
        superadmin: true,
      },
    },
    {
      permission: "manage:reports",
      roles: {
        user: false,
        moderator: true,
        admin: true,
        superadmin: true,
      },
    },
    {
      permission: "execute:cleanup",
      roles: {
        user: false,
        moderator: false,
        admin: false,
        superadmin: true,
      },
    },
    {
      permission: "manage:admins",
      roles: {
        user: false,
        moderator: false,
        admin: false,
        superadmin: true,
      },
    },
  ];

  testCases.forEach(({ permission, roles }) => {
    it(`should correctly check permission '${permission}'`, () => {
      Object.entries(roles).forEach(([role, shouldHave]) => {
        // biome-ignore lint/suspicious/noExplicitAny: Test permission string cast
        expect(hasPermission(role as UserRole, permission as any)).toBe(shouldHave);
      });
    });
  });
});
