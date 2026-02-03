/**
 * Admin Role Management
 *
 * Mutations for managing admin roles and permissions.
 * Requires superadmin privileges for most operations.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { scheduleAuditLog } from "../lib/internalHelpers";
import {
  type UserRole,
  canManageRole,
  getUserRole,
  requireRole,
  roleHierarchy,
} from "../lib/roles";

/**
 * Grant a role to a user with optional temporal settings
 * Requires superadmin for admin/superadmin roles
 * Requires admin for moderator roles
 */
export const grantRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("moderator"), v.literal("admin"), v.literal("superadmin")),
    expiresAt: v.optional(v.number()), // Optional expiration timestamp (null = permanent)
    grantNote: v.optional(v.string()), // Optional note/reason for grant
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    let errorMessage: string | undefined;

    try {
      // Get actor's role
      const actorRole = await getUserRole(ctx, userId);

      // Check if actor can grant this role
      if (!canManageRole(actorRole, args.role)) {
        throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
          reason: `Cannot grant role '${args.role}' with current role '${actorRole}'`,
          actorRole,
          targetRole: args.role,
        });
      }

      // Validate expiration if provided
      if (args.expiresAt && args.expiresAt <= Date.now()) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Expiration time must be in the future",
        });
      }

      // Check if target user exists
      const targetUser = await ctx.db.get(args.targetUserId);
      if (!targetUser) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: args.targetUserId,
        });
      }

      // Check if user already has an active role
      const existingRole = await ctx.db
        .query("adminRoles")
        .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (existingRole) {
        // Check if trying to upgrade to a higher role
        const existingRoleLevel = roleHierarchy[existingRole.role as UserRole];
        const newRoleLevel = roleHierarchy[args.role];

        if (newRoleLevel <= existingRoleLevel) {
          throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
            reason: `User already has role '${existingRole.role}'. Use revokeRole first to change roles.`,
          });
        }

        // Deactivate old role with revocation tracking
        await ctx.db.patch(existingRole._id, {
          isActive: false,
          revokedAt: Date.now(),
          revokedBy: userId,
        });
      }

      // Grant new role with temporal fields
      await ctx.db.insert("adminRoles", {
        userId: args.targetUserId,
        role: args.role,
        grantedBy: userId,
        grantedAt: Date.now(),
        isActive: true,
        expiresAt: args.expiresAt,
        grantNote: args.grantNote,
      });

      // Build message with expiration info
      const expirationInfo = args.expiresAt
        ? ` (expires: ${new Date(args.expiresAt).toISOString()})`
        : " (permanent)";

      // Log successful action
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "grant_role",
        targetUserId: args.targetUserId,
        targetEmail: targetUser.email,
        metadata: {
          role: args.role,
          previousRole: existingRole?.role,
          targetUsername: targetUser.username,
          expiresAt: args.expiresAt,
          grantNote: args.grantNote,
          isTemporal: !!args.expiresAt,
        },
        success: true,
      });

      return {
        success: true,
        message: `Granted role '${args.role}' to user ${targetUser.username || targetUser.email}${expirationInfo}`,
        expiresAt: args.expiresAt,
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      // Log failed action
      const targetUser = await ctx.db.get(args.targetUserId);
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "grant_role",
        targetUserId: args.targetUserId,
        targetEmail: targetUser?.email,
        metadata: {
          role: args.role,
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

/**
 * Revoke a user's admin role
 * Requires superadmin for admin/superadmin roles
 * Requires admin for moderator roles
 */
export const revokeRole = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    let errorMessage: string | undefined;

    try {
      // Get target user's role
      const existingRole = await ctx.db
        .query("adminRoles")
        .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (!existingRole) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "User does not have an active admin role",
        });
      }

      // Get actor's role
      const actorRole = await getUserRole(ctx, userId);

      // Check if actor can revoke this role
      if (!canManageRole(actorRole, existingRole.role as UserRole)) {
        throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
          reason: `Cannot revoke role '${existingRole.role}' with current role '${actorRole}'`,
          actorRole,
          targetRole: existingRole.role,
        });
      }

      // Prevent self-revocation
      if (args.targetUserId === userId) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Cannot revoke your own admin role",
        });
      }

      const targetUser = await ctx.db.get(args.targetUserId);

      // Deactivate role with revocation tracking
      await ctx.db.patch(existingRole._id, {
        isActive: false,
        revokedAt: Date.now(),
        revokedBy: userId,
      });

      // Log successful action
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "revoke_role",
        targetUserId: args.targetUserId,
        targetEmail: targetUser?.email,
        metadata: {
          revokedRole: existingRole.role,
          targetUsername: targetUser?.username,
          wasTemporary: !!existingRole.expiresAt,
          originalExpiration: existingRole.expiresAt,
        },
        success: true,
      });

      return {
        success: true,
        message: `Revoked role '${existingRole.role}' from user ${targetUser?.username || targetUser?.email || args.targetUserId}`,
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      // Log failed action
      const targetUser = await ctx.db.get(args.targetUserId);
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "revoke_role",
        targetUserId: args.targetUserId,
        targetEmail: targetUser?.email,
        metadata: {
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

/**
 * List all admins by role level
 * Requires moderator or higher
 */
export const listAdminsByRole = query({
  args: {
    role: v.optional(v.union(v.literal("moderator"), v.literal("admin"), v.literal("superadmin"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Require at least moderator role to view admin list
    await requireRole(ctx, userId, "moderator");

    // Get all active admin roles
    // biome-ignore lint/suspicious/noImplicitAnyLet: Type inferred from conditional query results
    let adminRoles;
    if (args.role) {
      adminRoles = await ctx.db
        .query("adminRoles")
        .withIndex("by_role", (q) =>
          q.eq("role", args.role as "moderator" | "admin" | "superadmin").eq("isActive", true)
        )
        .collect();
    } else {
      adminRoles = await ctx.db
        .query("adminRoles")
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    }

    const now = Date.now();

    // Fetch user details
    const admins = await Promise.all(
      adminRoles.map(async (adminRole) => {
        const user = await ctx.db.get(adminRole.userId);
        const grantedBy = await ctx.db.get(adminRole.grantedBy);

        // Calculate temporal status
        const isExpired = adminRole.expiresAt ? adminRole.expiresAt < now : false;
        const timeRemaining = adminRole.expiresAt ? adminRole.expiresAt - now : undefined;

        return {
          userId: adminRole.userId,
          username: user?.username,
          email: user?.email,
          role: adminRole.role,
          grantedBy: {
            userId: adminRole.grantedBy,
            username: grantedBy?.username,
            email: grantedBy?.email,
          },
          grantedAt: adminRole.grantedAt,
          // Temporal fields
          expiresAt: adminRole.expiresAt,
          grantNote: adminRole.grantNote,
          isTemporary: !!adminRole.expiresAt,
          isExpired,
          timeRemaining: timeRemaining && timeRemaining > 0 ? timeRemaining : undefined,
        };
      })
    );

    // Sort by role hierarchy (highest first)
    admins.sort((a, b) => {
      const aLevel = roleHierarchy[a.role as UserRole];
      const bLevel = roleHierarchy[b.role as UserRole];
      return bLevel - aLevel;
    });

    return admins;
  },
});

/**
 * Get current user's role and permissions
 * Useful for frontend to determine what UI to show
 */
export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const role = await getUserRole(ctx, userId);
    const roleLevel = roleHierarchy[role];

    return {
      role,
      roleLevel,
      isAdmin: role !== "user",
      isModerator: roleLevel >= roleHierarchy.moderator,
      isFullAdmin: roleLevel >= roleHierarchy.admin,
      isSuperAdmin: role === "superadmin",
    };
  },
});

/**
 * Extend a user's temporary role grant
 * Requires same permissions as granting the role
 */
export const extendRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newExpiresAt: v.number(), // New expiration timestamp
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get existing role
    const existingRole = await ctx.db
      .query("adminRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!existingRole) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User does not have an active admin role to extend",
      });
    }

    // Validate new expiration
    if (args.newExpiresAt <= Date.now()) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "New expiration time must be in the future",
      });
    }

    // Get actor's role and check permissions
    const actorRole = await getUserRole(ctx, userId);
    if (!canManageRole(actorRole, existingRole.role as UserRole)) {
      throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
        reason: `Cannot extend role '${existingRole.role}' with current role '${actorRole}'`,
      });
    }

    const targetUser = await ctx.db.get(args.targetUserId);

    // Update expiration
    await ctx.db.patch(existingRole._id, {
      expiresAt: args.newExpiresAt,
    });

    // Log action
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "extend_role",
      targetUserId: args.targetUserId,
      targetEmail: targetUser?.email,
      metadata: {
        role: existingRole.role,
        previousExpiration: existingRole.expiresAt,
        newExpiration: args.newExpiresAt,
        targetUsername: targetUser?.username,
      },
      success: true,
    });

    return {
      success: true,
      message: `Extended role '${existingRole.role}' until ${new Date(args.newExpiresAt).toISOString()}`,
      newExpiresAt: args.newExpiresAt,
    };
  },
});

