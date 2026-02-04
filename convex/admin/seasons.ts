/**
 * Season Admin Module
 *
 * CRUD operations for managing competitive seasons with rewards distribution.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Types & Validators
// =============================================================================

const seasonStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("active"),
  v.literal("ended")
);

const rankResetTypeValidator = v.union(v.literal("full"), v.literal("soft"), v.literal("none"));

const rewardTierValidator = v.object({
  tier: v.string(),
  minElo: v.number(),
  goldReward: v.number(),
  gemsReward: v.number(),
  cardPackReward: v.optional(v.number()),
  exclusiveCardId: v.optional(v.id("cardDefinitions")),
  titleReward: v.optional(v.string()),
});

// Default ELO rating
const DEFAULT_ELO = 1000;

// Default tier configuration
const DEFAULT_REWARDS = [
  { tier: "Bronze", minElo: 0, goldReward: 500, gemsReward: 0 },
  { tier: "Silver", minElo: 1100, goldReward: 1000, gemsReward: 50 },
  { tier: "Gold", minElo: 1300, goldReward: 2000, gemsReward: 100 },
  { tier: "Platinum", minElo: 1500, goldReward: 3500, gemsReward: 200 },
  { tier: "Diamond", minElo: 1700, goldReward: 5000, gemsReward: 350 },
  { tier: "Master", minElo: 1900, goldReward: 7500, gemsReward: 500, cardPackReward: 3 },
  {
    tier: "Legend",
    minElo: 2100,
    goldReward: 10000,
    gemsReward: 750,
    cardPackReward: 5,
    titleReward: "Legend",
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get tier for a given ELO rating
 */
type RewardTier = {
  tier: string;
  minElo: number;
  goldReward: number;
  gemsReward: number;
  cardPackReward?: number;
  exclusiveCardId?: Id<"cardDefinitions">;
  titleReward?: string;
};

const DEFAULT_TIER: RewardTier = { tier: "Unranked", minElo: 0, goldReward: 0, gemsReward: 0 };

function getTierForElo(elo: number, rewards: RewardTier[]): RewardTier {
  if (rewards.length === 0) return DEFAULT_TIER;
  // Sort by minElo descending to find highest matching tier
  const sortedRewards = [...rewards].sort((a, b) => b.minElo - a.minElo);
  for (const reward of sortedRewards) {
    if (elo >= reward.minElo) {
      return reward;
    }
  }
  // Default to lowest tier
  return rewards[0] ?? DEFAULT_TIER;
}

// =============================================================================
// Queries
// =============================================================================

/**
 * List all seasons ordered by number descending (newest first)
 */
export const listSeasons = query({
  args: {
    status: v.optional(seasonStatusValidator),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const seasons = await (async () => {
      if (args.status) {
        const status = args.status;
        return await ctx.db
          .query("seasons")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect();
      }
      return await ctx.db.query("seasons").collect();
    })();

    type Season = (typeof seasons)[number];

    // Sort by number descending (newest first)
    seasons.sort((a: Season, b: Season) => b.number - a.number);

    // Apply pagination
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;
    const paginated = seasons.slice(offset, offset + limit);

    return {
      seasons: paginated,
      totalCount: seasons.length,
      hasMore: offset + limit < seasons.length,
    };
  },
});

/**
 * Get a single season with stats
 */
export const getSeason = query({
  args: {
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, { seasonId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const season = await ctx.db.get(seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    // Get creator info
    const creator = await ctx.db.get(season.createdBy);

    // Get snapshot stats if season ended
    let snapshotStats = null;
    if (season.status === "ended") {
      const snapshots = await ctx.db
        .query("seasonSnapshots")
        .withIndex("by_season", (q) => q.eq("seasonId", seasonId))
        .collect();

      const rewardsDistributed = snapshots.filter((s) => s.rewardsDistributed).length;
      const tierCounts: Record<string, number> = {};
      for (const snap of snapshots) {
        tierCounts[snap.tier] = (tierCounts[snap.tier] || 0) + 1;
      }

      snapshotStats = {
        totalPlayers: snapshots.length,
        rewardsDistributed,
        pendingRewards: snapshots.length - rewardsDistributed,
        tierDistribution: tierCounts,
      };
    }

    return {
      ...season,
      creatorUsername: creator?.username || "Unknown",
      snapshotStats,
    };
  },
});

/**
 * Get the currently active season
 */
export const getCurrentSeason = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const activeSeason = await ctx.db
      .query("seasons")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();

    return activeSeason;
  },
});

