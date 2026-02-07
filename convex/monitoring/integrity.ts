/**
 * Production Integrity Monitoring
 *
 * Periodic checks for data anomalies that indicate race conditions,
 * duplicate rewards, or corrupted state. Runs every 5 minutes via cron.
 * Results visible at /analytics/integrity in the admin dashboard.
 */

import { internal } from "../_generated/api";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, query } from "../_generated/server";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// =============================================================================
// Individual Checks
// =============================================================================

async function checkNegativeBalances(ctx: QueryCtx | MutationCtx) {
  const negative = await ctx.db
    .query("playerCurrency")
    .filter((q) => q.or(q.lt(q.field("gold"), 0), q.lt(q.field("gems"), 0)))
    .take(20);

  return {
    name: "Negative Balances",
    severity: "critical" as const,
    status: negative.length > 0 ? ("anomaly" as const) : ("ok" as const),
    count: negative.length,
    details:
      negative.length > 0
        ? `${negative.length} account(s) with negative balance`
        : "All balances non-negative",
    items: negative.map((p) => ({
      id: p.userId as string,
      info: `gold: ${p.gold}, gems: ${p.gems}`,
    })),
  };
}

async function checkCurrencyConservation(ctx: QueryCtx | MutationCtx) {
  const allCurrency = await ctx.db.query("playerCurrency").take(500);

  const violations = allCurrency.filter(
    (p) => p.gold + p.lifetimeGoldSpent !== p.lifetimeGoldEarned
  );

  return {
    name: "Currency Conservation",
    severity: "critical" as const,
    status: violations.length > 0 ? ("anomaly" as const) : ("ok" as const),
    count: violations.length,
    details:
      violations.length > 0
        ? `${violations.length} account(s) violate gold conservation law`
        : "All accounts balanced",
    items: violations.slice(0, 10).map((p) => ({
      id: p.userId as string,
      info: `gold=${p.gold} + spent=${p.lifetimeGoldSpent} != earned=${p.lifetimeGoldEarned}`,
    })),
  };
}

async function checkDuplicateRewardTransactions(ctx: QueryCtx | MutationCtx) {
  // Check recent reward transactions for duplicate referenceIds
  const recentRewards = await ctx.db
    .query("currencyTransactions")
    .filter((q) =>
      q.and(
        q.eq(q.field("transactionType"), "reward"),
        q.neq(q.field("referenceId"), undefined)
      )
    )
    .order("desc")
    .take(500);

  // Group by referenceId and find duplicates
  const refCounts = new Map<string, number>();
  for (const tx of recentRewards) {
    if (tx.referenceId) {
      refCounts.set(tx.referenceId, (refCounts.get(tx.referenceId) || 0) + 1);
    }
  }

  const duplicates = Array.from(refCounts.entries()).filter(([, count]) => count > 1);

  return {
    name: "Duplicate Reward Transactions",
    severity: "warning" as const,
    status: duplicates.length > 0 ? ("anomaly" as const) : ("ok" as const),
    count: duplicates.length,
    details:
      duplicates.length > 0
        ? `${duplicates.length} referenceId(s) with multiple reward transactions`
        : "No duplicate rewards detected",
    items: duplicates.slice(0, 10).map(([refId, count]) => ({
      id: refId,
      info: `${count} transactions`,
    })),
  };
}

async function checkOrphanedFriendships(ctx: QueryCtx | MutationCtx) {
  const accepted = await ctx.db
    .query("friendships")
    .withIndex("by_status", (q) => q.eq("status", "accepted"))
    .take(500);

  const orphaned: Array<{ id: string; info: string }> = [];

  for (const f of accepted) {
    const reciprocal = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", f.friendId).eq("friendId", f.userId))
      .first();

    if (!reciprocal || reciprocal.status !== "accepted") {
      orphaned.push({
        id: f._id as string,
        info: `${f.userId} → ${f.friendId} (no reciprocal)`,
      });
      if (orphaned.length >= 10) break;
    }
  }

  return {
    name: "Orphaned Friendships",
    severity: "warning" as const,
    status: orphaned.length > 0 ? ("anomaly" as const) : ("ok" as const),
    count: orphaned.length,
    details:
      orphaned.length > 0
        ? `${orphaned.length} accepted friendship(s) missing reciprocal record`
        : "All friendships have reciprocal records",
    items: orphaned,
  };
}

