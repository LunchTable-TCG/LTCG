/**
 * User Reports Admin Module
 *
 * Operations for managing user reports.
 * Requires moderator role or higher.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Status validator matching schema
const statusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("resolved"),
  v.literal("dismissed")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List all user reports with optional filtering
 */
export const listReports = query({
  args: {
    status: v.optional(statusValidator),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let reports = await (async () => {
      if (args.status) {
        return await ctx.db
          .query("userReports")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect();
      }
      return await ctx.db.query("userReports").order("desc").collect();
    })();

    type Report = (typeof reports)[number];

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      reports = reports.filter(
        (r: Report) =>
          r.reporterUsername.toLowerCase().includes(searchLower) ||
          r.reportedUsername.toLowerCase().includes(searchLower) ||
          r.reason.toLowerCase().includes(searchLower)
      );
    }

    const totalCount = reports.length;
    const paginated = reports.slice(offset, offset + limit);

    return {
      reports: paginated,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  },
});

/**
 * Get a single report by ID with additional context
 */
export const getReport = query({
  args: {
    reportId: v.id("userReports"),
  },
  handler: async (ctx, { reportId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const report = await ctx.db.get(reportId);
    if (!report) return null;

    // Get reporter and reported user details
    const reporter = await ctx.db.get(report.reporterId);
    const reported = await ctx.db.get(report.reportedUserId);

    // Get other reports against the same user
    const otherReports = await ctx.db
      .query("userReports")
      .withIndex("by_reported_user", (q) => q.eq("reportedUserId", report.reportedUserId))
      .filter((q) => q.neq(q.field("_id"), reportId))
      .order("desc")
      .take(10);

    // Get moderation history for reported user
    const moderationHistory = await ctx.db
      .query("moderationActions")
      .withIndex("by_user", (q) => q.eq("userId", report.reportedUserId))
      .order("desc")
      .take(10);

    // Get reviewer info if reviewed
    let reviewer = null;
    if (report.reviewedBy) {
      reviewer = await ctx.db.get(report.reviewedBy);
    }

    return {
      ...report,
      reporter: reporter ? { _id: reporter._id, username: reporter.username } : null,
      reported: reported
        ? {
            _id: reported._id,
            username: reported.username,
            accountStatus: reported.accountStatus,
          }
        : null,
      reviewer: reviewer ? { _id: reviewer._id, username: reviewer.username } : null,
      otherReportsCount: otherReports.length,
      otherReports,
      moderationHistory,
    };
  },
});

/**
 * Get report statistics
 */
export const getReportStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const reports = await ctx.db.query("userReports").collect();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Count by status
    const byStatus = {
      pending: reports.filter((r) => r.status === "pending").length,
      reviewed: reports.filter((r) => r.status === "reviewed").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
      dismissed: reports.filter((r) => r.status === "dismissed").length,
    };

    // Recent reports
    const reportsToday = reports.filter((r) => r.createdAt > oneDayAgo).length;
    const reportsThisWeek = reports.filter((r) => r.createdAt > oneWeekAgo).length;

    // Average resolution time (for resolved reports)
    const resolvedReports = reports.filter((r) => r.status === "resolved" && r.reviewedAt);
    const avgResolutionTime =
      resolvedReports.length > 0
        ? resolvedReports.reduce((sum, r) => sum + (r.reviewedAt! - r.createdAt), 0) /
          resolvedReports.length
        : 0;

    return {
      totalReports: reports.length,
      byStatus,
      reportsToday,
      reportsThisWeek,
      avgResolutionTimeMs: avgResolutionTime,
      avgResolutionTimeHours: Math.round(avgResolutionTime / (1000 * 60 * 60)),
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update report status
 */
export const updateReportStatus = mutation({
  args: {
    reportId: v.id("userReports"),
    status: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      reviewedBy: adminId,
      reviewedAt: Date.now(),
    };

    if (args.notes !== undefined) {
      updates["notes"] = args.notes;
    }

    await ctx.db.patch(args.reportId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_report_status",
      metadata: {
        reportId: args.reportId,
        reportedUserId: report.reportedUserId,
        previousStatus: report.status,
        newStatus: args.status,
      },
      success: true,
    });

    return {
      success: true,
      message: `Report status updated to "${args.status}"`,
    };
  },
});

/**
 * Resolve report with action against reported user
 */
export const resolveReportWithAction = mutation({
  args: {
    reportId: v.id("userReports"),
    action: v.union(
      v.literal("dismiss"),
      v.literal("warn"),
      v.literal("mute"),
      v.literal("suspend"),
      v.literal("ban")
    ),
    notes: v.optional(v.string()),
    muteDurationHours: v.optional(v.number()),
    suspendDurationDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    // Update report status
    const newStatus = args.action === "dismiss" ? "dismissed" : "resolved";
    await ctx.db.patch(args.reportId, {
      status: newStatus,
      reviewedBy: adminId,
      reviewedAt: Date.now(),
      notes: args.notes,
    });

    // Take action against user if not dismissed
    if (args.action !== "dismiss") {
      const reported = await ctx.db.get(report.reportedUserId);
      if (reported) {
        let newAccountStatus = reported.accountStatus;
        let mutedUntil = reported.mutedUntil;

        if (args.action === "warn") {
          // Just log the warning, no status change
        } else if (args.action === "mute") {
          const hours = args.muteDurationHours ?? 24;
          mutedUntil = Date.now() + hours * 60 * 60 * 1000;
        } else if (args.action === "suspend") {
          newAccountStatus = "suspended";
        } else if (args.action === "ban") {
          newAccountStatus = "banned";
        }

        await ctx.db.patch(report.reportedUserId, {
          accountStatus: newAccountStatus,
          mutedUntil,
        });

        // Create moderation action record
        const actionType =
          args.action === "warn"
            ? "warn"
            : args.action === "mute"
              ? "mute"
              : args.action === "suspend"
                ? "suspend"
                : "ban";

        // Calculate duration in ms
        const durationMs =
          args.action === "mute"
            ? (args.muteDurationHours ?? 24) * 60 * 60 * 1000
            : args.action === "suspend"
              ? (args.suspendDurationDays ?? 7) * 24 * 60 * 60 * 1000
              : undefined;

        await ctx.db.insert("moderationActions", {
          adminId,
          userId: report.reportedUserId,
          actionType,
          reason: `Report resolved: ${report.reason}`,
          duration: durationMs,
          expiresAt: durationMs ? Date.now() + durationMs : undefined,
          createdAt: Date.now(),
        });
      }
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "resolve_report",
      metadata: {
        reportId: args.reportId,
        reportedUserId: report.reportedUserId,
        actionTaken: args.action,
      },
      success: true,
    });

    return {
      success: true,
      message: `Report ${newStatus} with action: ${args.action}`,
    };
  },
});

/**
 * Bulk update report statuses
 */
export const bulkUpdateReportStatus = mutation({
  args: {
    reportIds: v.array(v.id("userReports")),
    status: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const now = Date.now();
    let updated = 0;

    for (const reportId of args.reportIds) {
      const report = await ctx.db.get(reportId);
      if (report) {
        await ctx.db.patch(reportId, {
          status: args.status,
          reviewedBy: adminId,
          reviewedAt: now,
          notes: args.notes,
        });
        updated++;
      }
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "bulk_update_report_status",
      metadata: {
        reportCount: updated,
        newStatus: args.status,
      },
      success: true,
    });

    return {
      success: true,
      message: `Updated ${updated} reports to "${args.status}"`,
    };
  },
});