/**
 * Get season statistics
 */
export const getSeasonStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const seasons = await ctx.db.query("seasons").collect();
    const activeSeason = seasons.find((s) => s.status === "active");
    const upcomingSeasons = seasons.filter((s) => s.status === "upcoming").length;
    const endedSeasons = seasons.filter((s) => s.status === "ended").length;

    // Get current season player count from ranked stats
    let activeSeasonPlayers = 0;
    if (activeSeason) {
      const playersWithRanked = await ctx.db
        .query("users")
        .filter((q) => q.gt(q.field("rankedElo"), 0))
        .collect();
      activeSeasonPlayers = playersWithRanked.length;
    }

    return {
      totalSeasons: seasons.length,
      activeSeason: activeSeason
        ? { _id: activeSeason._id, name: activeSeason.name, number: activeSeason.number }
        : null,
      upcomingSeasons,
      endedSeasons,
      activeSeasonPlayers,
    };
  },
});

/**
 * Get leaderboard for a season (or current rankings if active)
 */
export const getSeasonLeaderboard = query({
  args: {
    seasonId: v.id("seasons"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const season = await ctx.db.get(args.seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;

    // If season ended, get from snapshots
    if (season.status === "ended") {
      const snapshots = await ctx.db
        .query("seasonSnapshots")
        .withIndex("by_season_rank", (q) => q.eq("seasonId", args.seasonId))
        .collect();

      // Sort by rank
      snapshots.sort((a, b) => a.rank - b.rank);
      const paginated = snapshots.slice(offset, offset + limit);

      return {
        leaderboard: paginated.map((s) => ({
          rank: s.rank,
          userId: s.userId,
          username: s.username,
          elo: s.finalElo,
          tier: s.tier,
          gamesPlayed: s.gamesPlayed,
          wins: s.wins,
          losses: s.losses,
          winRate: s.gamesPlayed > 0 ? Math.round((s.wins / s.gamesPlayed) * 100) : 0,
          rewardsDistributed: s.rewardsDistributed,
        })),
        totalCount: snapshots.length,
        hasMore: offset + limit < snapshots.length,
      };
    }

    // For active/upcoming seasons, get live rankings
    const users = await ctx.db.query("users").withIndex("rankedElo").collect();

    // Filter to users with ranked games and sort by ELO
    const rankedUsers = users
      .filter((u) => (u.rankedWins ?? 0) + (u.rankedLosses ?? 0) > 0)
      .sort((a, b) => (b.rankedElo ?? DEFAULT_ELO) - (a.rankedElo ?? DEFAULT_ELO));

    const paginated = rankedUsers.slice(offset, offset + limit);

    return {
      leaderboard: paginated.map((u, index) => {
        const elo = u.rankedElo ?? DEFAULT_ELO;
        const wins = u.rankedWins ?? 0;
        const losses = u.rankedLosses ?? 0;
        const gamesPlayed = wins + losses;
        const tierInfo = getTierForElo(
          elo,
          season.rewards.length > 0 ? season.rewards : DEFAULT_REWARDS
        );
        return {
          rank: offset + index + 1,
          userId: u._id,
          username: u.username || "Unknown",
          elo,
          tier: tierInfo.tier,
          gamesPlayed,
          wins,
          losses,
          winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
          rewardsDistributed: false,
        };
      }),
      totalCount: rankedUsers.length,
      hasMore: offset + limit < rankedUsers.length,
    };
  },
});

/**
 * Preview what rewards would be distributed for a season
 */
export const previewSeasonRewards = query({
  args: {
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, { seasonId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const season = await ctx.db.get(seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    const rewards = season.rewards.length > 0 ? season.rewards : DEFAULT_REWARDS;

    // Get all users with ranked games
    const users = await ctx.db.query("users").withIndex("rankedElo").collect();

    const rankedUsers = users
      .filter((u) => (u.rankedWins ?? 0) + (u.rankedLosses ?? 0) > 0)
      .sort((a, b) => (b.rankedElo ?? DEFAULT_ELO) - (a.rankedElo ?? DEFAULT_ELO));

    // Calculate rewards per tier
    const tierStats: Record<
      string,
      { count: number; totalGold: number; totalGems: number; totalPacks: number }
    > = {};
    let totalGold = 0;
    let totalGems = 0;
    let totalPacks = 0;

    for (const user of rankedUsers) {
      const elo = user.rankedElo ?? DEFAULT_ELO;
      const tierInfo = getTierForElo(elo, rewards);

      if (!tierStats[tierInfo.tier]) {
        tierStats[tierInfo.tier] = { count: 0, totalGold: 0, totalGems: 0, totalPacks: 0 };
      }

      const stats = tierStats[tierInfo.tier];
      if (!stats) {
        throw new Error(`Tier stats not found for tier ${tierInfo.tier}`);
      }
      stats.count++;
      stats.totalGold += tierInfo.goldReward;
      stats.totalGems += tierInfo.gemsReward;
      stats.totalPacks += tierInfo.cardPackReward ?? 0;

      totalGold += tierInfo.goldReward;
      totalGems += tierInfo.gemsReward;
      totalPacks += tierInfo.cardPackReward ?? 0;
    }

    return {
      totalPlayers: rankedUsers.length,
      totalGold,
      totalGems,
      totalPacks,
      tierBreakdown: Object.entries(tierStats).map(([tier, stats]) => ({
        tier,
        playerCount: stats.count,
        totalGold: stats.totalGold,
        totalGems: stats.totalGems,
        totalPacks: stats.totalPacks,
      })),
      rewards,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new season
 */
export const createSeason = mutation({
  args: {
    name: v.string(),
    number: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    description: v.optional(v.string()),
    rankResetType: rankResetTypeValidator,
    softResetPercentage: v.optional(v.number()),
    rewards: v.optional(v.array(rewardTierValidator)),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate season number is unique
    const existingNumber = await ctx.db
      .query("seasons")
      .withIndex("by_number", (q) => q.eq("number", args.number))
      .first();

    if (existingNumber) {
      throw new Error(`Season number ${args.number} already exists`);
    }

    // Validate dates
    if (args.startDate >= args.endDate) {
      throw new Error("End date must be after start date");
    }

    // Validate soft reset percentage if applicable
    if (args.rankResetType === "soft") {
      if (
        args.softResetPercentage === undefined ||
        args.softResetPercentage < 0 ||
        args.softResetPercentage > 100
      ) {
        throw new Error("Soft reset percentage must be between 0 and 100");
      }
    }

    const now = Date.now();
    const rewards = args.rewards ?? DEFAULT_REWARDS;

    const seasonId = await ctx.db.insert("seasons", {
      name: args.name,
      number: args.number,
      status: "upcoming",
      startDate: args.startDate,
      endDate: args.endDate,
      description: args.description,
      rankResetType: args.rankResetType,
      softResetPercentage: args.softResetPercentage,
      rewards,
      createdAt: now,
      createdBy: adminId,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_season",
      metadata: {
        seasonId,
        name: args.name,
        number: args.number,
      },
      success: true,
    });

    return { seasonId, message: `Created season "${args.name}"` };
  },
});

/**
 * Update a season's details
 */
export const updateSeason = mutation({
  args: {
    seasonId: v.id("seasons"),
    name: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    description: v.optional(v.string()),
    rankResetType: v.optional(rankResetTypeValidator),
    softResetPercentage: v.optional(v.number()),
    rewards: v.optional(v.array(rewardTierValidator)),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const season = await ctx.db.get(args.seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    // Don't allow editing ended seasons (except minor metadata)
    if (season.status === "ended") {
      throw new Error("Cannot edit an ended season");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates["name"] = args.name;
    if (args.description !== undefined) updates["description"] = args.description;
    if (args.rankResetType !== undefined) updates["rankResetType"] = args.rankResetType;
    if (args.softResetPercentage !== undefined)
      updates["softResetPercentage"] = args.softResetPercentage;
    if (args.rewards !== undefined) updates["rewards"] = args.rewards;

    // Validate dates if either is being updated
    const newStartDate = args.startDate ?? season.startDate;
    const newEndDate = args.endDate ?? season.endDate;
    if (newStartDate >= newEndDate) {
      throw new Error("End date must be after start date");
    }
    if (args.startDate !== undefined) updates["startDate"] = args.startDate;
    if (args.endDate !== undefined) updates["endDate"] = args.endDate;

    await ctx.db.patch(args.seasonId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_season",
      metadata: {
        seasonId: args.seasonId,
        updates: Object.keys(updates)
          .filter((k) => k !== "updatedAt")
          .join(", "),
      },
      success: true,
    });

    return { success: true, message: `Updated season "${season.name}"` };
  },
});

/**
 * Start a season (set to active)
 * Will end any currently active season first
 */
export const startSeason = mutation({
  args: {
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, { seasonId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const season = await ctx.db.get(seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    if (season.status !== "upcoming") {
      throw new Error("Can only start upcoming seasons");
    }

    // Check for active season and end it first
    const activeSeason = await ctx.db
      .query("seasons")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();

    if (activeSeason) {
      // End the current active season
      await ctx.db.patch(activeSeason._id, {
        status: "ended",
        updatedAt: Date.now(),
      });

      // Create snapshots for the ending season
      await createSeasonSnapshots(ctx, activeSeason._id, activeSeason.rewards);

      await scheduleAuditLog(ctx, {
        adminId,
        action: "auto_end_season",
        metadata: {
          seasonId: activeSeason._id,
          name: activeSeason.name,
          reason: "New season started",
        },
        success: true,
      });
    }

    // Apply rank reset based on configuration
    if (season.rankResetType !== "none") {
      await applyRankReset(ctx, season.rankResetType, season.softResetPercentage);
    }

    // Activate the new season
    await ctx.db.patch(seasonId, {
      status: "active",
      startDate: Date.now(), // Update to actual start time
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "start_season",
      metadata: {
        seasonId,
        name: season.name,
        rankResetType: season.rankResetType,
        previousSeason: activeSeason?._id,
      },
      success: true,
    });

    return { success: true, message: `Started season "${season.name}"` };
  },
});

/**
 * End a season and create snapshots
 */
export const endSeason = mutation({
  args: {
    seasonId: v.id("seasons"),
    distributeRewards: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const season = await ctx.db.get(args.seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    if (season.status !== "active") {
      throw new Error("Can only end active seasons");
    }

    // Create snapshots for all ranked players
    const snapshotCount = await createSeasonSnapshots(ctx, args.seasonId, season.rewards);

    // Mark season as ended
    await ctx.db.patch(args.seasonId, {
      status: "ended",
      endDate: Date.now(), // Update to actual end time
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "end_season",
      metadata: {
        seasonId: args.seasonId,
        name: season.name,
        snapshotCount,
        distributeRewards: args.distributeRewards ?? false,
      },
      success: true,
    });

    // Optionally distribute rewards immediately
    if (args.distributeRewards) {
      const distributed = await distributeAllRewards(ctx, args.seasonId, season.rewards, adminId);
      return {
        success: true,
        message: `Ended season "${season.name}" and distributed rewards to ${distributed} players`,
        snapshotCount,
        rewardsDistributed: distributed,
      };
    }

    return {
      success: true,
      message: `Ended season "${season.name}". ${snapshotCount} player snapshots created.`,
      snapshotCount,
      rewardsDistributed: 0,
    };
  },
});

/**
 * Distribute rewards for a specific season
 */
export const distributeSeasonRewards = mutation({
  args: {
    seasonId: v.id("seasons"),
    userIds: v.optional(v.array(v.id("users"))), // Optional: distribute to specific users only
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const season = await ctx.db.get(args.seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    if (season.status !== "ended") {
      throw new Error("Can only distribute rewards for ended seasons");
    }

    const distributed = await distributeAllRewards(
      ctx,
      args.seasonId,
      season.rewards,
      adminId,
      args.userIds
    );

    await scheduleAuditLog(ctx, {
      adminId,
      action: "distribute_season_rewards",
      metadata: {
        seasonId: args.seasonId,
        distributedCount: distributed,
        specificUsers: args.userIds?.length ?? 0,
      },
      success: true,
    });

    return {
      success: true,
      message: `Distributed rewards to ${distributed} players`,
      distributedCount: distributed,
    };
  },
});

/**
 * Delete a season (superadmin only, must be upcoming)
 */
export const deleteSeason = mutation({
  args: {
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, { seasonId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const season = await ctx.db.get(seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    if (season.status !== "upcoming") {
      throw new Error("Can only delete upcoming seasons. End active seasons first.");
    }

    await ctx.db.delete(seasonId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_season",
      metadata: {
        seasonId,
        name: season.name,
        number: season.number,
      },
      success: true,
    });

    return { success: true, message: `Deleted season "${season.name}"` };
  },
});

// =============================================================================
// Internal Helper Functions
// =============================================================================

/**
 * Create snapshots for all ranked players in a season
 */
async function createSeasonSnapshots(
  ctx: MutationCtx,
  seasonId: Id<"seasons">,
  rewards: RewardTier[]
) {
  const season = await ctx.db.get(seasonId);
  if (!season) return 0;

  // Get all users with ranked games
  const users = await ctx.db.query("users").withIndex("rankedElo").collect();

  const rankedUsers = users
    .filter((u) => (u.rankedWins ?? 0) + (u.rankedLosses ?? 0) > 0)
    .sort((a, b) => (b.rankedElo ?? DEFAULT_ELO) - (a.rankedElo ?? DEFAULT_ELO));

  const now = Date.now();
  let count = 0;

  for (let i = 0; i < rankedUsers.length; i++) {
    const user = rankedUsers[i];
    if (!user) {
      continue;
    }
    const elo = user.rankedElo ?? DEFAULT_ELO;
    const wins = user.rankedWins ?? 0;
    const losses = user.rankedLosses ?? 0;
    const tierInfo = getTierForElo(elo, rewards.length > 0 ? rewards : DEFAULT_REWARDS);

    await ctx.db.insert("seasonSnapshots", {
      seasonId,
      seasonNumber: season.number,
      userId: user._id,
      username: user.username || "Unknown",
      finalElo: elo,
      tier: tierInfo.tier,
      rank: i + 1,
      gamesPlayed: wins + losses,
      wins,
      losses,
      rewardsDistributed: false,
      createdAt: now,
    });
    count++;
  }

  return count;
}

/**
 * Distribute rewards to all players with pending rewards
 */
async function distributeAllRewards(
  ctx: MutationCtx,
  seasonId: Id<"seasons">,
  rewards: RewardTier[],
  _adminId: Id<"users">,
  specificUserIds?: Id<"users">[]
) {
  const snapshots = await ctx.db
    .query("seasonSnapshots")
    .withIndex("by_season", (q) => q.eq("seasonId", seasonId))
    .collect();

  const rewardConfig = rewards.length > 0 ? rewards : DEFAULT_REWARDS;
  let distributedCount = 0;

  for (const snapshot of snapshots) {
    // Skip if already distributed or not in specific user list
    if (snapshot.rewardsDistributed) continue;
    if (specificUserIds && !specificUserIds.includes(snapshot.userId)) continue;

    const tierInfo = rewardConfig.find((r) => r.tier === snapshot.tier);
    if (!tierInfo) continue;

    // Distribute gold and gems
    if (tierInfo.goldReward > 0 || tierInfo.gemsReward > 0) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId: snapshot.userId,
        goldDelta: tierInfo.goldReward,
        gemsDelta: tierInfo.gemsReward,
        transactionType: "reward",
        description: `Season ${snapshot.seasonNumber} ${snapshot.tier} Rewards`,
        referenceId: seasonId,
        metadata: {
          tier: snapshot.tier,
          rank: snapshot.rank,
        },
      });
    }

    // Mark as distributed
    await ctx.db.patch(snapshot._id, { rewardsDistributed: true });
    distributedCount++;
  }

  return distributedCount;
}

/**
 * Apply rank reset to all players
 */
async function applyRankReset(
  ctx: MutationCtx,
  resetType: "full" | "soft" | "none",
  softResetPercentage?: number
) {
  if (resetType === "none") return;

  const users = await ctx.db
    .query("users")
    .filter((q) => q.gt(q.field("rankedElo"), 0))
    .collect();

  for (const user of users) {
    const currentElo = user.rankedElo ?? DEFAULT_ELO;
    let newElo = DEFAULT_ELO;

    if (resetType === "soft" && softResetPercentage !== undefined) {
      // Soft reset: keep a percentage of ELO above/below baseline
      const eloDiff = currentElo - DEFAULT_ELO;
      const keepAmount = eloDiff * (softResetPercentage / 100);
      newElo = DEFAULT_ELO + Math.round(keepAmount);
    }

    await ctx.db.patch(user._id, {
      rankedElo: newElo,
      rankedWins: 0,
      rankedLosses: 0,
    });
  }
}