/**
 * Make a temporary role permanent (remove expiration)
 * Requires same permissions as granting the role
 */
export const makeRolePermanent = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get existing role
    const existingRole = await ctx.db
      .query("adminRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!existingRole) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User does not have an active admin role",
      });
    }

    if (!existingRole.expiresAt) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Role is already permanent",
      });
    }

    // Get actor's role and check permissions
    const actorRole = await getUserRole(ctx, userId);
    if (!canManageRole(actorRole, existingRole.role as UserRole)) {
      throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
        reason: `Cannot modify role '${existingRole.role}' with current role '${actorRole}'`,
      });
    }

    const targetUser = await ctx.db.get(args.targetUserId);

    // Remove expiration
    await ctx.db.patch(existingRole._id, {
      expiresAt: undefined,
    });

    // Log action
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "make_role_permanent",
      targetUserId: args.targetUserId,
      targetEmail: targetUser?.email,
      metadata: {
        role: existingRole.role,
        previousExpiration: existingRole.expiresAt,
        targetUsername: targetUser?.username,
      },
      success: true,
    });

    return {
      success: true,
      message: `Made role '${existingRole.role}' permanent for ${targetUser?.username || targetUser?.email}`,
    };
  },
});

/**
 * Clean up expired roles (deactivate them)
 * Called by cron job or manually by superadmin
 */
