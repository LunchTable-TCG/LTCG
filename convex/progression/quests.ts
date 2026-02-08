import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
import { query } from "../_generated/server";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { internalMutation, mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { shuffleArray } from "../lib/deterministicRandom";
import { ErrorCode, createError } from "../lib/errorCodes";
import { getNotificationSetting } from "../lib/preferenceHelpers";
import { questClaimValidator, userQuestValidator } from "../lib/returnValidators";
import { addXP } from "../lib/xpHelpers";

// Type definitions matching schema
type QuestType = "daily" | "weekly" | "achievement";
type GameMode = "ranked" | "casual" | "story";

interface QuestRewards {
  gold: number;
  xp: number;
  gems?: number;
}

interface QuestFilters {
  gameMode?: GameMode;
  archetype?: string;
  cardType?: string;
}

interface QuestDefinitionInput {
  questId: string;
  name: string;
  description: string;
  questType: QuestType;
  requirementType: string;
  targetValue: number;
  rewards: QuestRewards;
  filters?: QuestFilters;
  isActive: boolean;
  createdAt: number;
}

/**
 * Retrieves all active, completed, and claimed quests for the authenticated user.
 * Returns enriched quest data including progress, rewards, and expiration times.
 *
 * @returns Array of user quests with complete quest definition data
 */
export const getUserQuests = query({
  args: {},
  returns: v.array(userQuestValidator),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get user's quests
    const userQuests = await ctx.db
      .query("userQuests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // OPTIMIZATION: Fetch all quest definitions once, then create a Map for O(1) lookups
    // This prevents N+1 queries (one query per user quest)
    const uniqueQuestIds = [...new Set(userQuests.map((uq) => uq.questId))];

    // Fetch all quest definitions in parallel
    const definitionPromises = uniqueQuestIds.map((questId) =>
      ctx.db
        .query("questDefinitions")
        .withIndex("by_quest_id", (q) => q.eq("questId", questId))
        .first()
    );
    const definitions = await Promise.all(definitionPromises);

    // Create a Map for O(1) lookups by questId
    const definitionMap = new Map(
      definitions
        .filter((def): def is NonNullable<typeof def> => def !== null)
        .map((def) => [def.questId, def])
    );

    // Join user quests with definitions using the Map
    const enrichedQuests = userQuests
      .map((uq) => {
        const definition = definitionMap.get(uq.questId);
        if (!definition) return null;

        return {
          questRecordId: uq._id,
          questId: uq.questId,
          name: definition.name,
          description: definition.description,
          questType: definition.questType,
          requirementType: definition.requirementType,
          currentProgress: uq.currentProgress,
          targetValue: definition.targetValue,
          rewardGold: definition.rewards.gold,
          rewardXp: definition.rewards.xp,
          rewardGems: definition.rewards.gems,
          status: uq.status,
          expiresAt: uq.expiresAt || 0,
        };
      })
      .filter((q) => q !== null);

    return enrichedQuests;
  },
});

/**
 * Ensure the user has quests - generates daily/weekly quests if none exist.
 * Called when a user visits the quests page to ensure they have quests to complete.
 * This is idempotent - calling multiple times won't create duplicate quests.
 *
 * @returns Success status and counts of quests generated
 */
export const ensureUserHasQuests = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    dailyGenerated: v.number(),
    weeklyGenerated: v.number(),
    alreadyHadQuests: v.boolean(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    // Check if user already has active quests
    const existingQuests = await ctx.db
      .query("userQuests")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .collect();

    // Check if they have recent daily quests (created in the last 24 hours)
    const hasRecentDailyQuests = existingQuests.some((uq) => {
      const oneDayAgo = now - oneDayMs;
      return (
        uq.startedAt && uq.startedAt > oneDayAgo && uq.expiresAt && uq.expiresAt <= now + oneDayMs
      );
    });

    // Check if they have recent weekly quests
    const hasRecentWeeklyQuests = existingQuests.some((uq) => {
      const oneWeekAgo = now - oneWeekMs;
      return (
        uq.startedAt && uq.startedAt > oneWeekAgo && uq.expiresAt && uq.expiresAt > now + oneDayMs
      );
    });

    if (hasRecentDailyQuests && hasRecentWeeklyQuests) {
      return {
        success: true,
        dailyGenerated: 0,
        weeklyGenerated: 0,
        alreadyHadQuests: true,
      };
    }

    let dailyGenerated = 0;
    let weeklyGenerated = 0;

    // Generate daily quests if needed
    if (!hasRecentDailyQuests) {
      const dailyQuests = await ctx.db
        .query("questDefinitions")
        .withIndex("by_type", (q) => q.eq("questType", "daily"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Use deterministic randomness
      const dateString = new Date(now).toISOString().split("T")[0];
      const seed = `${userId}-${dateString}`;
      const selectedDaily = shuffleArray(dailyQuests, seed).slice(0, 3);

      for (const quest of selectedDaily) {
        await ctx.db.insert("userQuests", {
          userId,
          questId: quest.questId,
          currentProgress: 0,
          status: "active",
          startedAt: now,
          expiresAt: now + oneDayMs,
        });
        dailyGenerated++;
      }
    }

    // Generate weekly quests if needed
    if (!hasRecentWeeklyQuests) {
      const weeklyQuests = await ctx.db
        .query("questDefinitions")
        .withIndex("by_type", (q) => q.eq("questType", "weekly"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Use deterministic randomness
      const weekNumber = Math.floor(now / oneWeekMs);
      const seed = `${userId}-week-${weekNumber}`;
      const selectedWeekly = shuffleArray(weeklyQuests, seed).slice(0, 2);

      for (const quest of selectedWeekly) {
        await ctx.db.insert("userQuests", {
          userId,
          questId: quest.questId,
          currentProgress: 0,
          status: "active",
          startedAt: now,
          expiresAt: now + oneWeekMs,
        });
        weeklyGenerated++;
      }
    }

    // Assign achievement quests (permanent, no expiry) if user doesn't have them yet
    const achievementDefs = await ctx.db
      .query("questDefinitions")
      .withIndex("by_type", (q) => q.eq("questType", "achievement"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const quest of achievementDefs) {
      const existing = await ctx.db
        .query("userQuests")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("questId"), quest.questId))
        .first();

      if (!existing) {
        await ctx.db.insert("userQuests", {
          userId,
          questId: quest.questId,
          currentProgress: 0,
          status: "active",
          startedAt: now,
        });
      }
    }

    return {
      success: true,
      dailyGenerated,
      weeklyGenerated,
      alreadyHadQuests: false,
    };
  },
});

/**
 * Claims rewards for a completed quest and updates quest status to claimed.
 * Awards gold, gems, and XP according to the quest's reward definition.
 * Uses internal currency adjustment helper to maintain transaction ledger.
 *
 * @param questRecordId - The ID of the user's quest record to claim
 * @returns Success status and reward details (gold, XP, gems)
 */
export const claimQuestReward = mutation({
  args: {
    questRecordId: v.id("userQuests"),
  },
  returns: questClaimValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the quest
    const userQuest = await ctx.db.get(args.questRecordId);
    if (!userQuest || userQuest.userId !== userId) {
      throw createError(ErrorCode.NOT_FOUND_QUEST);
    }

    if (userQuest.status !== "completed") {
      throw createError(ErrorCode.QUEST_NOT_COMPLETED);
    }

    // Get quest definition for rewards
    const definition = await ctx.db
      .query("questDefinitions")
      .withIndex("by_quest_id", (q) => q.eq("questId", userQuest.questId))
      .first();

    if (!definition) {
      throw createError(ErrorCode.NOT_FOUND_QUEST);
    }

    // SECURITY: Use internal mutation to ensure transaction ledger is maintained
    // This properly records currency changes and maintains the audit trail
    // Award gold if any
    if (definition.rewards.gold > 0) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        goldDelta: definition.rewards.gold,
        transactionType: "reward",
        description: `Quest reward: ${definition.name}`,
        referenceId: args.questRecordId,
        metadata: { questId: userQuest.questId, questType: definition.questType },
      });
    }

    // Award gems if any
    if (definition.rewards.gems && definition.rewards.gems > 0) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        gemsDelta: definition.rewards.gems,
        transactionType: "reward",
        description: `Quest reward: ${definition.name}`,
        referenceId: args.questRecordId,
        metadata: { questId: userQuest.questId, questType: definition.questType },
      });
    }

    // Award XP to user via xpHelpers (also grants battle pass XP)
    if (definition.rewards.xp > 0) {
      const questSource = `quest_${definition.questType}`;
      await addXP(ctx, userId, definition.rewards.xp, { source: questSource });
    }

    // Mark quest as claimed
    await ctx.db.patch(args.questRecordId, {
      status: "claimed",
      claimedAt: Date.now(),
    });

    return {
      success: true,
      rewards: definition.rewards,
    };
  },
});

