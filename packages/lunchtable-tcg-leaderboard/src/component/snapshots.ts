import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const snapshotValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  boardId: v.string(),
  entries: v.array(
    v.object({
      playerId: v.string(),
      playerName: v.optional(v.string()),
      score: v.number(),
      rank: v.number(),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
    })
  ),
  takenAt: v.number(),
  period: v.string(),
  metadata: v.optional(v.any()),
});

export const createSnapshot = mutation({
  args: {
    boardId: v.string(),
    period: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board_score", (q) => q.eq("boardId", args.boardId))
      .order("desc")
      .collect();

    const snapshotEntries = entries.map((entry, index) => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      score: entry.score,
      rank: index + 1,
      wins: entry.wins,
      losses: entry.losses,
    }));

    const id = await ctx.db.insert("snapshots", {
      boardId: args.boardId,
      entries: snapshotEntries,
      takenAt: Date.now(),
      period: args.period,
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const getSnapshots = query({
  args: {
    boardId: v.string(),
    period: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.array(snapshotValidator),
  handler: async (ctx, args) => {
    let snapshotsQuery = ctx.db
      .query("snapshots")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId));

    if (args.period) {
      snapshotsQuery = ctx.db
        .query("snapshots")
        .withIndex("by_board_period", (q) =>
          q.eq("boardId", args.boardId).eq("period", args.period)
        );
    }

    let snapshots = await snapshotsQuery.collect();

    if (args.startDate !== undefined) {
      snapshots = snapshots.filter((s) => s.takenAt >= args.startDate!);
    }

    if (args.endDate !== undefined) {
      snapshots = snapshots.filter((s) => s.takenAt <= args.endDate!);
    }

    return snapshots
      .sort((a, b) => b.takenAt - a.takenAt)
      .map((snapshot) => ({
        ...snapshot,
        _id: snapshot._id as string,
      }));
  },
});

export const getSnapshotById = query({
  args: {
    id: v.id("snapshots"),
  },
  returns: v.union(snapshotValidator, v.null()),
  handler: async (ctx, args) => {
    const snapshot = await ctx.db.get(args.id);
    if (!snapshot) return null;
    return {
      ...snapshot,
      _id: snapshot._id as string,
    };
  },
});
