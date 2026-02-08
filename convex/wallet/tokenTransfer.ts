/**
 * Token Transfer Actions
 *
 * Convex actions for building token transfer transactions.
 * Transactions are built on the backend and signed on the frontend with Privy.
 */

import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internal = (generatedApi as any).internal;
import { action, internalAction } from "../_generated/server";
import { RetryConfig, actionRetrier } from "../infrastructure/actionRetrier";
import { buildTokenTransferTransaction } from "../lib/solana/tokenTransfer";

/**
 * Build an unsigned LTCG token transfer transaction (with retry logic)
 *
 * Creates a transaction that can be signed by the frontend using Privy.
 * The transaction is returned as a base64-encoded string.
 *
 * Flow:
 * 1. Frontend calls this action with transfer details
 * 2. Backend builds unsigned transaction with recent blockhash (retries on RPC failures)
 * 3. Frontend decodes base64 → Uint8Array
 * 4. Frontend signs with Privy's signAndSendTransaction
 *
 * @param from - Sender wallet address (must match authenticated user's wallet)
 * @param to - Recipient wallet address
 * @param amount - Amount to transfer in human-readable format (e.g., 100 = 100 LTCG)
 * @returns Unsigned transaction (base64) and metadata
 */
export const buildTransferTransaction = action({
  args: {
    from: v.string(),
    to: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate addresses (basic format check)
    const addressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!addressRegex.test(args.from)) {
      throw new Error("Invalid sender address format");
    }
    if (!addressRegex.test(args.to)) {
      throw new Error("Invalid recipient address format");
    }

    // Validate amount
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // Prevent self-transfers
    if (args.from === args.to) {
      throw new Error("Cannot transfer to yourself");
    }

    // Use action retrier for RPC calls
    const runId = await actionRetrier.run(
      ctx,
      internal.wallet.tokenTransfer._buildTransferTransactionInternal,
      args,
      RetryConfig.solanaRpc
    );

    return { runId };
  },
});

/**
 * Internal action that performs the actual RPC call
 */
export const _buildTransferTransactionInternal = internalAction({
  args: {
    from: v.string(),
    to: v.string(),
    amount: v.number(),
  },
  returns: v.object({
    transaction: v.string(),
    description: v.string(),
    totalAmount: v.number(),
    blockhash: v.string(),
    lastValidBlockHeight: v.number(),
  }),
  handler: async (_ctx, args) => {
    // Build the unsigned transaction (includes RPC call for blockhash)
    const result = await buildTokenTransferTransaction({
      from: args.from,
      to: args.to,
      amount: args.amount,
      createRecipientAta: true, // Create recipient's token account if needed
    });

    return result;
  },
});
