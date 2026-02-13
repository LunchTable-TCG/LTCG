import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const escrowReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  gameId: v.string(),
  player1Id: v.string(),
  player2Id: v.string(),
  amount: v.number(),
  currency: v.string(),
  status: v.string(),
  player1Deposited: v.boolean(),
  player2Deposited: v.boolean(),
  winnerId: v.optional(v.string()),
  settledAt: v.optional(v.number()),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
  metadata: v.optional(v.any()),
});

export const createEscrow = mutation({
  args: {
    gameId: v.string(),
    player1Id: v.string(),
    player2Id: v.string(),
    amount: v.number(),
    currency: v.string(),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("escrows", {
      gameId: args.gameId,
      player1Id: args.player1Id,
      player2Id: args.player2Id,
      amount: args.amount,
      currency: args.currency,
      status: "pending",
      player1Deposited: false,
      player2Deposited: false,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      metadata: args.metadata,
    });
    return id as string;
  },
});

export const getEscrow = query({
  args: { id: v.id("escrows") },
  returns: v.union(escrowReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const escrow = await ctx.db.get(args.id);
    if (!escrow) return null;
    return { ...escrow, _id: escrow._id as string };
  },
});

export const getEscrowForGame = query({
  args: { gameId: v.string() },
  returns: v.union(escrowReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const escrow = await ctx.db
      .query("escrows")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();
    if (!escrow) return null;
    return { ...escrow, _id: escrow._id as string };
  },
});

export const releaseToWinner = mutation({
  args: {
    escrowId: v.id("escrows"),
    winnerId: v.string(),
    txSignature: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const escrow = await ctx.db.get(args.escrowId);
    if (!escrow) {
      throw new Error(`Escrow not found: ${args.escrowId}`);
    }

    if (escrow.status !== "funded") {
      throw new Error(`Escrow must be funded to release. Current status: ${escrow.status}`);
    }

    if (args.winnerId !== escrow.player1Id && args.winnerId !== escrow.player2Id) {
      throw new Error(`Winner must be one of the escrow players`);
    }

    const settledAt = Date.now();

    // Update escrow status
    await ctx.db.patch(args.escrowId, {
      status: "settled",
      winnerId: args.winnerId,
      settledAt,
    });

    // Record payout transaction
    await ctx.db.insert("wagerTransactions", {
      escrowId: args.escrowId,
      playerId: args.winnerId,
      type: "payout",
      amount: escrow.amount * 2, // Winner gets both deposits
      currency: escrow.currency,
      txSignature: args.txSignature,
      timestamp: settledAt,
      metadata: { gameId: escrow.gameId },
    });

    return null;
  },
});

export const refundEscrow = mutation({
  args: {
    escrowId: v.id("escrows"),
    txSignature1: v.optional(v.string()),
    txSignature2: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const escrow = await ctx.db.get(args.escrowId);
    if (!escrow) {
      throw new Error(`Escrow not found: ${args.escrowId}`);
    }

    if (escrow.status === "settled" || escrow.status === "refunded") {
      throw new Error(`Escrow already ${escrow.status}`);
    }

    const refundedAt = Date.now();

    // Update escrow status
    await ctx.db.patch(args.escrowId, {
      status: "refunded",
      settledAt: refundedAt,
    });

    // Refund player 1 if they deposited
    if (escrow.player1Deposited) {
      await ctx.db.insert("wagerTransactions", {
        escrowId: args.escrowId,
        playerId: escrow.player1Id,
        type: "refund",
        amount: escrow.amount,
        currency: escrow.currency,
        txSignature: args.txSignature1,
        timestamp: refundedAt,
        metadata: { gameId: escrow.gameId },
      });
    }

    // Refund player 2 if they deposited
    if (escrow.player2Deposited) {
      await ctx.db.insert("wagerTransactions", {
        escrowId: args.escrowId,
        playerId: escrow.player2Id,
        type: "refund",
        amount: escrow.amount,
        currency: escrow.currency,
        txSignature: args.txSignature2,
        timestamp: refundedAt,
        metadata: { gameId: escrow.gameId },
      });
    }

    return null;
  },
});

export const getPlayerEscrows = query({
  args: {
    playerId: v.string(),
    status: v.optional(v.string()),
  },
  returns: v.array(escrowReturnValidator),
  handler: async (ctx, args) => {
    // Get escrows where player is player1
    const player1Escrows = await ctx.db
      .query("escrows")
      .withIndex("by_player1", (q) => q.eq("player1Id", args.playerId))
      .collect();

    // Get escrows where player is player2
    const player2Escrows = await ctx.db
      .query("escrows")
      .withIndex("by_player2", (q) => q.eq("player2Id", args.playerId))
      .collect();

    // Combine and deduplicate
    const allEscrows = [...player1Escrows, ...player2Escrows];
    const uniqueEscrows = Array.from(
      new Map(allEscrows.map((e) => [e._id, e])).values()
    );

    // Filter by status if provided
    const filteredEscrows = args.status
      ? uniqueEscrows.filter((e) => e.status === args.status)
      : uniqueEscrows;

    return filteredEscrows.map((escrow) => ({
      ...escrow,
      _id: escrow._id as string,
    }));
  },
});

export const markDeposited = mutation({
  args: {
    escrowId: v.id("escrows"),
    playerId: v.string(),
    txSignature: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const escrow = await ctx.db.get(args.escrowId);
    if (!escrow) {
      throw new Error(`Escrow not found: ${args.escrowId}`);
    }

    if (escrow.status !== "pending" && escrow.status !== "funded") {
      throw new Error(`Cannot deposit to escrow with status: ${escrow.status}`);
    }

    const timestamp = Date.now();
    const updates: any = {};

    // Mark the appropriate player as deposited
    if (args.playerId === escrow.player1Id) {
      if (escrow.player1Deposited) {
        throw new Error("Player 1 has already deposited");
      }
      updates.player1Deposited = true;
    } else if (args.playerId === escrow.player2Id) {
      if (escrow.player2Deposited) {
        throw new Error("Player 2 has already deposited");
      }
      updates.player2Deposited = true;
    } else {
      throw new Error("Player not part of this escrow");
    }

    // If both players have now deposited, mark as funded
    const bothDeposited =
      (args.playerId === escrow.player1Id ? true : escrow.player1Deposited) &&
      (args.playerId === escrow.player2Id ? true : escrow.player2Deposited);

    if (bothDeposited) {
      updates.status = "funded";
    }

    await ctx.db.patch(args.escrowId, updates);

    // Record deposit transaction
    await ctx.db.insert("wagerTransactions", {
      escrowId: args.escrowId,
      playerId: args.playerId,
      type: "deposit",
      amount: escrow.amount,
      currency: escrow.currency,
      txSignature: args.txSignature,
      timestamp,
      metadata: { gameId: escrow.gameId },
    });

    return null;
  },
});
