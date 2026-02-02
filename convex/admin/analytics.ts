/**
 * Analytics Module
 *
 * Provides comprehensive analytics data for the admin dashboard.
 * Includes:
 * - Card win rates and play rates
 * - Player behavior patterns
 * - Economy metrics
 * - Game statistics
 * - Matchmaking health
 * - Retention metrics
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate median from an array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Calculate percentile from an array of numbers
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

/**
 * Calculate Gini coefficient for wealth inequality
 * Returns value between 0 (perfect equality) and 1 (perfect inequality)
 */
function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;

  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * (sorted[i] ?? 0);
  }
  return numerator / (n * sum);
}

/**
 * Get cutoff time for period type
 */
function getPeriodCutoff(periodType: "daily" | "weekly" | "monthly" | "all_time"): number {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (periodType) {
    case "daily":
      return now - day;
    case "weekly":
      return now - 7 * day;
    case "monthly":
      return now - 30 * day;
    case "all_time":
      return 0;
  }
}

/**
 * Get rank tier from rating
 */
function getRankTier(rating: number): string {
  if (rating >= 2200) return "diamond";
  if (rating >= 2000) return "platinum";
  if (rating >= 1800) return "gold";
  if (rating >= 1400) return "silver";
  return "bronze";
}

// =============================================================================
// Card Analytics
// =============================================================================

/**
 * Get top cards by win rate
 * Analyzes game events to determine which cards contribute most to victories
 */
export const getTopCardsByWinRate = query({
  args: {
    periodType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("all_time")
    ),
    limit: v.number(),
    minGames: v.optional(v.number()),
  },
  handler: async (ctx, { periodType, limit, minGames = 5 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cutoff = getPeriodCutoff(periodType);

    // Get completed games within the period
    const games = await ctx.db
      .query("gameLobbies")
      .filter((q) =>
        q.and(q.eq(q.field("status"), "completed"), q.gte(q.field("createdAt"), cutoff))
      )
      .collect();

    // Get game states for completed games to analyze card usage
    const cardStats = new Map<
      string,
      { cardId: Id<"cardDefinitions">; wins: number; losses: number; gamesPlayed: number }
    >();

    for (const game of games) {
      if (!game.winnerId) continue;

      const gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", game._id))
        .first();

      if (!gameState) continue;

      // Track cards that were in the winner's deck
      const winnerCards =
        game.winnerId === gameState.hostId
          ? [...gameState.hostDeck, ...gameState.hostHand, ...gameState.hostGraveyard]
          : [...gameState.opponentDeck, ...gameState.opponentHand, ...gameState.opponentGraveyard];

      const loserCards =
        game.winnerId === gameState.hostId
          ? [...gameState.opponentDeck, ...gameState.opponentHand, ...gameState.opponentGraveyard]
          : [...gameState.hostDeck, ...gameState.hostHand, ...gameState.hostGraveyard];

      // Count unique cards for winner
      const winnerUniqueCards = new Set(winnerCards);
      for (const cardId of winnerUniqueCards) {
        const key = cardId.toString();
        const stats = cardStats.get(key) || { cardId, wins: 0, losses: 0, gamesPlayed: 0 };
        stats.wins++;
        stats.gamesPlayed++;
        cardStats.set(key, stats);
      }

      // Count unique cards for loser
      const loserUniqueCards = new Set(loserCards);
      for (const cardId of loserUniqueCards) {
        const key = cardId.toString();
        const stats = cardStats.get(key) || { cardId, wins: 0, losses: 0, gamesPlayed: 0 };
        stats.losses++;
        stats.gamesPlayed++;
        cardStats.set(key, stats);
      }
    }

    // Filter by minimum games and calculate win rates
    const cardStatsArray = Array.from(cardStats.values())
      .filter((s) => s.gamesPlayed >= minGames)
      .map((s) => ({
        cardId: s.cardId,
        winRate: s.gamesPlayed > 0 ? (s.wins / s.gamesPlayed) * 100 : 0,
        gamesPlayed: s.gamesPlayed,
        wins: s.wins,
        losses: s.losses,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit);

    // Enrich with card details
    const results = await Promise.all(
      cardStatsArray.map(async (stats) => {
        const card = await ctx.db.get(stats.cardId);
        return {
          cardId: stats.cardId,
          cardName: card?.name || "Unknown",
          archetype: card?.archetype || "neutral",
          rarity: card?.rarity || "common",
          cardType: card?.cardType || "creature",
          winRate: Math.round(stats.winRate * 10) / 10,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          losses: stats.losses,
        };
      })
    );

    return results;
  },
});

/**
 * Get top cards by play rate
 * Tracks how often cards appear in decks and are played in games
 */
export const getTopCardsByPlayRate = query({
  args: {
    periodType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("all_time")
    ),
    limit: v.number(),
  },
  handler: async (ctx, { periodType, limit }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cutoff = getPeriodCutoff(periodType);

    // Get total games in period
    const games = await ctx.db
      .query("gameLobbies")
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field("status"), "completed"), q.eq(q.field("status"), "active")),
          q.gte(q.field("createdAt"), cutoff)
        )
      )
      .collect();

    const totalGames = games.length;
    if (totalGames === 0) return [];

    // Count card appearances across all game states
    const cardAppearances = new Map<string, { cardId: Id<"cardDefinitions">; count: number }>();

    for (const game of games) {
      const gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", game._id))
        .first();

      if (!gameState) continue;

      // Gather all cards from both players
      const allCards = [
        ...gameState.hostDeck,
        ...gameState.hostHand,
        ...gameState.hostGraveyard,
        ...gameState.hostBanished,
        ...gameState.opponentDeck,
        ...gameState.opponentHand,
        ...gameState.opponentGraveyard,
        ...gameState.opponentBanished,
      ];

      // Count unique cards per game (a card only counts once per game)
      const uniqueCardsInGame = new Set(allCards);
      for (const cardId of uniqueCardsInGame) {
        const key = cardId.toString();
        const entry = cardAppearances.get(key) || { cardId, count: 0 };
        entry.count++;
        cardAppearances.set(key, entry);
      }
    }

    // Calculate play rates and sort
    const playRates = Array.from(cardAppearances.values())
      .map((entry) => ({
        cardId: entry.cardId,
        playRate: (entry.count / totalGames) * 100,
        gamesPlayed: entry.count,
      }))
      .sort((a, b) => b.playRate - a.playRate)
      .slice(0, limit);

    // Enrich with card details
    const results = await Promise.all(
      playRates.map(async (stats) => {
        const card = await ctx.db.get(stats.cardId);
        return {
          cardId: stats.cardId,
          cardName: card?.name || "Unknown",
          archetype: card?.archetype || "neutral",
          rarity: card?.rarity || "common",
          cardType: card?.cardType || "creature",
          playRate: Math.round(stats.playRate * 10) / 10,
          gamesPlayed: stats.gamesPlayed,
          totalGames,
        };
      })
    );

    return results;
  },
});

