/**
 * Gem Purchases Module
 *
 * Handles purchasing gems with native token.
 * Includes price oracle integration and transaction verification.
 */

import { literals } from "convex-helpers/validators";
import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
import { action, internalMutation, internalQuery, query } from "../_generated/server";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { mutation } from "../functions";
import { ELIZAOS_TOKEN, GEM_PACKAGES, TOKEN } from "../lib/constants";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { adjustPlayerCurrencyHelper } from "./economy";

// =============================================================================
// Token Configuration
// =============================================================================

/**
 * Check if a token mint address is the ElizaOS token
 */
function isElizaOSToken(tokenMint: string): boolean {
  return tokenMint === ELIZAOS_TOKEN.MINT_ADDRESS;
}

/**
 * Calculate price with ElizaOS discount applied
 * @param usdCents - Original price in USD cents
 * @param tokenMint - Token mint address (ElizaOS gets discount)
 * @returns Discounted price in USD cents
 */
function applyElizaOSDiscount(usdCents: number, tokenMint: string): number {
  if (isElizaOSToken(tokenMint)) {
    const discountMultiplier = 1 - ELIZAOS_TOKEN.PAYMENT_DISCOUNT_PERCENT;
    return Math.round(usdCents * discountMultiplier);
  }
  return usdCents;
}

// =============================================================================
// Price Oracle
// =============================================================================

/** Cached token price to avoid excessive API calls */
let cachedTokenPrice: { usdCents: number; timestamp: number } | null = null;

/**
 * Fetch token price from Jupiter API (primary) or Birdeye (fallback)
 * Returns price in USD cents (e.g., 150 = $1.50)
 */
async function fetchTokenPriceFromOracle(): Promise<number> {
  const mintAddress = TOKEN.MINT_ADDRESS;

  if (!mintAddress) {
    // If no token configured, use a placeholder price for testing
    return 100; // $1.00
  }

  try {
    // Try Jupiter Price API first
    const jupiterResponse = await fetch(`https://price.jup.ag/v6/price?ids=${mintAddress}`);

    if (jupiterResponse.ok) {
      const data = await jupiterResponse.json();
      const price = data.data?.[mintAddress]?.price;
      if (price && typeof price === "number") {
        return Math.round(price * 100); // Convert to cents
      }
    }
  } catch {
    // Jupiter failed, try Birdeye
  }

  try {
    // Fallback to Birdeye
    const birdeyeResponse = await fetch(
      `https://public-api.birdeye.so/defi/price?address=${mintAddress}`,
      {
        headers: {
          "X-API-KEY": process.env["BIRDEYE_API_KEY"] || "",
        },
      }
    );

    if (birdeyeResponse.ok) {
      const data = await birdeyeResponse.json();
      const price = data.data?.value;
      if (price && typeof price === "number") {
        return Math.round(price * 100);
      }
    }
  } catch {
    // Birdeye also failed
  }

  throw new Error("Failed to fetch token price from oracles");
}

/**
 * Get current token price with caching
 */
