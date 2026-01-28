/**
 * Admin Core Module
 *
 * Consolidated admin queries and mutations for the admin dashboard.
 * Provides system stats, admin role management, and suspicious activity monitoring.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { requireRole, getUserRole, canManageRole, roleHierarchy, type UserRole } from "../lib/roles";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";

/**
 * Local helper to schedule audit logging without triggering TS2589
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

// =============================================================================
// System Stats & Dashboard
// =============================================================================

/**
 * Get system statistics for the admin dashboard
 * Aggregates data from users, gameLobbies, agents, and apiKeys tables
 * Requires moderator role or higher
 */
export const getSystemStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    const totalPlayers = allUsers.length;
    const humanPlayers = allUsers.filter((u) => !u.isAiAgent).length;
    const aiPlayers = allUsers.filter((u) => u.isAiAgent).length;

    // Get game stats
    const allLobbies = await ctx.db.query("gameLobbies").collect();
    const totalGames = allLobbies.length;
    const activeGames = allLobbies.filter(
      (l) => l.status === "active" || l.status === "waiting"
    ).length;
    const completedGames = allLobbies.filter((l) => l.status === "completed").length;

    // Count recent games (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentGames = allLobbies.filter((l) => {
      const createdAt = l._creationTime || 0;
      return createdAt >= thirtyDaysAgo;
    }).length;

    // Count players in queue (waiting lobbies without opponent)
    const playersInQueue = allLobbies.filter(
      (l) => l.status === "waiting" && !l.opponentId
    ).length;

    // Get API key stats
    const allApiKeys = await ctx.db.query("apiKeys").collect();
    const totalApiKeys = allApiKeys.length;
    const activeApiKeys = allApiKeys.filter((k) => k.isActive).length;

    return {
      totalPlayers,
      humanPlayers,
      aiPlayers,
      totalGames,
      activeGames,
      completedGames,
      recentGames,
      totalApiKeys,
      activeApiKeys,
      playersInQueue,
      activeSeason: null, // TODO: Implement season management
    };
  },
});

/**
 * Get suspicious activity report
 * Analyzes recent reports, bans, and unusual patterns
 * Requires moderator role or higher
 */
export const getSuspiciousActivityReport = query({
  args: {
    lookbackDays: v.number(),
  },
  handler: async (ctx, { lookbackDays }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - lookbackMs;

    // Get recent user reports
    const allReports = await ctx.db.query("userReports").collect();
    const recentReports = allReports.filter((r) => r.createdAt >= cutoffTime);
    const pendingReports = recentReports.filter((r) => r.status === "pending");

    // Get recent ban actions from audit logs
    const auditLogs = await ctx.db
      .query("adminAuditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(1000);

    const recentBans = auditLogs.filter(
      (log) => log.action === "ban_player" && log.timestamp >= cutoffTime && log.success
    );

    const recentWarnings = auditLogs.filter(
      (log) => log.action === "warn_player" && log.timestamp >= cutoffTime && log.success
    );

    // Build summary by category
    const summary: Array<{
      category: string;
      count: number;
      severity: "high" | "medium" | "low";
    }> = [];

    if (pendingReports.length > 0) {
      summary.push({
        category: "Pending Reports",
        count: pendingReports.length,
        severity: pendingReports.length > 10 ? "high" : pendingReports.length > 5 ? "medium" : "low",
      });
    }

    if (recentBans.length > 0) {
      summary.push({
        category: "Recent Bans",
        count: recentBans.length,
        severity: recentBans.length > 5 ? "high" : "medium",
      });
    }

    if (recentWarnings.length > 0) {
      summary.push({
        category: "Recent Warnings",
        count: recentWarnings.length,
        severity: "low",
      });
    }

    return {
      reportGeneratedAt: Date.now(),
      lookbackDays,
      suspiciousMatchups: 0, // TODO: Implement matchup analysis
      abnormalRatingChanges: 0, // TODO: Implement rating analysis
      recentBans: recentBans.length,
      recentWarnings: recentWarnings.length,
      summary,
    };
  },
});

// =============================================================================
// Admin Role Management (Wrappers for admin/roles.ts)
// =============================================================================

/**
 * Get current user's admin role
 * Maps backend role names to frontend expectations
 */
export const getMyAdminRole = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const role = await getUserRole(ctx, userId);

    if (role === "user") {
      return null;
    }

    // Map backend role to frontend format
    const roleLevel = roleHierarchy[role];

    // Get the actual admin role record for permissions
    const adminRole = await ctx.db
      .query("adminRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return {
      role,
      roleLevel,
      isAdmin: true,
      isModerator: roleLevel >= roleHierarchy.moderator,
      isFullAdmin: roleLevel >= roleHierarchy.admin,
      isSuperAdmin: role === "superadmin",
      permissions: [], // TODO: Add explicit permissions if needed
      grantedAt: adminRole?.grantedAt,
      grantedBy: adminRole?.grantedBy,
    };
  },
});