/**
 * Get card stats by archetype
 * Analyzes performance metrics grouped by card archetype
 */
export const getCardStatsByArchetype = query({
  args: {
    archetype: v.string(),
    periodType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("all_time")
    ),
  },
  handler: async (ctx, { archetype, periodType }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cutoff = getPeriodCutoff(periodType);

    // Get all cards of this archetype
    const archetypeCards = await ctx.db
      .query("cardDefinitions")
      .withIndex("by_archetype", (q) =>
        q.eq("archetype", archetype as Doc<"cardDefinitions">["archetype"])
      )
      .collect();

    if (archetypeCards.length === 0) return [];

    // Get completed games in period
    const games = await ctx.db
      .query("gameLobbies")
      .filter((q) =>
        q.and(q.eq(q.field("status"), "completed"), q.gte(q.field("createdAt"), cutoff))
      )
      .collect();

    // Track stats for each card
    const cardStats = new Map<
      string,
      { cardId: Id<"cardDefinitions">; wins: number; losses: number; plays: number }
    >();

    // Initialize with all archetype cards
    for (const card of archetypeCards) {
      cardStats.set(card._id.toString(), {
        cardId: card._id,
        wins: 0,
        losses: 0,
        plays: 0,
      });
    }

    // Analyze games
    for (const game of games) {
      if (!game.winnerId) continue;

      const gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", game._id))
        .first();

      if (!gameState) continue;

      const winnerCards =
        game.winnerId === gameState.hostId
          ? [...gameState.hostDeck, ...gameState.hostHand, ...gameState.hostGraveyard]
          : [...gameState.opponentDeck, ...gameState.opponentHand, ...gameState.opponentGraveyard];

      const loserCards =
        game.winnerId === gameState.hostId
          ? [...gameState.opponentDeck, ...gameState.opponentHand, ...gameState.opponentGraveyard]
          : [...gameState.hostDeck, ...gameState.hostHand, ...gameState.hostGraveyard];

      // Process winner's cards
      for (const cardId of new Set(winnerCards)) {
        const key = cardId.toString();
        const stats = cardStats.get(key);
        if (stats) {
          stats.wins++;
          stats.plays++;
        }
      }

      // Process loser's cards
      for (const cardId of new Set(loserCards)) {
        const key = cardId.toString();
        const stats = cardStats.get(key);
        if (stats) {
          stats.losses++;
          stats.plays++;
        }
      }
    }

    // Build results with card details
    const results = await Promise.all(
      Array.from(cardStats.values()).map(async (stats) => {
        const card = await ctx.db.get(stats.cardId);
        const totalGames = stats.wins + stats.losses;
        return {
          cardId: stats.cardId,
          cardName: card?.name || "Unknown",
          rarity: card?.rarity || "common",
          cardType: card?.cardType || "creature",
          attack: card?.attack,
          defense: card?.defense,
          cost: card?.cost || 0,
          winRate: totalGames > 0 ? Math.round((stats.wins / totalGames) * 1000) / 10 : 0,
          gamesPlayed: stats.plays,
          wins: stats.wins,
          losses: stats.losses,
        };
      })
    );

    // Sort by play count descending
    return results.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  },
});

// =============================================================================
// Economy Analytics
// =============================================================================

/**
 * Get current economy snapshot
 * Real-time economy tracking with wealth distribution metrics
 */