/**
 * Updates progress for all active quests matching the given game event.
 * Internal mutation called from game events. Checks event type and filters,
 * updates progress, and creates notifications when quests are completed.
 *
 * @param userId - The ID of the user whose quest progress to update
 * @param event - Game event containing type, value, and optional filters
 * @param event.type - Event type (e.g., "win_game", "play_card", "deal_damage")
 * @param event.value - Progress value to add
 * @param event.gameMode - Optional game mode filter (e.g., "ranked", "casual")
 * @param event.archetype - Optional archetype filter
 */
export const updateQuestProgress = internalMutation({
  args: {
    userId: v.id("users"),
    event: v.object({
      type: v.string(), // "win_game", "play_card", "deal_damage", etc.
      value: v.number(),
      gameMode: v.optional(v.string()),
      archetype: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Get all active quests for this user
    const userQuests = await ctx.db
      .query("userQuests")
      .withIndex("by_user_status", (q) => q.eq("userId", args.userId).eq("status", "active"))
      .collect();

    // Batch fetch all quest definitions in parallel
    const questIds = [...new Set(userQuests.map((uq) => uq.questId))];
    const questDefResults = await Promise.all(
      questIds.map((questId) =>
        ctx.db
          .query("questDefinitions")
          .withIndex("by_quest_id", (q) => q.eq("questId", questId))
          .first()
      )
    );
    const questDefMap = new Map(
      questIds
        .map((id, i) => [id, questDefResults[i]] as const)
        .filter(
          (entry): entry is [string, NonNullable<(typeof questDefResults)[number]>] =>
            entry[1] !== null
        )
    );

    // Update progress for matching quests
    for (const userQuest of userQuests) {
      const definition = questDefMap.get(userQuest.questId);
      if (!definition) continue;

      // Check if event matches quest requirements
      if (definition.requirementType !== args.event.type) continue;

      // Check filters
      if (definition.filters?.gameMode && definition.filters.gameMode !== args.event.gameMode) {
        continue;
      }
      if (definition.filters?.archetype && definition.filters.archetype !== args.event.archetype) {
        continue;
      }

      // Update progress
      const newProgress = Math.min(
        userQuest.currentProgress + args.event.value,
        definition.targetValue
      );

      const wasCompleted = userQuest.status === "completed";
      const justCompleted = !wasCompleted && newProgress >= definition.targetValue;

      await ctx.db.patch(userQuest._id, {
        currentProgress: newProgress,
        status: newProgress >= definition.targetValue ? "completed" : "active",
        completedAt: newProgress >= definition.targetValue ? Date.now() : undefined,
      });

      // Create quest completion notification if just completed (and user has questComplete notifications enabled)
      if (justCompleted) {
        const wantsQuestNotifs = await getNotificationSetting(ctx, args.userId, "questComplete");
        if (wantsQuestNotifs) {
          await ctx.scheduler.runAfter(
            0,
            internalAny.progression.notifications.createQuestCompletedNotification,
            {
              userId: args.userId,
              questName: definition.name,
              questType: definition.questType,
            }
          );
        }
      }
    }
  },
});

/**
 * Generates a new set of daily quests for a specific user.
 * Selects 3 random active daily quest definitions and creates user quest records
 * that expire after 24 hours. Internal mutation typically called by cron job.
 *
 * @param userId - The ID of the user to generate daily quests for
 */
export const generateDailyQuests = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Get active daily quest definitions
    const dailyQuests = await ctx.db
      .query("questDefinitions")
      .withIndex("by_type", (q) => q.eq("questType", "daily"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // OPTIMIZATION: Use deterministic randomness to ensure idempotency on retry
    // Seed combines userId + date to ensure consistent quest selection per day
    const dateString = new Date(now).toISOString().split("T")[0]; // YYYY-MM-DD
    const seed = `${args.userId}-${dateString}`;
    const selectedQuests = shuffleArray(dailyQuests, seed).slice(0, 3);

    // Create user quests
    for (const quest of selectedQuests) {
      await ctx.db.insert("userQuests", {
        userId: args.userId,
        questId: quest.questId,
        currentProgress: 0,
        status: "active",
        startedAt: now,
        expiresAt: now + oneDayMs,
      });
    }
  },
});

/**
 * Generates daily quests for all active users who don't already have today's quests.
 * Active users are defined as those with activity in the last 30 days.
 * Internal mutation scheduled by cron job.
 *
 * @returns Success status and number of users processed
 */
export const generateDailyQuestsForAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    // OPTIMIZATION NOTE: This queries ALL users, then filters in memory for active users.
    // This is acceptable for smaller user bases but may need optimization for scale.
    // Consider adding a lastActivityAt field and index if this becomes a bottleneck.
    // Get all users who have logged in within the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Get all users (we'll filter by recent activity)
    const allUsers = await ctx.db.query("users").take(10000);

    // Filter to active users only
    const activeUsers = allUsers.filter((user) => {
      // Consider user active if they have any recent activity or stats
      return (
        (user.lastStatsUpdate && user.lastStatsUpdate > thirtyDaysAgo) ||
        (user.createdAt && user.createdAt > thirtyDaysAgo) ||
        (user.totalWins && user.totalWins > 0)
      );
    });

    // Generate daily quests for each active user
    for (const user of activeUsers) {
      // Check if user already has active daily quests for today
      const existingDailyQuests = await ctx.db
        .query("userQuests")
        .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "active"))
        .collect();

      const hasTodaysQuests = existingDailyQuests.some((uq) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return uq.startedAt && uq.startedAt > oneDayAgo;
      });

      // Only generate if user doesn't have today's quests yet
      if (!hasTodaysQuests) {
        await ctx.scheduler.runAfter(0, internalAny.progression.quests.generateDailyQuests, {
          userId: user._id,
        });
      }
    }

    return { success: true, usersProcessed: activeUsers.length };
  },
});

