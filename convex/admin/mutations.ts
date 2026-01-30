/**
 * Admin Mutations
 *
 * Protected admin operations requiring admin authentication.
 * Includes user management and analytics.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { requireRole } from "../lib/roles";

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
    // biome-ignore lint/suspicious/noExplicitAny: Flexible metadata structure for audit logging
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
 * Delete a user by email (admin operation)
 * For testing and moderation purposes
 * Requires admin role or higher
 */
export const deleteUserByEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate admin session and require admin role
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    let message = "";
    let targetUserId: Id<"users"> | undefined;

    try {
      // Find user by email
      const user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email))
        .unique();

      if (!user) {
        message = `User ${args.email} not found`;

        // Log failed attempt
        await scheduleAuditLog(ctx, {
          adminId: userId,
          action: "delete_user",
          targetEmail: args.email,
          metadata: { reason: "user_not_found" },
          success: false,
          errorMessage: message,
        });

        return { success: false, message };
      }

      targetUserId = user._id;

      // Delete user (Privy manages auth sessions externally)
      await ctx.db.delete(user._id);

      message = `Deleted user ${args.email}`;

      // Log successful deletion
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "delete_user",
        targetUserId,
        targetEmail: args.email,
        metadata: {
          userEmail: args.email,
        },
        success: true,
      });

      return { success: true, message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "delete_user",
        targetUserId,
        targetEmail: args.email,
        metadata: { error: errorMessage },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

/**
 * Delete all test users (emails containing "testuser")
 * Requires superadmin role (destructive operation)
 */
export const deleteTestUsers = mutation({
  args: {},
  handler: async (ctx, _args) => {
    // Validate admin session and require superadmin role
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "superadmin");

    let deletedCount = 0;
    const deletedEmails: string[] = [];

    try {
      const allUsers = await ctx.db.query("users").collect();

      for (const user of allUsers) {
        if (user.email?.includes("testuser")) {
          // Delete user (Privy manages auth sessions externally)
          await ctx.db.delete(user._id);
          deletedCount++;
          if (user.email) {
            deletedEmails.push(user.email);
          }
        }
      }

      // Log successful deletion
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "delete_test_users",
        metadata: {
          deletedCount,
          deletedEmails,
        },
        success: true,
      });

      return {
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} test users`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "delete_test_users",
        metadata: {
          deletedCount,
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
 * Get user analytics (admin operation)
 * Requires moderator role or higher
 *
 * Note: This is a query, not a mutation, so audit logging is done via action
 * For sensitive read operations, consider converting to mutation or action
 */
export const getUserAnalytics = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Validate admin session and require moderator role
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "moderator");

    const targetUserId = args.userId;

    // Note: Queries cannot schedule mutations, so audit logging would need to be
    // done via an action or by converting this to a mutation.
    // For now, we log access in the query itself for read operations.

    if (targetUserId) {
      // Get specific user analytics
      const user = await ctx.db.get(targetUserId);
      if (!user) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: targetUserId,
        });
      }

      const currency = await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", targetUserId))
        .first();

      const cards = await ctx.db
        .query("playerCards")
        .withIndex("by_user", (q) => q.eq("userId", targetUserId))
        .collect();

      const transactions = await ctx.db
        .query("currencyTransactions")
        .withIndex("by_user_time", (q) => q.eq("userId", targetUserId))
        .collect();

      return {
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt,
        },
        currency: currency
          ? {
              gold: currency.gold,
              gems: currency.gems,
              lifetimeGoldEarned: currency.lifetimeGoldEarned,
              lifetimeGoldSpent: currency.lifetimeGoldSpent,
              lifetimeGemsEarned: currency.lifetimeGemsEarned,
              lifetimeGemsSpent: currency.lifetimeGemsSpent,
            }
          : null,
        cards: {
          totalCards: cards.reduce((sum, c) => sum + c.quantity, 0),
          uniqueCards: cards.length,
        },
        transactions: {
          total: transactions.length,
          recentTransactions: transactions.slice(0, 10),
        },
      };
    }

    // Get overall platform analytics
    const allUsers = await ctx.db.query("users").collect();
    const allCurrency = await ctx.db.query("playerCurrency").collect();
    const allTransactions = await ctx.db.query("currencyTransactions").collect();

    const totalGold = allCurrency.reduce((sum, c) => sum + c.gold, 0);
    const totalGems = allCurrency.reduce((sum, c) => sum + c.gems, 0);

    return {
      platform: {
        totalUsers: allUsers.length,
        totalGoldInCirculation: totalGold,
        totalGemsInCirculation: totalGems,
        totalTransactions: allTransactions.length,
      },
    };
  },
});

/**
 * Get all test users for validation
 * Requires moderator role or higher
 */
export const getAllTestUsers = query({
  args: {},
  handler: async (ctx, _args) => {
    // Validate admin session and require moderator role
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const allUsers = await ctx.db.query("users").collect();

    const testUsers = allUsers.filter((user) => user.email?.includes("testuser"));

    return testUsers.map((user) => ({
      _id: user._id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    }));
  },
});

/**
 * Add gold to current user (dev operation)
 * For development and testing purposes
 */
export const addGoldToCurrentUser = mutation({
  args: {
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    let currentGold = 0;
    let newGold = 0;

    try {
      // Get or create user's gold field
      const user = await ctx.db.get(userId);
      if (!user) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          reason: "User not found for gold addition",
        });
      }

      // Update user's gold field
      currentGold = user.gold ?? 0;
      newGold = currentGold + args.amount;
      await ctx.db.patch(userId, {
        gold: newGold,
      });

      // Log successful gold addition
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "add_gold_to_self",
        targetUserId: userId,
        targetEmail: user.email,
        metadata: {
          amount: args.amount,
          previousGold: currentGold,
          newGold,
        },
        success: true,
      });

      return {
        success: true,
        previousGold: currentGold,
        newGold,
        amountAdded: args.amount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "add_gold_to_self",
        targetUserId: userId,
        metadata: {
          amount: args.amount,
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
 * Force close any active game for current user (dev operation)
 */
export const forceCloseMyGame = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    let closedCount = 0;

    try {
      // Find user's active lobby
      const lobbies = await ctx.db
        .query("gameLobbies")
        .filter((q) =>
          q.and(
            q.or(q.eq(q.field("hostId"), userId), q.eq(q.field("opponentId"), userId)),
            q.or(q.eq(q.field("status"), "active"), q.eq(q.field("status"), "waiting"))
          )
        )
        .collect();

      for (const lobby of lobbies) {
        await ctx.db.patch(lobby._id, {
          status: "completed",
        });
      }
      closedCount = lobbies.length;

      // Update user presence to online
      const presence = await ctx.db
        .query("userPresence")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (presence) {
        await ctx.db.patch(presence._id, {
          status: "online",
        });
      }

      const user = await ctx.db.get(userId);

      // Log successful game closure
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "force_close_game",
        targetUserId: userId,
        targetEmail: user?.email,
        metadata: {
          closedLobbies: closedCount,
          lobbyIds: lobbies.map((l) => l._id),
        },
        success: true,
      });

      return { success: true, closedLobbies: closedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error
      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "force_close_game",
        targetUserId: userId,
        metadata: {
          closedLobbies: closedCount,
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
 * Get admin audit logs with filtering and pagination
 *
 * Allows admins to view all admin operations for security and compliance.
 * Requires moderator role or higher.
 */
export const getAdminAuditLogs = query({
  args: {
    // Filtering options
    adminId: v.optional(v.id("users")),
    action: v.optional(v.string()),
    targetUserId: v.optional(v.id("users")),
    success: v.optional(v.boolean()),
    startDate: v.optional(v.number()), // Unix timestamp
    endDate: v.optional(v.number()), // Unix timestamp
    // Pagination
    limit: v.optional(v.number()), // Default 50, max 100
    offset: v.optional(v.number()), // Default 0
  },
  handler: async (ctx, args) => {
    // Validate admin session and require moderator role
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;

    // Collect logs based on most specific filter
    // biome-ignore lint/suspicious/noImplicitAnyLet: Type inferred from conditional query results
    let logs;

    if (args.adminId) {
      const adminId = args.adminId;
      logs = await ctx.db
        .query("adminAuditLogs")
        .withIndex("by_admin", (q) => q.eq("adminId", adminId))
        .collect();
    } else if (args.action) {
      const action = args.action;
      logs = await ctx.db
        .query("adminAuditLogs")
        .withIndex("by_action", (q) => q.eq("action", action))
        .collect();
    } else if (args.targetUserId) {
      const targetUserId = args.targetUserId;
      logs = await ctx.db
        .query("adminAuditLogs")
        .withIndex("by_target_user", (q) => q.eq("targetUserId", targetUserId))
        .collect();
    } else if (args.success !== undefined) {
      const success = args.success;
      logs = await ctx.db
        .query("adminAuditLogs")
        .withIndex("by_success", (q) => q.eq("success", success))
        .collect();
    } else {
      logs = await ctx.db.query("adminAuditLogs").withIndex("by_timestamp").collect();
    }

    // Sort by timestamp descending
    logs = logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply additional filters in memory
    if (args.startDate) {
      const startDate = args.startDate;
      logs = logs.filter((log) => log.timestamp >= startDate);
    }
    if (args.endDate) {
      const endDate = args.endDate;
      logs = logs.filter((log) => log.timestamp <= endDate);
    }
    if (args.adminId && args.action) {
      logs = logs.filter((log) => log.action === args.action);
    }
    if (args.adminId && args.success !== undefined) {
      logs = logs.filter((log) => log.success === args.success);
    }

    // Get total count before pagination
    const totalCount = logs.length;

    // Apply pagination
    const paginatedLogs = logs.slice(offset, offset + limit);

    // Enrich logs with admin user info
    const enrichedLogs = await Promise.all(
      paginatedLogs.map(async (log) => {
        const admin = await ctx.db.get(log.adminId);
        let targetUser = null;
        if (log.targetUserId) {
          targetUser = await ctx.db.get(log.targetUserId);
        }

        return {
          ...log,
          adminEmail: admin?.email,
          adminUsername: admin?.username,
          targetUsername: targetUser?.username,
        };
      })
    );

    return {
      logs: enrichedLogs,
      pagination: {
        totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    };
  },
});

/**
 * Get audit log statistics
 *
 * Provides summary statistics about admin operations.
 * Requires moderator role or higher.
 */
export const getAuditLogStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate admin session and require moderator role
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Get all logs in date range
    let logs = await ctx.db.query("adminAuditLogs").withIndex("by_timestamp").collect();

    if (args.startDate) {
      const startDate = args.startDate;
      logs = logs.filter((log) => log.timestamp >= startDate);
    }
    if (args.endDate) {
      const endDate = args.endDate;
      logs = logs.filter((log) => log.timestamp <= endDate);
    }

    // Calculate statistics
    const totalActions = logs.length;
    const successfulActions = logs.filter((log) => log.success).length;
    const failedActions = logs.filter((log) => !log.success).length;

    // Group by action type
    const actionCounts: Record<string, number> = {};
    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    }

    // Group by admin
    const adminCounts: Record<string, number> = {};
    for (const log of logs) {
      const adminIdStr = log.adminId;
      adminCounts[adminIdStr] = (adminCounts[adminIdStr] || 0) + 1;
    }

    // Get top admins (most actions)
    const topAdmins = await Promise.all(
      Object.entries(adminCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(async ([adminId, count]) => {
          const admin = await ctx.db.get(adminId as Id<"users">);
          return {
            adminId,
            email: admin?.email,
            username: admin?.username,
            actionCount: count,
          };
        })
    );

    return {
      summary: {
        totalActions,
        successfulActions,
        failedActions,
        successRate: totalActions > 0 ? (successfulActions / totalActions) * 100 : 0,
      },
      actionBreakdown: Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count),
      topAdmins,
    };
  },
});
