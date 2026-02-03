/**
 * Feedback System
 *
 * Allows players to submit bug reports and feature requests with optional
 * screenshots and screen recordings. Admin dashboard provides kanban-style
 * management for triaging and tracking feedback.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { successResponseValidator } from "../lib/returnValidators";
import { requireRole } from "../lib/roles";

// =============================================================================
// Validators
// =============================================================================

const feedbackTypeValidator = v.union(v.literal("bug"), v.literal("feature"));

const feedbackStatusValidator = v.union(
  v.literal("new"),
  v.literal("triaged"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("closed")
);

const feedbackPriorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical")
);

// =============================================================================
// Player Functions
// =============================================================================

/**
 * Submit feedback (bug report or feature request)
 *
 * Players can submit feedback with optional screenshot and recording URLs.
 * Context like page URL, user agent, and viewport are captured automatically.
 */
export const submit = mutation({
  args: {
    type: feedbackTypeValidator,
    title: v.string(),
    description: v.string(),
    screenshotUrl: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    pageUrl: v.string(),
    userAgent: v.string(),
    viewport: v.object({ width: v.number(), height: v.number() }),
  },
  returns: v.object({ feedbackId: v.id("feedback") }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Validate title
    if (args.title.length < 5) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Title must be at least 5 characters",
      });
    }
    if (args.title.length > 200) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Title must be less than 200 characters",
      });
    }

    // Validate description
    if (args.description.length < 10) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Description must be at least 10 characters",
      });
    }
    if (args.description.length > 5000) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Description must be less than 5000 characters",
      });
    }

    const now = Date.now();

    const feedbackId = await ctx.db.insert("feedback", {
      userId,
      username,
      type: args.type,
      title: args.title,
      description: args.description,
      screenshotUrl: args.screenshotUrl,
      recordingUrl: args.recordingUrl,
      pageUrl: args.pageUrl,
      userAgent: args.userAgent,
      viewport: args.viewport,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    return { feedbackId };
  },
});

/**
 * Get player's own feedback submissions
 */
export const getMyFeedback = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 20 }) => {
    const { userId } = await requireAuthQuery(ctx);

    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return feedback;
  },
});

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * List feedback by status (for kanban board)
 *
 * Returns feedback grouped by status for the admin kanban view.
 * Requires moderator role or higher.
 */
export const listByStatus = query({
  args: {
    type: v.optional(feedbackTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { type, limit = 100 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Define the status order for kanban columns
    const statuses = ["new", "triaged", "in_progress", "resolved", "closed"] as const;

    const result: Record<
      string,
      Array<{
        _id: string;
        userId: string;
        username: string;
        type: "bug" | "feature";
        title: string;
        description: string;
        status: string;
        priority?: string;
        screenshotUrl?: string;
        recordingUrl?: string;
        createdAt: number;
        updatedAt: number;
      }>
    > = {};

    for (const status of statuses) {
      let feedbackQuery;

      if (type) {
        feedbackQuery = ctx.db
          .query("feedback")
          .withIndex("by_type_status", (q) =>
            q.eq("type", type).eq("status", status)
          )
          .order("desc")
          .take(limit);
      } else {
        feedbackQuery = ctx.db
          .query("feedback")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(limit);
      }

      const items = await feedbackQuery;
      result[status] = items.map((item) => ({
        _id: item._id,
        userId: item.userId,
        username: item.username,
        type: item.type,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        screenshotUrl: item.screenshotUrl,
        recordingUrl: item.recordingUrl,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    }

    return result;
  },
});

/**
 * Get single feedback item details
 *
 * Requires moderator role or higher.
 */
export const get = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, { feedbackId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const feedback = await ctx.db.get(feedbackId);
    if (!feedback) {
      throw createError(ErrorCode.NOT_FOUND, {
        resource: "feedback",
      });
    }

    // Get assigned user info if assigned
    let assignedUser = null;
    if (feedback.assignedTo) {
      const user = await ctx.db.get(feedback.assignedTo);
      if (user) {
        assignedUser = {
          _id: user._id,
          username: user.username,
        };
      }
    }

    // Get resolver info if resolved
    let resolvedByUser = null;
    if (feedback.resolvedBy) {
      const user = await ctx.db.get(feedback.resolvedBy);
      if (user) {
        resolvedByUser = {
          _id: user._id,
          username: user.username,
        };
      }
    }

    return {
      ...feedback,
      assignedUser,
      resolvedByUser,
    };
  },
});

/**
 * Update feedback status (drag-drop in kanban)
 *
 * Requires moderator role or higher.
 */
export const updateStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: feedbackStatusValidator,
  },
  returns: successResponseValidator,
  handler: async (ctx, { feedbackId, status }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "moderator");

    const feedback = await ctx.db.get(feedbackId);
    if (!feedback) {
      throw createError(ErrorCode.NOT_FOUND, {
        resource: "feedback",
      });
    }

    const updates: {
      status: typeof status;
      updatedAt: number;
      resolvedAt?: number;
      resolvedBy?: typeof userId;
    } = {
      status,
      updatedAt: Date.now(),
    };

    // Track resolution
    if (status === "resolved" && feedback.status !== "resolved") {
      updates.resolvedAt = Date.now();
      updates.resolvedBy = userId;
    }

    await ctx.db.patch(feedbackId, updates);

    return { success: true };
  },
});

/**
 * Update feedback details (priority, notes, assignment)
 *
 * Requires moderator role or higher.
 */
