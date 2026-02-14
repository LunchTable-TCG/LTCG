import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const achievementDefFields = {
  achievementId: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("wins"),
    v.literal("games_played"),
    v.literal("collection"),
    v.literal("social"),
    v.literal("story"),
    v.literal("ranked"),
    v.literal("special")
  ),
  rarity: v.union(
    v.literal("common"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  ),
  icon: v.string(),
  requirementType: v.string(),
  targetValue: v.number(),
  rewards: v.optional(
    v.object({
      gold: v.optional(v.number()),
      xp: v.optional(v.number()),
      gems: v.optional(v.number()),
      badge: v.optional(v.string()),
      cardDefinitionId: v.optional(v.string()),
    })
  ),
  isSecret: v.boolean(),
  isActive: v.boolean(),
  createdAt: v.number(),
};

const achievementDefReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  achievementId: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("wins"),
    v.literal("games_played"),
    v.literal("collection"),
    v.literal("social"),
    v.literal("story"),
    v.literal("ranked"),
    v.literal("special")
  ),
  rarity: v.union(
    v.literal("common"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  ),
  icon: v.string(),
  requirementType: v.string(),
  targetValue: v.number(),
  rewards: v.optional(
    v.object({
      gold: v.optional(v.number()),
      xp: v.optional(v.number()),
      gems: v.optional(v.number()),
      badge: v.optional(v.string()),
      cardDefinitionId: v.optional(v.string()),
    })
  ),
  isSecret: v.boolean(),
  isActive: v.boolean(),
  createdAt: v.number(),
});

const userAchievementReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  achievementId: v.string(),
  currentProgress: v.number(),
  isUnlocked: v.boolean(),
  unlockedAt: v.optional(v.number()),
});

export const defineAchievement = mutation({
  args: achievementDefFields,
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("achievementDefinitions", args);
    return id as string;
  },
});

export const getDefinitions = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("wins"),
        v.literal("games_played"),
        v.literal("collection"),
        v.literal("social"),
        v.literal("story"),
        v.literal("ranked"),
        v.literal("special")
      )
    ),
  },
  returns: v.array(achievementDefReturnValidator),
  handler: async (ctx, args) => {
    const defs = args.category
      ? await ctx.db
          .query("achievementDefinitions")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .collect()
      : await ctx.db.query("achievementDefinitions").collect();

    return defs.map((def) => ({
      ...def,
      _id: def._id as string,
    }));
  },
});

export const getDefinitionById = query({
  args: { id: v.id("achievementDefinitions") },
  returns: v.union(achievementDefReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const def = await ctx.db.get(args.id);
    if (!def) return null;
    return { ...def, _id: def._id as string };
  },
});

export const grantAchievement = mutation({
  args: {
    userId: v.string(),
    achievementId: v.string(),
    currentProgress: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_achievement", (q) =>
        q.eq("userId", args.userId).eq("achievementId", args.achievementId)
      )
      .unique();

    if (existing) {
      // Already granted
      return existing._id as string;
    }

    // Get the achievement definition to determine the target value
    const def = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_achievement_id", (q) => q.eq("achievementId", args.achievementId))
      .unique();

    const id = await ctx.db.insert("userAchievements", {
      userId: args.userId,
      achievementId: args.achievementId,
      currentProgress: args.currentProgress ?? def?.targetValue ?? 100,
      isUnlocked: true,
      unlockedAt: Date.now(),
    });

    return id as string;
  },
});

export const getPlayerAchievements = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(userAchievementReturnValidator),
  handler: async (ctx, args) => {
    const achievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return achievements.map((a) => ({
      ...a,
      _id: a._id as string,
    }));
  },
});

export const updateProgress = mutation({
  args: {
    userId: v.string(),
    achievementId: v.string(),
    delta: v.number(),
  },
  returns: v.object({
    currentProgress: v.number(),
    isUnlocked: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_achievement", (q) =>
        q.eq("userId", args.userId).eq("achievementId", args.achievementId)
      )
      .unique();

    if (!existing) {
      // Create new progress entry
      const id = await ctx.db.insert("userAchievements", {
        userId: args.userId,
        achievementId: args.achievementId,
        currentProgress: args.delta,
        isUnlocked: false,
      });

      return { currentProgress: args.delta, isUnlocked: false };
    }

    const newProgress = existing.currentProgress + args.delta;

    // Get achievement definition to check target value
    const def = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_achievement_id", (q) => q.eq("achievementId", args.achievementId))
      .unique();

    let isUnlocked = existing.isUnlocked;
    let unlockedAt = existing.unlockedAt;

    if (def && def.targetValue) {
      if (newProgress >= def.targetValue && !existing.isUnlocked) {
        isUnlocked = true;
        unlockedAt = Date.now();
      }
    }

    await ctx.db.patch(existing._id, {
      currentProgress: newProgress,
      isUnlocked,
      unlockedAt,
    });

    return { currentProgress: newProgress, isUnlocked };
  },
});

export const checkAndGrant = mutation({
  args: {
    userId: v.string(),
    achievementId: v.string(),
    currentValue: v.number(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const def = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_achievement_id", (q) => q.eq("achievementId", args.achievementId))
      .unique();

    if (!def) {
      throw new Error(`Achievement not found: ${args.achievementId}`);
    }

    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_achievement", (q) =>
        q.eq("userId", args.userId).eq("achievementId", args.achievementId)
      )
      .unique();

    if (existing?.isUnlocked) {
      // Already unlocked
      return null;
    }

    const targetValue = def.targetValue ?? 1;

    if (args.currentValue >= targetValue) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          currentProgress: args.currentValue,
          isUnlocked: true,
          unlockedAt: Date.now(),
        });
        return existing._id as string;
      } else {
        const id = await ctx.db.insert("userAchievements", {
          userId: args.userId,
          achievementId: args.achievementId,
          currentProgress: args.currentValue,
          isUnlocked: true,
          unlockedAt: Date.now(),
        });
        return id as string;
      }
    }

    return null;
  },
});