export const getCurrentEconomySnapshot = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Get all users
    const users = await ctx.db.query("users").collect();
    const humanUsers = users.filter((u) => !u.isAiAgent);

    // Calculate gold in circulation
    const goldValues = humanUsers.map((u) => u.gold || 0);
    const totalGold = goldValues.reduce((sum, g) => sum + g, 0);
    const averageGold = humanUsers.length > 0 ? totalGold / humanUsers.length : 0;
    const medianGold = calculateMedian(goldValues);

    // Calculate wealth concentration
    const sortedGold = [...goldValues].sort((a, b) => b - a);
    const top10Count = Math.ceil(humanUsers.length * 0.1);
    const top1Count = Math.ceil(humanUsers.length * 0.01);
    const top10Gold = sortedGold.slice(0, top10Count).reduce((sum, g) => sum + g, 0);
    const top1Gold = sortedGold.slice(0, top1Count).reduce((sum, g) => sum + g, 0);

    // Get player currency data for gems
    const currencies = await ctx.db.query("playerCurrency").collect();
    const totalGems = currencies.reduce((sum, c) => sum + (c.gems || 0), 0);
    const averageGems = currencies.length > 0 ? totalGems / currencies.length : 0;

    // Get card counts
    const playerCards = await ctx.db.query("playerCards").collect();
    const totalCards = playerCards.reduce((sum, pc) => sum + pc.quantity, 0);

    // Get pack opening count (last 7 days for context)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentPacks = await ctx.db
      .query("packOpeningHistory")
      .withIndex("by_time", (q) => q.gte("openedAt", weekAgo))
      .collect();

    // Get marketplace listings
    const activeListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Calculate weekly gold change from transactions
    const weeklyTransactions = await ctx.db
      .query("currencyTransactions")
      .filter((q) =>
        q.and(q.eq(q.field("currencyType"), "gold"), q.gte(q.field("createdAt"), weekAgo))
      )
      .collect();

    let weeklyGoldGenerated = 0;
    let weeklyGoldSpent = 0;
    for (const tx of weeklyTransactions) {
      if (tx.amount > 0) {
        weeklyGoldGenerated += tx.amount;
      } else {
        weeklyGoldSpent += Math.abs(tx.amount);
      }
    }
    const weeklyNetGoldChange = weeklyGoldGenerated - weeklyGoldSpent;

    // Determine inflation trend
    let inflationTrend: "inflationary" | "deflationary" | "stable" = "stable";
    const changePercent = totalGold > 0 ? (weeklyNetGoldChange / totalGold) * 100 : 0;
    if (changePercent > 2) inflationTrend = "inflationary";
    else if (changePercent < -2) inflationTrend = "deflationary";

    return {
      totalGoldInCirculation: totalGold,
      totalGemsInCirculation: totalGems,
      averageGoldPerPlayer: Math.round(averageGold),
      averageGemsPerPlayer: Math.round(averageGems),
      totalTransactions: weeklyTransactions.length,
      totalCards,
      totalPacks: recentPacks.length,
      totalListings: activeListings.length,
      goldInCirculation: totalGold,
      weeklyNetGoldChange,
      dustInCirculation: 0, // Placeholder - dust not yet implemented
      activeListings: activeListings.length,
      medianPlayerGold: Math.round(medianGold),
      top10PercentShare: totalGold > 0 ? Math.round((top10Gold / totalGold) * 100) : 0,
      top1PercentShare: totalGold > 0 ? Math.round((top1Gold / totalGold) * 100) : 0,
      inflationTrend,
      timestamp: Date.now(),
    };
  },
});

/**
 * Get economy trends over time
 * Historical economy tracking for trend analysis
 */
export const getEconomyTrends = query({
  args: {
    periodType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    days: v.number(),
  },
  handler: async (ctx, { periodType, days }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const trends = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const intervalMs =
      periodType === "daily" ? dayMs : periodType === "weekly" ? 7 * dayMs : 30 * dayMs;

    for (let i = days - 1; i >= 0; i--) {
      const periodEnd = now - i * intervalMs;
      const periodStart = periodEnd - intervalMs;

      // Get transactions in this period
      const transactions = await ctx.db
        .query("currencyTransactions")
        .filter((q) =>
          q.and(q.gte(q.field("createdAt"), periodStart), q.lt(q.field("createdAt"), periodEnd))
        )
        .collect();

      let goldGenerated = 0;
      let goldSpent = 0;
      for (const tx of transactions) {
        if (tx.currencyType === "gold") {
          if (tx.amount > 0) goldGenerated += tx.amount;
          else goldSpent += Math.abs(tx.amount);
        }
      }

      // Get pack openings in period
      const packs = await ctx.db
        .query("packOpeningHistory")
        .filter((q) =>
          q.and(q.gte(q.field("openedAt"), periodStart), q.lt(q.field("openedAt"), periodEnd))
        )
        .collect();

      // Get marketplace sales in period
      const sales = await ctx.db
        .query("marketplaceListings")
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "sold"),
            q.gte(q.field("soldAt"), periodStart),
            q.lt(q.field("soldAt"), periodEnd)
          )
        )
        .collect();

      trends.push({
        date: new Date(periodEnd).toISOString(),
        goldGenerated,
        goldSpent,
        netGoldChange: goldGenerated - goldSpent,
        packsOpened: packs.length,
        marketplaceSales: sales.length,
        marketplaceVolume: sales.reduce((sum, s) => sum + (s.soldFor || 0), 0),
      });
    }

    return trends;
  },
});

/**
 * Get economy metrics over multiple days
 * Daily snapshots for dashboard charts
 */
