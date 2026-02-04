import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { query, type MutationCtx } from "../_generated/server";
import { internalMutation } from "../functions";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { requireAuthQuery } from "../lib/convexAuth";
import { achievementUnlockedValidator, achievementValidator } from "../lib/returnValidators";

// Type definitions matching schema
type AchievementCategory =
  | "wins"
  | "games_played"
  | "collection"
  | "social"
  | "story"
  | "ranked"
  | "special";
type AchievementRarity = "common" | "rare" | "epic" | "legendary";

interface AchievementRewards {
  gold?: number;
  xp?: number;
  gems?: number;
  badge?: string;
}

interface AchievementDefinitionInput {
  achievementId: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  requirementType: string;
  targetValue: number;
  rewards?: AchievementRewards;
  isSecret: boolean;
  isActive: boolean;
  createdAt: number;
}

/**
 * Retrieves all active achievements for the authenticated user with current progress.
 * Returns both locked and unlocked achievements, hiding secret achievements that
 * haven't been unlocked yet.
 *
 * @returns Array of achievements with progress, unlock status, and rewards
 */
export const getUserAchievements = query({
  args: {},
  returns: v.array(achievementValidator),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get all active achievement definitions
    const definitions = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // OPTIMIZATION: Fetch all user achievements once, then create a Map for O(1) lookups
    // This prevents N+1 queries (one query per definition)
    const allUserAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Create a Map for O(1) lookups by achievementId
    const userProgressMap = new Map(allUserAchievements.map((ua) => [ua.achievementId, ua]));

    // Join definitions with user progress using the Map
    const achievements = definitions.map((def) => {
      const userProgress = userProgressMap.get(def.achievementId);

      return {
        achievementId: def.achievementId,
        name: def.name,
        description: def.description,
        category: def.category,
        rarity: def.rarity,
        icon: def.icon,
        requirementType: def.requirementType,
        targetValue: def.targetValue,
        currentProgress: userProgress?.currentProgress ?? 0,
        isUnlocked: userProgress?.isUnlocked ?? false,
        unlockedAt: userProgress?.unlockedAt,
        rewards: def.rewards,
        isSecret: def.isSecret,
      };
    });

    // Hide secret achievements that aren't unlocked
    return achievements.filter((a) => !a.isSecret || a.isUnlocked);
  },
});

/**
 * Retrieves only unlocked achievements for a specific user by username.
 * Used for profile display to showcase player accomplishments to others.
 *
 * @param username - The username of the user whose achievements to retrieve
 * @returns Array of unlocked achievements with basic details and unlock timestamp
 */
export const getUnlockedAchievements = query({
  args: {
    username: v.string(),
  },
  returns: v.array(achievementUnlockedValidator),
  handler: async (ctx, args) => {
    // Find user by username
    const user = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.username.toLowerCase()))
      .first();

    if (!user) return [];

    // Get unlocked achievements
    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_unlocked", (q) => q.eq("userId", user._id).eq("isUnlocked", true))
      .collect();

    // Enrich with achievement definitions
    const enriched = await Promise.all(
      userAchievements.map(async (ua) => {
        const definition = await ctx.db
          .query("achievementDefinitions")
          .withIndex("by_achievement_id", (q) => q.eq("achievementId", ua.achievementId))
          .first();

        if (!definition) return null;

        return {
          achievementId: ua.achievementId,
          name: definition.name,
          description: definition.description,
          category: definition.category,
          rarity: definition.rarity,
          icon: definition.icon,
          unlockedAt: ua.unlockedAt,
        };
      })
    );

    return enriched.filter((a) => a !== null);
  },
});

/**
 * Updates progress for all achievements matching the given game event.
 * Internal mutation called from game events. Automatically awards rewards and
 * creates notifications when achievements are unlocked.
 *
 * @param userId - The ID of the user whose achievement progress to update
 * @param event - Game event containing type, value, and optional filters
 * @param event.type - Event type (e.g., "win_game", "play_game", "collect_card")
 * @param event.value - Progress value to add
 * @param event.gameMode - Optional game mode filter
 * @param event.archetype - Optional archetype filter
 */