export const getTokenPrice = action({
  args: {},
  returns: v.object({
    usdCents: v.number(),
    cachedAt: v.number(),
    fresh: v.boolean(),
  }),
  handler: async () => {
    const now = Date.now();

    // Check cache
    if (cachedTokenPrice && now - cachedTokenPrice.timestamp < TOKEN.PRICE_CACHE_TTL_MS) {
      return {
        usdCents: cachedTokenPrice.usdCents,
        cachedAt: cachedTokenPrice.timestamp,
        fresh: false,
      };
    }

    // Fetch fresh price
    const usdCents = await fetchTokenPriceFromOracle();
    cachedTokenPrice = { usdCents, timestamp: now };

    return {
      usdCents,
      cachedAt: now,
      fresh: true,
    };
  },
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all available gem packages with calculated token prices
 * Includes both native token and ElizaOS token prices (with 10% discount)
 */
export const getGemPackages = query({
  args: {},
  returns: v.array(
    v.object({
      packageId: v.optional(v.string()),
      name: v.string(),
      gems: v.number(),
      usdCents: v.optional(v.number()),
      usdPrice: v.optional(v.number()),
      elizaOSPrice: v.number(),
      elizaOSDiscountPercent: v.number(),
      bonusPercent: v.optional(v.number()),
      isActive: v.boolean(),
      sortOrder: v.number(),
      _id: v.optional(v.id("gemPackages")),
      _creationTime: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    // Get packages from database if seeded, otherwise use constants
    const dbPackages = await ctx.db
      .query("gemPackages")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const discountPercent = ELIZAOS_TOKEN.PAYMENT_DISCOUNT_PERCENT * 100;

    if (dbPackages.length > 0) {
      return dbPackages
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((pkg) => ({
          ...pkg,
          elizaOSPrice: applyElizaOSDiscount(pkg.usdPrice, ELIZAOS_TOKEN.MINT_ADDRESS),
          elizaOSDiscountPercent: discountPercent,
        }));
    }

    // Fallback to constants
    return GEM_PACKAGES.map((pkg: { id: string; name: string; gems: number; usdCents: number; bonus: number }, idx: number) => ({
      packageId: pkg.id,
      name: pkg.name,
      gems: pkg.gems,
      usdCents: pkg.usdCents,
      elizaOSPrice: applyElizaOSDiscount(pkg.usdCents, ELIZAOS_TOKEN.MINT_ADDRESS),
      elizaOSDiscountPercent: discountPercent,
      bonusPercent: pkg.bonus,
      isActive: true,
      sortOrder: idx,
    }));
  },
});

/**
 * Get user's gem purchase history
 */
export const getGemPurchaseHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("tokenGemPurchases"),
      _creationTime: v.number(),
      userId: v.id("users"),
      packageId: v.string(),
      gemsReceived: v.number(),
      usdValue: v.number(),
      tokenAmount: v.number(),
      tokenPriceUsd: v.number(),
      solanaSignature: v.string(),
      status: literals("pending", "confirmed", "failed", "expired"),
      createdAt: v.number(),
      confirmedAt: v.optional(v.number()),
      failureReason: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("tokenGemPurchases")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get pending gem purchases for user
 */
export const getPendingPurchases = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("tokenGemPurchases"),
      _creationTime: v.number(),
      userId: v.id("users"),
      packageId: v.string(),
      gemsReceived: v.number(),
      usdValue: v.number(),
      tokenAmount: v.number(),
      tokenPriceUsd: v.number(),
      solanaSignature: v.string(),
      status: literals("pending", "confirmed", "failed", "expired"),
      createdAt: v.number(),
      confirmedAt: v.optional(v.number()),
      failureReason: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    return await ctx.db
      .query("tokenGemPurchases")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a pending gem purchase
 * Called before the user signs the blockchain transaction
 */
export const createPendingPurchase = mutation({
  args: {
    packageId: v.string(),
    tokenAmount: v.number(),
    tokenPriceUsd: v.number(),
    expectedSignature: v.optional(v.string()),
  },
  returns: v.object({
    purchaseId: v.id("tokenGemPurchases"),
    gemsToReceive: v.number(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Validate package exists
    const pkg = GEM_PACKAGES.find((p: typeof GEM_PACKAGES[number]) => p.id === args.packageId);
    if (!pkg) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: `Unknown gem package: ${args.packageId}`,
      });
    }

    // Validate slippage - token amount should be within tolerance
    const expectedTokenAmount = (pkg.usdCents * 1_000_000) / args.tokenPriceUsd; // In smallest unit
    const slippageTolerance = TOKEN.SLIPPAGE_TOLERANCE;
    const minAmount = expectedTokenAmount * (1 - slippageTolerance);
    const maxAmount = expectedTokenAmount * (1 + slippageTolerance);

    if (args.tokenAmount < minAmount || args.tokenAmount > maxAmount) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: "Token amount outside slippage tolerance",
      });
    }

    // Create pending purchase
    const purchaseId = await ctx.db.insert("tokenGemPurchases", {
      userId,
      packageId: args.packageId,
      gemsReceived: pkg.gems,
      usdValue: pkg.usdCents,
      tokenAmount: args.tokenAmount,
      tokenPriceUsd: args.tokenPriceUsd,
      solanaSignature: args.expectedSignature ?? "",
      status: "pending",
      createdAt: Date.now(),
    });

    return {
      purchaseId,
      gemsToReceive: pkg.gems,
      expiresAt: Date.now() + TOKEN.GEM_PURCHASE_TIMEOUT_MS,
    };
  },
});