export const getEconomyMetrics = query({
  args: {
    days: v.number(),
  },
  handler: async (ctx, { days }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const metrics = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = days - 1; i >= 0; i--) {
      const dayEnd = now - i * dayMs;
      const dayStart = dayEnd - dayMs;
      const date = new Date(dayEnd);

      // Get transactions for this day
      const transactions = await ctx.db
        .query("currencyTransactions")
        .filter((q) =>
          q.and(q.gte(q.field("createdAt"), dayStart), q.lt(q.field("createdAt"), dayEnd))
        )
        .collect();

      let goldGenerated = 0;
      let goldSpent = 0;
      for (const tx of transactions) {
        if (tx.currencyType === "gold") {
          if (tx.amount > 0) goldGenerated += tx.amount;
          else goldSpent += Math.abs(tx.amount);
        }
      }

      // Get packs opened
      const packs = await ctx.db
        .query("packOpeningHistory")
        .filter((q) =>
          q.and(q.gte(q.field("openedAt"), dayStart), q.lt(q.field("openedAt"), dayEnd))
        )
        .collect();

      // Get marketplace data
      const activeListings = await ctx.db
        .query("marketplaceListings")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();

      const sales = await ctx.db
        .query("marketplaceListings")
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "sold"),
            q.gte(q.field("soldAt"), dayStart),
            q.lt(q.field("soldAt"), dayEnd)
          )
        )
        .collect();

      // Get user gold stats (snapshot estimation)
      const users = await ctx.db.query("users").collect();
      const humanUsers = users.filter((u) => !u.isAiAgent);
      const goldValues = humanUsers.map((u) => u.gold || 0);
      const totalGold = goldValues.reduce((sum, g) => sum + g, 0);
      const medianGold = calculateMedian(goldValues);
      const sortedGold = [...goldValues].sort((a, b) => b - a);
      const top10Count = Math.ceil(humanUsers.length * 0.1);
      const top10Gold = sortedGold.slice(0, top10Count).reduce((sum, g) => sum + g, 0);

      // Get card count
      const playerCards = await ctx.db.query("playerCards").collect();
      const totalCards = playerCards.reduce((sum, pc) => sum + pc.quantity, 0);

      metrics.push({
        date: date.toISOString(),
        goldInCirculation: totalGold,
        goldGenerated,
        goldSpent,
        netGoldChange: goldGenerated - goldSpent,
        dustInCirculation: 0,
        totalCards,
        packsOpened: packs.length,
        activeListings: activeListings.length,
        salesVolume: sales.reduce((sum, s) => sum + (s.soldFor || 0), 0),
        medianPlayerGold: Math.round(medianGold),
        top10PercentGold: Math.round(top10Gold),
      });
    }

    return metrics;
  },
});

/**
 * Get wealth distribution analysis
 * Includes Gini coefficient and distribution buckets
 */
export const getWealthDistribution = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Get all human users
    const users = await ctx.db.query("users").collect();
    const humanUsers = users.filter((u) => !u.isAiAgent);

    if (humanUsers.length === 0) {
      return {
        distribution: [],
        medianGold: 0,
        averageGold: 0,
        totalPlayers: 0,
        giniCoefficient: 0,
      };
    }

    // Extract gold values
    const goldValues = humanUsers.map((u) => u.gold || 0);
    const totalGold = goldValues.reduce((sum, g) => sum + g, 0);
    const averageGold = totalGold / humanUsers.length;
    const medianGold = calculateMedian(goldValues);
    const giniCoefficient = calculateGiniCoefficient(goldValues);

    // Create distribution buckets
    const buckets = [
      { min: 0, max: 100, label: "0-100" },
      { min: 100, max: 500, label: "100-500" },
      { min: 500, max: 1000, label: "500-1K" },
      { min: 1000, max: 5000, label: "1K-5K" },
      { min: 5000, max: 10000, label: "5K-10K" },
      { min: 10000, max: 50000, label: "10K-50K" },
      { min: 50000, max: 100000, label: "50K-100K" },
      { min: 100000, max: Number.POSITIVE_INFINITY, label: "100K+" },
    ];

    const distribution = buckets.map((bucket) => ({
      label: bucket.label,
      count: goldValues.filter((g) => g >= bucket.min && g < bucket.max).length,
      percentage:
        humanUsers.length > 0
          ? Math.round(
              (goldValues.filter((g) => g >= bucket.min && g < bucket.max).length /
                humanUsers.length) *
                100
            )
          : 0,
    }));

    return {
      distribution,
      medianGold: Math.round(medianGold),
      averageGold: Math.round(averageGold),
      totalPlayers: humanUsers.length,
      giniCoefficient: Math.round(giniCoefficient * 1000) / 1000,
    };
  },
});

// =============================================================================
// Player Analytics
// =============================================================================

/**
 * Get player distribution stats
 * Includes active players and activity-based segmentation
 */
export const getPlayerDistribution = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;

    // Get user presence for activity tracking
    const presences = await ctx.db.query("userPresence").collect();
    const presenceMap = new Map(presences.map((p) => [p.userId.toString(), p]));

    // Calculate active players (active in last 7 days)
    let activePlayers = 0;
    for (const user of users) {
      const presence = presenceMap.get(user._id.toString());
      if (presence && now - presence.lastActiveAt < weekMs) {
        activePlayers++;
      }
    }

    // Calculate new players (created in last 7 days)
    const newPlayers = users.filter((u) => {
      const createdAt = u.createdAt || u._creationTime;
      return now - createdAt < weekMs;
    }).length;

    return {
      totalPlayers: users.length,
      humanPlayers: users.filter((u) => !u.isAiAgent).length,
      aiPlayers: users.filter((u) => u.isAiAgent).length,
      activePlayers,
      newPlayers,
    };
  },
});

/**
 * Get player retention metrics
 * Day 1, Day 7, and Day 30 retention rates
 */
