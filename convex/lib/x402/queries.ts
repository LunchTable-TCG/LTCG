/**
 * x402 Internal Queries
 *
 * Internal queries for x402 payment configuration that can be called
 * from HTTP actions via ctx.runQuery().
 */

import { internalQuery } from "../../_generated/server";
import { TOKEN } from "../constants";

/**
 * Get the active fee_collection treasury wallet address
 *
 * @internal Called by x402 middleware to get payment recipient
 */
export const getTreasuryWallet = internalQuery({
  args: {},
  handler: async (ctx) => {
    try {
      const treasuryWallet = await ctx.db
        .query("treasuryWallets")
        .withIndex("by_purpose", (q) => q.eq("purpose", "fee_collection"))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (treasuryWallet?.address) {
        return { address: treasuryWallet.address, source: "database" as const };
      }
    } catch {
      // Database query failed
    }

    // Fall back to environment variables
    const envWallet = process.env["X402_TREASURY_WALLET"] || TOKEN.TREASURY_WALLET || "";
    return { address: envWallet, source: "environment" as const };
  },
});

/**
 * Check if x402 is properly configured
 *
 * @internal Called by x402 middleware to verify configuration
 */
export const checkX402Config = internalQuery({
  args: {},
  handler: async (ctx) => {
    const treasuryResult = await ctx.db
      .query("treasuryWallets")
      .withIndex("by_purpose", (q) => q.eq("purpose", "fee_collection"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    const treasuryWallet =
      treasuryResult?.address || process.env["X402_TREASURY_WALLET"] || TOKEN.TREASURY_WALLET || "";

    const tokenMint = process.env["X402_TOKEN_MINT"] || TOKEN.MINT_ADDRESS || "";

    return {
      isConfigured: Boolean(treasuryWallet && tokenMint),
      treasuryWallet: treasuryWallet ? `${treasuryWallet.slice(0, 8)}...` : null,
      tokenMint: tokenMint ? `${tokenMint.slice(0, 8)}...` : null,
      source: treasuryResult ? "database" : "environment",
    };
  },
});
