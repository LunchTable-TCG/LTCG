import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { mutation, query } from "./_generated/server.js";

// ============================================================================
// CREATE SCHEDULED CONTENT
// ============================================================================

export const createScheduledContent = mutation({
  args: {
    type: literals("blog", "x_post", "reddit", "email", "announcement", "news", "image"),
    title: v.string(),
    content: v.string(),
    scheduledFor: v.number(),
    status: literals("draft", "scheduled", "published", "failed"),
    metadata: v.object({
      slug: v.optional(v.string()),
      excerpt: v.optional(v.string()),
      featuredImage: v.optional(v.string()),
      tweetId: v.optional(v.string()),
      subreddit: v.optional(v.string()),
      redditPostId: v.optional(v.string()),
      subject: v.optional(v.string()),
      recipientType: v.optional(literals("players", "subscribers", "both", "custom")),
      recipientListId: v.optional(v.string()),
      templateId: v.optional(v.string()),
      priority: v.optional(literals("normal", "important", "urgent")),
      expiresAt: v.optional(v.number()),
      newsArticleId: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      altText: v.optional(v.string()),
      caption: v.optional(v.string()),
    }),
    publishedAt: v.optional(v.number()),
    publishError: v.optional(v.string()),
    authorId: v.string(),
  },
  returns: v.id("scheduledContent"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const data: any = {
      type: args.type,
      title: args.title,
      content: args.content,
      scheduledFor: args.scheduledFor,
      status: args.status,
      metadata: args.metadata,
      authorId: args.authorId,
      createdAt: now,
      updatedAt: now,
    };

    if (args.publishedAt !== undefined) {
      data.publishedAt = args.publishedAt;
    }

    if (args.publishError !== undefined) {
      data.publishError = args.publishError;
    }

    const contentId = await ctx.db.insert("scheduledContent", data);

    return contentId;
  },
});

// ============================================================================
// GET SCHEDULED CONTENT
// ============================================================================

export const getScheduledContent = query({
  args: {
    status: v.optional(literals("draft", "scheduled", "published", "failed")),
    type: v.optional(literals("blog", "x_post", "reddit", "email", "announcement", "news", "image")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let content = await ctx.db.query("scheduledContent").collect();

    if (args.status) {
      content = content.filter((c) => c.status === args.status);
    }

    if (args.type) {
      content = content.filter((c) => c.type === args.type);
    }

    return content.sort((a, b) => (b.scheduledFor as number) - (a.scheduledFor as number));
  },
});

// ============================================================================
// GET SCHEDULED CONTENT BY ID
// ============================================================================

export const getScheduledContentById = query({
  args: {
    contentId: v.id("scheduledContent"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contentId);
  },
});

// ============================================================================
// UPDATE SCHEDULED CONTENT
// ============================================================================

export const updateScheduledContent = mutation({
  args: {
    contentId: v.id("scheduledContent"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.contentId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// DELETE SCHEDULED CONTENT
// ============================================================================

export const deleteScheduledContent = mutation({
  args: {
    contentId: v.id("scheduledContent"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.contentId);
    return null;
  },
});
