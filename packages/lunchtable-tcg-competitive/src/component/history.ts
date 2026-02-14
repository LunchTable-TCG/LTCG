import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const historyReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  tournamentId: v.string(),
  tournamentName: v.string(),
  maxPlayers: v.number(),
  placement: v.number(),
  prizeWon: v.number(),
  matchesPlayed: v.number(),
  matchesWon: v.number(),
  completedAt: v.number(),
});

export const recordHistory = mutation({
  args: {
    userId: v.string(),
    tournamentId: v.id("tournaments"),
    tournamentName: v.string(),
    maxPlayers: v.number(),
    placement: v.number(),
    prizeWon: v.number(),
    matchesPlayed: v.number(),
    matchesWon: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tournamentHistory", {
      userId: args.userId,
      tournamentId: args.tournamentId,
      tournamentName: args.tournamentName,
      maxPlayers: args.maxPlayers,
      placement: args.placement,
      prizeWon: args.prizeWon,
      matchesPlayed: args.matchesPlayed,
      matchesWon: args.matchesWon,
      completedAt: Date.now(),
    });

    return id as string;
  },
});

export const getUserHistory = query({
  args: { userId: v.string() },
  returns: v.array(historyReturnValidator),
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("tournamentHistory")
      .withIndex("by_user_completed", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return history.map((h) => ({
      ...h,
      _id: h._id as string,
      tournamentId: h.tournamentId as string,
    }));
  },
});

export const getRecentHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(historyReturnValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const history = await ctx.db
      .query("tournamentHistory")
      .order("desc")
      .take(limit);

    return history.map((h) => ({
      ...h,
      _id: h._id as string,
      tournamentId: h.tournamentId as string,
    }));
  },
});

export const getTournamentHistory = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(historyReturnValidator),
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("tournamentHistory")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return history.map((h) => ({
      ...h,
      _id: h._id as string,
      tournamentId: h.tournamentId as string,
    }));
  },
});

export const getUserStats = query({
  args: { userId: v.string() },
  returns: v.object({
    totalTournaments: v.number(),
    totalMatchesPlayed: v.number(),
    totalMatchesWon: v.number(),
    averagePlacement: v.number(),
    bestPlacement: v.number(),
    totalPrizesWon: v.number(),
  }),
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("tournamentHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (history.length === 0) {
      return {
        totalTournaments: 0,
        totalMatchesPlayed: 0,
        totalMatchesWon: 0,
        averagePlacement: 0,
        bestPlacement: 0,
        totalPrizesWon: 0,
      };
    }

    const totalMatchesPlayed = history.reduce((sum, h) => sum + h.matchesPlayed, 0);
    const totalMatchesWon = history.reduce((sum, h) => sum + h.matchesWon, 0);
    const totalPlacement = history.reduce((sum, h) => sum + h.placement, 0);
    const bestPlacement = Math.min(...history.map((h) => h.placement));
    const totalPrizesWon = history.reduce((sum, h) => sum + h.prizeWon, 0);

    return {
      totalTournaments: history.length,
      totalMatchesPlayed,
      totalMatchesWon,
      averagePlacement: totalPlacement / history.length,
      bestPlacement,
      totalPrizesWon,
    };
  },
});
