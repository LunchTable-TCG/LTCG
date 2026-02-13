import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const achievementDefFields = {
  key: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.string(),
  iconUrl: v.optional(v.string()),
  requirement: v.any(),
  reward: v.optional(v.any()),
  isHidden: v.optional(v.boolean()),
  metadata: v.optional(v.any()),
};

const achievementDefReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  key: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.string(),
  iconUrl: v.optional(v.string()),
  requirement: v.any(),
  reward: v.optional(v.any()),
  isHidden: v.optional(v.boolean()),
  metadata: v.optional(v.any()),
});

const userAchievementReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  achievementKey: v.string(),
  progress: v.number(),
  completed: v.boolean(),
  completedAt: v.optional(v.number()),
  claimed: v.optional(v.boolean()),
  metadata: v.optional(v.any()),
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
    category: v.optional(v.string()),
  },
  returns: v.array(achievementDefReturnValidator),
  handler: async (ctx, args) => {
    let query = ctx.db.query("achievementDefinitions");

    if (args.category) {
      query = query.withIndex("by_category", (q) =>
        q.eq("category", args.category!)
      );
    }

    const defs = await query.collect();
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
    achievementKey: v.string(),
    progress: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_achievement", (q) =>
        q.eq("userId", args.userId).eq("achievementKey", args.achievementKey)
      )
      .unique();

    if (existing) {
      // Already granted
      return existing._id as string;
    }

    const id = await ctx.db.insert("userAchievements", {
      userId: args.userId,
      achievementKey: args.achievementKey,
      progress: args.progress ?? 100,
      completed: true,
      completedAt: Date.now(),
      claimed: false,
      metadata: args.metadata,
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
    achievementKey: v.string(),
    delta: v.number(),
  },
  returns: v.object({
    progress: v.number(),
    completed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_achievement", (q) =>
        q.eq("userId", args.userId).eq("achievementKey", args.achievementKey)
      )
      .unique();

    if (!existing) {
      // Create new progress entry
      const id = await ctx.db.insert("userAchievements", {
        userId: args.userId,
        achievementKey: args.achievementKey,
        progress: args.delta,
        completed: false,
        claimed: false,
      });

      return { progress: args.delta, completed: false };
    }

    const newProgress = existing.progress + args.delta;

    // Get achievement definition to check threshold
    const def = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_key", (q) => q.eq("key", args.achievementKey))
      .unique();

    let completed = existing.completed;
    let completedAt = existing.completedAt;

    if (def && def.requirement?.threshold) {
      if (newProgress >= def.requirement.threshold && !existing.completed) {
        completed = true;
        completedAt = Date.now();
      }
    }

    await ctx.db.patch(existing._id, {
      progress: newProgress,
      completed,
      completedAt,
    });

    return { progress: newProgress, completed };
  },
});

export const checkAndGrant = mutation({
  args: {
    userId: v.string(),
    achievementKey: v.string(),
    currentValue: v.number(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const def = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_key", (q) => q.eq("key", args.achievementKey))
      .unique();

    if (!def) {
      throw new Error(`Achievement not found: ${args.achievementKey}`);
    }

    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_achievement", (q) =>
        q.eq("userId", args.userId).eq("achievementKey", args.achievementKey)
      )
      .unique();

    if (existing?.completed) {
      // Already completed
      return null;
    }

    const threshold = def.requirement?.threshold ?? 1;

    if (args.currentValue >= threshold) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          progress: args.currentValue,
          completed: true,
          completedAt: Date.now(),
        });
        return existing._id as string;
      } else {
        const id = await ctx.db.insert("userAchievements", {
          userId: args.userId,
          achievementKey: args.achievementKey,
          progress: args.currentValue,
          completed: true,
          completedAt: Date.now(),
          claimed: false,
        });
        return id as string;
      }
    }

    return null;
  },
});