export const cleanupExpiredRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // Only superadmin can run cleanup
    await requireRole(ctx, userId, "superadmin");

    const now = Date.now();

    // Find all expired but still active roles
    const expiredRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_expiration", (q) => q.eq("isActive", true))
      .filter((q) => q.and(q.neq(q.field("expiresAt"), undefined), q.lt(q.field("expiresAt"), now)))
      .collect();

    // Deactivate expired roles
    for (const role of expiredRoles) {
      await ctx.db.patch(role._id, {
        isActive: false,
        revokedAt: now,
      });
    }

    // Log action
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "cleanup_expired_roles",
      metadata: {
        expiredCount: expiredRoles.length,
        expiredUserIds: expiredRoles.map((r) => r.userId),
      },
      success: true,
    });

    return {
      success: true,
      message: `Deactivated ${expiredRoles.length} expired role(s)`,
      affectedCount: expiredRoles.length,
    };
  },
});

/**
 * Get roles expiring soon (for admin notifications)
 */
export const getExpiringRoles = query({
  args: {
    withinDays: v.optional(v.number()), // Default 7 days
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Require admin to view expiring roles
    await requireRole(ctx, userId, "admin");

    const daysAhead = args.withinDays ?? 7;
    const now = Date.now();
    const futureThreshold = now + daysAhead * 24 * 60 * 60 * 1000;

    // Get all active roles with expiration
    const allActiveRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_expiration", (q) => q.eq("isActive", true))
      .collect();

    // Filter for roles expiring within threshold
    const expiringRoles = allActiveRoles.filter(
      (role) => role.expiresAt && role.expiresAt > now && role.expiresAt <= futureThreshold
    );

    // Fetch user details
    const result = await Promise.all(
      expiringRoles.map(async (role) => {
        const user = await ctx.db.get(role.userId);
        const grantedBy = await ctx.db.get(role.grantedBy);

        return {
          userId: role.userId,
          username: user?.username,
          email: user?.email,
          role: role.role,
          expiresAt: role.expiresAt,
          timeRemaining: role.expiresAt! - now,
          grantNote: role.grantNote,
          grantedBy: {
            userId: role.grantedBy,
            username: grantedBy?.username,
          },
        };
      })
    );

    // Sort by expiration (soonest first)
    result.sort((a, b) => a.expiresAt! - b.expiresAt!);

    return result;
  },
});

// ============================================================================
// INTERNAL FUNCTIONS (for cron jobs)
// ============================================================================

/**
 * Internal mutation to clean up expired roles (called by cron job)
 * Does not require authentication - called by system
 */
export const autoCleanupExpiredRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all expired but still active roles
    const expiredRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_expiration", (q) => q.eq("isActive", true))
      .filter((q) => q.and(q.neq(q.field("expiresAt"), undefined), q.lt(q.field("expiresAt"), now)))
      .collect();

    if (expiredRoles.length === 0) {
      return { success: true, affectedCount: 0 };
    }

    // Deactivate expired roles
    for (const role of expiredRoles) {
      await ctx.db.patch(role._id, {
        isActive: false,
        revokedAt: now,
      });
    }

    return {
      success: true,
      affectedCount: expiredRoles.length,
      expiredUserIds: expiredRoles.map((r) => r.userId),
    };
  },
});