async function checkDuplicateActiveSessions(ctx: QueryCtx | MutationCtx) {
  const activeSessions = await ctx.db
    .query("streamingSessions")
    .withIndex("by_status", (q) => q.eq("status", "live"))
    .take(200);

  const pendingSessions = await ctx.db
    .query("streamingSessions")
    .withIndex("by_status", (q) => q.eq("status", "initializing"))
    .take(200);

  const allActive = [...activeSessions, ...pendingSessions];

  // Group by userId and find duplicates
  const userCounts = new Map<string, number>();
  for (const s of allActive) {
    if (s.userId) {
      const key = s.userId as string;
      userCounts.set(key, (userCounts.get(key) || 0) + 1);
    }
  }

  const duplicates = Array.from(userCounts.entries()).filter(([, count]) => count > 1);

  return {
    name: "Duplicate Active Sessions",
    severity: "warning" as const,
    status: duplicates.length > 0 ? ("anomaly" as const) : ("ok" as const),
    count: duplicates.length,
    details:
      duplicates.length > 0
        ? `${duplicates.length} user(s) with multiple active streaming sessions`
        : "No duplicate sessions",
    items: duplicates.slice(0, 10).map(([userId, count]) => ({
      id: userId,
      info: `${count} active sessions`,
    })),
  };
}

async function checkStuckSessions(ctx: QueryCtx | MutationCtx) {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const liveSessions = await ctx.db
    .query("streamingSessions")
    .withIndex("by_status", (q) => q.eq("status", "live"))
    .take(100);

  const stuck = liveSessions.filter((s) => s.createdAt < oneDayAgo);

  return {
    name: "Stuck Sessions",
    severity: "info" as const,
    status: stuck.length > 0 ? ("anomaly" as const) : ("ok" as const),
    count: stuck.length,
    details:
      stuck.length > 0
        ? `${stuck.length} session(s) active for over 24 hours`
        : "No stuck sessions",
    items: stuck.slice(0, 10).map((s) => ({
      id: s._id as string,
      info: `created ${new Date(s.createdAt).toISOString()}`,
    })),
  };
}

async function checkAchievementOvergrants(ctx: QueryCtx | MutationCtx) {
  const unlocked = await ctx.db
    .query("userAchievements")
    .filter((q) => q.eq(q.field("isUnlocked"), true))
    .take(500);

  const overgrants: Array<{ id: string; info: string }> = [];

  for (const ua of unlocked) {
    const def = await ctx.db
      .query("achievementDefinitions")
      .filter((q) => q.eq(q.field("achievementId"), ua.achievementId))
      .first();

    if (def && ua.currentProgress < def.targetValue) {
      overgrants.push({
        id: `${ua.userId}:${ua.achievementId}`,
        info: `progress=${ua.currentProgress} < target=${def.targetValue}`,
      });
      if (overgrants.length >= 10) break;
    }
  }

  return {
    name: "Achievement Over-grants",
    severity: "warning" as const,
    status: overgrants.length > 0 ? ("anomaly" as const) : ("ok" as const),
    count: overgrants.length,
    details:
      overgrants.length > 0
        ? `${overgrants.length} achievement(s) unlocked with insufficient progress`
        : "All achievements correctly unlocked",
    items: overgrants,
  };
}

async function checkStalePendingRequests(ctx: QueryCtx | MutationCtx) {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

  const pending = await ctx.db
    .query("friendships")
    .withIndex("by_status", (q) => q.eq("status", "pending"))
    .take(500);

  const stale = pending.filter((f) => f.createdAt < ninetyDaysAgo);

  return {
    name: "Stale Pending Requests",
    severity: "info" as const,
    status: stale.length > 0 ? ("anomaly" as const) : ("ok" as const),
    count: stale.length,
    details:
      stale.length > 0
        ? `${stale.length} friend request(s) pending for over 90 days`
        : "No stale requests",
    items: stale.slice(0, 10).map((f) => ({
      id: f._id as string,
      info: `from ${f.userId} to ${f.friendId}, created ${new Date(f.createdAt).toISOString()}`,
    })),
  };
}

async function checkStoryProgressMismatch(ctx: QueryCtx | MutationCtx) {
  const completed = await ctx.db
    .query("storyProgress")
    .filter((q) => q.eq(q.field("status"), "completed"))
    .take(200);

  const mismatches: Array<{ id: string; info: string }> = [];

  for (const progress of completed) {
    const wonAttempts = await ctx.db
      .query("storyBattleAttempts")
      .filter((q) =>
        q.and(
          q.eq(q.field("progressId"), progress._id),
          q.eq(q.field("outcome"), "won")
        )
      )
      .collect();

    if (progress.timesCompleted > wonAttempts.length) {
      mismatches.push({
        id: progress._id as string,
        info: `timesCompleted=${progress.timesCompleted} but only ${wonAttempts.length} won attempts`,
      });
      if (mismatches.length >= 10) break;
    }
  }

  return {
    name: "Story Progress Mismatch",
    severity: "warning" as const,
    status: mismatches.length > 0 ? ("anomaly" as const) : ("ok" as const),
    count: mismatches.length,
    details:
      mismatches.length > 0
        ? `${mismatches.length} story progress record(s) with inflated completion count`
        : "All story progress consistent",
    items: mismatches,
  };
}

