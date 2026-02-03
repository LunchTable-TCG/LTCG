/**
 * Battle Pass Admin Module
 *
 * CRUD operations for managing battle pass seasons and tier definitions.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Types & Validators
// =============================================================================

const battlePassStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("active"),
  v.literal("ended")
);

const rewardTypeValidator = v.union(
  v.literal("gold"),
  v.literal("gems"),
  v.literal("xp"),
  v.literal("card"),
  v.literal("pack"),
  v.literal("title"),
  v.literal("avatar")
);

const rewardValidator = v.object({
  type: rewardTypeValidator,
  amount: v.optional(v.number()),
  cardId: v.optional(v.id("cardDefinitions")),
  packProductId: v.optional(v.string()),
  titleName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
});

// Default tier rewards template
const DEFAULT_TIER_REWARDS = generateDefaultTierRewards();

function generateDefaultTierRewards() {
  const rewards: Array<{
    tier: number;
    freeReward?: { type: "gold" | "gems" | "xp"; amount: number };
    premiumReward?: { type: "gold" | "gems" | "xp"; amount: number };
    isMilestone: boolean;
  }> = [];

  for (let i = 1; i <= 50; i++) {
    const isMilestone = i % 10 === 0 || i === 50;

    // Free track: gold every tier, bonus at milestones
    const freeGold = isMilestone ? 500 : 100;

    // Premium track: gems at milestones, gold otherwise
    const premiumReward = isMilestone
      ? { type: "gems" as const, amount: i === 50 ? 100 : 50 }
      : { type: "gold" as const, amount: 200 };

    rewards.push({
      tier: i,
      freeReward: { type: "gold", amount: freeGold },
      premiumReward,
      isMilestone,
    });
  }

  return rewards;
}

// =============================================================================
// Queries
// =============================================================================

/**
 * List all battle pass seasons
 */
export const listBattlePassSeasons = query({
  args: {
    status: v.optional(battlePassStatusValidator),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let battlePasses;
    if (args.status) {
      battlePasses = await ctx.db
        .query("battlePassSeasons")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      battlePasses = await ctx.db.query("battlePassSeasons").collect();
    }

    // Sort by creation date descending
    battlePasses.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;
    const paginated = battlePasses.slice(offset, offset + limit);

    // Enrich with season info
    const enriched = await Promise.all(
      paginated.map(async (bp) => {
        const season = await ctx.db.get(bp.seasonId) as Doc<"seasons"> | null;
        const tierCount = await ctx.db
          .query("battlePassTiers")
          .withIndex("by_battlepass", (q) => q.eq("battlePassId", bp._id))
          .collect();

        return {
          ...bp,
          seasonName: season?.name ?? "Unknown",
          seasonNumber: season?.number ?? 0,
          tierCount: tierCount.length,
        };
      })
    );

    return {
      battlePasses: enriched,
      totalCount: battlePasses.length,
      hasMore: offset + limit < battlePasses.length,
    };
  },
});

/**
 * Get a single battle pass with full details
 */
export const getBattlePass = query({
  args: {
    battlePassId: v.id("battlePassSeasons"),
  },
  handler: async (ctx, { battlePassId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const battlePass = await ctx.db.get(battlePassId);
    if (!battlePass) {
      throw new Error("Battle Pass not found");
    }

    // Get season info
    const season = await ctx.db.get(battlePass.seasonId);

    // Get tier count
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePassId))
      .collect();

    // Get progress stats
    const allProgress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePassId))
      .collect();

    const premiumCount = allProgress.filter((p) => p.isPremium).length;
    const avgTier =
      allProgress.length > 0
        ? Math.round(
            allProgress.reduce((sum, p) => sum + p.currentTier, 0) /
              allProgress.length
          )
        : 0;

    // Get creator info
    const creator = await ctx.db.get(battlePass.createdBy);

    return {
      ...battlePass,
      seasonName: season?.name ?? "Unknown",
      seasonNumber: season?.number ?? 0,
      tierCount: tiers.length,
      stats: {
        totalPlayers: allProgress.length,
        premiumPlayers: premiumCount,
        freeToPlayPlayers: allProgress.length - premiumCount,
        averageTier: avgTier,
        premiumConversionRate:
          allProgress.length > 0
            ? Math.round((premiumCount / allProgress.length) * 100)
            : 0,
      },
      creatorUsername: creator?.username ?? "Unknown",
    };
  },
});

/**
 * Get all tiers for a battle pass
 */