/**
 * Update signature on pending purchase
 */
export const updatePurchaseSignature = mutation({
  args: {
    purchaseId: v.id("tokenGemPurchases"),
    solanaSignature: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      throw createError(ErrorCode.ECONOMY_TRANSACTION_NOT_FOUND);
    }

    if (purchase.userId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN);
    }

    if (purchase.status !== "pending") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Purchase is not pending",
      });
    }

    await ctx.db.patch(args.purchaseId, {
      solanaSignature: args.solanaSignature,
    });

    return { success: true };
  },
});

/**
 * Internal mutation to confirm a gem purchase after blockchain verification
 */
export const confirmPurchaseInternal = internalMutation({
  args: {
    purchaseId: v.id("tokenGemPurchases"),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      throw createError(ErrorCode.ECONOMY_TRANSACTION_NOT_FOUND);
    }

    if (purchase.status !== "pending") {
      return { success: false, reason: "Purchase already processed" };
    }

    // Mark as confirmed
    await ctx.db.patch(args.purchaseId, {
      status: "confirmed",
      confirmedAt: Date.now(),
    });

    // Credit gems to user
    await adjustPlayerCurrencyHelper(ctx, {
      userId: purchase.userId,
      gemsDelta: purchase.gemsReceived,
      transactionType: "purchase",
      description: `Purchased ${purchase.gemsReceived} gems with token`,
      referenceId: args.purchaseId,
      metadata: {
        packageId: purchase.packageId,
        tokenAmount: purchase.tokenAmount,
        price: purchase.usdValue,
      },
    });

    return { success: true, gemsCredited: purchase.gemsReceived };
  },
});

/**
 * Internal mutation to fail a gem purchase
 */
export const failPurchaseInternal = internalMutation({
  args: {
    purchaseId: v.id("tokenGemPurchases"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) return;

    if (purchase.status !== "pending") return;

    await ctx.db.patch(args.purchaseId, {
      status: "failed",
      failureReason: args.reason,
    });
  },
});

/**
 * Internal query to get purchase by signature
 */
export const getPurchaseBySignature = internalQuery({
  args: {
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tokenGemPurchases")
      .withIndex("by_signature", (q) => q.eq("solanaSignature", args.signature))
      .first();
  },
});

/** Result type for verifyAndConfirmPurchase */
type VerifyResult = { success: boolean; reason?: string; gemsCredited?: number };

/**
 * Action to verify Solana transaction and confirm gem purchase
 * This should be called by a webhook or scheduled job after transaction is submitted
 */
export const verifyAndConfirmPurchase = action({
  args: {
    solanaSignature: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    reason: v.optional(v.string()),
    gemsCredited: v.optional(v.number()),
  }),
  handler: async (ctx, args): Promise<VerifyResult> => {
    // Get purchase by signature
    const purchase = await ctx.runQuery(internalAny.economy.gemPurchases.getPurchaseBySignature, {
      signature: args.solanaSignature,
    });

    if (!purchase) {
      throw new Error("Purchase not found for signature");
    }

    if (purchase.status !== "pending") {
      return { success: false, reason: "Purchase already processed" };
    }

    // Verify transaction on Solana
    const rpcUrl = TOKEN.MINT_ADDRESS
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com";

    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignatureStatuses",
          params: [[args.solanaSignature], { searchTransactionHistory: true }],
        }),
      });

      const data = await response.json();
      const status = data.result?.value?.[0];

      if (!status) {
        // Transaction not found yet, may need to retry
        return { success: false, reason: "Transaction not found on chain" };
      }

      if (status.err) {
        // Transaction failed
        await ctx.runMutation(internalAny.economy.gemPurchases.failPurchaseInternal, {
          purchaseId: purchase._id,
          reason: "Transaction failed on chain",
        });
        return { success: false, reason: "Transaction failed" };
      }

      if (status.confirmationStatus === "finalized" || status.confirmationStatus === "confirmed") {
        // Transaction confirmed - credit gems
        const confirmResult = await ctx.runMutation(
          internalAny.economy.gemPurchases.confirmPurchaseInternal,
          {
            purchaseId: purchase._id,
          }
        );
        return confirmResult;
      }

      return { success: false, reason: "Transaction not yet confirmed" };
    } catch {
      return { success: false, reason: "Failed to verify transaction" };
    }
  },
});

