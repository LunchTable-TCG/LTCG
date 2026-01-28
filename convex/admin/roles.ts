/**
 * Admin Role Management
 *
 * Mutations for managing admin roles and permissions.
 * Requires superadmin privileges for most operations.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import {
  type UserRole,
  canManageRole,
  getUserRole,
  requireRole,
  roleHierarchy,
} from "../lib/roles";
import type { MutationCtx } from "../_generated/server";

/**
 * Local helper to schedule audit logging without triggering TS2589
 * Type boundary prevents "Type instantiation is excessively deep" errors
 * @ts-ignore on the scheduler call prevents deep type instantiation from Convex internal types
 */
async function scheduleAuditLog(
  ctx: MutationCtx,
  params: {
    adminId: Id<"users">;
    action: string;
    targetUserId?: Id<"users">;
    targetEmail?: string;
    metadata?: any;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
  }
) {
  // @ts-ignore - TS2589: Type instantiation is excessively deep with internal.lib references
  await ctx.scheduler.runAfter(0, internal.lib.adminAudit.logAdminAction, params);
}

/**
 * Grant a role to a user
 * Requires superadmin for admin/superadmin roles
 * Requires admin for moderator roles
 */
export const grantRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("moderator"), v.literal("admin"), v.literal("superadmin")),
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

        // Deactivate old role
        await ctx.db.patch(existingRole._id, {
          isActive: false,
        });
      }

      // Grant new role
      await ctx.db.insert("adminRoles", {
        userId: args.targetUserId,
        role: args.role,
        grantedBy: userId,
        grantedAt: Date.now(),
        isActive: true,
      });

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
        },
        success: true,
      });

      return {
        success: true,
        message: `Granted role '${args.role}' to user ${targetUser.username || targetUser.email}`,
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

      // Deactivate role
      await ctx.db.patch(existingRole._id, {
        isActive: false,
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

    // Fetch user details
    const admins = await Promise.all(
      adminRoles.map(async (adminRole) => {
        const user = await ctx.db.get(adminRole.userId);
        const grantedBy = await ctx.db.get(adminRole.grantedBy);

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