export const update = mutation({
  args: {
    feedbackId: v.id("feedback"),
    priority: v.optional(feedbackPriorityValidator),
    adminNotes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
  },
  returns: successResponseValidator,
  handler: async (ctx, { feedbackId, priority, adminNotes, assignedTo }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "moderator");

    const feedback = await ctx.db.get(feedbackId);
    if (!feedback) {
      throw createError(ErrorCode.NOT_FOUND, {
        resource: "feedback",
      });
    }

    // Validate assigned user exists if provided
    if (assignedTo) {
      const assignedUser = await ctx.db.get(assignedTo);
      if (!assignedUser) {
        throw createError(ErrorCode.NOT_FOUND_USER, {
          userId: assignedTo,
        });
      }
    }

    const updates: {
      updatedAt: number;
      priority?: typeof priority;
      adminNotes?: string;
      assignedTo?: typeof assignedTo;
    } = {
      updatedAt: Date.now(),
    };

    if (priority !== undefined) updates.priority = priority;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;

    await ctx.db.patch(feedbackId, updates);

    return { success: true };
  },
});

/**
 * Get feedback statistics for dashboard
 *
 * Returns counts by type and status for the admin dashboard.
 * Requires moderator role or higher.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Get all feedback to calculate stats
    const allFeedback = await ctx.db.query("feedback").collect();

    const stats = {
      total: allFeedback.length,
      byType: {
        bug: 0,
        feature: 0,
      },
      byStatus: {
        new: 0,
        triaged: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
        unset: 0,
      },
    };

    for (const item of allFeedback) {
      stats.byType[item.type]++;
      stats.byStatus[item.status]++;
      if (item.priority) {
        stats.byPriority[item.priority]++;
      } else {
        stats.byPriority.unset++;
      }
    }

    return stats;
  },
});

/**
 * Get detailed feedback analytics for the admin dashboard
 *
 * Returns trends, resolution times, and top reporters.
 * Requires moderator role or higher.
 */
export const getAnalytics = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, { days = 30 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const now = Date.now();
    const startTime = now - days * 24 * 60 * 60 * 1000;

    // Get all feedback
    const allFeedback = await ctx.db.query("feedback").collect();
    const recentFeedback = allFeedback.filter((f) => f.createdAt >= startTime);

    // Daily submission trend (last N days)
    const dailyTrend: Record<string, { bugs: number; features: number; total: number }> = {};
    for (let i = 0; i < Math.min(days, 14); i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0] ?? "";
      if (dateKey) {
        dailyTrend[dateKey] = { bugs: 0, features: 0, total: 0 };
      }
    }

    for (const item of recentFeedback) {
      const dateKey = new Date(item.createdAt).toISOString().split("T")[0] ?? "";
      const trendEntry = dailyTrend[dateKey];
      if (trendEntry) {
        trendEntry.total++;
        if (item.type === "bug") {
          trendEntry.bugs++;
        } else {
          trendEntry.features++;
        }
      }
    }

    // Convert to array sorted by date
    const trendData = Object.entries(dailyTrend)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Resolution time analytics
    const resolvedFeedback = allFeedback.filter((f) => f.resolvedAt);
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let fastestResolution = Infinity;
    let slowestResolution = 0;

    for (const item of resolvedFeedback) {
      const resolutionTime = (item.resolvedAt as number) - item.createdAt;
      totalResolutionTime += resolutionTime;
      resolvedCount++;
      fastestResolution = Math.min(fastestResolution, resolutionTime);
      slowestResolution = Math.max(slowestResolution, resolutionTime);
    }

    const avgResolutionMs = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    // Top reporters (users who submitted the most feedback)
    const reporterCounts: Record<string, { username: string; count: number; bugs: number; features: number }> = {};
    for (const item of allFeedback) {
      const userIdStr = item.userId as string;
      if (!reporterCounts[userIdStr]) {
        reporterCounts[userIdStr] = { username: item.username, count: 0, bugs: 0, features: 0 };
      }
      const reporter = reporterCounts[userIdStr];
      if (reporter) {
        reporter.count++;
        if (item.type === "bug") {
          reporter.bugs++;
        } else {
          reporter.features++;
        }
      }
    }

    const topReporters = Object.entries(reporterCounts)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Media attachment stats
    const withScreenshot = allFeedback.filter((f) => f.screenshotUrl).length;
    const withRecording = allFeedback.filter((f) => f.recordingUrl).length;

    // Recent activity
    const last24h = allFeedback.filter((f) => f.createdAt >= now - 24 * 60 * 60 * 1000).length;
    const last7d = allFeedback.filter((f) => f.createdAt >= now - 7 * 24 * 60 * 60 * 1000).length;

    return {
      summary: {
        total: allFeedback.length,
        bugs: allFeedback.filter((f) => f.type === "bug").length,
        features: allFeedback.filter((f) => f.type === "feature").length,
        open: allFeedback.filter((f) => !["resolved", "closed"].includes(f.status)).length,
        resolved: allFeedback.filter((f) => f.status === "resolved").length,
        last24h,
        last7d,
      },
      resolution: {
        avgTimeMs: avgResolutionMs,
        avgTimeHours: Math.round(avgResolutionMs / (1000 * 60 * 60) * 10) / 10,
        fastestMs: fastestResolution === Infinity ? 0 : fastestResolution,
        slowestMs: slowestResolution,
        resolutionRate: allFeedback.length > 0
          ? Math.round((resolvedCount / allFeedback.length) * 100)
          : 0,
      },
      trend: trendData,
      topReporters,
      attachments: {
        withScreenshot,
        withRecording,
        screenshotRate: allFeedback.length > 0
          ? Math.round((withScreenshot / allFeedback.length) * 100)
          : 0,
      },
    };
  },
});
