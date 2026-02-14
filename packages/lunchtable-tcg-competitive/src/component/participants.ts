import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const participantReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  tournamentId: v.string(),
  userId: v.string(),
  username: v.string(),
  registeredAt: v.number(),
  seedRating: v.number(),
  status: v.union(
    v.literal("registered"),
    v.literal("checked_in"),
    v.literal("active"),
    v.literal("eliminated"),
    v.literal("winner"),
    v.literal("forfeit"),
    v.literal("refunded")
  ),
  checkedInAt: v.optional(v.number()),
  currentRound: v.optional(v.number()),
  bracket: v.optional(v.number()),
  eliminatedInRound: v.optional(v.number()),
  finalPlacement: v.optional(v.number()),
  prizeAwarded: v.optional(v.number()),
  prizeAwardedAt: v.optional(v.number()),
});

export const register = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.string(),
    username: v.string(),
    seedRating: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error(`Tournament not found: ${args.tournamentId}`);
    }
    if (tournament.status !== "registration") {
      throw new Error("Tournament registration is closed");
    }
    if (tournament.registeredCount >= tournament.maxPlayers) {
      throw new Error("Tournament is full");
    }

    const existing = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      throw new Error("Player is already registered for this tournament");
    }

    const id = await ctx.db.insert("tournamentParticipants", {
      tournamentId: args.tournamentId,
      userId: args.userId,
      username: args.username,
      registeredAt: Date.now(),
      seedRating: args.seedRating,
      status: "registered",
    });

    await ctx.db.patch(args.tournamentId, {
      registeredCount: tournament.registeredCount + 1,
      updatedAt: Date.now(),
    });

    return id as string;
  },
});

export const unregister = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.string(),
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
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .unique();

    if (!participant) {
      throw new Error("Player is not registered for this tournament");
    }

    await ctx.db.delete(participant._id);
    await ctx.db.patch(args.tournamentId, {
      registeredCount: tournament.registeredCount - 1,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const getParticipants = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(participantReturnValidator),
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return participants.map((p) => ({
      ...p,
      _id: p._id as string,
      tournamentId: p.tournamentId as string,
    }));
  },
});

export const getUserTournaments = query({
  args: { userId: v.string() },
  returns: v.array(participantReturnValidator),
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return participants.map((p) => ({
      ...p,
      _id: p._id as string,
      tournamentId: p.tournamentId as string,
    }));
  },
});

export const updateStatus = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.string(),
    status: v.union(
      v.literal("registered"),
      v.literal("checked_in"),
      v.literal("active"),
      v.literal("eliminated"),
      v.literal("winner"),
      v.literal("forfeit"),
      v.literal("refunded")
    ),
    currentRound: v.optional(v.number()),
    eliminatedInRound: v.optional(v.number()),
    finalPlacement: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found");
    }

    const updates: any = { status: args.status };
    if (args.currentRound !== undefined) updates.currentRound = args.currentRound;
    if (args.eliminatedInRound !== undefined) updates.eliminatedInRound = args.eliminatedInRound;
    if (args.finalPlacement !== undefined) updates.finalPlacement = args.finalPlacement;

    await ctx.db.patch(participant._id, updates);
    return null;
  },
});

export const eliminate = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.string(),
    eliminatedInRound: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found");
    }

    await ctx.db.patch(participant._id, {
      status: "eliminated",
      eliminatedInRound: args.eliminatedInRound,
    });
    return null;
  },
});

export const checkIn = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error(`Tournament not found: ${args.tournamentId}`);
    }

    const participant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found");
    }

    await ctx.db.patch(participant._id, {
      status: "checked_in",
      checkedInAt: Date.now(),
    });

    await ctx.db.patch(args.tournamentId, {
      checkedInCount: tournament.checkedInCount + 1,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const awardPrize = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.string(),
    prizeAmount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found");
    }

    await ctx.db.patch(participant._id, {
      prizeAwarded: args.prizeAmount,
      prizeAwardedAt: Date.now(),
    });

    return null;
  },
});