export const getBattlePassTiers = query({
  args: {
    battlePassId: v.id("battlePassSeasons"),
  },
  handler: async (ctx, { battlePassId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePassId))
      .collect();

    // Sort by tier number
    tiers.sort((a, b) => a.tier - b.tier);

    return tiers;
  },
});

/**
 * Get battle pass statistics
 */
export const getBattlePassStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const battlePasses = await ctx.db.query("battlePassSeasons").collect();
    const activeBP = battlePasses.find((bp) => bp.status === "active");

    let activeStats = null;
    if (activeBP) {
      const progress = await ctx.db
        .query("battlePassProgress")
        .withIndex("by_battlepass", (q) => q.eq("battlePassId", activeBP._id))
        .collect();

      const premiumCount = progress.filter((p) => p.isPremium).length;
      const avgTier =
        progress.length > 0
          ? Math.round(
              progress.reduce((sum, p) => sum + p.currentTier, 0) /
                progress.length
            )
          : 0;

      // Tier distribution
      const tierDistribution: Record<string, number> = {};
      for (const p of progress) {
        const tierBucket = `${Math.floor(p.currentTier / 10) * 10}-${Math.floor(p.currentTier / 10) * 10 + 9}`;
        tierDistribution[tierBucket] = (tierDistribution[tierBucket] || 0) + 1;
      }

      activeStats = {
        name: activeBP.name,
        totalPlayers: progress.length,
        premiumPlayers: premiumCount,
        averageTier: avgTier,
        daysRemaining: Math.max(
          0,
          Math.ceil((activeBP.endDate - Date.now()) / (24 * 60 * 60 * 1000))
        ),
        tierDistribution,
      };
    }

    return {
      totalBattlePasses: battlePasses.length,
      activeBattlePass: activeStats,
      upcomingCount: battlePasses.filter((bp) => bp.status === "upcoming")
        .length,
      endedCount: battlePasses.filter((bp) => bp.status === "ended").length,
    };
  },
});

/**
 * Get available seasons for linking to a battle pass
 */
export const getAvailableSeasonsForBattlePass = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Get all seasons
    const seasons = await ctx.db.query("seasons").collect();

    // Get seasons already linked to battle passes
    const battlePasses = await ctx.db.query("battlePassSeasons").collect();
    const linkedSeasonIds = new Set(battlePasses.map((bp) => bp.seasonId));

    // Return seasons that aren't already linked
    const available = seasons.filter((s) => !linkedSeasonIds.has(s._id));

    return available.map((s) => ({
      _id: s._id,
      name: s.name,
      number: s.number,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
    }));
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new battle pass season
 */
export const createBattlePassSeason = mutation({
  args: {
    seasonId: v.id("seasons"),
    name: v.string(),
    description: v.optional(v.string()),
    totalTiers: v.optional(v.number()), // Default: 50
    xpPerTier: v.optional(v.number()), // Default: 1000
    premiumPrice: v.optional(v.number()), // Default: 1000 gems
    useDefaultRewards: v.optional(v.boolean()), // Auto-generate tier rewards
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate season exists and isn't already linked
    const season = await ctx.db.get(args.seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    const existingBP = await ctx.db
      .query("battlePassSeasons")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .first();

    if (existingBP) {
      throw new Error("This season already has a battle pass");
    }

    const now = Date.now();
    const totalTiers = args.totalTiers ?? 50;
    const xpPerTier = args.xpPerTier ?? 1000;
    const premiumPrice = args.premiumPrice ?? 1000;

    // Create battle pass
    const battlePassId = await ctx.db.insert("battlePassSeasons", {
      seasonId: args.seasonId,
      name: args.name,
      description: args.description,
      status: season.status === "active" ? "active" : "upcoming",
      totalTiers,
      xpPerTier,
      premiumPrice,
      startDate: season.startDate,
      endDate: season.endDate,
      createdAt: now,
      createdBy: adminId,
      updatedAt: now,
    });

    // Create default tier rewards if requested
    if (args.useDefaultRewards !== false) {
      await createDefaultTiers(ctx, battlePassId, totalTiers);
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_battle_pass",
      metadata: {
        battlePassId,
        seasonId: args.seasonId,
        name: args.name,
        totalTiers,
      },
      success: true,
    });

    return {
      battlePassId,
      message: `Created battle pass "${args.name}" with ${totalTiers} tiers`,
    };
  },
});

/**
 * Update a battle pass season
 */
