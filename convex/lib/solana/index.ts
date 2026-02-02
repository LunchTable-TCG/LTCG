/**
 * Solana Utilities for LTCG Token Integration
 *
 * This module provides utilities for interacting with Solana blockchain:
 * - RPC connection management
 * - SPL token balance queries
 * - Unsigned transaction building for frontend signing
 *
 * @module convex/lib/solana
 *
 * @example
 * ```typescript
 * import {
 *   getConnection,
 *   getSPLTokenBalance,
 *   buildTokenTransferTransaction,
 * } from "./lib/solana";
 *
 * // Check balance
 * const balance = await getSPLTokenBalance(walletAddress);
 *
 * // Build purchase transaction
 * const tx = await buildTokenTransferTransaction({
 *   from: buyerWallet,
 *   to: sellerWallet,
 *   amount: 100,
 * });
 * ```
 */

// Connection utilities
export {
  getConnection,
  clearConnectionCache,
  getRpcUrl,
  type SolanaNetwork,
} from "./connection";

// Token balance utilities
export {
  getSPLTokenBalance,
  getAssociatedTokenAddress,
  hasEnoughTokens,
  toRawAmount,
  fromRawAmount,
  type TokenBalanceResult,
} from "./tokenBalance";

// Transaction building utilities
export {
  createTokenTransferInstruction,
  createAssociatedTokenAccountInstruction,
  buildTokenTransferTransaction,
  buildMarketplacePurchaseTransaction,
  deserializeTransaction,
  type TokenTransferParams,
  type TokenTransferResult,
} from "./tokenTransfer";
