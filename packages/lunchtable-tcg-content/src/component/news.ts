import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { mutation, query } from "./_generated/server.js";

// ============================================================================
// CREATE NEWS ARTICLE
// ============================================================================

export const createNewsArticle = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    category: literals("update", "event", "patch", "announcement", "maintenance"),
    imageUrl: v.optional(v.string()),
    authorId: v.string(),
    isPublished: v.boolean(),
    isPinned: v.boolean(),
    publishedAt: v.optional(v.number()),
  },
  returns: v.id("newsArticles"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const data: any = {
      title: args.title,
      slug: args.slug,
      excerpt: args.excerpt,
      content: args.content,
      category: args.category,
      authorId: args.authorId,
      isPublished: args.isPublished,
      isPinned: args.isPinned,
      createdAt: now,
      updatedAt: now,
    };

    if (args.imageUrl !== undefined) {
      data.imageUrl = args.imageUrl;
    }

    if (args.publishedAt !== undefined) {
      data.publishedAt = args.publishedAt;
    }

    const articleId = await ctx.db.insert("newsArticles", data);

    return articleId;
  },
});

// ============================================================================
// GET NEWS ARTICLES
// ============================================================================

export const getNewsArticles = query({
  args: {
    isPublished: v.optional(v.boolean()),
    category: v.optional(literals("update", "event", "patch", "announcement", "maintenance")),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let articles = await ctx.db.query("newsArticles").collect();

    if (args.isPublished !== undefined) {
      articles = articles.filter((a) => a.isPublished === args.isPublished);
    }

    if (args.category) {
      articles = articles.filter((a) => a.category === args.category);
    }

    // Sort by pinned first, then by published date
    articles.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return ((b.publishedAt as number) || 0) - ((a.publishedAt as number) || 0);
    });

    if (args.limit) {
      articles = articles.slice(0, args.limit);
    }

    return articles;
  },
});

// ============================================================================
// GET NEWS ARTICLE BY SLUG
// ============================================================================

export const getNewsArticleBySlug = query({
  args: {
    slug: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("newsArticles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return article;
  },
});

// ============================================================================
// GET NEWS ARTICLE
// ============================================================================

export const getNewsArticle = query({
  args: {
    articleId: v.id("newsArticles"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.articleId);
  },
});

// ============================================================================
// UPDATE NEWS ARTICLE
// ============================================================================

export const updateNewsArticle = mutation({
  args: {
    articleId: v.id("newsArticles"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.articleId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// DELETE NEWS ARTICLE
// ============================================================================

export const deleteNewsArticle = mutation({
  args: {
    articleId: v.id("newsArticles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.articleId);
    return null;
  },
});