/**
 * Cancel expired pending purchases (cleanup job)
 */
export const cleanupExpiredPurchases = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expiryTime = Date.now() - TOKEN.GEM_PURCHASE_TIMEOUT_MS;

    const expiredPurchases = await ctx.db
      .query("tokenGemPurchases")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("createdAt"), expiryTime))
      .take(100);

    for (const purchase of expiredPurchases) {
      await ctx.db.patch(purchase._id, {
        status: "failed",
      });
    }

    return { cleaned: expiredPurchases.length };
  },
});

// =============================================================================
// x402 Payment Protocol
// =============================================================================

/**
 * Credit gems from x402 payment
 * Called by HTTP shop endpoint after x402 payment is verified by facilitator
 *
 * Supports both native token and ElizaOS token payments.
 * ElizaOS token payments receive a 10% discount.
 *
 * @internal Used by convex/http/shop.ts
 */
export const creditGemsFromX402 = internalMutation({
  args: {
    payerWallet: v.string(),
    transactionSignature: v.string(),
    packageId: v.string(),
    gemsAmount: v.number(),
    usdValueCents: v.number(),
    tokenAmount: v.string(),
    tokenMint: v.optional(v.string()), // Token mint address (defaults to native token)
    userId: v.union(v.id("users"), v.null()),
    agentId: v.union(v.id("agents"), v.null()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate transaction (idempotency)
    const existingPayment = await ctx.db
      .query("x402Payments")
      .withIndex("by_signature", (q) => q.eq("transactionSignature", args.transactionSignature))
      .first();

    if (existingPayment) {
      throw new Error("Transaction already processed");
    }

    // Find user by wallet address if not provided
    let userId = args.userId;
    if (!userId) {
      // Try to find user by wallet
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("walletAddress"), args.payerWallet))
        .first();
      userId = user?._id ?? null;
    }

    // If still no user and we have an agentId, get the agent's user
    if (!userId && args.agentId) {
      const agent = await ctx.db.get(args.agentId);
      userId = agent?.userId ?? null;
    }

    if (!userId) {
      throw new Error(
        "Could not determine user for gem credit. Wallet not associated with any user."
      );
    }

    // Determine which token was used for payment
    const tokenMint = args.tokenMint ?? TOKEN.MINT_ADDRESS;
    const usedElizaOS = isElizaOSToken(tokenMint);

    // Calculate effective price (with discount if ElizaOS token)
    const effectiveUsdCents = applyElizaOSDiscount(args.usdValueCents, tokenMint);

    // Record x402 payment for audit trail
    await ctx.db.insert("x402Payments", {
      transactionSignature: args.transactionSignature,
      payerWallet: args.payerWallet,
      recipientWallet: TOKEN.TREASURY_WALLET,
      amount: Number(args.tokenAmount),
      tokenMint,
      network:
        process.env["SOLANA_NETWORK"] === "devnet"
          ? "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
          : "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      resourcePath: "/api/agents/shop/gems",
      resourceDescription: `Gem purchase: ${args.packageId} (${args.gemsAmount} gems)${usedElizaOS ? " [ElizaOS 10% discount]" : ""}`,
      userId,
      agentId: args.agentId ?? undefined,
      purchaseType: "gems",
      status: "settled",
      verifiedAt: Date.now(),
      createdAt: Date.now(),
    });

    // Credit gems to user
    const currencyResult = await adjustPlayerCurrencyHelper(ctx, {
      userId,
      gemsDelta: args.gemsAmount,
      transactionType: "purchase",
      description: `Purchased ${args.gemsAmount} gems via x402${usedElizaOS ? " (ElizaOS discount)" : ""}`,
      referenceId: args.transactionSignature,
      metadata: {
        packageId: args.packageId,
        paymentMethod: "x402",
        usdValueCents: args.usdValueCents,
        effectiveUsdCents,
        tokenAmount: args.tokenAmount,
        tokenMint,
        elizaOSDiscount: usedElizaOS,
      },
    });

    return {
      success: true,
      newBalance: currencyResult.gems,
      gemsCredited: args.gemsAmount,
      usedElizaOS,
      discountApplied: usedElizaOS ? ELIZAOS_TOKEN.PAYMENT_DISCOUNT_PERCENT * 100 : 0,
    };
  },
});
