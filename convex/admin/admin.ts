/**
 * Admin Core Module
 *
 * Consolidated admin queries and mutations for the admin dashboard.
 * Provides system stats, admin role management, and suspicious activity monitoring.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { rankedLeaderboardHumans } from "../infrastructure/aggregates";
import { ELO_SYSTEM } from "../lib/constants";
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
    const playersInQueue = allLobbies.filter((l) => l.status === "waiting" && !l.opponentId).length;

    // Get API key stats
    const allApiKeys = await ctx.db.query("apiKeys").collect();
    const totalApiKeys = allApiKeys.length;
    const activeApiKeys = allApiKeys.filter((k) => k.isActive).length;

    // Get active season info (placeholder until seasons table is added)
    // For now, create a synthetic "eternal" season based on date
    const now = new Date();
    const seasonNumber = Math.floor(
      (now.getFullYear() - 2024) * 4 + Math.floor(now.getMonth() / 3) + 1
    );
    const seasonStartMonth = Math.floor(now.getMonth() / 3) * 3; // 0, 3, 6, or 9
    const seasonStart = new Date(now.getFullYear(), seasonStartMonth, 1).getTime();
    const seasonEnd = new Date(now.getFullYear(), seasonStartMonth + 3, 0, 23, 59, 59).getTime();

    const activeSeason = {
      id: `season_${seasonNumber}`,
      name: `Season ${seasonNumber}`,
      startDate: seasonStart,
      endDate: seasonEnd,
      isActive: true,
    };

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
      activeSeason,
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

    // Analyze suspicious matchups - players who repeatedly play against the same opponent
    const recentMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_completed")
      .order("desc")
      .filter((q) => q.gte(q.field("completedAt"), cutoffTime))
      .take(1000);

    // Count matchup frequency between player pairs
    const matchupCounts = new Map<string, number>();
    for (const match of recentMatches) {
      // Create a normalized key (smaller ID first)
      const ids = [match.winnerId, match.loserId].sort();
      const key = `${ids[0]}_${ids[1]}`;
      matchupCounts.set(key, (matchupCounts.get(key) || 0) + 1);
    }

    // Flag matchups with 5+ games in the lookback period as suspicious
    const suspiciousMatchups = Array.from(matchupCounts.values()).filter(
      (count) => count >= 5
    ).length;

    // Analyze abnormal rating changes - look for rating changes > 50 in a single match
    // This could indicate win trading or exploit abuse
    const abnormalThreshold = 50; // Standard K-factor is 32, so 50+ is unusual
    const abnormalRatingChanges = recentMatches.filter((match) => {
      const winnerChange = match.winnerRatingAfter - match.winnerRatingBefore;
      const loserChange = Math.abs(match.loserRatingAfter - match.loserRatingBefore);
      return winnerChange > abnormalThreshold || loserChange > abnormalThreshold;
    }).length;

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
        severity:
          pendingReports.length > 10 ? "high" : pendingReports.length > 5 ? "medium" : "low",
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
      suspiciousMatchups,
      abnormalRatingChanges,
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

    // Define permissions based on role
    const permissionsMap: Record<UserRole, string[]> = {
      user: [],
      moderator: [
        "view_reports",
        "view_audit_logs",
        "view_player_profiles",
        "warn_players",
        "mute_players",
        "review_reports",
      ],
      admin: [
        "view_reports",
        "view_audit_logs",
        "view_player_profiles",
        "warn_players",
        "mute_players",
        "review_reports",
        "ban_players",
        "suspend_players",
        "grant_moderator_role",
        "revoke_moderator_role",
        "manage_cards",
        "manage_shop",
        "add_currency",
      ],
      superadmin: [
        "view_reports",
        "view_audit_logs",
        "view_player_profiles",
        "warn_players",
        "mute_players",
        "review_reports",
        "ban_players",
        "suspend_players",
        "grant_moderator_role",
        "revoke_moderator_role",
        "manage_cards",
        "manage_shop",
        "add_currency",
        "grant_admin_role",
        "revoke_admin_role",
        "delete_users",
        "system_config",
        "database_operations",
      ],
    };

    return {
      role,
      roleLevel,
      isAdmin: true,
      isModerator: roleLevel >= roleHierarchy.moderator,
      isFullAdmin: roleLevel >= roleHierarchy.admin,
      isSuperAdmin: role === "superadmin",
      permissions: permissionsMap[role] || [],
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
    role: v.optional(v.union(v.literal("moderator"), v.literal("admin"), v.literal("superadmin"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
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
    role: v.union(v.literal("moderator"), v.literal("admin"), v.literal("superadmin")),
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
 * Get audit log entries with filtering and pagination
 *
 * Supports filtering by:
 * - action: specific action type (e.g., "ban_player", "grant_role")
 * - adminId: specific admin who performed actions
 * - targetUserId: specific user who was targeted
 * - success: filter by success/failure status
 * - startDate/endDate: date range filtering
 *
 * Pagination uses cursor-based approach for efficiency
 */
