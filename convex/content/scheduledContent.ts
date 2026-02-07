import { v } from "convex/values";
import { internal } from "../_generated/api";

// @ts-ignore TS2589 workaround for deep type instantiation
const internalAny: any = internal;
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";
import {
  contentStatusValidator,
  emailRecipientTypeValidator,
  scheduledContentTypeValidator,
} from "../schema";

/**
 * Scheduled Content CRUD
 * Manages content scheduled for future publishing
 */

// Metadata validator for type-specific fields
const metadataValidator = v.object({
  // Blog-specific
  slug: v.optional(v.string()),
  excerpt: v.optional(v.string()),
  featuredImage: v.optional(v.string()),
  // X/Twitter-specific
  tweetId: v.optional(v.string()),
  // Reddit-specific
  subreddit: v.optional(v.string()),
  redditPostId: v.optional(v.string()),
  // Email-specific
  subject: v.optional(v.string()),
  recipientType: v.optional(emailRecipientTypeValidator),
  recipientListId: v.optional(v.id("emailLists")),
  templateId: v.optional(v.id("emailTemplates")),
  // Announcement-specific
  priority: v.optional(v.union(v.literal("normal"), v.literal("important"), v.literal("urgent"))),
  expiresAt: v.optional(v.number()),
  // News-specific
  newsArticleId: v.optional(v.id("newsArticles")),
  // Image-specific
  imageUrl: v.optional(v.string()),
  altText: v.optional(v.string()),
  caption: v.optional(v.string()),
});

// ============================================================================
// QUERIES
// ============================================================================

// Get content for a date range (for calendar view)
export const getByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    type: v.optional(scheduledContentTypeValidator),
    status: v.optional(contentStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    let items = await ctx.db
      .query("scheduledContent")
      .withIndex("by_date_range", (q) =>
        q.gte("scheduledFor", args.startDate).lte("scheduledFor", args.endDate)
      )
      .collect();

    if (args.type) {
      items = items.filter((item) => item.type === args.type);
    }
    if (args.status) {
      items = items.filter((item) => item.status === args.status);
    }

    // Get author info
    const authorIds = [...new Set(items.map((i) => i.authorId))];
    const authors = await Promise.all(authorIds.map((id) => ctx.db.get(id)));
    const authorMap = new Map(authors.filter(Boolean).map((a) => [a?._id, a]));

    return items.map((item) => ({
      ...item,
      author: authorMap.get(item.authorId),
    }));
  },
});

// Get content for a specific day
export const getByDay = query({
  args: {
    date: v.number(), // Start of day timestamp
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    const startOfDay = args.date;
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    const items = await ctx.db
      .query("scheduledContent")
      .withIndex("by_date_range", (q) =>
        q.gte("scheduledFor", startOfDay).lte("scheduledFor", endOfDay)
      )
      .collect();

    return items;
  },
});

// Get single content item
export const get = query({
  args: { id: v.id("scheduledContent") },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);
    const content = await ctx.db.get(args.id);
    if (!content) return null;

    const author = await ctx.db.get(content.authorId);
    return { ...content, author };
  },
});

// List all content with filters
export const list = query({
  args: {
    type: v.optional(scheduledContentTypeValidator),
    status: v.optional(contentStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    // Build query based on filters
    if (args.type && args.status) {
      const items = await ctx.db
        .query("scheduledContent")
        .withIndex("by_type", (q) => q.eq("type", args.type!).eq("status", args.status!))
        .order("desc")
        .take(args.limit ?? 1000);
      return items;
    }

    if (args.status) {
      const items = await ctx.db
        .query("scheduledContent")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(args.limit ?? 1000);
      return items;
    }

    if (args.type) {
      const items = await ctx.db
        .query("scheduledContent")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .take(args.limit ?? 1000);
      return items;
    }

    // No filters - return all
    const items = await ctx.db
      .query("scheduledContent")
      .order("desc")
      .take(args.limit ?? 1000);
    return items;
  },
});

// Get stats for dashboard
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthQuery(ctx);

    const all = await ctx.db.query("scheduledContent").collect();

    const stats = {
      total: all.length,
      draft: all.filter((c) => c.status === "draft").length,
      scheduled: all.filter((c) => c.status === "scheduled").length,
      published: all.filter((c) => c.status === "published").length,
      failed: all.filter((c) => c.status === "failed").length,
      byType: {} as Record<string, number>,
    };

    for (const item of all) {
      stats.byType[item.type] = (stats.byType[item.type] ?? 0) + 1;
    }

    return stats;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

// Create new scheduled content
export const create = mutation({
  args: {
    type: scheduledContentTypeValidator,
    title: v.string(),
    content: v.string(),
    scheduledFor: v.number(),
    status: v.optional(contentStatusValidator),
    metadata: metadataValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const now = Date.now();
    const contentId = await ctx.db.insert("scheduledContent", {
      type: args.type,
      title: args.title,
      content: args.content,
      scheduledFor: args.scheduledFor,
      status: args.status ?? "draft",
      metadata: args.metadata,
      authorId: userId,
      createdAt: now,
      updatedAt: now,
    });

    // If initially scheduled, schedule publication at exact time
    if (args.status === "scheduled") {
      await ctx.scheduler.runAt(
        args.scheduledFor,
        internalAny.content.publishing.publishContent,
        { contentId }
      );
    }

    return contentId;
  },
});

// Update existing content
export const update = mutation({
  args: {
    id: v.id("scheduledContent"),
    type: v.optional(scheduledContentTypeValidator),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    status: v.optional(contentStatusValidator),
    metadata: v.optional(metadataValidator),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Content not found");

    // Merge metadata if provided
    const mergedMetadata = updates.metadata
      ? { ...existing.metadata, ...updates.metadata }
      : undefined;

    await ctx.db.patch(id, {
      ...updates,
      metadata: mergedMetadata ?? existing.metadata,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete content
export const remove = mutation({
  args: { id: v.id("scheduledContent") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Schedule content (change status to scheduled)
export const schedule = mutation({
  args: {
    id: v.id("scheduledContent"),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const content = await ctx.db.get(args.id);
    if (!content) throw new Error("Content not found");

    const publishAt = args.scheduledFor ?? content.scheduledFor;

    await ctx.db.patch(args.id, {
      status: "scheduled",
      scheduledFor: publishAt,
      updatedAt: Date.now(),
    });

    // Schedule publication at exact time (replaces polling cron)
    await ctx.scheduler.runAt(
      publishAt,
      internalAny.content.publishing.publishContent,
      { contentId: args.id }
    );

    return { success: true };
  },
});

// Publish content immediately
export const publishNow = mutation({
  args: { id: v.id("scheduledContent") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const content = await ctx.db.get(args.id);
    if (!content) throw new Error("Content not found");

    await ctx.db.patch(args.id, {
      status: "scheduled",
      scheduledFor: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule immediate publication (replaces cron polling)
    await ctx.scheduler.runAfter(
      0,
      internalAny.content.publishing.publishContent,
      { contentId: args.id }
    );

    return { success: true };
  },
});

// Duplicate content (for creating similar posts)
export const duplicate = mutation({
  args: { id: v.id("scheduledContent") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const original = await ctx.db.get(args.id);
    if (!original) throw new Error("Content not found");

    const now = Date.now();
    return await ctx.db.insert("scheduledContent", {
      type: original.type,
      title: `${original.title} (Copy)`,
      content: original.content,
      scheduledFor: now + 24 * 60 * 60 * 1000, // Default to tomorrow
      status: "draft",
      metadata: original.metadata,
      authorId: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});