export const getPlayerRetention = query({
  args: {
    periodType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
  },
  handler: async (ctx, { periodType }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Get analysis window based on period type
    const analysisWindowDays = periodType === "daily" ? 7 : periodType === "weekly" ? 30 : 90;
    const analysisCutoff = now - analysisWindowDays * dayMs;

    // Get users created before the analysis window
    const users = await ctx.db.query("users").collect();
    const cohortUsers = users.filter((u) => {
      const createdAt = u.createdAt || u._creationTime;
      return createdAt < analysisCutoff;
    });

    if (cohortUsers.length === 0) {
      return { day1: 0, day7: 0, day30: 0 };
    }

    // Get match history for these users
    let day1Retained = 0;
    let day7Retained = 0;
    let day30Retained = 0;

    for (const user of cohortUsers) {
      const createdAt = user.createdAt || user._creationTime;

      // Check for activity in day 1 (within 24-48 hours of signup)
      const day1Start = createdAt + dayMs;
      const day1End = createdAt + 2 * dayMs;

      const day1Games = await ctx.db
        .query("gameLobbies")
        .filter((q) =>
          q.and(
            q.or(q.eq(q.field("hostId"), user._id), q.eq(q.field("opponentId"), user._id)),
            q.gte(q.field("createdAt"), day1Start),
            q.lt(q.field("createdAt"), day1End)
          )
        )
        .first();

      if (day1Games) day1Retained++;

      // Check for activity in day 7 (within day 6-8)
      const day7Start = createdAt + 6 * dayMs;
      const day7End = createdAt + 8 * dayMs;

      const day7Games = await ctx.db
        .query("gameLobbies")
        .filter((q) =>
          q.and(
            q.or(q.eq(q.field("hostId"), user._id), q.eq(q.field("opponentId"), user._id)),
            q.gte(q.field("createdAt"), day7Start),
            q.lt(q.field("createdAt"), day7End)
          )
        )
        .first();

      if (day7Games) day7Retained++;

      // Check for activity in day 30 (within day 28-32)
      const day30Start = createdAt + 28 * dayMs;
      const day30End = createdAt + 32 * dayMs;

      const day30Games = await ctx.db
        .query("gameLobbies")
        .filter((q) =>
          q.and(
            q.or(q.eq(q.field("hostId"), user._id), q.eq(q.field("opponentId"), user._id)),
            q.gte(q.field("createdAt"), day30Start),
            q.lt(q.field("createdAt"), day30End)
          )
        )
        .first();

      if (day30Games) day30Retained++;
    }

    const total = cohortUsers.length;
    return {
      day1: Math.round((day1Retained / total) * 100),
      day7: Math.round((day7Retained / total) * 100),
      day30: Math.round((day30Retained / total) * 100),
    };
  },
});

// =============================================================================
// Game Analytics
// =============================================================================

/**
 * Get game statistics
 * Comprehensive game analytics including duration and turn counts
 */
export const getGameStats = query({
  args: {
    periodType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("all_time")
    ),
  },
  handler: async (ctx, { periodType }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cutoff = getPeriodCutoff(periodType);

    // Get all lobbies in period
    const lobbies = await ctx.db
      .query("gameLobbies")
      .filter((q) => q.gte(q.field("createdAt"), cutoff))
      .collect();

    const completedGames = lobbies.filter((l) => l.status === "completed");
    const activeGames = lobbies.filter((l) => l.status === "active" || l.status === "waiting");

    // Calculate average duration for completed games
    let totalDuration = 0;
    let gamesWithDuration = 0;
    let totalTurns = 0;
    let gamesWithTurns = 0;

    for (const game of completedGames) {
      if (game.startedAt && game.lastMoveAt) {
        totalDuration += game.lastMoveAt - game.startedAt;
        gamesWithDuration++;
      }
      if (game.turnNumber) {
        totalTurns += game.turnNumber;
        gamesWithTurns++;
      }
    }

    const averageGameDuration =
      gamesWithDuration > 0 ? Math.round(totalDuration / gamesWithDuration / 1000) : 0; // in seconds
    const averageTurns = gamesWithTurns > 0 ? Math.round(totalTurns / gamesWithTurns) : 0;

    return {
      totalGames: lobbies.length,
      completedGames: completedGames.length,
      activeGames: activeGames.length,
      averageGameDuration,
      averageTurns,
    };
  },
});

/**
 * Get matchmaking statistics
 * Queue metrics and match success rates
 */
export const getMatchmakingStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Get current queue
    const queue = await ctx.db.query("matchmakingQueue").collect();

    // Calculate average queue time
    const now = Date.now();
    let totalQueueTime = 0;
    for (const entry of queue) {
      totalQueueTime += now - entry.joinedAt;
    }
    const averageQueueTime =
      queue.length > 0 ? Math.round(totalQueueTime / queue.length / 1000) : 0; // in seconds

    // Get recent games to calculate match success rate
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentGames = await ctx.db
      .query("gameLobbies")
      .filter((q) => q.gte(q.field("createdAt"), dayAgo))
      .collect();

    const completedGames = recentGames.filter((g) => g.status === "completed");
    const matchSuccessRate =
      recentGames.length > 0 ? Math.round((completedGames.length / recentGames.length) * 100) : 0;

    return {
      averageQueueTime,
      matchSuccessRate,
      playersInQueue: queue.length,
    };
  },
});

/**
 * Get matchmaking health status
 * Comprehensive health monitoring for ranked and casual queues
 */
