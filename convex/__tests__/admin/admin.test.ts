/**
 * Admin Module Tests
 *
 * Tests for admin role management, permissions, and audit logging.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import schema from "@convex/schema";
import { modules } from "@convex/test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

// Type helper to avoid TS2589/TS7053 deep instantiation errors
// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const adminAdmin: any = (api as any)["admin/admin"];
// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const adminMutations: any = (api as any)["admin/mutations"];
// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const _adminRoles: any = (api as any)["admin/roles"];

// Helper to create test instance
const createTestInstance = () => convexTest(schema, modules);

// Helper to create a user
async function createUser(
  t: ReturnType<typeof createTestInstance>,
  email: string,
  username: string
) {
  const privyId = `did:privy:test_${email.replace(/[^a-z0-9]/gi, "_")}`;
  const userId = await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("users", {
      email,
      username,
      privyId,
      createdAt: Date.now(),
    });
  });
  return { userId, privyId };
}

// Helper to create superadmin
async function createSuperadmin(
  t: ReturnType<typeof createTestInstance>,
  email: string,
  username: string
) {
  const privyId = `did:privy:test_${email.replace(/[^a-z0-9]/gi, "_")}`;
  const userId = await t.run(async (ctx: MutationCtx) => {
    const uid = await ctx.db.insert("users", {
      email,
      username,
      privyId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("adminRoles", {
      userId: uid,
      role: "superadmin",
      grantedBy: uid,
      grantedAt: Date.now(),
      isActive: true,
    });

    return uid;
  });
  return { userId, privyId };
}

// Helper to create user with specific role
async function createUserWithRole(
  t: ReturnType<typeof createTestInstance>,
  email: string,
  username: string,
  role: "moderator" | "admin" | "superadmin",
  grantedBy: Id<"users">
) {
  const privyId = `did:privy:test_${email.replace(/[^a-z0-9]/gi, "_")}`;
  const userId = await t.run(async (ctx: MutationCtx) => {
    const uid = await ctx.db.insert("users", {
      email,
      username,
      privyId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("adminRoles", {
      userId: uid,
      role,
      grantedBy,
      grantedAt: Date.now(),
      isActive: true,
    });

    return uid;
  });
  return { userId, privyId };
}

// =============================================================================
// SYSTEM STATS TESTS
// =============================================================================

describe("getSystemStats", () => {
  it("should return system stats for moderator", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: moderatorId, privyId: moderatorPrivyId } = await createUserWithRole(
      t,
      "moderator@test.com",
      "moderator",
      "moderator",
      superadminId
    );

    const asModerator = t.withIdentity({ subject: moderatorPrivyId });
    const stats = await asModerator.query(adminAdmin.getSystemStats, {});

    expect(stats).toBeDefined();
    expect(stats).toHaveProperty("totalPlayers");
    expect(stats).toHaveProperty("totalGames");
    expect(stats).toHaveProperty("activeGames");
  });

  it("should deny access to regular users", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createUser(t, "user@test.com", "regularuser");

    const asUser = t.withIdentity({ subject: privyId });

    await expect(asUser.query(adminAdmin.getSystemStats, {})).rejects.toThrowError(
      /moderator.*required|permission/i
    );
  });
});

// =============================================================================
// GRANT ADMIN ROLE TESTS
// =============================================================================

describe("grantAdminRole", () => {
  it("should allow superadmin to grant admin role", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: targetUserId, privyId: targetPrivyId } = await createUser(
      t,
      "target@test.com",
      "targetuser"
    );

    const asSuperadmin = t.withIdentity({ subject: superadminPrivyId });
    const result = await asSuperadmin.mutation(adminAdmin.grantAdminRole, {
      userId: targetUserId,
      role: "admin",
    });

    expect(result.success).toBe(true);

    // Verify role was granted
    const role = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db
        .query("adminRoles")
        .withIndex("by_user", (q) => q.eq("userId", targetUserId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
    });

    expect(role).toBeTruthy();
    expect(role?.role).toBe("admin");
  });

  it("should allow admin to grant moderator role", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: adminId, privyId: adminPrivyId } = await createUserWithRole(
      t,
      "admin@test.com",
      "admin",
      "admin",
      superadminId
    );
    const { userId: targetUserId, privyId: targetPrivyId } = await createUser(
      t,
      "target@test.com",
      "targetuser"
    );

    const asAdmin = t.withIdentity({ subject: adminPrivyId });
    const result = await asAdmin.mutation(adminAdmin.grantAdminRole, {
      userId: targetUserId,
      role: "moderator",
    });

    expect(result.success).toBe(true);
  });

  it("should NOT allow admin to grant admin role (hierarchy enforcement)", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: adminId, privyId: adminPrivyId } = await createUserWithRole(
      t,
      "admin@test.com",
      "admin",
      "admin",
      superadminId
    );
    const { userId: targetUserId, privyId: targetPrivyId } = await createUser(
      t,
      "target@test.com",
      "targetuser"
    );

    const asAdmin = t.withIdentity({ subject: adminPrivyId });

    await expect(
      asAdmin.mutation(adminAdmin.grantAdminRole, {
        userId: targetUserId,
        role: "admin",
      })
    ).rejects.toThrowError(/cannot grant role|permission/i);
  });

  it("should NOT allow moderator to grant any role", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: moderatorId, privyId: moderatorPrivyId } = await createUserWithRole(
      t,
      "moderator@test.com",
      "moderator",
      "moderator",
      superadminId
    );
    const { userId: targetUserId, privyId: targetPrivyId } = await createUser(
      t,
      "target@test.com",
      "targetuser"
    );

    const asModerator = t.withIdentity({ subject: moderatorPrivyId });

    await expect(
      asModerator.mutation(adminAdmin.grantAdminRole, {
        userId: targetUserId,
        role: "moderator",
      })
    ).rejects.toThrowError(/cannot grant role|permission/i);
  });

  it("should deny access to regular users", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createUser(t, "user@test.com", "regularuser");
    const { userId: targetUserId, privyId: targetPrivyId } = await createUser(
      t,
      "target@test.com",
      "targetuser"
    );

    const asUser = t.withIdentity({ subject: privyId });

    await expect(
      asUser.mutation(adminAdmin.grantAdminRole, {
        userId: targetUserId,
        role: "moderator",
      })
    ).rejects.toThrowError(/cannot grant role|permission/i);
  });
});

// =============================================================================
// REVOKE ADMIN ROLE TESTS
// =============================================================================

describe("revokeAdminRole", () => {
  it("should allow superadmin to revoke admin role", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: adminId, privyId: adminPrivyId } = await createUserWithRole(
      t,
      "admin@test.com",
      "admin",
      "admin",
      superadminId
    );

    const asSuperadmin = t.withIdentity({ subject: superadminPrivyId });
    const result = await asSuperadmin.mutation(adminAdmin.revokeAdminRole, {
      userId: adminId,
    });

    expect(result.success).toBe(true);

    // Verify role was revoked
    const role = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db
        .query("adminRoles")
        .withIndex("by_user", (q) => q.eq("userId", adminId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
    });

    expect(role).toBeNull();
  });

  it("should allow admin to revoke moderator role", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: adminId, privyId: adminPrivyId } = await createUserWithRole(
      t,
      "admin@test.com",
      "admin",
      "admin",
      superadminId
    );
    const { userId: moderatorId, privyId: moderatorPrivyId } = await createUserWithRole(
      t,
      "moderator@test.com",
      "moderator",
      "moderator",
      adminId
    );

    const asAdmin = t.withIdentity({ subject: adminPrivyId });
    const result = await asAdmin.mutation(adminAdmin.revokeAdminRole, {
      userId: moderatorId,
    });

    expect(result.success).toBe(true);
  });

  it("should NOT allow self-revocation (self-protection)", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );

    const asSuperadmin = t.withIdentity({ subject: superadminPrivyId });

    // Should fail with self-protection error
    await expect(
      asSuperadmin.mutation(adminAdmin.revokeAdminRole, {
        userId: superadminId,
      })
    ).rejects.toThrowError(/Cannot revoke your own admin role/);
  });

  it("should NOT allow admin to revoke admin role (hierarchy enforcement)", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: adminId, privyId: adminPrivyId } = await createUserWithRole(
      t,
      "admin@test.com",
      "admin",
      "admin",
      superadminId
    );
    const { userId: otherAdminId, privyId: otherAdminPrivyId } = await createUserWithRole(
      t,
      "admin2@test.com",
      "admin2",
      "admin",
      superadminId
    );

    const asAdmin = t.withIdentity({ subject: adminPrivyId });

    await expect(
      asAdmin.mutation(adminAdmin.revokeAdminRole, {
        userId: otherAdminId,
      })
    ).rejects.toThrowError(/cannot revoke role|permission/i);
  });
});

// =============================================================================
// AUDIT LOG TESTS
// =============================================================================

describe("getAuditLog", () => {
  it("should return audit logs for moderator", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: moderatorId, privyId: moderatorPrivyId } = await createUserWithRole(
      t,
      "moderator@test.com",
      "moderator",
      "moderator",
      superadminId
    );

    // Create some audit log entries
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("adminAuditLogs", {
        adminId: superadminId,
        action: "grant_role",
        targetUserId: moderatorId,
        metadata: { role: "moderator" },
        timestamp: Date.now(),
        success: true,
      });
      await ctx.db.insert("adminAuditLogs", {
        adminId: superadminId,
        action: "view_stats",
        timestamp: Date.now() - 1000,
        success: true,
      });
    });

    const asModerator = t.withIdentity({ subject: moderatorPrivyId });
    const result = await asModerator.query(adminAdmin.getAuditLog, {
      limit: 10,
    });

    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("hasMore");
    expect(result.logs.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter audit logs by action", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );

    // Create audit log entries with different actions
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("adminAuditLogs", {
        adminId: superadminId,
        action: "grant_role",
        timestamp: Date.now(),
        success: true,
      });
      await ctx.db.insert("adminAuditLogs", {
        adminId: superadminId,
        action: "delete_user",
        timestamp: Date.now() - 1000,
        success: true,
      });
      await ctx.db.insert("adminAuditLogs", {
        adminId: superadminId,
        action: "grant_role",
        timestamp: Date.now() - 2000,
        success: true,
      });
    });

    const asSuperadmin = t.withIdentity({ subject: superadminPrivyId });
    const result = await asSuperadmin.query(adminAdmin.getAuditLog, {
      limit: 10,
      action: "grant_role",
    });

    expect(result.logs.every((log: { action: string }) => log.action === "grant_role")).toBe(true);
  });

  it("should support pagination with cursor", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );

    // Create many audit log entries
    await t.run(async (ctx: MutationCtx) => {
      for (let i = 0; i < 15; i++) {
        await ctx.db.insert("adminAuditLogs", {
          adminId: superadminId,
          action: `action_${i}`,
          timestamp: Date.now() - i * 1000,
          success: true,
        });
      }
    });

    const asSuperadmin = t.withIdentity({ subject: superadminPrivyId });

    // First page
    const page1 = await asSuperadmin.query(adminAdmin.getAuditLog, {
      limit: 5,
    });

    expect(page1.logs.length).toBe(5);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBeDefined();

    // Second page using cursor
    const page2 = await asSuperadmin.query(adminAdmin.getAuditLog, {
      limit: 5,
      cursor: page1.nextCursor,
    });

    expect(page2.logs.length).toBe(5);
    // Verify no overlap between pages
    const page1Ids = page1.logs.map((l: { _id: string }) => l._id);
    const page2Ids = page2.logs.map((l: { _id: string }) => l._id);
    expect(page1Ids.some((id: string) => page2Ids.includes(id))).toBe(false);
  });

  it("should deny access to regular users", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createUser(t, "user@test.com", "regularuser");

    const asUser = t.withIdentity({ subject: privyId });

    await expect(asUser.query(adminAdmin.getAuditLog, { limit: 10 })).rejects.toThrowError(
      /moderator.*required|permission/i
    );
  });
});

// =============================================================================
// DELETE USER BY EMAIL TESTS
// =============================================================================

describe("deleteUserByEmail", () => {
  it("should allow admin to delete user by email", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: adminId, privyId: adminPrivyId } = await createUserWithRole(
      t,
      "admin@test.com",
      "admin",
      "admin",
      superadminId
    );

    // Create user to delete (without auth session - that's managed by Convex Auth)
    const targetUserId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("users", {
        email: "todelete@test.com",
        username: "todelete",
        createdAt: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ subject: adminPrivyId });
    const result = await asAdmin.mutation(adminMutations.deleteUserByEmail, {
      email: "todelete@test.com",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Deleted user");

    // Verify user was deleted
    const user = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.get(targetUserId);
    });
    expect(user).toBeNull();
  });

  it("should return error for non-existent email", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: adminId, privyId: adminPrivyId } = await createUserWithRole(
      t,
      "admin@test.com",
      "admin",
      "admin",
      superadminId
    );

    const asAdmin = t.withIdentity({ subject: adminPrivyId });
    const result = await asAdmin.mutation(adminMutations.deleteUserByEmail, {
      email: "nonexistent@test.com",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("not found");
  });

  it("should deny access to moderators", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: moderatorId, privyId: moderatorPrivyId } = await createUserWithRole(
      t,
      "moderator@test.com",
      "moderator",
      "moderator",
      superadminId
    );

    const asModerator = t.withIdentity({ subject: moderatorPrivyId });

    await expect(
      asModerator.mutation(adminMutations.deleteUserByEmail, {
        email: "anyone@test.com",
      })
    ).rejects.toThrowError(/admin.*required|permission/i);
  });
});

// =============================================================================
// DELETE TEST USERS TESTS
// =============================================================================

describe("deleteTestUsers", () => {
  it("should allow superadmin to delete test users", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );

    // Create test users
    await t.run(async (ctx: MutationCtx) => {
      await ctx.db.insert("users", {
        email: "testuser1@test.com",
        username: "testuser1",
        createdAt: Date.now(),
      });
      await ctx.db.insert("users", {
        email: "testuser2@test.com",
        username: "testuser2",
        createdAt: Date.now(),
      });
      // Non-test user should not be deleted
      await ctx.db.insert("users", {
        email: "realuser@test.com",
        username: "realuser",
        createdAt: Date.now(),
      });
    });

    const asSuperadmin = t.withIdentity({ subject: superadminPrivyId });
    const result = await asSuperadmin.mutation(adminMutations.deleteTestUsers, {});

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBeGreaterThanOrEqual(2);

    // Verify test users were deleted
    const testUsers = await t.run(async (ctx: MutationCtx) => {
      const users = await ctx.db.query("users").collect();
      return users.filter((u) => u.email?.includes("testuser"));
    });
    expect(testUsers).toHaveLength(0);

    // Verify non-test user was not deleted
    const realUser = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", "realuser@test.com"))
        .first();
    });
    expect(realUser).toBeTruthy();
  });

  it("should deny access to admin (requires superadmin)", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: adminId, privyId: adminPrivyId } = await createUserWithRole(
      t,
      "admin@test.com",
      "admin",
      "admin",
      superadminId
    );

    const asAdmin = t.withIdentity({ subject: adminPrivyId });

    await expect(asAdmin.mutation(adminMutations.deleteTestUsers, {})).rejects.toThrowError(
      /superadmin.*required|permission/i
    );
  });
});

// =============================================================================
// GET MY ADMIN ROLE TESTS
// =============================================================================

describe("getMyAdminRole", () => {
  it("should return null for regular user", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createUser(t, "user@test.com", "regularuser");

    const asUser = t.withIdentity({ subject: privyId });
    const result = await asUser.query(adminAdmin.getMyAdminRole, {});

    expect(result).toBeNull();
  });

  it("should return role info for moderator", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: moderatorId, privyId: moderatorPrivyId } = await createUserWithRole(
      t,
      "moderator@test.com",
      "moderator",
      "moderator",
      superadminId
    );

    const asModerator = t.withIdentity({ subject: moderatorPrivyId });
    const result = await asModerator.query(adminAdmin.getMyAdminRole, {});

    expect(result).toBeTruthy();
    expect(result?.role).toBe("moderator");
    expect(result?.isModerator).toBe(true);
    expect(result?.isFullAdmin).toBe(false);
    expect(result?.isSuperAdmin).toBe(false);
  });

  it("should return role info for admin", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    const { userId: adminId, privyId: adminPrivyId } = await createUserWithRole(
      t,
      "admin@test.com",
      "admin",
      "admin",
      superadminId
    );

    const asAdmin = t.withIdentity({ subject: adminPrivyId });
    const result = await asAdmin.query(adminAdmin.getMyAdminRole, {});

    expect(result).toBeTruthy();
    expect(result?.role).toBe("admin");
    expect(result?.isModerator).toBe(true);
    expect(result?.isFullAdmin).toBe(true);
    expect(result?.isSuperAdmin).toBe(false);
  });

  it("should return role info for superadmin", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );

    const asSuperadmin = t.withIdentity({ subject: superadminPrivyId });
    const result = await asSuperadmin.query(adminAdmin.getMyAdminRole, {});

    expect(result).toBeTruthy();
    expect(result?.role).toBe("superadmin");
    expect(result?.isModerator).toBe(true);
    expect(result?.isFullAdmin).toBe(true);
    expect(result?.isSuperAdmin).toBe(true);
  });
});

// =============================================================================
// LIST ADMINS TESTS
// =============================================================================

describe("listAdmins", () => {
  it("should list all admins for moderator", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    await createUserWithRole(t, "admin@test.com", "admin", "admin", superadminId);
    const { userId: moderatorId, privyId: moderatorPrivyId } = await createUserWithRole(
      t,
      "moderator@test.com",
      "moderator",
      "moderator",
      superadminId
    );

    const asModerator = t.withIdentity({ subject: moderatorPrivyId });
    const admins = await asModerator.query(adminAdmin.listAdmins, {});

    expect(admins.length).toBeGreaterThanOrEqual(3);
  });

  it("should filter admins by role", async () => {
    const t = createTestInstance();

    const { userId: superadminId, privyId: superadminPrivyId } = await createSuperadmin(
      t,
      "superadmin@test.com",
      "superadmin"
    );
    await createUserWithRole(t, "admin@test.com", "admin", "admin", superadminId);
    await createUserWithRole(t, "moderator@test.com", "moderator", "moderator", superadminId);

    const asSuperadmin = t.withIdentity({ subject: superadminPrivyId });
    const adminsOnly = await asSuperadmin.query(adminAdmin.listAdmins, {
      role: "admin",
    });

    expect(adminsOnly.every((a: { role: string }) => a.role === "admin")).toBe(true);
  });

  it("should deny access to regular users", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createUser(t, "user@test.com", "regularuser");

    const asUser = t.withIdentity({ subject: privyId });

    await expect(asUser.query(adminAdmin.listAdmins, {})).rejects.toThrowError(
      /moderator.*required|permission/i
    );
  });
});
