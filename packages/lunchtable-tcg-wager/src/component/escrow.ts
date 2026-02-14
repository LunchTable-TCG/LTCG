import { v } from "convex/values";

/**
 * Escrow functions for crypto wagers.
 *
 * NOTE: Escrow state is now tracked in the parent gameLobbies table fields:
 * - cryptoHostDeposited, cryptoOpponentDeposited
 * - cryptoSettled, cryptoSettleTxSig, cryptoSettlementWinnerId
 *
 * This component only tracks transactions in cryptoWagerTransactions.
 * Escrow management functions have been moved to the parent schema
 * since components cannot directly access parent tables.
 *
 * For escrow operations, use the functions in the parent schema's
 * gameplay/crypto module instead.
 */

// Placeholder to prevent import errors - all escrow logic moved to parent schema
export const _placeholder = v.null();