export const getMatchmakingHealth = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    // Get queue entries
    const queue = await ctx.db.query("matchmakingQueue").collect();
    const rankedQueue = queue.filter((q) => q.mode === "ranked");
    const casualQueue = queue.filter((q) => q.mode === "casual");

    // Calculate queue times
    const calculateAvgWaitTime = (entries: typeof queue) => {
      if (entries.length === 0) return 0;
      const totalWait = entries.reduce((sum, e) => sum + (now - e.joinedAt), 0);
      return Math.round(totalWait / entries.length / 1000);
    };

    // Get today's games
    const todayGames = await ctx.db
      .query("gameLobbies")
      .filter((q) => q.gte(q.field("createdAt"), dayAgo))
      .collect();

    const rankedGames = todayGames.filter((g) => g.mode === "ranked");
    const casualGames = todayGames.filter((g) => g.mode === "casual");

    // Get match history for rating differences
    const todayMatches = await ctx.db
      .query("matchHistory")
      .filter((q) => q.gte(q.field("completedAt"), dayAgo))
      .collect();

    const rankedMatches = todayMatches.filter((m) => m.gameType === "ranked");
    let totalRatingDiff = 0;
    for (const match of rankedMatches) {
      totalRatingDiff += Math.abs(match.winnerRatingBefore - match.loserRatingBefore);
    }
    const avgRatingDiff =
      rankedMatches.length > 0 ? Math.round(totalRatingDiff / rankedMatches.length) : 0;

    // Calculate tier distribution
    const users = await ctx.db.query("users").collect();
    const tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
    for (const user of users) {
      const tier = getRankTier(user.rankedElo || 1000);
      if (tier in tierCounts) {
        tierCounts[tier as keyof typeof tierCounts]++;
      }
    }

    // Calculate health scores (0-100)
    const rankedHealthScore = Math.min(
      100,
      Math.max(
        0,
        100 -
          calculateAvgWaitTime(rankedQueue) * 2 - // Penalize long wait times
          avgRatingDiff / 20 // Penalize large rating differences
      )
    );

    const casualHealthScore = Math.min(
      100,
      Math.max(0, 100 - calculateAvgWaitTime(casualQueue) * 2)
    );

    // Determine overall status
    const avgWaitTime = calculateAvgWaitTime(queue);
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (avgWaitTime > 120 || rankedHealthScore < 50) status = "degraded";
    if (avgWaitTime > 300 || rankedHealthScore < 25) status = "unhealthy";

    return {
      status,
      averageWaitTime: avgWaitTime,
      queueDepth: queue.length,
      matchQuality: 100 - Math.min(100, avgRatingDiff / 10),
      ranked: {
        tierDistribution: tierCounts,
        healthScore: Math.round(rankedHealthScore),
        avgQueueTime: calculateAvgWaitTime(rankedQueue),
        avgRatingDiff,
        totalMatchesToday: rankedGames.length,
      },
      casual: {
        healthScore: Math.round(casualHealthScore),
        avgQueueTime: calculateAvgWaitTime(casualQueue),
        totalMatchesToday: casualGames.length,
      },
    };
  },
});

/**
 * Get detailed matchmaking stats over time
 * Historical matchmaking analytics for trend analysis
 */
export const getMatchmakingStatsDetailed = query({
  args: {
    days: v.number(),
  },
  handler: async (ctx, { days }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const stats = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = days - 1; i >= 0; i--) {
      const dayEnd = now - i * dayMs;
      const dayStart = dayEnd - dayMs;
      const date = new Date(dayEnd);

      // Get games for this day
      const games = await ctx.db
        .query("gameLobbies")
        .filter((q) =>
          q.and(q.gte(q.field("createdAt"), dayStart), q.lt(q.field("createdAt"), dayEnd))
        )
        .collect();

      // Get match history for rating diffs
      const matches = await ctx.db
        .query("matchHistory")
        .filter((q) =>
          q.and(q.gte(q.field("completedAt"), dayStart), q.lt(q.field("completedAt"), dayEnd))
        )
        .collect();

      const rankedGames = games.filter((g) => g.mode === "ranked");
      const casualGames = games.filter((g) => g.mode === "casual");
      const rankedMatches = matches.filter((m) => m.gameType === "ranked");

      // Calculate rating differences
      let totalRatingDiff = 0;
      let fairMatches = 0;
      for (const match of rankedMatches) {
        const diff = Math.abs(match.winnerRatingBefore - match.loserRatingBefore);
        totalRatingDiff += diff;
        if (diff < 200) fairMatches++;
      }
      const avgRatingDiff =
        rankedMatches.length > 0 ? Math.round(totalRatingDiff / rankedMatches.length) : 0;

      // Count AI-filled matches (games where one player is AI)
      let aiFilledMatches = 0;
      for (const game of rankedGames) {
        if (game.hostId && game.opponentId) {
          const host = await ctx.db.get(game.hostId);
          const opponent = await ctx.db.get(game.opponentId);
          if ((host?.isAiAgent || false) !== (opponent?.isAiAgent || false)) {
            aiFilledMatches++;
          }
        }
      }

      stats.push({
        date: date.toISOString(),
        queueType: "ranked",
        avgQueueTime: 0, // Would need queue event logging to calculate accurately
        avgRatingDiff,
        fairMatches,
        aiFilledMatches,
        totalMatches: rankedGames.length,
        avgWaitTime: 0,
      });

      // Also add casual stats
      stats.push({
        date: date.toISOString(),
        queueType: "casual",
        avgQueueTime: 0,
        avgRatingDiff: 0,
        fairMatches: casualGames.length, // All casual matches are "fair"
        aiFilledMatches: 0,
        totalMatches: casualGames.length,
        avgWaitTime: 0,
      });
    }

    return stats;
  },
});

/**
 * Get skill/rating distribution
 * Analyzes player rating distribution across buckets
 */
