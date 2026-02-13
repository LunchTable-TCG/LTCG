import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const playerXPReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  totalXP: v.number(),
  level: v.number(),
  currentLevelXP: v.number(),
  xpToNextLevel: v.number(),
  metadata: v.optional(v.any()),
});

// Standard XP curve: XP required for level N = N * 100
function calculateLevelFromXP(totalXP: number): {
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
} {
  let level = 1;
  let xpForCurrentLevel = 0;

  // Find the level
  while (true) {
    const xpForNextLevel = level * 100;
    if (xpForCurrentLevel + xpForNextLevel > totalXP) {
      break;
    }
    xpForCurrentLevel += xpForNextLevel;
    level++;
  }

  const currentLevelXP = totalXP - xpForCurrentLevel;
  const xpToNextLevel = level * 100 - currentLevelXP;

  return { level, currentLevelXP, xpToNextLevel };
}

export const addXP = mutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    totalXP: v.number(),
    level: v.number(),
    levelUps: v.number(),
  }),
  handler: async (ctx, args) => {
    let playerXP = await ctx.db
      .query("playerXP")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const oldLevel = playerXP?.level ?? 1;

    if (!playerXP) {
      const totalXP = args.amount;
      const { level, currentLevelXP, xpToNextLevel } =
        calculateLevelFromXP(totalXP);

      await ctx.db.insert("playerXP", {
        userId: args.userId,
        totalXP,
        level,
        currentLevelXP,
        xpToNextLevel,
        metadata: args.metadata,
      });

      return {
        totalXP,
        level,
        levelUps: level - 1,
      };
    }

    const totalXP = playerXP.totalXP + args.amount;
    const { level, currentLevelXP, xpToNextLevel } =
      calculateLevelFromXP(totalXP);

    await ctx.db.patch(playerXP._id, {
      totalXP,
      level,
      currentLevelXP,
      xpToNextLevel,
      metadata: args.metadata ?? playerXP.metadata,
    });

    return {
      totalXP,
      level,
      levelUps: level - oldLevel,
    };
  },
});

export const getPlayerXP = query({
  args: {
    userId: v.string(),
  },
  returns: v.union(playerXPReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const xp = await ctx.db
      .query("playerXP")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!xp) return null;

    return {
      ...xp,
      _id: xp._id as string,
    };
  },
});

export const getLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(playerXPReturnValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const allPlayers = await ctx.db.query("playerXP").collect();

    // Sort by totalXP descending
    const sorted = allPlayers.sort((a, b) => b.totalXP - a.totalXP);
    const top = sorted.slice(0, limit);

    return top.map((xp) => ({
      ...xp,
      _id: xp._id as string,
    }));
  },
});
