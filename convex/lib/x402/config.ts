/**
 * x402 Runtime Configuration
 *
 * Provides runtime access to x402 payment configuration,
 * querying the database for treasury wallet settings.
 * Falls back to environment variables if database values aren't set.
 */

import type { ActionCtx } from "../../_generated/server";
import { TOKEN } from "../constants";
import { X402_CONFIG } from "./constants";

// Helper to get internal API without triggering TS2589
// eslint-disable-next-line @typescript-eslint/no-require-imports
function getInternalApi() {
  return require("../../_generated/api").internal;
}

// biome-ignore lint/suspicious/noExplicitAny: Avoids TS2589 deep instantiation
type DbCtx = { db: any };

// biome-ignore lint/suspicious/noExplicitAny: Avoids TS2589 deep instantiation
type RunQueryCtx = { runQuery: any };

/**
 * Check if context has direct database access
 */
function hasDb(ctx: unknown): ctx is DbCtx {
  return typeof ctx === "object" && ctx !== null && "db" in ctx;
}

/**
 * Check if context has runQuery (ActionCtx)
 */
function hasRunQuery(ctx: unknown): ctx is RunQueryCtx {
  return typeof ctx === "object" && ctx !== null && "runQuery" in ctx;
}

/**
 * Get the x402 treasury wallet address
 *
 * Priority:
 * 1. Active fee_collection treasury wallet from database
 * 2. X402_TREASURY_WALLET environment variable
 * 3. LTCG_TREASURY_WALLET environment variable
 *
 * @param ctx - Convex context with database access (QueryCtx, MutationCtx, or ActionCtx)
 * @returns Treasury wallet address or empty string if not configured
 */
export async function getX402TreasuryWallet(ctx: ActionCtx | DbCtx): Promise<string> {
  try {
    if (hasDb(ctx)) {
      // Direct database access (QueryCtx or MutationCtx)
      const treasuryWallet = await ctx.db
        .query("treasuryWallets")
        .withIndex("by_purpose", (q: { eq: (field: string, value: string) => unknown }) =>
          q.eq("purpose", "fee_collection")
        )
        .filter(
          (q: {
            eq: (field: unknown, value: string) => unknown;
            field: (name: string) => unknown;
          }) => q.eq(q.field("status"), "active")
        )
        .first();

      if (treasuryWallet?.address) {
        return treasuryWallet.address;
      }
    } else if (hasRunQuery(ctx)) {
      // ActionCtx - use runQuery to call internal query
      const result = await ctx.runQuery(getInternalApi().lib.x402.queries.getTreasuryWallet, {});
      if (result?.address) {
        return result.address;
      }
    }
  } catch {
    // Database query failed - fall back to env vars
  }

  // Fall back to environment variables
  return process.env["X402_TREASURY_WALLET"] || TOKEN.TREASURY_WALLET || "";
}

/**
 * Get the x402 token mint address
 *
 * Priority:
 * 1. X402_TOKEN_MINT environment variable
 * 2. LTCG_TOKEN_MINT environment variable
 *
 * Token mint is always from env vars since it's network-specific
 *
 * @returns Token mint address or empty string if not configured
 */
export function getX402TokenMint(): string {
  return process.env["X402_TOKEN_MINT"] || TOKEN.MINT_ADDRESS || "";
}

/**
 * Get complete x402 payment configuration
 *
 * @param ctx - Convex context with database access
 * @returns Configuration object for x402 payments
 */
export async function getX402PaymentConfig(ctx: ActionCtx | DbCtx): Promise<{
  treasuryWallet: string;
  tokenMint: string;
  facilitatorUrl: string;
  network: string;
  isConfigured: boolean;
}> {
  const treasuryWallet = await getX402TreasuryWallet(ctx);
  const tokenMint = getX402TokenMint();

  return {
    treasuryWallet,
    tokenMint,
    facilitatorUrl: X402_CONFIG.FACILITATOR_URL,
    network: X402_CONFIG.NETWORK,
    isConfigured: Boolean(treasuryWallet && tokenMint),
  };
}

/**
 * Check if x402 payments are properly configured
 *
 * @param ctx - Convex context with database access
 * @returns True if all required settings are configured
 */
export async function isX402Configured(ctx: ActionCtx | DbCtx): Promise<boolean> {
  const config = await getX402PaymentConfig(ctx);
  return config.isConfigured;
}
