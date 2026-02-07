/**
 * Cached Solana RPC Actions
 *
 * Internal actions used as sources for ActionCache.
 * These wrap raw Solana RPC calls so their results can be cached.
 */

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { ELIZAOS_TOKEN, SOLANA } from "../constants";
import { getSPLTokenBalance } from "./tokenBalance";

/**
 * Fetch SPL token balance (used by tokenBalanceCache)
 * Returns serializable result (BigInt converted to string)
 */
export const fetchTokenBalance = internalAction({
  args: {
    walletAddress: v.string(),
    tokenMint: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const result = await getSPLTokenBalance(args.walletAddress, args.tokenMint);
    return {
      balance: result.balance,
      rawBalance: result.rawBalance.toString(),
      decimals: result.decimals,
      accountExists: result.accountExists,
    };
  },
});

/**
 * Fetch ElizaOS token balance (used by elizaOSBalanceCache)
 * Makes direct Solana RPC call for getTokenAccountsByOwner
 */
export const fetchElizaOSBalance = internalAction({
  args: {
    walletAddress: v.string(),
  },
  handler: async (_ctx, args) => {
    const rpcUrl = SOLANA.RPC_URL;

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          args.walletAddress,
          { mint: ELIZAOS_TOKEN.MINT_ADDRESS },
          { encoding: "jsonParsed" },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const accounts = data.result?.value ?? [];

    if (accounts.length === 0) {
      return { balance: 0 };
    }

    let totalBalance = 0;
    for (const account of accounts) {
      const tokenAmount = account.account?.data?.parsed?.info?.tokenAmount;
      if (tokenAmount) {
        totalBalance += Number(tokenAmount.amount);
      }
    }

    return { balance: totalBalance };
  },
});