/**
 * List all admins
 * Wrapper for admin/roles.ts listAdminsByRole
 */
export const listAdmins = query({
  args: {
    role: v.optional(
      v.union(
        v.literal("moderator"),
        v.literal("admin"),
        v.literal("superadmin")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
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
 * Grant admin role to a user
 * Wrapper for admin/roles.ts grantRole
 */
export const grantAdminRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("moderator"),
      v.literal("admin"),
      v.literal("superadmin")
    ),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);

    let errorMessage: string | undefined;

    try {
      // Get actor's role
      const actorRole = await getUserRole(ctx, adminId);

      // Check if actor can grant this role
      if (!canManageRole(actorRole, args.role as UserRole)) {
        throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
          reason: `Cannot grant role '${args.role}' with current role '${actorRole}'`,
          actorRole,
          targetRole: args.role,
        });
      }

      // Check if target user exists
      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: args.userId,
        });
      }

      // Check if user already has an active role
      const existingRole = await ctx.db
        .query("adminRoles")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (existingRole) {
        // Check if trying to upgrade to a higher role
        const existingRoleLevel = roleHierarchy[existingRole.role as UserRole];
        const newRoleLevel = roleHierarchy[args.role as UserRole];

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
        userId: args.userId,
        role: args.role,
        grantedBy: adminId,
        grantedAt: Date.now(),
        isActive: true,
      });

      // Log successful action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "grant_role",
        targetUserId: args.userId,
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
      const targetUser = await ctx.db.get(args.userId);
      await scheduleAuditLog(ctx, {
        adminId,
        action: "grant_role",
        targetUserId: args.userId,
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
 * Revoke admin role from a user
 * Wrapper for admin/roles.ts revokeRole
 */
export const revokeAdminRole = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);

    let errorMessage: string | undefined;

    try {
      // Get target user's role
      const existingRole = await ctx.db
        .query("adminRoles")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (!existingRole) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "User does not have an active admin role",
        });
      }

      // Get actor's role
      const actorRole = await getUserRole(ctx, adminId);

      // Check if actor can revoke this role
      if (!canManageRole(actorRole, existingRole.role as UserRole)) {
        throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
          reason: `Cannot revoke role '${existingRole.role}' with current role '${actorRole}'`,
          actorRole,
          targetRole: existingRole.role,
        });
      }

      // Prevent self-revocation
      if (args.userId === adminId) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Cannot revoke your own admin role",
        });
      }

      const targetUser = await ctx.db.get(args.userId);

      // Deactivate role
      await ctx.db.patch(existingRole._id, {
        isActive: false,
      });

      // Log successful action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "revoke_role",
        targetUserId: args.userId,
        targetEmail: targetUser?.email,
        metadata: {
          revokedRole: existingRole.role,
          targetUsername: targetUser?.username,
        },
        success: true,
      });

      return {
        success: true,
        message: `Revoked role '${existingRole.role}' from user ${targetUser?.username || targetUser?.email || args.userId}`,
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      // Log failed action
      const targetUser = await ctx.db.get(args.userId);
      await scheduleAuditLog(ctx, {
        adminId,
        action: "revoke_role",
        targetUserId: args.userId,
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
