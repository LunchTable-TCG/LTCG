import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

// ============================================================================
// SUBMIT FEEDBACK
// ============================================================================

export const submitFeedback = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    type: v.union(v.literal("bug"), v.literal("feature")),
    title: v.string(),
    description: v.string(),
    screenshotUrl: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    pageUrl: v.string(),
    userAgent: v.string(),
    viewport: v.object({ width: v.number(), height: v.number() }),
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("triaged"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("closed")
      )
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))
    ),
  },
  returns: v.id("feedback"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const data: any = {
      userId: args.userId,
      username: args.username,
      type: args.type,
      title: args.title,
      description: args.description,
      pageUrl: args.pageUrl,
      userAgent: args.userAgent,
      viewport: args.viewport,
      status: args.status || "new",
      createdAt: now,
      updatedAt: now,
    };

    if (args.screenshotUrl !== undefined) {
      data.screenshotUrl = args.screenshotUrl;
    }

    if (args.recordingUrl !== undefined) {
      data.recordingUrl = args.recordingUrl;
    }

    if (args.priority !== undefined) {
      data.priority = args.priority;
    }

    const feedbackId = await ctx.db.insert("feedback", data);

    return feedbackId;
  },
});

// ============================================================================
// GET FEEDBACK
// ============================================================================

export const getFeedback = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("triaged"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("closed")
      )
    ),
    type: v.optional(v.union(v.literal("bug"), v.literal("feature"))),
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let feedback = await ctx.db.query("feedback").collect();

    if (args.status) {
      feedback = feedback.filter((f) => f.status === args.status);
    }

    if (args.type) {
      feedback = feedback.filter((f) => f.type === args.type);
    }

    if (args.userId) {
      feedback = feedback.filter((f) => f.userId === args.userId);
    }

    // Sort by creation date (newest first)
    feedback.sort((a, b) => (b.createdAt as number) - (a.createdAt as number));

    if (args.limit) {
      feedback = feedback.slice(0, args.limit);
    }

    return feedback;
  },
});

// ============================================================================
// GET FEEDBACK BY ID
// ============================================================================

export const getFeedbackById = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.feedbackId);
  },
});

// ============================================================================
// UPDATE FEEDBACK STATUS
// ============================================================================

export const updateFeedbackStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: v.union(
      v.literal("new"),
      v.literal("triaged"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    adminNotes: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    resolvedBy: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.adminNotes !== undefined) {
      updates.adminNotes = args.adminNotes;
    }

    if (args.assignedTo !== undefined) {
      updates.assignedTo = args.assignedTo;
    }

    if (args.resolvedBy !== undefined) {
      updates.resolvedBy = args.resolvedBy;
    }

    if (args.resolvedAt !== undefined) {
      updates.resolvedAt = args.resolvedAt;
    }

    if (args.priority !== undefined) {
      updates.priority = args.priority;
    }

    await ctx.db.patch(args.feedbackId, updates);

    return null;
  },
});