/**
 * Generates a new set of weekly quests for a specific user.
 * Selects 2 random active weekly quest definitions and creates user quest records
 * that expire after 7 days. Internal mutation typically called by cron job.
 *
 * @param userId - The ID of the user to generate weekly quests for
 */
export const generateWeeklyQuests = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    // Get active weekly quest definitions
    const weeklyQuests = await ctx.db
      .query("questDefinitions")
      .withIndex("by_type", (q) => q.eq("questType", "weekly"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // OPTIMIZATION: Use deterministic randomness to ensure idempotency on retry
    // Seed combines userId + week number to ensure consistent quest selection per week
    const weekNumber = Math.floor(now / oneWeekMs);
    const seed = `${args.userId}-week-${weekNumber}`;
    const selectedQuests = shuffleArray(weeklyQuests, seed).slice(0, 2);

    // Create user quests
    for (const quest of selectedQuests) {
      await ctx.db.insert("userQuests", {
        userId: args.userId,
        questId: quest.questId,
        currentProgress: 0,
        status: "active",
        startedAt: now,
        expiresAt: now + oneWeekMs,
      });
    }
  },
});

/**
 * Generates weekly quests for all active users who don't already have this week's quests.
 * Active users are defined as those with activity in the last 30 days.
 * Internal mutation scheduled by cron job.
 *
 * @returns Success status and number of users processed
 */
export const generateWeeklyQuestsForAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    // OPTIMIZATION NOTE: This queries ALL users, then filters in memory for active users.
    // This is acceptable for smaller user bases but may need optimization for scale.
    // Consider adding a lastActivityAt field and index if this becomes a bottleneck.
    // Get all users who have logged in within the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Get all users
    const allUsers = await ctx.db.query("users").take(10000);

    // Filter to active users only
    const activeUsers = allUsers.filter((user) => {
      return (
        (user.lastStatsUpdate && user.lastStatsUpdate > thirtyDaysAgo) ||
        (user.createdAt && user.createdAt > thirtyDaysAgo) ||
        (user.totalWins && user.totalWins > 0)
      );
    });

    // Generate weekly quests for each active user
    for (const user of activeUsers) {
      // Check if user already has active weekly quests for this week
      const existingWeeklyQuests = await ctx.db
        .query("userQuests")
        .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "active"))
        .collect();

      const hasThisWeeksQuests = existingWeeklyQuests.some((uq) => {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return (
          uq.startedAt && uq.startedAt > oneWeekAgo && uq.expiresAt && uq.expiresAt > Date.now()
        );
      });

      // Only generate if user doesn't have this week's quests yet
      if (!hasThisWeeksQuests) {
        await ctx.scheduler.runAfter(0, internalAny.progression.quests.generateWeeklyQuests, {
          userId: user._id,
        });
      }
    }

    return { success: true, usersProcessed: activeUsers.length };
  },
});

/**
 * Removes all expired quests that have not been claimed.
 * Internal mutation scheduled by cron job to prevent database bloat.
 */
