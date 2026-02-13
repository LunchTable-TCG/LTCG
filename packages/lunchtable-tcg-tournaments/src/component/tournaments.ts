import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const tournamentFields = {
  name: v.string(),
  description: v.optional(v.string()),
  organizerId: v.string(),
  format: v.string(),
  maxPlayers: v.number(),
  entryFee: v.optional(v.number()),
  entryCurrency: v.optional(v.string()),
  prizePool: v.optional(v.any()),
  startTime: v.number(),
  checkInDeadline: v.optional(v.number()),
  totalRounds: v.optional(v.number()),
  rules: v.optional(v.any()),
  metadata: v.optional(v.any()),
};

const tournamentReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  organizerId: v.string(),
  format: v.string(),
  maxPlayers: v.number(),
  currentPlayers: v.number(),
  entryFee: v.optional(v.number()),
  entryCurrency: v.optional(v.string()),
  prizePool: v.optional(v.any()),
  status: v.string(),
  startTime: v.number(),
  checkInDeadline: v.optional(v.number()),
  currentRound: v.optional(v.number()),
  totalRounds: v.optional(v.number()),
  rules: v.optional(v.any()),
  metadata: v.optional(v.any()),
});

export const create = mutation({
  args: tournamentFields,
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tournaments", {
      ...args,
      currentPlayers: 0,
      status: "registration",
      currentRound: 0,
    });
    return id as string;
  },
});

export const getById = query({
  args: { id: v.id("tournaments") },
  returns: v.union(tournamentReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);
    if (!tournament) return null;
    return { ...tournament, _id: tournament._id as string };
  },
});

export const getActive = query({
  args: {},
  returns: v.array(tournamentReturnValidator),
  handler: async (ctx) => {
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) =>
        q.eq("status", "registration").or("status", "check_in").or("status", "in_progress")
      )
      .collect();

    return tournaments.map((t) => ({
      ...t,
      _id: t._id as string,
    }));
  },
});

export const getByOrganizer = query({
  args: { organizerId: v.string() },
  returns: v.array(tournamentReturnValidator),
  handler: async (ctx, args) => {
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .collect();

    return tournaments.map((t) => ({
      ...t,
      _id: t._id as string,
    }));
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("tournaments"),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error(`Tournament not found: ${args.id}`);
    }
    await ctx.db.patch(args.id, { status: args.status });
    return null;
  },
});

export const updateSettings = mutation({
  args: {
    id: v.id("tournaments"),
    settings: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      maxPlayers: v.optional(v.number()),
      entryFee: v.optional(v.number()),
      entryCurrency: v.optional(v.string()),
      prizePool: v.optional(v.any()),
      startTime: v.optional(v.number()),
      checkInDeadline: v.optional(v.number()),
      totalRounds: v.optional(v.number()),
      rules: v.optional(v.any()),
      metadata: v.optional(v.any()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error(`Tournament not found: ${args.id}`);
    }
    await ctx.db.patch(args.id, args.settings);
    return null;
  },
});

export const advanceRound = mutation({
  args: {
    id: v.id("tournaments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error(`Tournament not found: ${args.id}`);
    }
    const currentRound = existing.currentRound ?? 0;
    await ctx.db.patch(args.id, { currentRound: currentRound + 1 });
    return null;
  },
});