export const updateAchievementProgress = internalMutation({
  args: {
    userId: v.id("users"),
    event: v.object({
      type: v.string(), // "win_game", "play_game", "collect_card", etc.
      value: v.number(),
      gameMode: v.optional(v.string()),
      archetype: v.optional(v.string()),
    }),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<"users">;
      event: { type: string; value: number; gameMode?: string; archetype?: string };
    }
  ) => {
    // Get all active achievement definitions
    const definitions = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Update progress for matching achievements
    for (const definition of definitions) {
      // Check if event matches achievement requirements
      if (definition.requirementType !== args.event.type) continue;

      // Get or create user achievement progress
      const userAchievement = await ctx.db
        .query("userAchievements")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("achievementId"), definition.achievementId))
        .first();

      if (!userAchievement) {
        // Create new achievement progress
        await ctx.db.insert("userAchievements", {
          userId: args.userId,
          achievementId: definition.achievementId,
          currentProgress: args.event.value,
          isUnlocked: args.event.value >= definition.targetValue,
          unlockedAt: args.event.value >= definition.targetValue ? Date.now() : undefined,
        });
      } else if (!userAchievement.isUnlocked) {
        // Update existing progress
        const newProgress = Math.min(
          userAchievement.currentProgress + args.event.value,
          definition.targetValue
        );

        await ctx.db.patch(userAchievement._id, {
          currentProgress: newProgress,
          isUnlocked: newProgress >= definition.targetValue,
          unlockedAt: newProgress >= definition.targetValue ? Date.now() : undefined,
        });

        // Award rewards if unlocked
        if (newProgress >= definition.targetValue && definition.rewards) {
          // SECURITY: Use internal mutation to ensure transaction ledger is maintained
          // This properly records currency changes and maintains the audit trail

          // Award gold if any
          if (definition.rewards.gold && definition.rewards.gold > 0) {
            await adjustPlayerCurrencyHelper(ctx, {
              userId: args.userId,
              goldDelta: definition.rewards.gold,
              transactionType: "reward",
              description: `Achievement unlocked: ${definition.name}`,
              referenceId: definition.achievementId,
              metadata: {
                achievementId: definition.achievementId,
                category: definition.category,
                rarity: definition.rarity,
              },
            });
          }

          // Award gems if any
          if (definition.rewards.gems && definition.rewards.gems > 0) {
            await adjustPlayerCurrencyHelper(ctx, {
              userId: args.userId,
              gemsDelta: definition.rewards.gems,
              transactionType: "reward",
              description: `Achievement unlocked: ${definition.name}`,
              referenceId: definition.achievementId,
              metadata: {
                achievementId: definition.achievementId,
                category: definition.category,
                rarity: definition.rarity,
              },
            });
          }

          // Award XP
          if (definition.rewards.xp) {
            const user = await ctx.db.get(args.userId);
            if (user) {
              await ctx.db.patch(args.userId, {
                xp: (user.xp || 0) + definition.rewards.xp,
              });
            }
          }

          // Create achievement unlock notification
          await ctx.scheduler.runAfter(
            0,
            internal.progression.notifications.createAchievementNotification,
            {
              userId: args.userId,
              achievementId: definition.achievementId,
              achievementName: definition.name,
              achievementRarity: definition.rarity,
              rewards: {
                gold: definition.rewards.gold,
                xp: definition.rewards.xp,
                gems: definition.rewards.gems,
              },
            }
          );
        }
      }
    }
  },
});

/**
 * Seeds the database with initial achievement definitions across all categories
 * (wins, games_played, ranked, story, social). Only inserts achievements that
 * don't already exist. Internal mutation used during setup.
 *
 * @returns Success status and count of achievement definitions seeded
 */
