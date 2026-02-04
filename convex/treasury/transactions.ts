/**
 * Treasury Transaction Management
 *
 * Track and query treasury transactions.
 * Requires admin role.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Validators
const transactionTypeValidator = v.union(
  v.literal("fee_received"),
  v.literal("distribution"),
  v.literal("liquidity_add"),
  v.literal("liquidity_remove"),
  v.literal("transfer_internal"),
  v.literal("transfer_external")
);

const transactionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("submitted"),
  v.literal("confirmed"),
  v.literal("failed")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List transactions with filtering
 */
export const listTransactions = query({
  args: {
    walletId: v.optional(v.id("treasuryWallets")),
    type: v.optional(transactionTypeValidator),
    status: v.optional(transactionStatusValidator),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit || 50;
    const offset = args.offset || 0;

    let transactions: Doc<"treasuryTransactions">[];

    if (args.walletId) {
      const walletId = args.walletId;
      transactions = await ctx.db
        .query("treasuryTransactions")
        .withIndex("by_wallet", (q) => q.eq("walletId", walletId))
        .order("desc")
        .collect();
    } else if (args.status) {
      const status = args.status;
      transactions = await ctx.db
        .query("treasuryTransactions")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    } else if (args.type) {
      const type = args.type;
      transactions = await ctx.db
        .query("treasuryTransactions")
        .withIndex("by_type", (q) => q.eq("type", type))
        .order("desc")
        .collect();
    } else {
      transactions = await ctx.db
        .query("treasuryTransactions")
        .withIndex("by_created")
        .order("desc")
        .collect();
    }

    // Apply additional filters
    if (args.walletId && args.status) {
      transactions = transactions.filter((t) => t.status === args.status);
    }
    if (args.walletId && args.type) {
      transactions = transactions.filter((t) => t.type === args.type);
    }
    if (args.status && args.type) {
      transactions = transactions.filter((t) => t.type === args.type);
    }

    // Pagination
    const total = transactions.length;
    transactions = transactions.slice(offset, offset + limit);

    // Enrich with wallet data
    const enrichedTxs = await Promise.all(
      transactions.map(async (tx) => {
        const wallet = await ctx.db.get(tx.walletId);
        return {
          ...tx,
          walletName: wallet?.name || "Unknown",
          walletAddress: wallet?.address || "",
        };
      })
    );

    return {
      transactions: enrichedTxs,
      total,
      limit,
      offset,
    };
  },
});

/**
 * Get a single transaction
 */
