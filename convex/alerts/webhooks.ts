/**
 * Webhook Configuration Management
 *
 * Configure and manage webhooks for external data providers (Helius, etc.).
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation, internalMutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Validators
const providerValidator = v.union(v.literal("helius"), v.literal("shyft"), v.literal("bitquery"));

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all webhook configurations
 */
export const getAll = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    if (args.activeOnly) {
      return await ctx.db
        .query("webhookConfig")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }

    return await ctx.db.query("webhookConfig").collect();
  },
});

/**
 * Get webhook config by provider
 */
export const getByProvider = query({
  args: {
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("webhookConfig")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();
  },
});

/**
 * Get webhook stats
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const webhooks = await ctx.db.query("webhookConfig").collect();

    return {
      total: webhooks.length,
      active: webhooks.filter((w) => w.isActive).length,
      byProvider: {
        helius: webhooks.filter((w) => w.provider === "helius").length,
        shyft: webhooks.filter((w) => w.provider === "shyft").length,
        bitquery: webhooks.filter((w) => w.provider === "bitquery").length,
      },
      lastActivity:
        webhooks
          .map((w) => w.lastEventAt)
          .filter(Boolean)
          .sort((a, b) => (b ?? 0) - (a ?? 0))[0] ?? null,
      totalErrors: webhooks.reduce((sum, w) => sum + (w.errorCount ?? 0), 0),
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new webhook configuration
 */
export const create = mutation({
  args: {
    provider: providerValidator,
    webhookUrl: v.string(),
    webhookId: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    tokenMint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Check if webhook for this provider already exists
    const existing = await ctx.db
      .query("webhookConfig")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();

    if (existing) {
      throw new Error(`Webhook for ${args.provider} already exists`);
    }

    const now = Date.now();
    const configId = await ctx.db.insert("webhookConfig", {
      provider: args.provider,
      webhookId: args.webhookId,
      webhookUrl: args.webhookUrl,
      webhookSecret: args.webhookSecret,
      tokenMint: args.tokenMint,
      isActive: true,
      errorCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "webhook.config.create",
      metadata: { configId, provider: args.provider },
      success: true,
    });

    return configId;
  },
});

/**
 * Update webhook configuration
 */
export const update = mutation({
  args: {
    configId: v.id("webhookConfig"),
    webhookUrl: v.optional(v.string()),
    webhookId: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    tokenMint: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const config = await ctx.db.get(args.configId);
    if (!config) {
      throw new Error("Webhook config not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.webhookUrl !== undefined) updates["webhookUrl"] = args.webhookUrl;
    if (args.webhookId !== undefined) updates["webhookId"] = args.webhookId;
    if (args.webhookSecret !== undefined) updates["webhookSecret"] = args.webhookSecret;
    if (args.tokenMint !== undefined) updates["tokenMint"] = args.tokenMint;
    if (args.isActive !== undefined) updates["isActive"] = args.isActive;

    await ctx.db.patch(args.configId, updates);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "webhook.config.update",
      metadata: { configId: args.configId, provider: config.provider },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Delete webhook configuration
 */
export const remove = mutation({
  args: {
    configId: v.id("webhookConfig"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const config = await ctx.db.get(args.configId);
    if (!config) {
      throw new Error("Webhook config not found");
    }

    await ctx.db.delete(args.configId);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "webhook.config.delete",
      metadata: { configId: args.configId, provider: config.provider },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Toggle webhook active status
 */
export const toggleActive = mutation({
  args: {
    configId: v.id("webhookConfig"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const config = await ctx.db.get(args.configId);
    if (!config) {
      throw new Error("Webhook config not found");
    }

    await ctx.db.patch(args.configId, {
      isActive: !config.isActive,
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: config.isActive ? "webhook.config.deactivate" : "webhook.config.activate",
      metadata: { configId: args.configId, provider: config.provider },
      success: true,
    });

    return { success: true, isActive: !config.isActive };
  },
});

/**
 * Reset error count
 */
export const resetErrors = mutation({
  args: {
    configId: v.id("webhookConfig"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    await ctx.db.patch(args.configId, {
      errorCount: 0,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Record webhook event received
 */
export const recordEvent = internalMutation({
  args: {
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("webhookConfig")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();

    if (config) {
      await ctx.db.patch(config._id, {
        lastEventAt: Date.now(),
      });
    }
  },
});

/**
 * Record webhook error
 */
export const recordError = internalMutation({
  args: {
    provider: providerValidator,
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("webhookConfig")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();

    if (config) {
      await ctx.db.patch(config._id, {
        errorCount: (config.errorCount ?? 0) + 1,
        updatedAt: Date.now(),
      });

      // Disable webhook if too many errors
      if ((config.errorCount ?? 0) >= 10) {
        await ctx.db.patch(config._id, {
          isActive: false,
        });
      }
    }
  },
});
