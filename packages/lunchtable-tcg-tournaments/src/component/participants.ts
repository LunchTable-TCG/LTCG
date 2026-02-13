import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const participantReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  tournamentId: v.string(),
  playerId: v.string(),
  playerName: v.optional(v.string()),
  deckId: v.optional(v.string()),
  seed: v.optional(v.number()),
  checkedIn: v.boolean(),
  eliminated: v.boolean(),
  wins: v.number(),
  losses: v.number(),
  tiebreaker: v.optional(v.number()),
  registeredAt: v.number(),
  metadata: v.optional(v.any()),
});

export const register = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    playerId: v.string(),
    playerName: v.optional(v.string()),
    deckId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Check if tournament exists and has space
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error(`Tournament not found: ${args.tournamentId}`);
    }
    if (tournament.status !== "registration") {
      throw new Error("Tournament registration is closed");
    }
    if (tournament.currentPlayers >= tournament.maxPlayers) {
      throw new Error("Tournament is full");
    }

    // Check if player is already registered
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_tournament_player", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("playerId", args.playerId)
      )
      .unique();

    if (existing) {
      throw new Error("Player is already registered for this tournament");
    }

    // Create participant
    const id = await ctx.db.insert("participants", {
      tournamentId: args.tournamentId,
      playerId: args.playerId,
      playerName: args.playerName,
      deckId: args.deckId,
      checkedIn: false,
      eliminated: false,
      wins: 0,
      losses: 0,
      registeredAt: Date.now(),
      metadata: args.metadata,
    });

    // Update tournament player count
    await ctx.db.patch(args.tournamentId, {
      currentPlayers: tournament.currentPlayers + 1,
    });

    return id as string;
  },
});

export const unregister = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    playerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error(`Tournament not found: ${args.tournamentId}`);
    }
    if (tournament.status !== "registration") {
      throw new Error("Cannot unregister after registration closes");
    }

    const participant = await ctx.db
      .query("participants")
      .withIndex("by_tournament_player", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("playerId", args.playerId)
      )
      .unique();

    if (!participant) {
      throw new Error("Player is not registered for this tournament");
    }

    await ctx.db.delete(participant._id);
    await ctx.db.patch(args.tournamentId, {
      currentPlayers: tournament.currentPlayers - 1,
    });

    return null;
  },
});

export const getParticipants = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(participantReturnValidator),
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return participants.map((p) => ({
      ...p,
      _id: p._id as string,
      tournamentId: p.tournamentId as string,
    }));
  },
});

export const getPlayerTournaments = query({
  args: { playerId: v.string() },
  returns: v.array(participantReturnValidator),
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    return participants.map((p) => ({
      ...p,
      _id: p._id as string,
      tournamentId: p.tournamentId as string,
    }));
  },
});

export const updateResult = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    playerId: v.string(),
    wins: v.optional(v.number()),
    losses: v.optional(v.number()),
    tiebreaker: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_tournament_player", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("playerId", args.playerId)
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found");
    }

    const updates: any = {};
    if (args.wins !== undefined) updates.wins = args.wins;
    if (args.losses !== undefined) updates.losses = args.losses;
    if (args.tiebreaker !== undefined) updates.tiebreaker = args.tiebreaker;

    await ctx.db.patch(participant._id, updates);
    return null;
  },
});

export const eliminate = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    playerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_tournament_player", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("playerId", args.playerId)
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found");
    }

    await ctx.db.patch(participant._id, { eliminated: true });
    return null;
  },
});

export const checkIn = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    playerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_tournament_player", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("playerId", args.playerId)
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found");
    }

    await ctx.db.patch(participant._id, { checkedIn: true });
    return null;
  },
});
