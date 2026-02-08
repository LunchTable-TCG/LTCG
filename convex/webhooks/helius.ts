/**
 * Helius Webhook Handler
 *
 * Receives real-time transaction data from Helius webhooks for pump.fun token swaps.
 * Parses transaction data and updates tokenTrades, tokenHolders, and tokenMetrics.
 */

import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { httpAction, internalMutation, internalQuery } from "../_generated/server";

type CounterAny = {
  add: (ctx: unknown, key: string, amount: number) => Promise<void>;
  set: (ctx: unknown, key: string, value: number) => Promise<void>;
};

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const tokenHolderCounterAny = (require("../infrastructure/shardedCounters") as any)
  .tokenHolderCounter as CounterAny;
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const tokenTx24hCounterAny = (require("../infrastructure/shardedCounters") as any)
  .tokenTx24hCounter as CounterAny;

// =============================================================================
// Types for Helius Webhook Payloads
// =============================================================================

interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number; // lamports
}

interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: Array<{
    userAccount: string;
    tokenAccount: string;
    rawTokenAmount: {
      tokenAmount: string;
      decimals: number;
    };
    mint: string;
  }>;
}

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  slot: number;
  nativeTransfers?: HeliusNativeTransfer[];
  tokenTransfers?: HeliusTokenTransfer[];
  accountData?: HeliusAccountData[];
  description?: string;
  events?: {
    swap?: {
      nativeInput?: {
        account: string;
        amount: string;
      };
      nativeOutput?: {
        account: string;
        amount: string;
      };
      tokenInputs?: Array<{
        userAccount: string;
        tokenAccount: string;
        rawTokenAmount: {
          tokenAmount: string;
          decimals: number;
        };
        mint: string;
      }>;
      tokenOutputs?: Array<{
        userAccount: string;
        tokenAccount: string;
        rawTokenAmount: {
          tokenAmount: string;
          decimals: number;
        };
        mint: string;
      }>;
      tokenFees?: unknown[];
      nativeFees?: unknown[];
      innerSwaps?: unknown[];
    };
  };
}

// =============================================================================
// Configuration
// =============================================================================

// Whale threshold: 1% of total supply (adjust based on your tokenomics)
const WHALE_THRESHOLD_PERCENT = 1;

// Token decimals (pump.fun tokens typically use 6)
const TOKEN_DECIMALS = 6;

// =============================================================================
// Signature Verification (using Web Crypto API for Convex runtime)
// =============================================================================

