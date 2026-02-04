/**
 * User Reporting System
 *
 * Allows users to report inappropriate behavior or content.
 * Reports are sent to moderators for review.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { successResponseValidator } from "../lib/returnValidators";
import { requireRole } from "../lib/roles";

/**
 * Report a user for inappropriate behavior
 *
 * Creates a report that moderators can review.
 */
export const reportUser = mutation({
  args: {
    reportedUsername: v.string(),
    reason: v.string(),
  },
  returns: successResponseValidator,
  handler: async (ctx, { reportedUsername, reason }) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Find reported user
    const reportedUser = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", reportedUsername))
      .first();

    if (!reportedUser) {
      throw createError(ErrorCode.NOT_FOUND_USER, {
        username: reportedUsername,
      });
    }

    // Prevent self-reporting
    if (reportedUser._id === userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Cannot report yourself",
      });
    }

    // Check if user has already reported this person recently (within 24 hours)
    const recentReport = await ctx.db
      .query("userReports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("reportedUserId"), reportedUser._id),
          q.gt(q.field("createdAt"), Date.now() - 24 * 60 * 60 * 1000)
        )
      )
      .first();

    if (recentReport) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You have already reported this user recently. Please wait 24 hours.",
      });
    }

    // Validate reason length
    if (reason.length < 10) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Report reason must be at least 10 characters",
      });
    }

    if (reason.length > 500) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Report reason must be less than 500 characters",
      });
    }

    // Create report
    await ctx.db.insert("userReports", {
      reporterId: userId,
      reporterUsername: username,
      reportedUserId: reportedUser._id,
      reportedUsername: reportedUser.username || reportedUsername,
      reason,
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get all pending reports (moderators only)
 *
 * Returns reports that need to be reviewed.
 * Requires moderator role or higher.
 */
export const getPendingReports = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Require moderator role or higher
    await requireRole(ctx, userId, "moderator");

    // Get all pending reports
    const reports = await ctx.db
      .query("userReports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(50);

    return reports;
  },
});

/**
 * Update report status (moderators only)
 * Requires moderator role or higher.
 */
export const updateReportStatus = mutation({
  args: {
    reportId: v.id("userReports"),
    status: v.union(v.literal("reviewed"), v.literal("resolved"), v.literal("dismissed")),
    notes: v.optional(v.string()),
  },
  returns: successResponseValidator,
  handler: async (ctx, { reportId, status, notes }) => {
    const { userId } = await requireAuthMutation(ctx);

    // Require moderator role or higher
    await requireRole(ctx, userId, "moderator");

    // Update report
    await ctx.db.patch(reportId, {
      status,
      reviewedBy: userId,
      reviewedAt: Date.now(),
      notes,
    });

    return { success: true };
  },
});
