/**
 * x402 Payment Protocol Configuration
 *
 * Constants for the x402 payment protocol integration.
 * Uses PayAI as the facilitator for payment verification and settlement.
 *
 * @see https://www.x402.org/
 * @see https://facilitator.payai.network/
 */

import { SOLANA, TOKEN } from "../constants";

/**
 * CAIP-2 Network Identifiers for Solana
 * @see https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
 */
export const SOLANA_CAIP2 = {
  /** Mainnet-beta chain ID */
  MAINNET: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  /** Devnet chain ID */
  DEVNET: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
} as const;

/**
 * x402 Protocol Configuration
 */
export const X402_CONFIG = {
  /** Protocol version */
  VERSION: 2,

  /**
   * Facilitator API URL
   * PayAI handles verification and settlement of x402 payments
   * Can be overridden via environment variable
   */
  FACILITATOR_URL: process.env["X402_FACILITATOR_URL"] || "https://facilitator.payai.network",

  /** HTTP Headers */
  HEADERS: {
    /** Server → Client: Payment requirements */
    PAYMENT_REQUIRED: "PAYMENT-REQUIRED",
    /** Client → Server: Payment proof */
    PAYMENT_SIGNATURE: "PAYMENT-SIGNATURE",
  },

  /** Maximum time for payment to be valid (5 minutes) */
  MAX_TIMEOUT_SECONDS: 300,

  /** Payment scheme (currently only "exact" is supported) */
  SCHEME: "exact" as const,

  /**
   * Get the CAIP-2 network identifier based on current Solana network
   */
  get NETWORK() {
    return SOLANA.NETWORK === "mainnet-beta" ? SOLANA_CAIP2.MAINNET : SOLANA_CAIP2.DEVNET;
  },

  /**
   * Treasury wallet for receiving payments
   * Falls back to TOKEN.TREASURY_WALLET from main constants
   */
  get TREASURY_WALLET() {
    return process.env["X402_TREASURY_WALLET"] || TOKEN.TREASURY_WALLET;
  },

  /**
   * Token mint address for payments
   * Falls back to TOKEN.MINT_ADDRESS from main constants
   */
  get TOKEN_MINT() {
    return process.env["X402_TOKEN_MINT"] || TOKEN.MINT_ADDRESS;
  },

  /**
   * Token decimals for amount conversion
   * Falls back to TOKEN.DECIMALS from main constants
   */
  TOKEN_DECIMALS: TOKEN.DECIMALS,

  /** Facilitator API timeout in milliseconds */
  FACILITATOR_TIMEOUT_MS: Number(process.env["X402_FACILITATOR_TIMEOUT_MS"] || 30_000),

  /** Maximum retries for facilitator API calls */
  FACILITATOR_MAX_RETRIES: Number(process.env["X402_FACILITATOR_MAX_RETRIES"] || 2),
} as const;

/**
 * x402 Error Codes
 * Standardized error codes for payment-related errors
 */
export const X402_ERROR_CODES = {
  /** No payment signature provided */
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  /** Payment verification failed */
  PAYMENT_INVALID: "PAYMENT_INVALID",
  /** Payment timed out */
  PAYMENT_EXPIRED: "PAYMENT_EXPIRED",
  /** Transaction already processed */
  PAYMENT_DUPLICATE: "PAYMENT_DUPLICATE",
  /** Payment amount doesn't match requirements */
  PAYMENT_AMOUNT_MISMATCH: "PAYMENT_AMOUNT_MISMATCH",
  /** Payment sent to wrong recipient */
  PAYMENT_RECIPIENT_MISMATCH: "PAYMENT_RECIPIENT_MISMATCH",
  /** Facilitator service unavailable */
  FACILITATOR_ERROR: "FACILITATOR_ERROR",
  /** Unsupported x402 protocol version */
  UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION",
  /** Unsupported payment scheme */
  UNSUPPORTED_SCHEME: "UNSUPPORTED_SCHEME",
  /** Unsupported network */
  UNSUPPORTED_NETWORK: "UNSUPPORTED_NETWORK",
} as const;

export type X402ErrorCode = (typeof X402_ERROR_CODES)[keyof typeof X402_ERROR_CODES];
