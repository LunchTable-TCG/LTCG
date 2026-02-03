/**
 * Treasury Wallet Management
 *
 * CRUD operations for treasury wallets using Privy Server Wallet API.
 * Requires admin role.
 */

import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Validators
const walletPurposeValidator = v.union(
  v.literal("fee_collection"),
  v.literal("distribution"),
  v.literal("liquidity"),
  v.literal("reserves")
);

const walletStatusValidator = v.union(
  v.literal("active"),
  v.literal("frozen"),
  v.literal("archived")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List all treasury wallets
 */
export const listWallets = query({
  args: {
    purpose: v.optional(walletPurposeValidator),
    status: v.optional(walletStatusValidator),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    let wallets;
    if (args.purpose) {
      wallets = await ctx.db
        .query("treasuryWallets")
        .withIndex("by_purpose", (q) => q.eq("purpose", args.purpose!))
        .collect();
    } else if (args.status) {
      wallets = await ctx.db
        .query("treasuryWallets")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      wallets = await ctx.db.query("treasuryWallets").collect();
    }

    // Filter by status if both filters provided
    if (args.purpose && args.status) {
      wallets = wallets.filter((w) => w.status === args.status);
    }

    return wallets;
  },
});

/**
 * Get a single wallet by ID
 */
export const getWallet = query({
  args: {
    walletId: v.id("treasuryWallets"),
  },
  handler: async (ctx, { walletId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db.get(walletId);
  },
});

/**
 * Get wallet by address
 */
export const getWalletByAddress = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("treasuryWallets")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();
  },
});

/**
 * Get treasury overview stats
 */
