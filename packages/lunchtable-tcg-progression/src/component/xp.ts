import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const playerXPReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  currentXP: v.number(),
  currentLevel: v.number(),
  lifetimeXP: v.number(),
  lastUpdatedAt: v.number(),
});

// Standard XP curve: XP required for level N = N * 100
function calculateLevelFromXP(lifetimeXP: number): {
  currentLevel: number;
  currentXP: number;
} {
  let currentLevel = 1;
  let xpForCurrentLevel = 0;

  // Find the level
  while (true) {
    const xpForNextLevel = currentLevel * 100;
    if (xpForCurrentLevel + xpForNextLevel > lifetimeXP) {
      break;
    }
    xpForCurrentLevel += xpForNextLevel;
    currentLevel++;
  }

  const currentXP = lifetimeXP - xpForCurrentLevel;

  return { currentLevel, currentXP };
}

export const addXP = mutation({
  args: {
    userId: v.string(),
    amount: v.number(),
  },
  returns: v.object({
    lifetimeXP: v.number(),
    currentLevel: v.number(),
    levelUps: v.number(),
  }),
  handler: async (ctx, args) => {
    let playerXP = await ctx.db
      .query("playerXP")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const oldLevel = playerXP?.currentLevel ?? 1;
    const now = Date.now();

    if (!playerXP) {
      const lifetimeXP = args.amount;
      const { currentLevel, currentXP } = calculateLevelFromXP(lifetimeXP);

      await ctx.db.insert("playerXP", {
        userId: args.userId,
        lifetimeXP,
        currentLevel,
        currentXP,
        lastUpdatedAt: now,
      });

      return {
        lifetimeXP,
        currentLevel,
        levelUps: currentLevel - 1,
      };
    }

    const lifetimeXP = playerXP.lifetimeXP + args.amount;
    const { currentLevel, currentXP } = calculateLevelFromXP(lifetimeXP);

    await ctx.db.patch(playerXP._id, {
      lifetimeXP,
      currentLevel,
      currentXP,
      lastUpdatedAt: now,
    });

    return {
      lifetimeXP,
      currentLevel,
      levelUps: currentLevel - oldLevel,
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

    // Sort by lifetimeXP descending
    const sorted = allPlayers.sort((a, b) => b.lifetimeXP - a.lifetimeXP);
    const top = sorted.slice(0, limit);

    return top.map((xp) => ({
      ...xp,
      _id: xp._id as string,
    }));
  },
});
