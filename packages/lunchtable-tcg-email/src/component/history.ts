import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { mutation, query } from "./_generated/server.js";

export const recordEmailSend = mutation({
  args: {
    scheduledContentId: v.optional(v.string()),
    templateId: v.optional(v.id("emailTemplates")),
    subject: v.string(),
    recipientCount: v.number(),
    sentBy: v.string(),
    resendBatchId: v.optional(v.string()),
  },
  returns: v.id("emailHistory"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const historyId = await ctx.db.insert("emailHistory", {
      scheduledContentId: args.scheduledContentId,
      templateId: args.templateId,
      subject: args.subject,
      recipientCount: args.recipientCount,
      sentCount: 0,
      failedCount: 0,
      status: "sending",
      resendBatchId: args.resendBatchId,
      sentBy: args.sentBy,
      sentAt: now,
    });

    return historyId;
  },
});

export const updateEmailHistory = mutation({
  args: {
    historyId: v.id("emailHistory"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.historyId, args.updates);
    return null;
  },
});

export const getEmailHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const history = await ctx.db
      .query("emailHistory")
      .withIndex("by_sent")
      .order("desc")
      .take(limit);

    return history;
  },
});

export const getHistoryByContent = query({
  args: {
    scheduledContentId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("emailHistory")
      .withIndex("by_content", (q) => q.eq("scheduledContentId", args.scheduledContentId))
      .collect();

    return history;
  },
});