async function verifyHeliusSignature(
  payload: string,
  signature: string | null,
  secret: string | undefined
): Promise<boolean> {
  // If no secret configured, skip verification
  if (!secret) {
    return true;
  }

  // If secret configured but no signature provided, reject
  if (!signature) {
    return false;
  }

  try {
    // Use Web Crypto API (available in Convex runtime)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const data = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

// =============================================================================
// Transaction Parsing
// =============================================================================

interface ParsedSwap {
  signature: string;
  type: "buy" | "sell";
  traderAddress: string;
  tokenAmount: number;
  solAmount: number;
  pricePerToken: number;
  timestamp: number;
  tokenMint: string;
}

function parseSwapTransaction(tx: HeliusTransaction, tokenMint: string): ParsedSwap | null {
  // Check if this is a swap transaction
  if (!tx.events?.swap && tx.type !== "SWAP") {
    // Try to parse from token transfers for pump.fun
    return parseFromTransfers(tx, tokenMint);
  }

  const swap = tx.events?.swap;
  if (!swap) {
    return parseFromTransfers(tx, tokenMint);
  }

  // Determine buy vs sell based on native input/output
  const hasNativeInput = swap.nativeInput && BigInt(swap.nativeInput.amount) > 0;
  const hasNativeOutput = swap.nativeOutput && BigInt(swap.nativeOutput.amount) > 0;

  // Find token involved
  const tokenInput = swap.tokenInputs?.find((t) => t.mint === tokenMint);
  const tokenOutput = swap.tokenOutputs?.find((t) => t.mint === tokenMint);

  let type: "buy" | "sell";
  let traderAddress: string;
  let tokenAmount: number;
  let solAmount: number;

  if (hasNativeInput && tokenOutput && swap.nativeInput?.account) {
    // User sent SOL, received token = BUY
    type = "buy";
    traderAddress = swap.nativeInput.account;
    solAmount = Number(swap.nativeInput?.amount) / 1e9; // lamports to SOL
    tokenAmount = Number(tokenOutput.rawTokenAmount.tokenAmount) / 10 ** TOKEN_DECIMALS;
  } else if (tokenInput && hasNativeOutput) {
    // User sent token, received SOL = SELL
    type = "sell";
    traderAddress = tokenInput.userAccount;
    solAmount = Number(swap.nativeOutput?.amount) / 1e9;
    tokenAmount = Number(tokenInput.rawTokenAmount.tokenAmount) / 10 ** TOKEN_DECIMALS;
  } else {
    // Can't determine swap direction
    return null;
  }

  if (tokenAmount === 0 || solAmount === 0) {
    return null;
  }

  const pricePerToken = solAmount / tokenAmount;

  return {
    signature: tx.signature,
    type,
    traderAddress,
    tokenAmount,
    solAmount,
    pricePerToken,
    timestamp: tx.timestamp * 1000, // Convert to milliseconds
    tokenMint,
  };
}

function parseFromTransfers(tx: HeliusTransaction, tokenMint: string): ParsedSwap | null {
  // Parse swap from raw transfers (backup method)
  const tokenTransfers = tx.tokenTransfers?.filter((t) => t.mint === tokenMint) ?? [];
  const nativeTransfers = tx.nativeTransfers ?? [];

  if (tokenTransfers.length === 0) {
    return null;
  }

  // Find the main token transfer
  const mainTokenTransfer = tokenTransfers.reduce((max, t) =>
    t.tokenAmount > (max?.tokenAmount ?? 0) ? t : max
  );

  if (!mainTokenTransfer || mainTokenTransfer.tokenAmount === 0) {
    return null;
  }

  // Find corresponding SOL transfer
  // For buys, user sends SOL to bonding curve
  // For sells, user receives SOL from bonding curve
  const relevantNativeTransfers = nativeTransfers.filter(
    (nt) =>
      nt.fromUserAccount === mainTokenTransfer.toUserAccount ||
      nt.toUserAccount === mainTokenTransfer.fromUserAccount
  );

  if (relevantNativeTransfers.length === 0) {
    // Try to get SOL amount from account data
    const accountData = tx.accountData ?? [];
    const traderAccount = accountData.find(
      (a) =>
        a.account === mainTokenTransfer.toUserAccount ||
        a.account === mainTokenTransfer.fromUserAccount
    );

    if (!traderAccount || traderAccount.nativeBalanceChange === 0) {
      return null;
    }

    const solAmount = Math.abs(traderAccount.nativeBalanceChange) / 1e9;
    const tokenAmount = mainTokenTransfer.tokenAmount;

    // Determine buy/sell: if native balance decreased, it's a buy
    const isBuy = traderAccount.nativeBalanceChange < 0;

    return {
      signature: tx.signature,
      type: isBuy ? "buy" : "sell",
      traderAddress: isBuy ? mainTokenTransfer.toUserAccount : mainTokenTransfer.fromUserAccount,
      tokenAmount,
      solAmount,
      pricePerToken: solAmount / tokenAmount,
      timestamp: tx.timestamp * 1000,
      tokenMint,
    };
  }

  const mainNativeTransfer = relevantNativeTransfers.reduce((max, t) =>
    t.amount > (max?.amount ?? 0) ? t : max
  );

  const solAmount = mainNativeTransfer.amount / 1e9;
  const tokenAmount = mainTokenTransfer.tokenAmount;

  // Determine buy vs sell:
  // If token is going TO the user (toUserAccount is the trader), it's a BUY
  // If token is going FROM the user (fromUserAccount is the trader), it's a SELL
  const isBuy = mainNativeTransfer.fromUserAccount === mainTokenTransfer.toUserAccount;

  return {
    signature: tx.signature,
    type: isBuy ? "buy" : "sell",
    traderAddress: isBuy ? mainTokenTransfer.toUserAccount : mainTokenTransfer.fromUserAccount,
    tokenAmount,
    solAmount,
    pricePerToken: solAmount / tokenAmount,
    timestamp: tx.timestamp * 1000,
    tokenMint,
  };
}

// =============================================================================
// HTTP Actions
// =============================================================================

/**
 * Main webhook endpoint for Helius
 */
export const handleWebhook = httpAction(async (ctx, request) => {
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify signature if secret is configured
    const signature = request.headers.get("x-helius-signature");
    const webhookSecret = process.env["HELIUS_WEBHOOK_SECRET"];

    const isValid = await verifyHeliusSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error("Helius webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse payload
    let transactions: HeliusTransaction[];
    try {
      const payload = JSON.parse(rawBody);
      // Helius sends array of transactions
      transactions = Array.isArray(payload) ? payload : [payload];
    } catch {
      console.error("Failed to parse Helius webhook payload");
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get token mint from webhook config
    const webhookConfig = await ctx.runQuery(internalAny.webhooks.helius.getWebhookConfig);
    const tokenMint = webhookConfig?.tokenMint;

    if (!tokenMint) {
      console.warn("No token mint configured for Helius webhook");
      // Still record the event
      await ctx.runMutation(internalAny.alerts.webhooks.recordEvent, {
        provider: "helius",
      });
      return new Response(JSON.stringify({ processed: 0, message: "No token mint configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process transactions
    let processedCount = 0;
    let errorCount = 0;
    const processedSwaps: ParsedSwap[] = [];

    for (const tx of transactions) {
      try {
        const swap = parseSwapTransaction(tx, tokenMint);
        if (swap) {
          processedSwaps.push(swap);
          processedCount++;
        }
      } catch (err) {
        console.error(`Error parsing transaction ${tx.signature}:`, err);
        errorCount++;
      }
    }

    // Record trades
    if (processedSwaps.length > 0) {
      // Get total supply for whale detection
      const latestMetrics = await ctx.runQuery(internalAny.webhooks.helius.getLatestMetrics);
      const totalSupply = latestMetrics?.holderCount ? 1_000_000_000 : 1_000_000_000; // Default 1B

      for (const swap of processedSwaps) {
        const isWhale = (swap.tokenAmount / totalSupply) * 100 >= WHALE_THRESHOLD_PERCENT;

        // Record trade
        await ctx.runMutation(internalAny.tokenAnalytics.trades.record, {
          signature: swap.signature,
          traderAddress: swap.traderAddress,
          type: swap.type,
          tokenAmount: swap.tokenAmount,
          solAmount: swap.solAmount,
          pricePerToken: swap.pricePerToken,
          timestamp: swap.timestamp,
          isWhale,
          source: "pump.fun",
        });

        // Update holder
        await ctx.runMutation(internalAny.webhooks.helius.updateHolderFromTrade, {
          address: swap.traderAddress,
          type: swap.type,
          tokenAmount: swap.tokenAmount,
        });
      }

      // Update metrics with latest price
      const latestSwap = processedSwaps[processedSwaps.length - 1];
      if (latestSwap) {
        await ctx.runMutation(internalAny.webhooks.helius.updateMetricsFromSwap, {
          price: latestSwap.pricePerToken,
          timestamp: latestSwap.timestamp,
        });
      }
    }

    // Record webhook event
    await ctx.runMutation(internalAny.alerts.webhooks.recordEvent, {
      provider: "helius",
    });

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        processingTimeMs: processingTime,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Helius webhook error:", error);

    // Record error
    await ctx.runMutation(internalAny.alerts.webhooks.recordError, {
      provider: "helius",
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Health check endpoint for Helius webhook
 */
export const healthCheck = httpAction(async () => {
  return new Response(
    JSON.stringify({
      status: "ok",
      provider: "helius",
      timestamp: Date.now(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});

// =============================================================================
// Internal Queries/Mutations for Webhook Processing
// =============================================================================

/**
 * Get webhook config for Helius
 */
export const getWebhookConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("webhookConfig")
      .withIndex("by_provider", (q) => q.eq("provider", "helius"))
      .first();
  },
});

/**
 * Get latest token metrics
 */
export const getLatestMetrics = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tokenMetrics").order("desc").first();
  },
});

/**
 * Update holder balance from trade
 */
export const updateHolderFromTrade = internalMutation({
  args: {
    address: v.string(),
    type: v.union(v.literal("buy"), v.literal("sell")),
    tokenAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tokenHolders")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    const now = Date.now();

    if (existing) {
      const oldBalance = existing.balance;
      const newBalance =
        args.type === "buy"
          ? existing.balance + args.tokenAmount
          : Math.max(0, existing.balance - args.tokenAmount);

      const newTotalBought =
        args.type === "buy" ? existing.totalBought + args.tokenAmount : existing.totalBought;

      const newTotalSold =
        args.type === "sell" ? existing.totalSold + args.tokenAmount : existing.totalSold;

      // Track holder count changes when balance crosses zero threshold
      if (oldBalance === 0 && newBalance > 0) {
        // New holder (balance went from 0 to positive)
        await tokenHolderCounterAny.add(ctx, "global", 1);
      } else if (oldBalance > 0 && newBalance === 0) {
        // Lost holder (balance went from positive to 0)
        await tokenHolderCounterAny.add(ctx, "global", -1);
      }

      // If balance goes to 0, we could delete the holder
      // But keeping for history is often better
      await ctx.db.patch(existing._id, {
        balance: newBalance,
        totalBought: newTotalBought,
        totalSold: newTotalSold,
        lastActivityAt: now,
      });
    } else if (args.type === "buy") {
      // New holder
      await ctx.db.insert("tokenHolders", {
        address: args.address,
        balance: args.tokenAmount,
        percentOwnership: 0, // Will be calculated in rollup
        firstPurchaseAt: now,
        lastActivityAt: now,
        totalBought: args.tokenAmount,
        totalSold: 0,
        isPlatformWallet: false,
      });

      // Increment holder count for new holder
      await tokenHolderCounterAny.add(ctx, "global", 1);
    }

    // Increment 24h transaction counter on each trade
    await tokenTx24hCounterAny.add(ctx, "global", 1);
  },
});

/**
 * Reset 24h transaction counter
 * Called daily by cron job
 */
export const reset24hTxCounter = internalMutation({
  args: {},
  handler: async (ctx) => {
    await tokenTx24hCounterAny.set(ctx, "global", 0);
  },
});

/**
 * Update metrics from swap data
 */
export const updateMetricsFromSwap = internalMutation({
  args: {
    price: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Get latest metrics to carry forward unchanged values
    const latest = await ctx.db.query("tokenMetrics").order("desc").first();

    // Get current holder count
    const holders = await ctx.db.query("tokenHolders").collect();
    const holderCount = holders.filter((h) => h.balance > 0).length;

    // Calculate market cap (assuming 1B total supply with 6 decimals)
    const totalSupply = 1_000_000_000;
    const marketCap = args.price * totalSupply;

    // Get SOL price in USD (would normally fetch from oracle/API)
    // Using placeholder - in production, fetch from Pyth or similar
    const solPriceUsd = latest?.priceUsd && latest?.price ? latest.priceUsd / latest.price : 150;
    const priceUsd = args.price * solPriceUsd;

    // Calculate bonding curve progress (pump.fun graduates at ~$90k market cap)
    const targetMarketCapUsd = 90000;
    const currentMarketCapUsd = marketCap * solPriceUsd;
    const bondingCurveProgress = Math.min(100, (currentMarketCapUsd / targetMarketCapUsd) * 100);

    await ctx.db.insert("tokenMetrics", {
      timestamp: args.timestamp,
      price: args.price,
      priceUsd,
      marketCap,
      volume24h: latest?.volume24h ?? 0,
      txCount24h: latest?.txCount24h ?? 0,
      holderCount,
      liquidity: latest?.liquidity ?? 0,
      bondingCurveProgress,
      graduationEta: latest?.graduationEta,
    });
  },
});
