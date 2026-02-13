import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const historyReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  tournamentId: v.string(),
  tournamentName: v.string(),
  playerId: v.string(),
  placement: v.number(),
  wins: v.number(),
  losses: v.number(),
  prizeWon: v.optional(v.any()),
  completedAt: v.number(),
  metadata: v.optional(v.any()),
});

export const recordHistory = mutation({
  args: {
    tournamentId: v.string(),
    tournamentName: v.string(),
    playerId: v.string(),
    placement: v.number(),
    wins: v.number(),
    losses: v.number(),
    prizeWon: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("history", {
      tournamentId: args.tournamentId,
      tournamentName: args.tournamentName,
      playerId: args.playerId,
      placement: args.placement,
      wins: args.wins,
      losses: args.losses,
      prizeWon: args.prizeWon,
      completedAt: Date.now(),
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const getPlayerHistory = query({
  args: { playerId: v.string() },
  returns: v.array(historyReturnValidator),
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("history")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .order("desc")
      .collect();

    return history.map((h) => ({
      ...h,
      _id: h._id as string,
    }));
  },
});

export const getRecentHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(historyReturnValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const history = await ctx.db
      .query("history")
      .order("desc")
      .take(limit);

    return history.map((h) => ({
      ...h,
      _id: h._id as string,
    }));
  },
});

export const getTournamentHistory = query({
  args: { tournamentId: v.string() },
  returns: v.array(historyReturnValidator),
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("history")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .order("asc")
      .collect();

    return history.map((h) => ({
      ...h,
      _id: h._id as string,
    }));
  },
});

export const getPlayerStats = query({
  args: { playerId: v.string() },
  returns: v.object({
    totalTournaments: v.number(),
    totalWins: v.number(),
    totalLosses: v.number(),
    averagePlacement: v.number(),
    bestPlacement: v.number(),
    prizesWon: v.array(v.any()),
  }),
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("history")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    if (history.length === 0) {
      return {
        totalTournaments: 0,
        totalWins: 0,
        totalLosses: 0,
        averagePlacement: 0,
        bestPlacement: 0,
        prizesWon: [],
      };
    }

    const totalWins = history.reduce((sum, h) => sum + h.wins, 0);
    const totalLosses = history.reduce((sum, h) => sum + h.losses, 0);
    const totalPlacement = history.reduce((sum, h) => sum + h.placement, 0);
    const bestPlacement = Math.min(...history.map((h) => h.placement));
    const prizesWon = history
      .filter((h) => h.prizeWon)
      .map((h) => h.prizeWon);

    return {
      totalTournaments: history.length,
      totalWins,
      totalLosses,
      averagePlacement: totalPlacement / history.length,
      bestPlacement,
      prizesWon,
    };
  },
});
