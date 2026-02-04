/**
 * Admin News Management
 *
 * Manages news articles and announcements for the Chronicles page.
 * Provides CRUD operations for admin-managed news content.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Validators
// =============================================================================

const newsCategoryValidator = v.union(
  v.literal("update"),
  v.literal("event"),
  v.literal("patch"),
  v.literal("announcement"),
  v.literal("maintenance")
);

export type NewsCategory = "update" | "event" | "patch" | "announcement" | "maintenance";

// =============================================================================
// Public Queries (for web app)
// =============================================================================

/**
 * Get published news articles for the Chronicles page
 * Public - no auth required
 */
export const getPublishedNews = query({
  args: {
    category: v.optional(newsCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const articles = await (async () => {
      if (args.category) {
        const category = args.category;
        return await ctx.db
          .query("newsArticles")
          .withIndex("by_category", (q) => q.eq("category", category).eq("isPublished", true))
          .order("desc")
          .take(limit);
      }
      return await ctx.db
        .query("newsArticles")
        .withIndex("by_published", (q) => q.eq("isPublished", true))
        .order("desc")
        .take(limit);
    })();

    type Article = (typeof articles)[number];

    // Sort pinned articles to the top
    const pinned = articles.filter((a: Article) => a.isPinned);
    const unpinned = articles.filter((a: Article) => !a.isPinned);

    return [...pinned, ...unpinned];
  },
});

/**
 * Get a single published news article by slug
 * Public - no auth required
 */
export const getArticleBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("newsArticles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!article || !article.isPublished) {
      return null;
    }

    return article;
  },
});

// =============================================================================
// Admin Queries
// =============================================================================

/**
 * List all news articles (including drafts)
 * Requires admin role
 */
export const listArticles = query({
  args: {
    includeUnpublished: v.optional(v.boolean()),
    category: v.optional(newsCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 50;

    let articles = await ctx.db.query("newsArticles").order("desc").take(limit);

    // Filter by published status if requested
    if (!args.includeUnpublished) {
      articles = articles.filter((a) => a.isPublished);
    }

    // Filter by category if specified
    if (args.category) {
      articles = articles.filter((a) => a.category === args.category);
    }

    return articles;
  },
});

/**
 * Get a single news article by ID (for editing)
 * Requires admin role
 */
export const getArticle = query({
  args: {
    articleId: v.id("newsArticles"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw createError(ErrorCode.NOT_FOUND, { reason: "Article not found" });
    }

    return article;
  },
});

/**
 * Get news statistics
 * Requires admin role
 */
export const getNewsStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const allArticles = await ctx.db.query("newsArticles").collect();

    const published = allArticles.filter((a) => a.isPublished).length;
    const drafts = allArticles.filter((a) => !a.isPublished).length;
    const pinned = allArticles.filter((a) => a.isPinned && a.isPublished).length;

    // Count by category
    const categoryCountsObj: Record<string, number> = {};
    for (const article of allArticles) {
      categoryCountsObj[article.category] = (categoryCountsObj[article.category] || 0) + 1;
    }

    const categoryCounts = Object.entries(categoryCountsObj).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      total: allArticles.length,
      published,
      drafts,
      pinned,
      categoryCounts,
    };
  },
});

// =============================================================================
// Admin Mutations
// =============================================================================

/**
 * Create a new news article
 * Requires admin role
 */
export const createArticle = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    category: newsCategoryValidator,
    imageUrl: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Check for duplicate slug
    const existing = await ctx.db
      .query("newsArticles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Article with slug "${args.slug}" already exists`,
      });
    }

    const now = Date.now();
    const isPublished = args.isPublished ?? false;

    const articleId = await ctx.db.insert("newsArticles", {
      title: args.title,
      slug: args.slug,
      excerpt: args.excerpt,
      content: args.content,
      category: args.category,
      imageUrl: args.imageUrl,
      authorId: userId,
      isPublished,
      isPinned: args.isPinned ?? false,
      publishedAt: isPublished ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "create_news_article",
      metadata: {
        articleId,
        title: args.title,
        slug: args.slug,
        category: args.category,
        isPublished,
      },
      success: true,
    });

    return { articleId };
  },
});

/**
 * Update an existing news article
 * Requires admin role
 */
export const updateArticle = mutation({
  args: {
    articleId: v.id("newsArticles"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(newsCategoryValidator),
    imageUrl: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw createError(ErrorCode.NOT_FOUND, { reason: "Article not found" });
    }

    // Check for duplicate slug if changing
    if (args.slug && args.slug !== article.slug) {
      const slug = args.slug;
      const existing = await ctx.db
        .query("newsArticles")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (existing) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `Article with slug "${args.slug}" already exists`,
        });
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.title !== undefined) updates["title"] = args.title;
    if (args.slug !== undefined) updates["slug"] = args.slug;
    if (args.excerpt !== undefined) updates["excerpt"] = args.excerpt;
    if (args.content !== undefined) updates["content"] = args.content;
    if (args.category !== undefined) updates["category"] = args.category;
    if (args.imageUrl !== undefined) updates["imageUrl"] = args.imageUrl;
    if (args.isPinned !== undefined) updates["isPinned"] = args.isPinned;

    // Handle publishing
    if (args.isPublished !== undefined) {
      updates["isPublished"] = args.isPublished;
      if (args.isPublished && !article.publishedAt) {
        updates["publishedAt"] = Date.now();
      }
    }

    await ctx.db.patch(args.articleId, updates);

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "update_news_article",
      metadata: {
        articleId: args.articleId,
        updates: Object.keys(updates)
          .filter((k) => k !== "updatedAt")
          .join(", "),
      },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Delete a news article
 * Requires admin role
 */
export const deleteArticle = mutation({
  args: {
    articleId: v.id("newsArticles"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw createError(ErrorCode.NOT_FOUND, { reason: "Article not found" });
    }

    // Store info for audit before deleting
    const articleInfo = {
      title: article.title,
      slug: article.slug,
      category: article.category,
    };

    await ctx.db.delete(args.articleId);

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "delete_news_article",
      metadata: articleInfo,
      success: true,
    });

    return { success: true };
  },
});

/**
 * Toggle article published status
 * Requires admin role
 */
export const togglePublished = mutation({
  args: {
    articleId: v.id("newsArticles"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw createError(ErrorCode.NOT_FOUND, { reason: "Article not found" });
    }

    const isPublished = !article.isPublished;
    const updates: Record<string, unknown> = {
      isPublished,
      updatedAt: Date.now(),
    };

    if (isPublished && !article.publishedAt) {
      updates["publishedAt"] = Date.now();
    }

    await ctx.db.patch(args.articleId, updates);

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: isPublished ? "publish_news_article" : "unpublish_news_article",
      metadata: {
        articleId: args.articleId,
        title: article.title,
      },
      success: true,
    });

    return { success: true, isPublished };
  },
});

/**
 * Toggle article pinned status
 * Requires admin role
 */
export const togglePinned = mutation({
  args: {
    articleId: v.id("newsArticles"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw createError(ErrorCode.NOT_FOUND, { reason: "Article not found" });
    }

    const isPinned = !article.isPinned;
    await ctx.db.patch(args.articleId, {
      isPinned,
      updatedAt: Date.now(),
    });

    return { success: true, isPinned };
  },
});