export const getAuditLog = query({
  args: {
    limit: v.number(),
    cursor: v.optional(v.number()), // timestamp cursor for pagination
    action: v.optional(v.string()),
    adminId: v.optional(v.id("users")),
    targetUserId: v.optional(v.id("users")),
    success: v.optional(v.boolean()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const { limit, cursor, action, adminId, targetUserId, success, startDate, endDate } = args;

    // Choose the best index based on filters
    // biome-ignore lint/suspicious/noImplicitAnyLet: Type inferred from conditional query assignments
    let query;

    if (adminId) {
      // Filter by admin - use by_admin index
      query = ctx.db
        .query("adminAuditLogs")
        .withIndex("by_admin", (q) => q.eq("adminId", adminId))
        .order("desc");
    } else if (targetUserId) {
      // Filter by target user - use by_target_user index
      query = ctx.db
        .query("adminAuditLogs")
        .withIndex("by_target_user", (q) => q.eq("targetUserId", targetUserId))
        .order("desc");
    } else if (action) {
      // Filter by action - use by_action index
      query = ctx.db
        .query("adminAuditLogs")
        .withIndex("by_action", (q) => q.eq("action", action))
        .order("desc");
    } else if (success !== undefined) {
      // Filter by success status - use by_success index
      query = ctx.db
        .query("adminAuditLogs")
        .withIndex("by_success", (q) => q.eq("success", success))
        .order("desc");
    } else {
      // Default: sort by timestamp
      query = ctx.db.query("adminAuditLogs").withIndex("by_timestamp").order("desc");
    }

    // Apply cursor-based pagination (get logs older than cursor timestamp)
    if (cursor) {
      query = query.filter((q) => q.lt(q.field("timestamp"), cursor));
    }

    // Apply date range filters
    if (startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), startDate));
    }
    if (endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), endDate));
    }

    // Apply additional filters that couldn't use indexes
    if (action && !adminId && !targetUserId && success === undefined) {
      // action was already handled by index
    } else if (action) {
      query = query.filter((q) => q.eq(q.field("action"), action));
    }

    if (success !== undefined && adminId) {
      query = query.filter((q) => q.eq(q.field("success"), success));
    }

    // Fetch logs with limit + 1 to check for more pages
    const logs = await query.take(limit + 1);

    // Determine if there are more results
    const hasMore = logs.length > limit;
    const results = hasMore ? logs.slice(0, limit) : logs;

    // Get next cursor (timestamp of last result)
    const nextCursor =
      hasMore && results.length > 0 ? results[results.length - 1]?.timestamp : undefined;

    // Enrich logs with admin and target user details
    const enrichedLogs = await Promise.all(
      results.map(async (log) => {
        const admin = await ctx.db.get(log.adminId);
        const targetUser = log.targetUserId ? await ctx.db.get(log.targetUserId) : null;

        return {
          ...log,
          adminUsername: admin?.username || admin?.name || "Unknown",
          targetUsername: targetUser?.username || targetUser?.name || log.targetEmail || undefined,
        };
      })
    );

    return {
      logs: enrichedLogs,
      nextCursor,
      hasMore,
    };
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

/**
 * List players for admin operations (batch operations, player selector)
 * Returns simplified player data with ranking and type info
 * Requires moderator role or higher
 */
export const listPlayers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 200 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Get users
    const users = await ctx.db.query("users").take(limit);

    // Transform to PlayerOption format
    return users.map((user, index) => ({
      playerId: user._id,
      name: user.username || user.email || "Unknown",
      type: (user.isAiAgent ? "ai" : "human") as "ai" | "human",
      eloRating: user.rankedElo || 1000,
      rank: index + 1, // Simple ranking by query order
    }));
  },
});

/**
 * Get player profile for admin view
 * Returns extended player data including admin-specific fields
 */
