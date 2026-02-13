import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const questDefFields = {
  key: v.string(),
  name: v.string(),
  description: v.string(),
  type: v.string(),
  requirement: v.any(),
  reward: v.any(),
  isActive: v.boolean(),
  metadata: v.optional(v.any()),
};

const questDefReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  key: v.string(),
  name: v.string(),
  description: v.string(),
  type: v.string(),
  requirement: v.any(),
  reward: v.any(),
  isActive: v.boolean(),
  metadata: v.optional(v.any()),
});

const userQuestReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  questKey: v.string(),
  progress: v.number(),
  completed: v.boolean(),
  claimed: v.boolean(),
  assignedAt: v.number(),
  expiresAt: v.optional(v.number()),
  metadata: v.optional(v.any()),
});

export const defineQuest = mutation({
  args: questDefFields,
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("questDefinitions", args);
    return id as string;
  },
});

export const getActiveQuests = query({
  args: {
    type: v.optional(v.string()),
  },
  returns: v.array(questDefReturnValidator),
  handler: async (ctx, args) => {
    let questQuery = ctx.db.query("questDefinitions");

    if (args.type) {
      questQuery = questQuery.withIndex("by_type", (q) =>
        q.eq("type", args.type!)
      );
    }

    const quests = await questQuery.collect();
    const activeQuests = quests.filter((q) => q.isActive);

    return activeQuests.map((q) => ({
      ...q,
      _id: q._id as string,
    }));
  },
});

export const getPlayerQuests = query({
  args: {
    userId: v.string(),
    includeCompleted: v.optional(v.boolean()),
  },
  returns: v.array(userQuestReturnValidator),
  handler: async (ctx, args) => {
    const quests = await ctx.db
      .query("userQuests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let filtered = quests;
    if (!args.includeCompleted) {
      filtered = quests.filter((q) => !q.completed);
    }

    return filtered.map((q) => ({
      ...q,
      _id: q._id as string,
    }));
  },
});

export const startQuest = mutation({
  args: {
    userId: v.string(),
    questKey: v.string(),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userQuests")
      .withIndex("by_user_quest", (q) =>
        q.eq("userId", args.userId).eq("questKey", args.questKey)
      )
      .unique();

    if (existing && !existing.completed) {
      // Already in progress
      return existing._id as string;
    }

    const def = await ctx.db
      .query("questDefinitions")
      .withIndex("by_key", (q) => q.eq("key", args.questKey))
      .unique();

    if (!def) {
      throw new Error(`Quest definition not found: ${args.questKey}`);
    }

    if (!def.isActive) {
      throw new Error(`Quest is not active: ${args.questKey}`);
    }

    const id = await ctx.db.insert("userQuests", {
      userId: args.userId,
      questKey: args.questKey,
      progress: 0,
      completed: false,
      claimed: false,
      assignedAt: Date.now(),
      expiresAt: args.expiresAt,
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const updateQuestProgress = mutation({
  args: {
    userId: v.string(),
    questKey: v.string(),
    delta: v.number(),
  },
  returns: v.object({
    progress: v.number(),
    completed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userQuest = await ctx.db
      .query("userQuests")
      .withIndex("by_user_quest", (q) =>
        q.eq("userId", args.userId).eq("questKey", args.questKey)
      )
      .unique();

    if (!userQuest) {
      throw new Error(
        `User quest not found: ${args.userId} / ${args.questKey}`
      );
    }

    if (userQuest.completed) {
      // Quest already completed
      return { progress: userQuest.progress, completed: true };
    }

    const def = await ctx.db
      .query("questDefinitions")
      .withIndex("by_key", (q) => q.eq("key", args.questKey))
      .unique();

    if (!def) {
      throw new Error(`Quest definition not found: ${args.questKey}`);
    }

    const newProgress = userQuest.progress + args.delta;
    const threshold = def.requirement?.threshold ?? 1;
    const completed = newProgress >= threshold;

    await ctx.db.patch(userQuest._id, {
      progress: newProgress,
      completed,
    });

    return { progress: newProgress, completed };
  },
});

export const completeQuest = mutation({
  args: {
    userId: v.string(),
    questKey: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.boolean(),
      reward: v.any(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userQuest = await ctx.db
      .query("userQuests")
      .withIndex("by_user_quest", (q) =>
        q.eq("userId", args.userId).eq("questKey", args.questKey)
      )
      .unique();

    if (!userQuest) {
      return null;
    }

    if (!userQuest.completed) {
      throw new Error(`Quest not yet completed: ${args.questKey}`);
    }

    if (userQuest.claimed) {
      // Already claimed
      return { success: false, reward: null };
    }

    const def = await ctx.db
      .query("questDefinitions")
      .withIndex("by_key", (q) => q.eq("key", args.questKey))
      .unique();

    if (!def) {
      throw new Error(`Quest definition not found: ${args.questKey}`);
    }

    await ctx.db.patch(userQuest._id, {
      claimed: true,
    });

    return {
      success: true,
      reward: def.reward,
    };
  },
});

export const abandonQuest = mutation({
  args: {
    userId: v.string(),
    questKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userQuest = await ctx.db
      .query("userQuests")
      .withIndex("by_user_quest", (q) =>
        q.eq("userId", args.userId).eq("questKey", args.questKey)
      )
      .unique();

    if (!userQuest) {
      throw new Error(
        `User quest not found: ${args.userId} / ${args.questKey}`
      );
    }

    await ctx.db.delete(userQuest._id);
    return null;
  },
});