export const cleanupExpiredQuests = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired quests
    const expiredQuests = await ctx.db
      .query("userQuests")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .filter((q) => q.neq(q.field("status"), "claimed"))
      .collect();

    // Delete expired quests
    for (const quest of expiredQuests) {
      await ctx.db.delete(quest._id);
    }
  },
});

/**
 * Seeds the database with initial quest definitions for daily, weekly, and achievement quests.
 * Only inserts quests that don't already exist. Internal mutation used during setup.
 *
 * @returns Success status and count of quest definitions seeded
 */
export const seedQuests = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const quests: QuestDefinitionInput[] = [
      // Daily quests - Win games
      {
        questId: "daily_win_1",
        name: "Victory March",
        description: "Win 1 game in any mode",
        questType: "daily",
        requirementType: "win_game",
        targetValue: 1,
        rewards: { gold: 100, xp: 50 },
        filters: undefined,
        isActive: true,
        createdAt: now,
      },
      {
        questId: "daily_win_3",
        name: "Triple Threat",
        description: "Win 3 games in any mode",
        questType: "daily",
        requirementType: "win_game",
        targetValue: 3,
        rewards: { gold: 300, xp: 150, gems: 5 },
        filters: undefined,
        isActive: true,
        createdAt: now,
      },

      // Daily quests - Play games
      {
        questId: "daily_play_5",
        name: "Daily Grind",
        description: "Play 5 games in any mode",
        questType: "daily",
        requirementType: "play_game",
        targetValue: 5,
        rewards: { gold: 200, xp: 100 },
        filters: undefined,
        isActive: true,
        createdAt: now,
      },

      // Daily quests - Ranked wins
      {
        questId: "daily_ranked_win",
        name: "Ranked Warrior",
        description: "Win 1 ranked game",
        questType: "daily",
        requirementType: "win_game",
        targetValue: 1,
        rewards: { gold: 150, xp: 75, gems: 3 },
        filters: { gameMode: "ranked" },
        isActive: true,
        createdAt: now,
      },

      // Daily quests - Story mode
      {
        questId: "daily_story",
        name: "Story Adventurer",
        description: "Complete 2 story stages",
        questType: "daily",
        requirementType: "complete_stage",
        targetValue: 2,
        rewards: { gold: 100, xp: 50 },
        filters: { gameMode: "story" },
        isActive: true,
        createdAt: now,
      },

      // Weekly quests
      {
        questId: "weekly_win_10",
        name: "Weekly Champion",
        description: "Win 10 games this week",
        questType: "weekly",
        requirementType: "win_game",
        targetValue: 10,
        rewards: { gold: 1000, xp: 500, gems: 25 },
        filters: undefined,
        isActive: true,
        createdAt: now,
      },
      {
        questId: "weekly_ranked_5",
        name: "Ranked Climber",
        description: "Win 5 ranked games this week",
        questType: "weekly",
        requirementType: "win_game",
        targetValue: 5,
        rewards: { gold: 750, xp: 375, gems: 20 },
        filters: { gameMode: "ranked" },
        isActive: true,
        createdAt: now,
      },
      {
        questId: "weekly_play_20",
        name: "Weekly Grinder",
        description: "Play 20 games this week",
        questType: "weekly",
        requirementType: "play_game",
        targetValue: 20,
        rewards: { gold: 800, xp: 400, gems: 15 },
        filters: undefined,
        isActive: true,
        createdAt: now,
      },

      // Achievement-style permanent quests
      {
        questId: "achievement_win_50",
        name: "Master Duelist",
        description: "Win 50 games total",
        questType: "achievement",
        requirementType: "win_game",
        targetValue: 50,
        rewards: { gold: 2000, xp: 1000, gems: 50 },
        filters: undefined,
        isActive: true,
        createdAt: now,
      },
      {
        questId: "achievement_ranked_25",
        name: "Ranked Elite",
        description: "Win 25 ranked games",
        questType: "achievement",
        requirementType: "win_game",
        targetValue: 25,
        rewards: { gold: 1500, xp: 750, gems: 40 },
        filters: { gameMode: "ranked" },
        isActive: true,
        createdAt: now,
      },
    ];

    // Insert quests if they don't exist
    for (const quest of quests) {
      const existing = await ctx.db
        .query("questDefinitions")
        .withIndex("by_quest_id", (q) => q.eq("questId", quest.questId))
        .first();

      if (!existing) {
        await ctx.db.insert("questDefinitions", quest);
      }
    }

    return { success: true, count: quests.length };
  },
});