export const seedAchievements = internalMutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const now = Date.now();

    const achievements: AchievementDefinitionInput[] = [
      // Wins category
      {
        achievementId: "first_win",
        name: "First Victory",
        description: "Win your first game",
        category: "wins",
        rarity: "common",
        icon: "trophy",
        requirementType: "win_game",
        targetValue: 1,
        rewards: { gold: 100, xp: 50 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },
      {
        achievementId: "veteran_duelist",
        name: "Veteran Duelist",
        description: "Win 10 games",
        category: "wins",
        rarity: "rare",
        icon: "trophy",
        requirementType: "win_game",
        targetValue: 10,
        rewards: { gold: 500, xp: 250, gems: 10 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },
      {
        achievementId: "master_champion",
        name: "Master Champion",
        description: "Win 50 games",
        category: "wins",
        rarity: "epic",
        icon: "trophy",
        requirementType: "win_game",
        targetValue: 50,
        rewards: { gold: 2000, xp: 1000, gems: 50 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },
      {
        achievementId: "legend",
        name: "Legend",
        description: "Win 100 games",
        category: "wins",
        rarity: "legendary",
        icon: "trophy",
        requirementType: "win_game",
        targetValue: 100,
        rewards: { gold: 5000, xp: 2500, gems: 100, badge: "legend_badge" },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },

      // Games played category
      {
        achievementId: "first_steps",
        name: "First Steps",
        description: "Play your first game",
        category: "games_played",
        rarity: "common",
        icon: "play",
        requirementType: "play_game",
        targetValue: 1,
        rewards: { gold: 50, xp: 25 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },
      {
        achievementId: "dedicated_player",
        name: "Dedicated Player",
        description: "Play 50 games",
        category: "games_played",
        rarity: "rare",
        icon: "play",
        requirementType: "play_game",
        targetValue: 50,
        rewards: { gold: 1000, xp: 500, gems: 25 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },

      // Ranked category
      {
        achievementId: "ranked_debut",
        name: "Ranked Debut",
        description: "Win your first ranked game",
        category: "ranked",
        rarity: "common",
        icon: "star",
        requirementType: "win_ranked",
        targetValue: 1,
        rewards: { gold: 200, xp: 100 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },
      {
        achievementId: "climbing_ranks",
        name: "Climbing the Ranks",
        description: "Win 25 ranked games",
        category: "ranked",
        rarity: "epic",
        icon: "star",
        requirementType: "win_ranked",
        targetValue: 25,
        rewards: { gold: 1500, xp: 750, gems: 50 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },

      // Story category
      {
        achievementId: "story_begin",
        name: "The Journey Begins",
        description: "Complete your first story stage",
        category: "story",
        rarity: "common",
        icon: "book",
        requirementType: "complete_stage",
        targetValue: 1,
        rewards: { gold: 100, xp: 50 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },
      {
        achievementId: "chapter_master",
        name: "Chapter Master",
        description: "Complete an entire chapter",
        category: "story",
        rarity: "rare",
        icon: "book",
        requirementType: "complete_chapter",
        targetValue: 1,
        rewards: { gold: 500, xp: 250, gems: 20 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },

      // Social category
      {
        achievementId: "social_butterfly",
        name: "Social Butterfly",
        description: "Add 5 friends",
        category: "social",
        rarity: "common",
        icon: "users",
        requirementType: "add_friend",
        targetValue: 5,
        rewards: { gold: 200, xp: 100 },
        isSecret: false,
        isActive: true,
        createdAt: now,
      },
    ];

    // Insert achievements if they don't exist
    for (const achievement of achievements) {
      const existing = await ctx.db
        .query("achievementDefinitions")
        .withIndex("by_achievement_id", (q) => q.eq("achievementId", achievement.achievementId))
        .first();

      if (!existing) {
        await ctx.db.insert("achievementDefinitions", achievement);
      }
    }

    return { success: true, count: achievements.length };
  },
});