export const getSkillDistribution = query({
  args: {
    ratingType: v.string(),
  },
  handler: async (ctx, { ratingType }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Get all users
    const users = await ctx.db.query("users").collect();
    const humanUsers = users.filter((u) => !u.isAiAgent);

    // Get ratings based on type
    const ratings = humanUsers.map((u) =>
      ratingType === "ranked" ? u.rankedElo || 1000 : u.casualRating || 1000
    );

    if (ratings.length === 0) {
      return {
        distribution: {
          under800: 0,
          r800_1000: 0,
          r1000_1200: 0,
          r1200_1400: 0,
          r1400_1600: 0,
          r1600_1800: 0,
          r1800_2000: 0,
          r2000_2200: 0,
          over2200: 0,
        },
        summary: { totalPlayers: 0, average: 0, median: 0 },
        percentiles: { p25: 0, p50: 0, p75: 0, p90: 0, p99: 0 },
      };
    }

    // Calculate distribution
    const distribution = {
      under800: ratings.filter((r) => r < 800).length,
      r800_1000: ratings.filter((r) => r >= 800 && r < 1000).length,
      r1000_1200: ratings.filter((r) => r >= 1000 && r < 1200).length,
      r1200_1400: ratings.filter((r) => r >= 1200 && r < 1400).length,
      r1400_1600: ratings.filter((r) => r >= 1400 && r < 1600).length,
      r1600_1800: ratings.filter((r) => r >= 1600 && r < 1800).length,
      r1800_2000: ratings.filter((r) => r >= 1800 && r < 2000).length,
      r2000_2200: ratings.filter((r) => r >= 2000 && r < 2200).length,
      over2200: ratings.filter((r) => r >= 2200).length,
    };

    // Calculate summary stats
    const average = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
    const median = calculateMedian(ratings);

    // Calculate percentiles
    const percentiles = {
      p25: calculatePercentile(ratings, 25),
      p50: calculatePercentile(ratings, 50),
      p75: calculatePercentile(ratings, 75),
      p90: calculatePercentile(ratings, 90),
      p99: calculatePercentile(ratings, 99),
    };

    return {
      distribution,
      summary: {
        totalPlayers: humanUsers.length,
        average,
        median: Math.round(median),
      },
      percentiles,
    };
  },
});

/**
 * Get retention overview
 * Comprehensive retention analysis with trends
 */
export const getRetentionOverview = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Get all users for cohort analysis
    const users = await ctx.db.query("users").collect();

    // Filter to users created at least 30 days ago for complete analysis
    const cohortCutoff = now - 30 * dayMs;
    const cohortUsers = users.filter((u) => {
      const createdAt = u.createdAt || u._creationTime;
      return createdAt < cohortCutoff;
    });

    if (cohortUsers.length === 0) {
      return {
        day1: 0,
        day3: 0,
        day7: 0,
        day14: 0,
        day30: 0,
        day1Avg: 0,
        day7Avg: 0,
        day30Avg: 0,
        trend: "stable" as const,
      };
    }

    // Calculate retention for each period
    const retentionCounts = { day1: 0, day3: 0, day7: 0, day14: 0, day30: 0 };

    for (const user of cohortUsers) {
      const createdAt = user.createdAt || user._creationTime;

      // Check retention at each milestone
      const checkRetention = async (dayNum: number) => {
        const windowStart = createdAt + (dayNum - 1) * dayMs;
        const windowEnd = createdAt + (dayNum + 1) * dayMs;

        const activity = await ctx.db
          .query("gameLobbies")
          .filter((q) =>
            q.and(
              q.or(q.eq(q.field("hostId"), user._id), q.eq(q.field("opponentId"), user._id)),
              q.gte(q.field("createdAt"), windowStart),
              q.lt(q.field("createdAt"), windowEnd)
            )
          )
          .first();

        return activity !== null;
      };

      if (await checkRetention(1)) retentionCounts.day1++;
      if (await checkRetention(3)) retentionCounts.day3++;
      if (await checkRetention(7)) retentionCounts.day7++;
      if (await checkRetention(14)) retentionCounts.day14++;
      if (await checkRetention(30)) retentionCounts.day30++;
    }

    const total = cohortUsers.length;
    const day1 = Math.round((retentionCounts.day1 / total) * 100);
    const day3 = Math.round((retentionCounts.day3 / total) * 100);
    const day7 = Math.round((retentionCounts.day7 / total) * 100);
    const day14 = Math.round((retentionCounts.day14 / total) * 100);
    const day30 = Math.round((retentionCounts.day30 / total) * 100);

    // Calculate averages (same as current values for now)
    const day1Avg = day1;
    const day7Avg = day7;
    const day30Avg = day30;

    // Determine trend (compare day7 to day1)
    let trend: "improving" | "declining" | "stable" = "stable";
    const dropOff = day1 - day7;
    if (dropOff < 20) trend = "improving";
    else if (dropOff > 50) trend = "declining";

    return {
      day1,
      day3,
      day7,
      day14,
      day30,
      day1Avg,
      day7Avg,
      day30Avg,
      trend,
    };
  },
});

/**
 * Get top engaged players
 * Ranks players by engagement metrics
 */
export const getTopEngagedPlayers = query({
  args: {
    days: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, { days, limit }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get all human users
    const users = await ctx.db.query("users").collect();
    const humanUsers = users.filter((u) => !u.isAiAgent);

    // Calculate engagement for each user
    const engagementData = await Promise.all(
      humanUsers.map(async (user) => {
        // Get games played
        const games = await ctx.db
          .query("gameLobbies")
          .filter((q) =>
            q.and(
              q.or(q.eq(q.field("hostId"), user._id), q.eq(q.field("opponentId"), user._id)),
              q.gte(q.field("createdAt"), cutoff)
            )
          )
          .collect();

        // Calculate unique days active
        const activeDays = new Set(games.map((g) => new Date(g.createdAt).toDateString())).size;

        // Get last activity
        const lastGame = games.sort((a, b) => b.createdAt - a.createdAt)[0];

        return {
          userId: user._id,
          username: user.username || user.name || "Unknown",
          gamesPlayed: games.length,
          daysActive: activeDays,
          avgGamesPerDay: activeDays > 0 ? Math.round((games.length / activeDays) * 10) / 10 : 0,
          lastActiveAt: lastGame?.createdAt || 0,
          engagementScore: games.length * 10 + activeDays * 50, // Weighted score
        };
      })
    );

    // Sort by engagement score and return top N
    return engagementData
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit)
      .map((e, index) => ({
        rank: index + 1,
        ...e,
      }));
  },
});

/**
 * Get daily active user stats
 * Daily engagement metrics for charting
 */