export const updateBattlePassSeason = mutation({
  args: {
    battlePassId: v.id("battlePassSeasons"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    xpPerTier: v.optional(v.number()),
    premiumPrice: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const battlePass = await ctx.db.get(args.battlePassId);
    if (!battlePass) {
      throw new Error("Battle Pass not found");
    }

    // Don't allow editing ended battle passes
    if (battlePass.status === "ended") {
      throw new Error("Cannot edit an ended battle pass");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates["name"] = args.name;
    if (args.description !== undefined) updates["description"] = args.description;
    if (args.xpPerTier !== undefined) updates["xpPerTier"] = args.xpPerTier;
    if (args.premiumPrice !== undefined) updates["premiumPrice"] = args.premiumPrice;
    if (args.startDate !== undefined) updates["startDate"] = args.startDate;
    if (args.endDate !== undefined) updates["endDate"] = args.endDate;

    await ctx.db.patch(args.battlePassId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_battle_pass",
      metadata: {
        battlePassId: args.battlePassId,
        updates: Object.keys(updates).filter((k) => k !== "updatedAt"),
      },
      success: true,
    });

    return { success: true, message: `Updated battle pass "${battlePass.name}"` };
  },
});

/**
 * Define or update a single battle pass tier
 */
export const defineBattlePassTier = mutation({
  args: {
    battlePassId: v.id("battlePassSeasons"),
    tier: v.number(),
    freeReward: v.optional(rewardValidator),
    premiumReward: v.optional(rewardValidator),
    isMilestone: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const battlePass = await ctx.db.get(args.battlePassId);
    if (!battlePass) {
      throw new Error("Battle Pass not found");
    }

    if (args.tier < 1 || args.tier > battlePass.totalTiers) {
      throw new Error(
        `Tier must be between 1 and ${battlePass.totalTiers}`
      );
    }

    // Check if tier already exists
    const existingTier = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass_tier", (q) =>
        q.eq("battlePassId", args.battlePassId).eq("tier", args.tier)
      )
      .first();

    if (existingTier) {
      // Update existing tier
      await ctx.db.patch(existingTier._id, {
        freeReward: args.freeReward,
        premiumReward: args.premiumReward,
        isMilestone: args.isMilestone ?? existingTier.isMilestone,
      });

      return { success: true, message: `Updated tier ${args.tier}`, updated: true };
    }

    // Create new tier
    await ctx.db.insert("battlePassTiers", {
      battlePassId: args.battlePassId,
      tier: args.tier,
      freeReward: args.freeReward,
      premiumReward: args.premiumReward,
      isMilestone: args.isMilestone ?? args.tier % 10 === 0,
    });

    return { success: true, message: `Created tier ${args.tier}`, updated: false };
  },
});

/**
 * Bulk define battle pass tiers
 */
export const defineBattlePassTiers = mutation({
  args: {
    battlePassId: v.id("battlePassSeasons"),
    tiers: v.array(
      v.object({
        tier: v.number(),
        freeReward: v.optional(rewardValidator),
        premiumReward: v.optional(rewardValidator),
        isMilestone: v.optional(v.boolean()),
      })
    ),
    replaceExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const battlePass = await ctx.db.get(args.battlePassId);
    if (!battlePass) {
      throw new Error("Battle Pass not found");
    }

    // Delete existing tiers if replacing
    if (args.replaceExisting) {
      const existingTiers = await ctx.db
        .query("battlePassTiers")
        .withIndex("by_battlepass", (q) => q.eq("battlePassId", args.battlePassId))
        .collect();

      for (const tier of existingTiers) {
        await ctx.db.delete(tier._id);
      }
    }

    // Insert new tiers
    let created = 0;
    let updated = 0;

    for (const tierDef of args.tiers) {
      if (tierDef.tier < 1 || tierDef.tier > battlePass.totalTiers) {
        continue; // Skip invalid tiers
      }

      const existingTier = await ctx.db
        .query("battlePassTiers")
        .withIndex("by_battlepass_tier", (q) =>
          q.eq("battlePassId", args.battlePassId).eq("tier", tierDef.tier)
        )
        .first();

      if (existingTier && !args.replaceExisting) {
        await ctx.db.patch(existingTier._id, {
          freeReward: tierDef.freeReward,
          premiumReward: tierDef.premiumReward,
          isMilestone: tierDef.isMilestone ?? existingTier.isMilestone,
        });
        updated++;
      } else {
        await ctx.db.insert("battlePassTiers", {
          battlePassId: args.battlePassId,
          tier: tierDef.tier,
          freeReward: tierDef.freeReward,
          premiumReward: tierDef.premiumReward,
          isMilestone: tierDef.isMilestone ?? tierDef.tier % 10 === 0,
        });
        created++;
      }
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "define_battle_pass_tiers",
      metadata: {
        battlePassId: args.battlePassId,
        tiersProvided: args.tiers.length,
        created,
        updated,
        replaced: args.replaceExisting ?? false,
      },
      success: true,
    });

    return {
      success: true,
      message: `Processed ${args.tiers.length} tiers: ${created} created, ${updated} updated`,
      created,
      updated,
    };
  },
});