export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const wallets = await ctx.db
      .query("treasuryWallets")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Calculate totals
    const totalSolBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    const totalTokenBalance = wallets.reduce((sum, w) => sum + (w.tokenBalance || 0), 0);

    // Count by purpose
    const byPurpose = {
      fee_collection: wallets.filter((w) => w.purpose === "fee_collection").length,
      distribution: wallets.filter((w) => w.purpose === "distribution").length,
      liquidity: wallets.filter((w) => w.purpose === "liquidity").length,
      reserves: wallets.filter((w) => w.purpose === "reserves").length,
    };

    // Get recent transactions
    const recentTxs = await ctx.db
      .query("treasuryTransactions")
      .withIndex("by_created")
      .order("desc")
      .take(10);

    // Get pending transactions
    const pendingTxs = await ctx.db
      .query("treasuryTransactions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return {
      totalWallets: wallets.length,
      totalSolBalance,
      totalTokenBalance,
      byPurpose,
      recentTransactions: recentTxs,
      pendingTransactions: pendingTxs.length,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new treasury wallet
 * This initiates the Privy wallet creation process
 */
export const createWallet = mutation({
  args: {
    name: v.string(),
    purpose: walletPurposeValidator,
    policyId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Schedule the Privy wallet creation action
    const walletId = await ctx.db.insert("treasuryWallets", {
      privyWalletId: "", // Will be updated by action
      address: "", // Will be updated by action
      name: args.name,
      purpose: args.purpose,
      policyId: args.policyId,
      status: "active",
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Schedule the Privy API call
    await ctx.scheduler.runAfter(0, internal.treasury.wallets.createPrivyWallet, {
      walletDbId: walletId,
      policyId: args.policyId,
    });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "treasury.wallet.create",
      metadata: {
        walletId,
        name: args.name,
        purpose: args.purpose,
      },
      success: true,
    });

    return walletId;
  },
});

/**
 * Update wallet metadata
 */
export const updateWallet = mutation({
  args: {
    walletId: v.id("treasuryWallets"),
    name: v.optional(v.string()),
    policyId: v.optional(v.string()),
    status: v.optional(walletStatusValidator),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates["name"] = args.name;
    if (args.policyId !== undefined) updates["policyId"] = args.policyId;
    if (args.status !== undefined) updates["status"] = args.status;

    await ctx.db.patch(args.walletId, updates);

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "treasury.wallet.update",
      metadata: {
        walletId: args.walletId,
        updates,
      },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Sync wallet balance from Solana
 */
export const syncBalance = mutation({
  args: {
    walletId: v.id("treasuryWallets"),
  },
  handler: async (ctx, { walletId }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const wallet = await ctx.db.get(walletId);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Schedule the balance sync action
    await ctx.scheduler.runAfter(0, internal.treasury.wallets.syncWalletBalance, {
      walletDbId: walletId,
      address: wallet.address,
    });

    return { success: true, message: "Balance sync scheduled" };
  },
});

// =============================================================================
// Internal Mutations (called by actions)
// =============================================================================

/**
 * Update wallet with Privy data after creation
 */
export const updateWithPrivyData = internalMutation({
  args: {
    walletDbId: v.id("treasuryWallets"),
    privyWalletId: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.walletDbId, {
      privyWalletId: args.privyWalletId,
      address: args.address,
    });
  },
});

/**
 * Update wallet balance
 */
export const updateBalance = internalMutation({
  args: {
    walletDbId: v.id("treasuryWallets"),
    balance: v.number(),
    tokenBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.walletDbId, {
      balance: args.balance,
      tokenBalance: args.tokenBalance,
      lastSyncedAt: Date.now(),
    });
  },
});

// =============================================================================
// Internal Actions (Privy API calls)
// =============================================================================

/**
 * Create wallet via Privy Server Wallet API
 */
export const createPrivyWallet = internalAction({
  args: {
    walletDbId: v.id("treasuryWallets"),
    policyId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const PRIVY_APP_ID = process.env["PRIVY_APP_ID"];
    const PRIVY_APP_SECRET = process.env["PRIVY_APP_SECRET"];

    if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
      console.error("Privy credentials not configured");
      return;
    }

    try {
      // Create wallet via Privy API
      const response = await fetch("https://api.privy.io/v1/wallets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-app-id": PRIVY_APP_ID,
          Authorization: `Basic ${Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString("base64")}`,
        },
        body: JSON.stringify({
          chain_type: "solana",
          policy_ids: args.policyId ? [args.policyId] : [],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Privy wallet creation failed:", error);
        return;
      }

      const wallet = await response.json();

      // Update the database with Privy data
      await ctx.runMutation(internal.treasury.wallets.updateWithPrivyData, {
        walletDbId: args.walletDbId,
        privyWalletId: wallet.id,
        address: wallet.address,
      });

      console.log(`Treasury wallet created: ${wallet.address}`);
    } catch (error) {
      console.error("Failed to create Privy wallet:", error);
    }
  },
});

/**
 * Sync wallet balance from Solana RPC
 */
export const syncWalletBalance = internalAction({
  args: {
    walletDbId: v.id("treasuryWallets"),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const { getSPLTokenBalance } = await import("../lib/solana/tokenBalance");
    const { getConnection } = await import("../lib/solana/connection");

    try {
      const connection = getConnection();

      // Get SOL balance
      const { PublicKey } = await import("@solana/web3.js");
      const pubkey = new PublicKey(args.address);
      const solBalance = await connection.getBalance(pubkey);

      // Get token balance
      let tokenBalance = 0;
      try {
        const tokenResult = await getSPLTokenBalance(args.address);
        tokenBalance = tokenResult.rawBalance ? Number(tokenResult.rawBalance) : 0;
      } catch {
        // Token account may not exist yet
        tokenBalance = 0;
      }

      // Update database
      await ctx.runMutation(internal.treasury.wallets.updateBalance, {
        walletDbId: args.walletDbId,
        balance: solBalance,
        tokenBalance,
      });

      console.log(`Synced balance for ${args.address}: ${solBalance} lamports, ${tokenBalance} tokens`);
    } catch (error) {
      console.error("Failed to sync wallet balance:", error);
    }
  },
});
