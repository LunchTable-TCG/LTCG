import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const tournamentFields = {
  name: v.string(),
  description: v.optional(v.string()),
  format: v.literal("single_elimination"),
  maxPlayers: v.union(v.literal(4), v.literal(8), v.literal(16), v.literal(32)),
  entryFee: v.number(),
  mode: v.union(v.literal("ranked"), v.literal("casual")),
  prizePool: v.object({
    first: v.number(),
    second: v.number(),
    thirdFourth: v.number(),
  }),
  registrationStartsAt: v.number(),
  registrationEndsAt: v.number(),
  checkInStartsAt: v.number(),
  checkInEndsAt: v.number(),
  scheduledStartAt: v.number(),
  createdBy: v.string(),
  creatorType: v.optional(v.union(v.literal("admin"), v.literal("user"))),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  joinCode: v.optional(v.string()),
  autoStartOnFull: v.optional(v.boolean()),
  expiresAt: v.optional(v.number()),
};

const tournamentReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  format: v.literal("single_elimination"),
  maxPlayers: v.union(v.literal(4), v.literal(8), v.literal(16), v.literal(32)),
  entryFee: v.number(),
  mode: v.union(v.literal("ranked"), v.literal("casual")),
  prizePool: v.object({
    first: v.number(),
    second: v.number(),
    thirdFourth: v.number(),
  }),
  status: v.union(
    v.literal("registration"),
    v.literal("checkin"),
    v.literal("active"),
    v.literal("completed"),
    v.literal("cancelled")
  ),
  registrationStartsAt: v.number(),
  registrationEndsAt: v.number(),
  checkInStartsAt: v.number(),
  checkInEndsAt: v.number(),
  scheduledStartAt: v.number(),
  actualStartedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  currentRound: v.number(),
  totalRounds: v.optional(v.number()),
  registeredCount: v.number(),
  checkedInCount: v.number(),
  winnerId: v.optional(v.string()),
  winnerUsername: v.optional(v.string()),
  secondPlaceId: v.optional(v.string()),
  secondPlaceUsername: v.optional(v.string()),
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  creatorType: v.optional(v.union(v.literal("admin"), v.literal("user"))),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  joinCode: v.optional(v.string()),
  autoStartOnFull: v.optional(v.boolean()),
  expiresAt: v.optional(v.number()),
});

export const create = mutation({
  args: tournamentFields,
  returns: v.string(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("tournaments", {
      ...args,
      status: "registration",
      currentRound: 0,
      registeredCount: 0,
      checkedInCount: 0,
      createdAt: now,
      updatedAt: now,
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
    const [registration, checkin, active] = await Promise.all([
      ctx.db
        .query("tournaments")
        .withIndex("by_status", (q) => q.eq("status", "registration"))
        .collect(),
      ctx.db
        .query("tournaments")
        .withIndex("by_status", (q) => q.eq("status", "checkin"))
        .collect(),
      ctx.db
        .query("tournaments")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect(),
    ]);

    const tournaments = [...registration, ...checkin, ...active];

    return tournaments.map((t) => ({
      ...t,
      _id: t._id as string,
    }));
  },
});

export const getByCreator = query({
  args: {
    createdBy: v.string(),
    status: v.optional(v.union(
      v.literal("registration"),
      v.literal("checkin"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
  },
  returns: v.array(tournamentReturnValidator),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("tournaments")
      .withIndex("by_creator", (q) => {
        const base = q.eq("createdBy", args.createdBy);
        return args.status ? base.eq("status", args.status) : base;
      });

    const tournaments = await query.collect();

    return tournaments.map((t) => ({
      ...t,
      _id: t._id as string,
    }));
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("tournaments"),
    status: v.union(
      v.literal("registration"),
      v.literal("checkin"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error(`Tournament not found: ${args.id}`);
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateSettings = mutation({
  args: {
    id: v.id("tournaments"),
    settings: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      registrationStartsAt: v.optional(v.number()),
      registrationEndsAt: v.optional(v.number()),
      checkInStartsAt: v.optional(v.number()),
      checkInEndsAt: v.optional(v.number()),
      scheduledStartAt: v.optional(v.number()),
      visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
      autoStartOnFull: v.optional(v.boolean()),
      expiresAt: v.optional(v.number()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error(`Tournament not found: ${args.id}`);
    }
    await ctx.db.patch(args.id, {
      ...args.settings,
      updatedAt: Date.now(),
    });
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
    await ctx.db.patch(args.id, {
      currentRound: currentRound + 1,
      updatedAt: Date.now(),
    });
    return null;
  },
});