export const getPlayerProfile = query({
  args: {
    playerId: v.id("users"),
  },
  handler: async (ctx, { playerId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const player = await ctx.db.get(playerId);
    if (!player) return null;

    // Calculate rank and percentile using the aggregate
    const { rank, percentile } = await calculatePlayerRankAndPercentile(ctx, player);

    // Try to find peak rating from match history
    const playerMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_winner", (q) => q.eq("winnerId", playerId))
      .take(100);

    // Find peak rating from match history
    let peakRating = player.rankedElo || ELO_SYSTEM.DEFAULT_RATING;
    for (const match of playerMatches) {
      if (match.winnerRatingAfter > peakRating) {
        peakRating = match.winnerRatingAfter;
      }
    }

    // Get player XP data for total score
    const playerXP = await ctx.db
      .query("playerXP")
      .withIndex("by_user", (q) => q.eq("userId", playerId))
      .first();

    return {
      _id: player._id,
      name: player.username || "Unknown",
      username: player.username,
      type: player.isAiAgent ? ("ai" as const) : ("human" as const),
      eloRating: player.rankedElo || ELO_SYSTEM.DEFAULT_RATING,
      seasonRating: player.casualRating || ELO_SYSTEM.DEFAULT_RATING,
      rank,
      percentile,
      lastActiveAt: player.lastStatsUpdate || player.createdAt || player._creationTime,
      createdAt: player.createdAt,
      aiDifficulty: player.isAiAgent ? ("medium" as const) : undefined,
      aiPersonality: player.isAiAgent ? "balanced" : undefined,
      peakRating,
      seasonId: null,
      stats: {
        gamesPlayed: (player.totalWins || 0) + (player.totalLosses || 0),
        gamesWon: player.totalWins || 0,
        totalScore: playerXP?.lifetimeXP || 0,
      },
    };
  },
});

/**
 * Helper function to calculate player rank and percentile
 * Uses the ranked leaderboard aggregate for O(log n) performance
 */
async function calculatePlayerRankAndPercentile(
  ctx: QueryCtx,
  player: Doc<"users">
): Promise<{ rank: number; percentile: number }> {
  const isAiAgent = player.isAiAgent || false;
  const namespace: "human" | "ai" = isAiAgent ? "ai" : "human";

  const playerRating = player.rankedElo || ELO_SYSTEM.DEFAULT_RATING;

  // Use aggregate for O(log n) rank lookup
  // The aggregate uses negative rating for descending sort
  const key = -playerRating;
  const index = await rankedLeaderboardHumans.indexOf(ctx, key, { namespace, id: player._id });
  const totalPlayers = await rankedLeaderboardHumans.count(ctx, { namespace });

  const rank = index + 1; // indexOf returns 0-based, convert to 1-based rank

  // Calculate percentile (higher is better - top 1% = 99 percentile)
  // Formula: ((totalPlayers - rank) / totalPlayers) * 100
  const percentile =
    totalPlayers > 0 ? Math.round(((totalPlayers - rank + 1) / totalPlayers) * 100) : 0;

  return { rank, percentile };
}

/**
 * Get player inventory for admin view
 * Returns all cards owned by a player with quantities and card details
 */
export const getPlayerInventory = query({
  args: {
    playerId: v.id("users"),
  },
  handler: async (ctx, { playerId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const player = await ctx.db.get(playerId);
    if (!player) return null;

    // Get all player cards
    const playerCards = await ctx.db
      .query("playerCards")
      .withIndex("by_user", (q) => q.eq("userId", playerId))
      .collect();

    // Batch fetch card definitions
    const cardDefIds = playerCards.map((pc) => pc.cardDefinitionId);
    const cardDefs = await Promise.all(cardDefIds.map((id) => ctx.db.get(id)));
    const cardDefMap = new Map(
      cardDefs.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    // Join with card definitions
    const inventory = playerCards
      .map((pc) => {
        const cardDef = cardDefMap.get(pc.cardDefinitionId);
        if (!cardDef) return null;

        return {
          playerCardId: pc._id,
          cardDefinitionId: pc.cardDefinitionId,
          name: cardDef.name,
          rarity: cardDef.rarity,
          archetype: cardDef.archetype,
          cardType: cardDef.cardType,
          attack: cardDef.attack,
          defense: cardDef.defense,
          cost: cardDef.cost,
          quantity: pc.quantity,
          isFavorite: pc.isFavorite,
          acquiredAt: pc.acquiredAt,
          imageUrl: cardDef.imageUrl,
        };
      })
      .filter((c) => c !== null);

    // Sort by rarity (legendary first) then by name
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    inventory.sort((a, b) => {
      const rarityDiff =
        (rarityOrder[a.rarity as keyof typeof rarityOrder] ?? 5) -
        (rarityOrder[b.rarity as keyof typeof rarityOrder] ?? 5);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name);
    });

    // Calculate summary stats
    const totalCards = inventory.reduce((sum, c) => sum + c.quantity, 0);
    const uniqueCards = inventory.length;
    const byRarity = {
      legendary: inventory
        .filter((c) => c.rarity === "legendary")
        .reduce((s, c) => s + c.quantity, 0),
      epic: inventory.filter((c) => c.rarity === "epic").reduce((s, c) => s + c.quantity, 0),
      rare: inventory.filter((c) => c.rarity === "rare").reduce((s, c) => s + c.quantity, 0),
      uncommon: inventory
        .filter((c) => c.rarity === "uncommon")
        .reduce((s, c) => s + c.quantity, 0),
      common: inventory.filter((c) => c.rarity === "common").reduce((s, c) => s + c.quantity, 0),
    };

    return {
      playerId,
      playerName: player.username || "Unknown",
      gold: player.gold || 0,
      totalCards,
      uniqueCards,
      byRarity,
      cards: inventory,
    };
  },
});
