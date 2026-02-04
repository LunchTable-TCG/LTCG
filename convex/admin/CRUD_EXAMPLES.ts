/**
 * CRUD Usage Examples
 *
 * This file demonstrates how to use auto-generated CRUD operations
 * for admin/config tables.
 *
 * IMPORTANT: The CRUD operations (create, read, update, destroy, paginate)
 * from crudGenerated.ts are ALREADY complete queries/mutations.
 * You use them directly from your frontend, you don't call them
 * inside other handlers.
 *
 * This file shows:
 * 1. How to use CRUD operations from frontend (React)
 * 2. When to write custom queries/mutations instead of using CRUD
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// ============================================================================
// FRONTEND USAGE (React/Next.js)
// ============================================================================

/**
 * USING CRUD FROM FRONTEND:
 *
 * The CRUD operations are already exposed as Convex functions.
 * Import them in your React components like this:
 *
 * ```typescript
 * import { useConvexQuery, useConvexMutation } from "@/lib/convexHelpers";
 * import { api } from "@convex/_generated/api";
 *
 * function NewsAdmin() {
 *   // List articles
 *   const articles = useConvexQuery(
 *     api.admin.crudGenerated.newsArticlesCRUD.paginate,
 *     { numItems: 10, cursor: null }
 *   );
 *
 *   // Create article
 *   const createArticle = useConvexMutation(
 *     api.admin.crudGenerated.newsArticlesCRUD.create
 *   );
 *
 *   const handleCreate = async () => {
 *     await createArticle({
 *       title: "New Article",
 *       slug: "new-article",
 *       excerpt: "Summary",
 *       content: "Full content",
 *       category: "update",
 *       authorId: currentUser.userId,
 *       isPublished: false,
 *       isPinned: false,
 *       createdAt: Date.now(),
 *       updatedAt: Date.now(),
 *     });
 *   };
 *
 *   // Update article
 *   const updateArticle = useConvexMutation(
 *     api.admin.crudGenerated.newsArticlesCRUD.update
 *   );
 *
 *   const handleUpdate = async (articleId: Id<"newsArticles">) => {
 *     await updateArticle({
 *       id: articleId,
 *       patch: { isPublished: true, publishedAt: Date.now() }
 *     });
 *   };
 *
 *   // Delete article
 *   const deleteArticle = useConvexMutation(
 *     api.admin.crudGenerated.newsArticlesCRUD.destroy
 *   );
 *
 *   const handleDelete = async (articleId: Id<"newsArticles">) => {
 *     await deleteArticle({ id: articleId });
 *   };
 *
 *   // Read single article
 *   const article = useConvexQuery(
 *     api.admin.crudGenerated.newsArticlesCRUD.read,
 *     { id: articleId }
 *   );
 *
 *   return (...)
 * }
 * ```
 */

// ============================================================================
// WHEN TO WRITE CUSTOM QUERIES/MUTATIONS
// ============================================================================

/**
 * Use CRUD operations DIRECTLY for:
 * - Simple create/read/update/delete
 * - Pagination of entire table
 * - Getting single document by ID
 *
 * Write CUSTOM queries/mutations for:
 * - Filtered queries (by category, status, etc)
 * - Complex business logic
 * - Computed fields
 * - Aggregations
 * - Joins across tables
 */

// ============================================================================
// CUSTOM QUERY EXAMPLES (When CRUD isn't enough)
// ============================================================================

/**
 * Example: List news articles by category
 * CRUD paginate doesn't support filtering, so we write a custom query
 */
export const listNewsByCategory = query({
  args: {
    category: v.union(
      v.literal("update"),
      v.literal("event"),
      v.literal("patch"),
      v.literal("announcement"),
      v.literal("maintenance")
    ),
  },
  handler: async (ctx, { category }) => {
    // Use index for efficient filtering
    return await ctx.db
      .query("newsArticles")
      .withIndex("by_category", (q) => q.eq("category", category).eq("isPublished", true))
      .order("desc")
      .collect();
  },
});

/**
 * Example: List published and pinned articles
 * Custom query for more complex filtering
 */
export const listPinnedNews = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("newsArticles")
      .withIndex("by_pinned", (q) => q.eq("isPinned", true).eq("isPublished", true))
      .order("desc")
      .take(5);
  },
});

/**
 * Example: Get config value by key
 * CRUD read uses ID, but we want to find by key
 */
export const getConfigByKey = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const auth = await requireAuthQuery(ctx);
    await requireRole(ctx, auth.userId, "admin");

    return await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
  },
});

/**
 * Example: List all configs by category
 */
export const listConfigsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    const auth = await requireAuthQuery(ctx);
    await requireRole(ctx, auth.userId, "admin");

    return await ctx.db
      .query("systemConfig")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
  },
});

/**
 * Example: Check feature flag by name
 * Frontend needs to check flags by name, not ID
 */
