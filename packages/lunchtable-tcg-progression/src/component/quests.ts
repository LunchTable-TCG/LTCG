import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const questDefFields = {
  questId: v.string(),
  name: v.string(),
  description: v.string(),
  questType: v.union(
    v.literal("daily"),
    v.literal("weekly"),
    v.literal("achievement")
  ),
  requirementType: v.string(),
  targetValue: v.number(),
  rewards: v.object({
    gold: v.number(),
    xp: v.number(),
    gems: v.optional(v.number()),
  }),
  filters: v.optional(
    v.object({
      gameMode: v.optional(
        v.union(
          v.literal("ranked"),
          v.literal("casual"),
          v.literal("story")
        )
      ),
      archetype: v.optional(v.string()),
      cardType: v.optional(v.string()),
    })
  ),
  isActive: v.boolean(),
  createdAt: v.number(),
};

const questDefReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  questId: v.string(),
  name: v.string(),
  description: v.string(),
  questType: v.union(
    v.literal("daily"),
    v.literal("weekly"),
    v.literal("achievement")
  ),
  requirementType: v.string(),
  targetValue: v.number(),
  rewards: v.object({
    gold: v.number(),
    xp: v.number(),
    gems: v.optional(v.number()),
  }),
  filters: v.optional(
    v.object({
      gameMode: v.optional(
        v.union(
          v.literal("ranked"),
          v.literal("casual"),
          v.literal("story")
        )
      ),
      archetype: v.optional(v.string()),
      cardType: v.optional(v.string()),
    })
  ),
  isActive: v.boolean(),
  createdAt: v.number(),
});

const userQuestReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  questId: v.string(),
  currentProgress: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("completed"),
    v.literal("claimed")
  ),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  claimedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
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
    questType: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("achievement")
      )
    ),
  },
  returns: v.array(questDefReturnValidator),
  handler: async (ctx, args) => {
    const quests = args.questType
      ? await ctx.db
          .query("questDefinitions")
          .withIndex("by_type", (q) => q.eq("questType", args.questType!))
          .collect()
      : await ctx.db.query("questDefinitions").collect();

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
    includeClaimed: v.optional(v.boolean()),
  },
  returns: v.array(userQuestReturnValidator),
  handler: async (ctx, args) => {
    const quests = await ctx.db
      .query("userQuests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let filtered = quests;
    if (!args.includeClaimed) {
      filtered = quests.filter((q) => q.status !== "claimed");
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
    questId: v.string(),
    expiresAt: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userQuests")
      .withIndex("by_user_quest", (q) =>
        q.eq("userId", args.userId).eq("questId", args.questId)
      )
      .unique();

    if (existing && existing.status === "active") {
      // Already in progress
      return existing._id as string;
    }

    const def = await ctx.db
      .query("questDefinitions")
      .withIndex("by_quest_id", (q) => q.eq("questId", args.questId))
      .unique();

    if (!def) {
      throw new Error(`Quest definition not found: ${args.questId}`);
    }

    if (!def.isActive) {
      throw new Error(`Quest is not active: ${args.questId}`);
    }

    const id = await ctx.db.insert("userQuests", {
      userId: args.userId,
      questId: args.questId,
      currentProgress: 0,
      status: "active",
      startedAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    return id as string;
  },
});

export const updateQuestProgress = mutation({
  args: {
    userId: v.string(),
    questId: v.string(),
    delta: v.number(),
  },
  returns: v.object({
    currentProgress: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("claimed")
    ),
  }),
  handler: async (ctx, args) => {
    const userQuest = await ctx.db
      .query("userQuests")
      .withIndex("by_user_quest", (q) =>
        q.eq("userId", args.userId).eq("questId", args.questId)
      )
      .unique();

    if (!userQuest) {
      throw new Error(
        `User quest not found: ${args.userId} / ${args.questId}`
      );
    }

    if (userQuest.status !== "active") {
      // Quest already completed or claimed
      return { currentProgress: userQuest.currentProgress, status: userQuest.status } as const;
    }

    const def = await ctx.db
      .query("questDefinitions")
      .withIndex("by_quest_id", (q) => q.eq("questId", args.questId))
      .unique();

    if (!def) {
      throw new Error(`Quest definition not found: ${args.questId}`);
    }

    const newProgress = userQuest.currentProgress + args.delta;
    const targetValue = def.targetValue ?? 1;
    const isCompleted = newProgress >= targetValue;
    const newStatus: "active" | "completed" = isCompleted ? "completed" : "active";

    await ctx.db.patch(userQuest._id, {
      currentProgress: newProgress,
      status: newStatus,
      completedAt: isCompleted ? Date.now() : undefined,
    });

    return { currentProgress: newProgress, status: newStatus };
  },
});

export const claimQuest = mutation({
  args: {
    userId: v.string(),
    questId: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.boolean(),
      rewards: v.object({
        gold: v.number(),
        xp: v.number(),
        gems: v.optional(v.number()),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userQuest = await ctx.db
      .query("userQuests")
      .withIndex("by_user_quest", (q) =>
        q.eq("userId", args.userId).eq("questId", args.questId)
      )
      .unique();

    if (!userQuest) {
      return null;
    }

    if (userQuest.status !== "completed") {
      throw new Error(`Quest not yet completed: ${args.questId}`);
    }

    const def = await ctx.db
      .query("questDefinitions")
      .withIndex("by_quest_id", (q) => q.eq("questId", args.questId))
      .unique();

    if (!def) {
      throw new Error(`Quest definition not found: ${args.questId}`);
    }

    await ctx.db.patch(userQuest._id, {
      status: "claimed",
      claimedAt: Date.now(),
    });

    return {
      success: true,
      rewards: def.rewards,
    };
  },
});

export const abandonQuest = mutation({
  args: {
    userId: v.string(),
    questId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userQuest = await ctx.db
      .query("userQuests")
      .withIndex("by_user_quest", (q) =>
        q.eq("userId", args.userId).eq("questId", args.questId)
      )
      .unique();

    if (!userQuest) {
      throw new Error(
        `User quest not found: ${args.userId} / ${args.questId}`
      );
    }

    await ctx.db.delete(userQuest._id);
    return null;
  },
});
