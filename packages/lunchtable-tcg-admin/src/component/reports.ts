import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const reportStatusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("resolved"),
  v.literal("dismissed")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Submit a user report.
 */
export const submitReport = mutation({
  args: {
    reporterId: v.string(),
    reporterUsername: v.string(),
    reportedUserId: v.string(),
    reportedUsername: v.string(),
    reason: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("userReports", {
      reporterId: args.reporterId,
      reporterUsername: args.reporterUsername,
      reportedUserId: args.reportedUserId,
      reportedUsername: args.reportedUsername,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * Update the status of a report.
 */
export const updateReportStatus = mutation({
  args: {
    reportId: v.id("userReports"),
    status: reportStatusValidator,
    reviewedBy: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    await ctx.db.patch(args.reportId, {
      status: args.status,
      reviewedBy: args.reviewedBy,
      reviewedAt: Date.now(),
      notes: args.notes,
    });

    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get reports filtered by status.
 */
export const getByStatus = query({
  args: {
    status: reportStatusValidator,
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userReports")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Get reports for a specific reported user.
 */
export const getByReportedUser = query({
  args: { reportedUserId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userReports")
      .withIndex("by_reported_user", (q) =>
        q.eq("reportedUserId", args.reportedUserId)
      )
      .collect();
  },
});

/**
 * Get reports submitted by a specific user.
 */
export const getByReporter = query({
  args: { reporterId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userReports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", args.reporterId))
      .collect();
  },
});
