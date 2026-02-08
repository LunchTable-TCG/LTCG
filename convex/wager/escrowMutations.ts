import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

// ============================================================================
// ESCROW MUTATION HELPERS
// ============================================================================
// Internal mutations called by escrow.ts actions and HTTP handlers.
// These run in the Convex (non-Node) runtime and handle database operations.

/**
 * Record a crypto wager transaction in the cryptoWagerTransactions table.
 * Called by escrow actions after deposit, payout, or treasury fee events.
 */
export const recordTransaction = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    userId: v.id("users"),
    walletAddress: v.string(),
    type: v.union(v.literal("deposit"), v.literal("payout"), v.literal("treasury_fee")),
    currency: v.union(v.literal("sol"), v.literal("usdc")),
    amount: v.number(),
    amountAtomic: v.string(),
    txSignature: v.optional(v.string()),
    escrowPda: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("cryptoWagerTransactions", {
      lobbyId: args.lobbyId,
      userId: args.userId,
      walletAddress: args.walletAddress,
      type: args.type,
      currency: args.currency,
      amount: args.amount,
      amountAtomic: args.amountAtomic,
      txSignature: args.txSignature,
      escrowPda: args.escrowPda,
      status: args.status,
      createdAt: args.createdAt,
    });
  },
});

/**
 * Record a deposit from the wager-join HTTP endpoint.
 * Convenience wrapper over recordTransaction with auto-confirmed status.
 */
export const recordDeposit = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    userId: v.id("users"),
    walletAddress: v.string(),
    type: v.literal("deposit"),
    currency: v.union(v.literal("sol"), v.literal("usdc")),
    amount: v.number(),
    amountAtomic: v.string(),
    txSignature: v.optional(v.string()),
    escrowPda: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("cryptoWagerTransactions", {
      lobbyId: args.lobbyId,
      userId: args.userId,
      walletAddress: args.walletAddress,
      type: args.type,
      currency: args.currency,
      amount: args.amount,
      amountAtomic: args.amountAtomic,
      txSignature: args.txSignature,
      escrowPda: args.escrowPda,
      status: args.txSignature ? "confirmed" : "pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * Update lobby with the escrow PDA address after onchain initialization.
 */
export const updateLobbyEscrowPda = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cryptoEscrowPda: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.lobbyId, {
      cryptoEscrowPda: args.cryptoEscrowPda,
    });
  },
});

/**
 * Mark the host's crypto deposit as confirmed on the lobby.
 */
export const updateLobbyHostDeposited = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.lobbyId, {
      cryptoHostDeposited: true,
    });
  },
});

/**
 * Store winner/loser IDs on the lobby for settlement retry.
 * Called before scheduling settleEscrow so the retry cron can re-derive args.
 */
export const storeSettlementParams = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    winnerId: v.id("users"),
    loserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.lobbyId, {
      cryptoSettlementWinnerId: args.winnerId,
      cryptoSettlementLoserId: args.loserId,
    });
  },
});

/**
 * Mark the escrow as settled and record the settlement transaction signature.
 */
export const updateLobbySettled = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cryptoSettleTxSig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.lobbyId, {
      cryptoSettled: true,
      cryptoSettleTxSig: args.cryptoSettleTxSig,
    });
  },
});
