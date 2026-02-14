import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const matchReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  tournamentId: v.string(),
  round: v.number(),
  matchNumber: v.number(),
  bracketPosition: v.number(),
  player1Id: v.optional(v.string()),
  player1Username: v.optional(v.string()),
  player1ParticipantId: v.optional(v.string()),
  player2Id: v.optional(v.string()),
  player2Username: v.optional(v.string()),
  player2ParticipantId: v.optional(v.string()),
  player1SourceMatchId: v.optional(v.string()),
  player2SourceMatchId: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("ready"),
    v.literal("active"),
    v.literal("completed"),
    v.literal("forfeit")
  ),
  lobbyId: v.optional(v.string()),
  gameId: v.optional(v.string()),
  winnerId: v.optional(v.string()),
  winnerUsername: v.optional(v.string()),
  loserId: v.optional(v.string()),
  loserUsername: v.optional(v.string()),
  winReason: v.optional(v.union(
    v.literal("game_win"),
    v.literal("opponent_forfeit"),
    v.literal("opponent_no_show"),
    v.literal("bye")
  )),
  scheduledAt: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const createMatch = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    round: v.number(),
    matchNumber: v.number(),
    bracketPosition: v.number(),
    player1Id: v.optional(v.string()),
    player1Username: v.optional(v.string()),
    player1ParticipantId: v.optional(v.string()),
    player2Id: v.optional(v.string()),
    player2Username: v.optional(v.string()),
    player2ParticipantId: v.optional(v.string()),
    player1SourceMatchId: v.optional(v.id("tournamentMatches")),
    player2SourceMatchId: v.optional(v.id("tournamentMatches")),
    scheduledAt: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error(`Tournament not found: ${args.tournamentId}`);
    }

    let status: "pending" | "ready" | "active" | "completed" | "forfeit" = "pending";
    if (args.player1Id && args.player2Id) {
      status = "ready";
    }

    const now = Date.now();
    const id = await ctx.db.insert("tournamentMatches", {
      tournamentId: args.tournamentId,
      round: args.round,
      matchNumber: args.matchNumber,
      bracketPosition: args.bracketPosition,
      player1Id: args.player1Id,
      player1Username: args.player1Username,
      player1ParticipantId: args.player1ParticipantId as any,
      player2Id: args.player2Id,
      player2Username: args.player2Username,
      player2ParticipantId: args.player2ParticipantId as any,
      player1SourceMatchId: args.player1SourceMatchId,
      player2SourceMatchId: args.player2SourceMatchId,
      status,
      scheduledAt: args.scheduledAt,
      createdAt: now,
      updatedAt: now,
    });

    return id as string;
  },
});

export const getMatches = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(matchReturnValidator),
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return matches.map((m) => ({
      ...m,
      _id: m._id as string,
      tournamentId: m.tournamentId as string,
      player1ParticipantId: m.player1ParticipantId as string | undefined,
      player2ParticipantId: m.player2ParticipantId as string | undefined,
      player1SourceMatchId: m.player1SourceMatchId as string | undefined,
      player2SourceMatchId: m.player2SourceMatchId as string | undefined,
    }));
  },
});

export const getMatchById = query({
  args: { id: v.id("tournamentMatches") },
  returns: v.union(matchReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.id);
    if (!match) return null;
    return {
      ...match,
      _id: match._id as string,
      tournamentId: match.tournamentId as string,
      player1ParticipantId: match.player1ParticipantId as string | undefined,
      player2ParticipantId: match.player2ParticipantId as string | undefined,
      player1SourceMatchId: match.player1SourceMatchId as string | undefined,
      player2SourceMatchId: match.player2SourceMatchId as string | undefined,
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
      .query("tournamentMatches")
      .withIndex("by_tournament_round", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("round", args.round)
      )
      .collect();

    return matches.map((m) => ({
      ...m,
      _id: m._id as string,
      tournamentId: m.tournamentId as string,
      player1ParticipantId: m.player1ParticipantId as string | undefined,
      player2ParticipantId: m.player2ParticipantId as string | undefined,
      player1SourceMatchId: m.player1SourceMatchId as string | undefined,
      player2SourceMatchId: m.player2SourceMatchId as string | undefined,
    }));
  },
});

export const reportResult = mutation({
  args: {
    id: v.id("tournamentMatches"),
    winnerId: v.string(),
    winnerUsername: v.string(),
    loserId: v.optional(v.string()),
    loserUsername: v.optional(v.string()),
    winReason: v.optional(v.union(
      v.literal("game_win"),
      v.literal("opponent_forfeit"),
      v.literal("opponent_no_show"),
      v.literal("bye")
    )),
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

    if (
      match.player1Id !== args.winnerId &&
      match.player2Id !== args.winnerId
    ) {
      throw new Error("Winner must be one of the match participants");
    }

    const loserId = args.loserId || (
      match.player1Id === args.winnerId ? match.player2Id : match.player1Id
    );
    const loserUsername = args.loserUsername || (
      match.player1Id === args.winnerId ? match.player2Username : match.player1Username
    );

    await ctx.db.patch(args.id, {
      winnerId: args.winnerId,
      winnerUsername: args.winnerUsername,
      loserId,
      loserUsername,
      winReason: args.winReason ?? "game_win",
      gameId: args.gameId,
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const advanceBracket = mutation({
  args: {
    matchId: v.id("tournamentMatches"),
    nextMatchId: v.id("tournamentMatches"),
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
    if (!match.winnerId || !match.winnerUsername) {
      throw new Error("Match has no winner");
    }

    const nextMatch = await ctx.db.get(args.nextMatchId);
    if (!nextMatch) {
      throw new Error(`Next match not found: ${args.nextMatchId}`);
    }

    if (!nextMatch.player1Id) {
      await ctx.db.patch(args.nextMatchId, {
        player1Id: match.winnerId,
        player1Username: match.winnerUsername,
        updatedAt: Date.now(),
      });
    } else if (!nextMatch.player2Id) {
      await ctx.db.patch(args.nextMatchId, {
        player2Id: match.winnerId,
        player2Username: match.winnerUsername,
        updatedAt: Date.now(),
      });
    } else {
      throw new Error("Next match is already full");
    }

    const updatedNextMatch = await ctx.db.get(args.nextMatchId);
    if (updatedNextMatch?.player1Id && updatedNextMatch?.player2Id) {
      await ctx.db.patch(args.nextMatchId, {
        status: "ready",
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

export const updateMatchStatus = mutation({
  args: {
    id: v.id("tournamentMatches"),
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("forfeit")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.id);
    if (!match) {
      throw new Error(`Match not found: ${args.id}`);
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});