/**
 * Activate a battle pass (set status to active)
 */
export const activateBattlePass = mutation({
  args: {
    battlePassId: v.id("battlePassSeasons"),
  },
  handler: async (ctx, { battlePassId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const battlePass = await ctx.db.get(battlePassId);
    if (!battlePass) {
      throw new Error("Battle Pass not found");
    }

    if (battlePass.status !== "upcoming") {
      throw new Error("Can only activate upcoming battle passes");
    }

    // Check for existing active battle pass
    const activeBP = await ctx.db
      .query("battlePassSeasons")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();

    if (activeBP) {
      throw new Error(
        `Another battle pass is already active: "${activeBP.name}". End it first.`
      );
    }

    // Verify tiers exist
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePassId))
      .collect();

    if (tiers.length === 0) {
      throw new Error("Battle pass has no tiers defined. Add tiers before activating.");
    }

    await ctx.db.patch(battlePassId, {
      status: "active",
      startDate: Date.now(),
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "activate_battle_pass",
      metadata: {
        battlePassId,
        name: battlePass.name,
        tierCount: tiers.length,
      },
      success: true,
    });

    return { success: true, message: `Activated battle pass "${battlePass.name}"` };
  },
});

/**
 * End a battle pass (set status to ended)
 */
export const endBattlePass = mutation({
  args: {
    battlePassId: v.id("battlePassSeasons"),
  },
  handler: async (ctx, { battlePassId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const battlePass = await ctx.db.get(battlePassId);
    if (!battlePass) {
      throw new Error("Battle Pass not found");
    }

    if (battlePass.status !== "active") {
      throw new Error("Can only end active battle passes");
    }

    // Get stats before ending
    const allProgress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePassId))
      .collect();

    const premiumCount = allProgress.filter((p) => p.isPremium).length;

    await ctx.db.patch(battlePassId, {
      status: "ended",
      endDate: Date.now(),
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "end_battle_pass",
      metadata: {
        battlePassId,
        name: battlePass.name,
        totalPlayers: allProgress.length,
        premiumPlayers: premiumCount,
      },
      success: true,
    });

    return {
      success: true,
      message: `Ended battle pass "${battlePass.name}"`,
      stats: {
        totalPlayers: allProgress.length,
        premiumPlayers: premiumCount,
      },
    };
  },
});

/**
 * Delete a battle pass (superadmin only, must be upcoming)
 */
export const deleteBattlePass = mutation({
  args: {
    battlePassId: v.id("battlePassSeasons"),
  },
  handler: async (ctx, { battlePassId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const battlePass = await ctx.db.get(battlePassId);
    if (!battlePass) {
      throw new Error("Battle Pass not found");
    }

    if (battlePass.status !== "upcoming") {
      throw new Error("Can only delete upcoming battle passes");
    }

    // Delete all tiers
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePassId))
      .collect();

    for (const tier of tiers) {
      await ctx.db.delete(tier._id);
    }

    // Delete battle pass
    await ctx.db.delete(battlePassId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_battle_pass",
      metadata: {
        battlePassId,
        name: battlePass.name,
        tiersDeleted: tiers.length,
      },
      success: true,
    });

    return {
      success: true,
      message: `Deleted battle pass "${battlePass.name}" and ${tiers.length} tiers`,
    };
  },
});

// =============================================================================
// Internal Helper Functions
// =============================================================================

/**
 * Create default tier rewards for a battle pass
 */
async function createDefaultTiers(
  ctx: MutationCtx,
  battlePassId: Id<"battlePassSeasons">,
  totalTiers: number
) {
  const rewards = DEFAULT_TIER_REWARDS.slice(0, totalTiers);

  for (const tierDef of rewards) {
    await ctx.db.insert("battlePassTiers", {
      battlePassId,
      tier: tierDef.tier,
      freeReward: tierDef.freeReward,
      premiumReward: tierDef.premiumReward,
      isMilestone: tierDef.isMilestone,
    });
  }
}
