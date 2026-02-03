/**
 * Token Configuration Management
 *
 * CRUD operations for the LunchTable token configuration.
 * Manages token metadata, social links, and launch status.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Validators
const tokenStatusValidator = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("launched"),
  v.literal("graduated")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get the current token configuration
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Get the most recent config (should be singleton-ish)
    const configs = await ctx.db.query("tokenConfig").order("desc").take(1);
    return configs[0] ?? null;
  },
});

/**
 * Get token config by status
 */
export const getByStatus = query({
  args: {
    status: tokenStatusValidator,
  },
  handler: async (ctx, { status }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("tokenConfig")
      .withIndex("by_status", (q) => q.eq("status", status))
      .first();
  },
});

/**
 * Get token launch readiness
 */
export const getReadiness = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const config = await ctx.db.query("tokenConfig").order("desc").first();
    if (!config) {
      return {
        ready: false,
        issues: ["No token configuration found"],
        checklist: {
          hasName: false,
          hasSymbol: false,
          hasDescription: false,
          hasImage: false,
          hasSocials: false,
        },
      };
    }

    const issues: string[] = [];
    const checklist = {
      hasName: !!config.name,
      hasSymbol: !!config.symbol,
      hasDescription: !!config.description,
      hasImage: !!config.imageUrl,
      hasSocials: !!(config.twitter || config.telegram || config.website),
    };

    if (!checklist.hasName) issues.push("Token name is required");
    if (!checklist.hasSymbol) issues.push("Token symbol is required");
    if (!checklist.hasDescription) issues.push("Token description is required");
    if (!checklist.hasImage) issues.push("Token image is recommended");
    if (!checklist.hasSocials) issues.push("At least one social link is recommended");

    return {
      ready: issues.length === 0,
      issues,
      checklist,
      config,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create or update token configuration
 */
export const upsertConfig = mutation({
  args: {
    name: v.string(),
    symbol: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    twitter: v.optional(v.string()),
    telegram: v.optional(v.string()),
    website: v.optional(v.string()),
    discord: v.optional(v.string()),
    initialSupply: v.optional(v.number()),
    decimals: v.optional(v.number()),
    targetMarketCap: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Check if config exists
    const existing = await ctx.db.query("tokenConfig").order("desc").first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });

      await scheduleAuditLog(ctx, {
        adminId: userId,
        action: "token.config.update",
        metadata: { configId: existing._id, updates: args },
        success: true,
      });

      return existing._id;
    }
    // Create new
    const configId = await ctx.db.insert("tokenConfig", {
      ...args,
      decimals: args.decimals ?? 6,
      targetMarketCap: args.targetMarketCap ?? 90000, // $90k default
      status: "draft",
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "token.config.create",
      metadata: { configId, name: args.name, symbol: args.symbol },
      success: true,
    });

    return configId;
  },
});

/**
 * Update token status
 */
export const updateStatus = mutation({
  args: {
    status: tokenStatusValidator,
    mintAddress: v.optional(v.string()),
    bondingCurveAddress: v.optional(v.string()),
    pumpfunUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const config = await ctx.db.query("tokenConfig").order("desc").first();
    if (!config) {
      throw new Error("No token configuration found");
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.mintAddress) updates.mintAddress = args.mintAddress;
    if (args.bondingCurveAddress) updates.bondingCurveAddress = args.bondingCurveAddress;
    if (args.pumpfunUrl) updates.pumpfunUrl = args.pumpfunUrl;

    if (args.status === "launched" && !config.launchedAt) {
      updates.launchedAt = Date.now();
    }

    if (args.status === "graduated" && !config.graduatedAt) {
      updates.graduatedAt = Date.now();
    }

    await ctx.db.patch(config._id, updates);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "token.config.status_change",
      metadata: {
        configId: config._id,
        oldStatus: config.status,
        newStatus: args.status,
      },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Mark token as ready for launch
 */
export const markReady = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const config = await ctx.db.query("tokenConfig").order("desc").first();
    if (!config) {
      throw new Error("No token configuration found");
    }

    // Validate required fields
    if (!config.name || !config.symbol || !config.description) {
      throw new Error("Token name, symbol, and description are required");
    }

    if (config.status !== "draft") {
      throw new Error("Token must be in draft status to mark as ready");
    }

    await ctx.db.patch(config._id, {
      status: "ready",
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "token.config.mark_ready",
      metadata: { configId: config._id },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Record launch transaction
 */
export const recordLaunch = mutation({
  args: {
    mintAddress: v.string(),
    bondingCurveAddress: v.optional(v.string()),
    pumpfunUrl: v.optional(v.string()),
    launchTxSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const config = await ctx.db.query("tokenConfig").order("desc").first();
    if (!config) {
      throw new Error("No token configuration found");
    }

    await ctx.db.patch(config._id, {
      status: "launched",
      mintAddress: args.mintAddress,
      bondingCurveAddress: args.bondingCurveAddress,
      pumpfunUrl: args.pumpfunUrl,
      launchedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Also update launch schedule if exists
    const schedule = await ctx.db.query("launchSchedule").order("desc").first();
    if (schedule) {
      await ctx.db.patch(schedule._id, {
        status: "launched",
        launchTxSignature: args.launchTxSignature,
        updatedAt: Date.now(),
      });
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "token.launched",
      metadata: {
        configId: config._id,
        mintAddress: args.mintAddress,
        pumpfunUrl: args.pumpfunUrl,
      },
      success: true,
    });

    return { success: true };
  },
});
