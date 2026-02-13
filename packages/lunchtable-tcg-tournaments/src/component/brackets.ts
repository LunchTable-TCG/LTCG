import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const matchReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  tournamentId: v.string(),
  round: v.number(),
  matchNumber: v.number(),
  player1Id: v.optional(v.string()),
  player2Id: v.optional(v.string()),
  winnerId: v.optional(v.string()),
  loserId: v.optional(v.string()),
  gameId: v.optional(v.string()),
  status: v.string(),
  score: v.optional(v.string()),
  scheduledTime: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  nextMatchId: v.optional(v.string()),
  metadata: v.optional(v.any()),
});

export const createMatch = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    round: v.number(),
    matchNumber: v.number(),
    player1Id: v.optional(v.string()),
    player2Id: v.optional(v.string()),
    scheduledTime: v.optional(v.number()),
    nextMatchId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error(`Tournament not found: ${args.tournamentId}`);
    }

    // Determine status based on players
    let status = "pending";
    if (!args.player1Id || !args.player2Id) {
      status = "bye";
    }

    const id = await ctx.db.insert("matches", {
      tournamentId: args.tournamentId,
      round: args.round,
      matchNumber: args.matchNumber,
      player1Id: args.player1Id,
      player2Id: args.player2Id,
      status,
      scheduledTime: args.scheduledTime,
      nextMatchId: args.nextMatchId,
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const getMatches = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(matchReturnValidator),
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return matches.map((m) => ({
      ...m,
      _id: m._id as string,
      tournamentId: m.tournamentId as string,
    }));
  },
});

export const getMatchById = query({
  args: { id: v.id("matches") },
  returns: v.union(matchReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.id);
    if (!match) return null;
    return {
      ...match,
      _id: match._id as string,
      tournamentId: match.tournamentId as string,
    };
  },
});

export const getRoundMatches = query({
  args: {
    tournamentId: v.id("tournaments"),
    round: v.number(),
  },
  returns: v.array(matchReturnValidator),
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_round", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("round", args.round)
      )
      .collect();

    return matches.map((m) => ({
      ...m,
      _id: m._id as string,
      tournamentId: m.tournamentId as string,
    }));
  },
});

export const reportResult = mutation({
  args: {
    id: v.id("matches"),
    winnerId: v.string(),
    loserId: v.optional(v.string()),
    score: v.optional(v.string()),
    gameId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.id);
    if (!match) {
      throw new Error(`Match not found: ${args.id}`);
    }
    if (match.status === "completed") {
      throw new Error("Match is already completed");
    }

    // Validate that winnerId is one of the players
    if (
      match.player1Id !== args.winnerId &&
      match.player2Id !== args.winnerId
    ) {
      throw new Error("Winner must be one of the match participants");
    }

    // Determine loser
    const loserId = args.loserId || (
      match.player1Id === args.winnerId ? match.player2Id : match.player1Id
    );

    await ctx.db.patch(args.id, {
      winnerId: args.winnerId,
      loserId,
      score: args.score,
      gameId: args.gameId,
      status: "completed",
      completedAt: Date.now(),
    });

    // Update participant records
    if (match.tournamentId) {
      // Update winner
      const winner = await ctx.db
        .query("participants")
        .withIndex("by_tournament_player", (q) =>
          q.eq("tournamentId", match.tournamentId).eq("playerId", args.winnerId)
        )
        .unique();
      if (winner) {
        await ctx.db.patch(winner._id, { wins: winner.wins + 1 });
      }

      // Update loser
      if (loserId) {
        const loser = await ctx.db
          .query("participants")
          .withIndex("by_tournament_player", (q) =>
            q.eq("tournamentId", match.tournamentId).eq("playerId", loserId)
          )
          .unique();
        if (loser) {
          await ctx.db.patch(loser._id, { losses: loser.losses + 1 });
        }
      }
    }

    return null;
  },
});

export const advanceBracket = mutation({
  args: {
    matchId: v.id("matches"),
    nextMatchId: v.id("matches"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error(`Match not found: ${args.matchId}`);
    }
    if (match.status !== "completed") {
      throw new Error("Cannot advance bracket for incomplete match");
    }
    if (!match.winnerId) {
      throw new Error("Match has no winner");
    }

    const nextMatch = await ctx.db.get(args.nextMatchId);
    if (!nextMatch) {
      throw new Error(`Next match not found: ${args.nextMatchId}`);
    }

    // Advance winner to next match
    if (!nextMatch.player1Id) {
      await ctx.db.patch(args.nextMatchId, { player1Id: match.winnerId });
    } else if (!nextMatch.player2Id) {
      await ctx.db.patch(args.nextMatchId, { player2Id: match.winnerId });
    } else {
      throw new Error("Next match is already full");
    }

    // Update status if both players are set
    const updatedNextMatch = await ctx.db.get(args.nextMatchId);
    if (updatedNextMatch?.player1Id && updatedNextMatch?.player2Id) {
      await ctx.db.patch(args.nextMatchId, { status: "pending" });
    }

    return null;
  },
});

export const updateMatchStatus = mutation({
  args: {
    id: v.id("matches"),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.id);
    if (!match) {
      throw new Error(`Match not found: ${args.id}`);
    }
    await ctx.db.patch(args.id, { status: args.status });
    return null;
  },
});