export const getTransaction = query({
  args: {
    transactionId: v.id("treasuryTransactions"),
  },
  handler: async (ctx, { transactionId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const tx = await ctx.db.get(transactionId);
    if (!tx) return null;

    const wallet = await ctx.db.get(tx.walletId);

    return {
      ...tx,
      walletName: wallet?.name || "Unknown",
      walletAddress: wallet?.address || "",
    };
  },
});

/**
 * Get transaction by signature
 */
export const getBySignature = query({
  args: {
    signature: v.string(),
  },
  handler: async (ctx, { signature }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("treasuryTransactions")
      .withIndex("by_signature", (q) => q.eq("signature", signature))
      .first();
  },
});

/**
 * Get transaction stats
 */
export const getStats = query({
  args: {
    walletId: v.optional(v.id("treasuryWallets")),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const daysBack = args.daysBack || 30;
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    let transactions: Doc<"treasuryTransactions">[];
    if (args.walletId) {
      const walletId = args.walletId;
      transactions = await ctx.db
        .query("treasuryTransactions")
        .withIndex("by_wallet", (q) => q.eq("walletId", walletId))
        .collect();
    } else {
      transactions = await ctx.db.query("treasuryTransactions").collect();
    }

    // Filter by date
    transactions = transactions.filter((t) => t.createdAt >= cutoff);

    // Calculate stats
    const byType = {
      fee_received: 0,
      distribution: 0,
      liquidity_add: 0,
      liquidity_remove: 0,
      transfer_internal: 0,
      transfer_external: 0,
    };

    const byStatus = {
      pending: 0,
      submitted: 0,
      confirmed: 0,
      failed: 0,
    };

    let totalVolume = 0;

    for (const tx of transactions) {
      byType[tx.type as keyof typeof byType]++;
      byStatus[tx.status as keyof typeof byStatus]++;
      if (tx.status === "confirmed") {
        totalVolume += tx.amount;
      }
    }

    return {
      totalTransactions: transactions.length,
      totalVolume,
      byType,
      byStatus,
      daysBack,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Record an incoming fee
 */
export const recordFeeReceived = mutation({
  args: {
    walletId: v.id("treasuryWallets"),
    amount: v.number(),
    tokenMint: v.string(),
    signature: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const txId = await ctx.db.insert("treasuryTransactions", {
      walletId: args.walletId,
      type: "fee_received",
      amount: args.amount,
      tokenMint: args.tokenMint,
      signature: args.signature,
      status: "confirmed",
      metadata: args.metadata,
      createdAt: Date.now(),
      confirmedAt: Date.now(),
    });

    return txId;
  },
});

/**
 * Create a distribution transaction (pending approval)
 */
export const createDistribution = mutation({
  args: {
    walletId: v.id("treasuryWallets"),
    amount: v.number(),
    tokenMint: v.string(),
    recipientAddress: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const txId = await ctx.db.insert("treasuryTransactions", {
      walletId: args.walletId,
      type: "distribution",
      amount: args.amount,
      tokenMint: args.tokenMint,
      status: "pending",
      metadata: {
        recipientAddress: args.recipientAddress,
        reason: args.reason,
      },
      initiatedBy: userId,
      createdAt: Date.now(),
    });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "treasury.distribution.create",
      metadata: {
        transactionId: txId,
        walletId: args.walletId,
        amount: args.amount,
        recipient: args.recipientAddress,
      },
      success: true,
    });

    return txId;
  },
});

/**
 * Approve a pending transaction
 */
export const approveTransaction = mutation({
  args: {
    transactionId: v.id("treasuryTransactions"),
  },
  handler: async (ctx, { transactionId }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const tx = await ctx.db.get(transactionId);
    if (!tx) {
      throw new Error("Transaction not found");
    }

    if (tx.status !== "pending") {
      throw new Error("Transaction is not pending");
    }

    // Add approver
    const approvers = tx.approvedBy || [];
    if (!approvers.includes(userId)) {
      approvers.push(userId);
    }

    await ctx.db.patch(transactionId, {
      approvedBy: approvers,
    });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "treasury.transaction.approve",
      metadata: {
        transactionId,
        approverCount: approvers.length,
      },
      success: true,
    });

    return { success: true, approverCount: approvers.length };
  },
});

/**
 * Update transaction status
 */
export const updateStatus = mutation({
  args: {
    transactionId: v.id("treasuryTransactions"),
    status: transactionStatusValidator,
    signature: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.signature) {
      updates["signature"] = args.signature;
    }

    if (args.errorMessage) {
      updates["errorMessage"] = args.errorMessage;
    }

    if (args.status === "confirmed") {
      updates["confirmedAt"] = Date.now();
    }

    await ctx.db.patch(args.transactionId, updates);

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "treasury.transaction.update_status",
      metadata: {
        transactionId: args.transactionId,
        newStatus: args.status,
      },
      success: true,
    });

    return { success: true };
  },
});

// =============================================================================
// Internal Mutations (for webhooks/actions)
// =============================================================================

/**
 * Record transaction from webhook
 */
export const recordFromWebhook = internalMutation({
  args: {
    walletAddress: v.string(),
    type: transactionTypeValidator,
    amount: v.number(),
    tokenMint: v.string(),
    signature: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Find wallet by address
    const wallet = await ctx.db
      .query("treasuryWallets")
      .withIndex("by_address", (q) => q.eq("address", args.walletAddress))
      .first();

    if (!wallet) {
      console.warn(`No treasury wallet found for address: ${args.walletAddress}`);
      return null;
    }

    // Check for duplicate
    const existing = await ctx.db
      .query("treasuryTransactions")
      .withIndex("by_signature", (q) => q.eq("signature", args.signature))
      .first();

    if (existing) {
      return existing._id;
    }

    // Insert transaction
    const txId = await ctx.db.insert("treasuryTransactions", {
      walletId: wallet._id,
      type: args.type,
      amount: args.amount,
      tokenMint: args.tokenMint,
      signature: args.signature,
      status: "confirmed",
      metadata: args.metadata,
      createdAt: Date.now(),
      confirmedAt: Date.now(),
    });

    return txId;
  },
});