// =============================================================================
// Orchestrator (cron-triggered)
// =============================================================================

export const runIntegrityChecks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const checks = [
      await checkNegativeBalances(ctx),
      await checkCurrencyConservation(ctx),
      await checkDuplicateRewardTransactions(ctx),
      await checkOrphanedFriendships(ctx),
      await checkDuplicateActiveSessions(ctx),
      await checkStuckSessions(ctx),
      await checkAchievementOvergrants(ctx),
      await checkStalePendingRequests(ctx),
      await checkStoryProgressMismatch(ctx),
    ];

    const anomalies = checks.filter((c) => c.status === "anomaly");

    if (anomalies.length === 0) {
      return { status: "healthy", checksRun: checks.length, anomalies: 0 };
    }

    // Find or create the integrity alert rule
    let rule = await ctx.db
      .query("alertRules")
      .withIndex("by_type", (q) => q.eq("triggerType", "integrity_violation"))
      .first();

    if (!rule) {
      // Auto-create the rule on first run (needs a createdBy user)
      const anyAdmin = await ctx.db
        .query("adminRoles")
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (anyAdmin) {
        const ruleId = await ctx.db.insert("alertRules", {
          name: "Integrity Violation",
          description: "Automated data integrity check detected anomalies",
          isEnabled: true,
          triggerType: "integrity_violation",
          conditions: {},
          severity: "critical",
          cooldownMinutes: 5,
          createdBy: anyAdmin.userId,
          createdAt: Date.now(),
        });
        rule = await ctx.db.get(ruleId);
      }
    }

    if (!rule) {
      return { status: "error", message: "No admin found to create alert rule" };
    }

    // Check cooldown
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    if (rule.lastTriggeredAt && Date.now() - rule.lastTriggeredAt < cooldownMs) {
      return { status: "cooldown", anomalies: anomalies.length };
    }

    // Determine worst severity
    const hasCritical = anomalies.some((a) => a.severity === "critical");
    const severity = hasCritical ? "critical" : "warning";

    // Build summary
    const summary = anomalies.map((a) => `${a.name}: ${a.details}`).join("; ");

    // Record alert
    const alertId = await ctx.db.insert("alertHistory", {
      ruleId: rule._id,
      severity,
      title: `Integrity Check: ${anomalies.length} anomaly(s) detected`,
      message: summary,
      data: { checks: anomalies },
      channelsNotified: ["in_app"],
      createdAt: Date.now(),
    });

    // Update rule last triggered
    await ctx.db.patch(rule._id, { lastTriggeredAt: Date.now() });

    // Notify admins for critical issues
    if (hasCritical) {
      // Schedule notification to avoid mutation-in-mutation issues
      await ctx.scheduler.runAfter(0, internal.alerts.notifications.createForAllAdmins, {
        title: `Integrity Alert: ${anomalies.length} anomaly(s)`,
        message: summary,
        type: "alert",
        alertHistoryId: alertId,
      });
    }

    return { status: "anomalies_found", checksRun: checks.length, anomalies: anomalies.length };
  },
});

// =============================================================================
// Dashboard Query (admin-only)
// =============================================================================

export const getIntegrityReport = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Run all checks live
    const checks = [
      await checkNegativeBalances(ctx),
      await checkCurrencyConservation(ctx),
      await checkDuplicateRewardTransactions(ctx),
      await checkOrphanedFriendships(ctx),
      await checkDuplicateActiveSessions(ctx),
      await checkStuckSessions(ctx),
      await checkAchievementOvergrants(ctx),
      await checkStalePendingRequests(ctx),
      await checkStoryProgressMismatch(ctx),
    ];

    // Get recent alert history for this rule type
    const rule = await ctx.db
      .query("alertRules")
      .withIndex("by_type", (q) => q.eq("triggerType", "integrity_violation"))
      .first();

    let recentAlerts: Array<{
      severity: string;
      title: string;
      message: string;
      createdAt: number;
    }> = [];

    if (rule) {
      const history = await ctx.db
        .query("alertHistory")
        .withIndex("by_rule", (q) => q.eq("ruleId", rule._id))
        .order("desc")
        .take(10);
      recentAlerts = history.map((h) => ({
        severity: h.severity,
        title: h.title,
        message: h.message,
        createdAt: h.createdAt,
      }));
    }

    const anomalyCount = checks.filter((c) => c.status === "anomaly").length;
    const criticalCount = checks.filter(
      (c) => c.status === "anomaly" && c.severity === "critical"
    ).length;

    return {
      overallStatus: criticalCount > 0 ? "critical" : anomalyCount > 0 ? "warning" : "healthy",
      checksRun: checks.length,
      anomalyCount,
      criticalCount,
      checks,
      recentAlerts,
      lastCheckedAt: Date.now(),
    };
  },
});