export const getDailyActiveStats = query({
  args: {
    days: v.number(),
  },
  handler: async (ctx, { days }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const stats = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = days - 1; i >= 0; i--) {
      const dayEnd = now - i * dayMs;
      const dayStart = dayEnd - dayMs;
      const date = new Date(dayEnd);

      // Get games for this day
      const games = await ctx.db
        .query("gameLobbies")
        .filter((q) =>
          q.and(q.gte(q.field("createdAt"), dayStart), q.lt(q.field("createdAt"), dayEnd))
        )
        .collect();

      // Get unique active users
      const activeUserIds = new Set<string>();
      const humanUserIds = new Set<string>();
      const aiUserIds = new Set<string>();

      for (const game of games) {
        if (game.hostId) activeUserIds.add(game.hostId.toString());
        if (game.opponentId) activeUserIds.add(game.opponentId.toString());
      }

      // Classify users
      for (const id of activeUserIds) {
        const user = await ctx.db.get(id as Id<"users">);
        if (user?.isAiAgent) {
          aiUserIds.add(id);
        } else {
          humanUserIds.add(id);
        }
      }

      // Get new users for this day
      const newUsers = await ctx.db
        .query("users")
        .filter((q) =>
          q.and(q.gte(q.field("_creationTime"), dayStart), q.lt(q.field("_creationTime"), dayEnd))
        )
        .collect();

      // Calculate returning users (active but not new)
      const newUserIds = new Set(newUsers.map((u) => u._id.toString()));
      const returningUsers = [...humanUserIds].filter((id) => !newUserIds.has(id)).length;

      // Count game types
      const rankedGames = games.filter((g) => g.mode === "ranked");
      const casualGames = games.filter((g) => g.mode === "casual");

      // Calculate average game duration
      const completedGames = games.filter(
        (g) => g.status === "completed" && g.startedAt && g.lastMoveAt
      );
      const totalDuration = completedGames.reduce(
        (sum, g) => sum + ((g.lastMoveAt || 0) - (g.startedAt || 0)),
        0
      );
      const avgDuration =
        completedGames.length > 0 ? Math.round(totalDuration / completedGames.length) : 0;

      // Retention calculations would require historical data
      stats.push({
        date: date.toISOString(),
        dau: activeUserIds.size,
        dauHumans: humanUserIds.size,
        dauAi: aiUserIds.size,
        newUsers: newUsers.filter((u) => !u.isAiAgent).length,
        returningUsers,
        totalGames: games.length,
        rankedGames: rankedGames.length,
        casualGames: casualGames.length,
        day1Retention: 0, // Would need historical comparison
        day7Retention: 0,
        averageGameDuration: avgDuration,
      });
    }

    return stats;
  },
});

// =============================================================================
// Marketplace Analytics
// =============================================================================

/**
 * Get marketplace statistics
 * Comprehensive marketplace metrics
 */
export const getMarketplaceStats = query({
  args: {
    periodType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("all_time")
    ),
  },
  handler: async (ctx, { periodType }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cutoff = getPeriodCutoff(periodType);
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    // Get all listings
    const allListings = await ctx.db
      .query("marketplaceListings")
      .filter((q) => q.gte(q.field("createdAt"), cutoff))
      .collect();

    // Active listings (current state)
    const activeListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Fixed vs auction
    const fixedListings = activeListings.filter((l) => l.listingType === "fixed");
    const auctionListings = activeListings.filter((l) => l.listingType === "auction");

    // Completed transactions in period
    const soldListings = allListings.filter((l) => l.status === "sold");
    const totalVolume = soldListings.reduce((sum, l) => sum + (l.soldFor || 0), 0);
    const averagePrice =
      soldListings.length > 0 ? Math.round(totalVolume / soldListings.length) : 0;

    // 24-hour metrics
    const sales24h = soldListings.filter((l) => (l.soldAt || 0) >= dayAgo);
    const volume24h = sales24h.reduce((sum, l) => sum + (l.soldFor || 0), 0);

    return {
      totalListings: allListings.length,
      activeListings: activeListings.length,
      activeListingsCount: activeListings.length,
      fixedListings: fixedListings.length,
      auctionListings: auctionListings.length,
      totalTransactions: soldListings.length,
      totalVolume,
      averagePrice,
      volume24h,
      sales24h: sales24h.length,
    };
  },
});

/**
 * Get player engagement analytics
 * Returns engagement metrics for a specific player
 */
export const getPlayerEngagement = query({
  args: {
    userId: v.id("users"),
    days: v.number(),
  },
  handler: async (ctx, { userId, days }) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "moderator");

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const lookbackMs = days * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - lookbackMs;

    // Get recent games
    const recentGames = await ctx.db
      .query("gameLobbies")
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field("hostId"), userId), q.eq(q.field("opponentId"), userId)),
          q.gte(q.field("_creationTime"), cutoffTime)
        )
      )
      .collect();

    // Calculate engagement metrics
    const totalGames = recentGames.length;
    const daysActive = new Set(recentGames.map((g) => new Date(g._creationTime).toDateString()))
      .size;

    // Calculate last active time from most recent game or user creation
    const lastActiveAt =
      recentGames.length > 0
        ? Math.max(...recentGames.map((g) => g._creationTime))
        : user.createdAt || user._creationTime;

    return {
      userId,
      username: user.username,
      period: { days, cutoffTime },
      metrics: {
        totalGames,
        daysActive,
        avgGamesPerDay: daysActive > 0 ? totalGames / daysActive : 0,
        engagementRate: daysActive / days,
        lastActiveAt,
        daysSinceLastActive: Math.floor((Date.now() - lastActiveAt) / (24 * 60 * 60 * 1000)),
      },
      timestamp: Date.now(),
    };
  },
});