export const checkFeatureFlag = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (!flag || !flag.enabled) {
      return { enabled: false };
    }

    // Simple rollout logic
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      // In real implementation, check user ID against rollout percentage
      return { enabled: flag.rolloutPercentage > 50 };
    }

    return { enabled: true };
  },
});

/**
 * Example: List feature flags by category
 */
export const listFlagsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    return await ctx.db
      .query("featureFlags")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
  },
});

// ============================================================================
// CUSTOM MUTATION EXAMPLES (When CRUD isn't enough)
// ============================================================================

/**
 * Example: Publish a news article with validation
 * Adds business logic beyond simple update
 */
export const publishNewsArticle = mutation({
  args: { id: v.id("newsArticles") },
  handler: async (ctx, { id }) => {
    const auth = await requireAuthMutation(ctx);
    await requireRole(ctx, auth.userId, "admin");

    // Get article to validate
    const article = await ctx.db.get(id);
    if (!article) {
      throw new Error("Article not found");
    }

    // Validation: ensure required fields are present
    if (!article.title || !article.content || !article.slug) {
      throw new Error("Cannot publish article with missing title, content, or slug");
    }

    // Update with publication data
    await ctx.db.patch(id, {
      isPublished: true,
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Could add side effects here:
    // - Send notification to subscribers
    // - Update analytics
    // - Cache invalidation
  },
});

/**
 * Example: Update config with validation
 * Enforces min/max constraints
 */
export const updateConfigValue = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, { key, value }) => {
    const auth = await requireAuthMutation(ctx);
    await requireRole(ctx, auth.userId, "admin");

    // Find config by key
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (!config) {
      throw new Error(`Config not found: ${key}`);
    }

    // Validate value based on type and constraints
    if (config.valueType === "number") {
      const numValue = Number(value);
      if (Number.isNaN(numValue)) {
        throw new Error("Value must be a number");
      }
      if (config.minValue !== undefined && numValue < config.minValue) {
        throw new Error(`Value must be >= ${config.minValue}`);
      }
      if (config.maxValue !== undefined && numValue > config.maxValue) {
        throw new Error(`Value must be <= ${config.maxValue}`);
      }
    }

    // Update config
    await ctx.db.patch(config._id, {
      value,
      updatedAt: Date.now(),
      updatedBy: auth.userId,
    });
  },
});

/**
 * Example: Toggle feature flag with gradual rollout
 * More complex than simple CRUD update
 */
export const toggleFeatureFlagWithRollout = mutation({
  args: {
    name: v.string(),
    targetPercentage: v.optional(v.number()),
  },
  handler: async (ctx, { name, targetPercentage }) => {
    const auth = await requireAuthMutation(ctx);
    await requireRole(ctx, auth.userId, "admin");

    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (!flag) {
      throw new Error("Feature flag not found");
    }

    // Toggle enabled state
    const newEnabled = !flag.enabled;

    // If enabling with gradual rollout
    const rolloutPercentage = newEnabled && targetPercentage !== undefined ? targetPercentage : newEnabled ? 100 : 0;

    await ctx.db.patch(flag._id, {
      enabled: newEnabled,
      rolloutPercentage,
      updatedAt: Date.now(),
      updatedBy: auth.userId,
    });
  },
});

// ============================================================================
// PATTERN SUMMARY
// ============================================================================

/**
 * WHEN TO USE WHAT:
 *
 * ✅ USE CRUD DIRECTLY (from frontend):
 *    - api.admin.crudGenerated.newsArticlesCRUD.create
 *    - api.admin.crudGenerated.newsArticlesCRUD.read
 *    - api.admin.crudGenerated.newsArticlesCRUD.update
 *    - api.admin.crudGenerated.newsArticlesCRUD.destroy
 *    - api.admin.crudGenerated.newsArticlesCRUD.paginate
 *
 * ✅ WRITE CUSTOM QUERIES for:
 *    - Filtering by fields (by category, status, etc)
 *    - Finding by non-ID fields (by name, slug, key)
 *    - Complex filtering with multiple conditions
 *    - Computed fields or aggregations
 *    - Joins across tables
 *
 * ✅ WRITE CUSTOM MUTATIONS for:
 *    - Validation beyond schema (min/max, business rules)
 *    - Side effects (notifications, analytics, etc)
 *    - Complex state transitions
 *    - Multi-table updates
 *    - Conditional logic
 *
 * 📝 EXAMPLES:
 *
 * // Use CRUD directly:
 * const article = useConvexQuery(api.admin.crudGenerated.newsArticlesCRUD.read, { id });
 *
 * // Use custom query for filtering:
 * const techNews = useConvexQuery(api.admin.CRUD_EXAMPLES.listNewsByCategory, { category: "update" });
 *
 * // Use custom mutation for complex logic:
 * const publish = useConvexMutation(api.admin.CRUD_EXAMPLES.publishNewsArticle);
 */
