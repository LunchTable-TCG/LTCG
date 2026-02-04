/**
 * x402 Payment Protocol Type Definitions
 *
 * Types for the x402 protocol v2, an open standard for internet-native payments.
 * Enables AI agents to autonomously make micropayments using Solana SPL tokens.
 *
 * @see https://www.x402.org/
 * @see https://docs.cdp.coinbase.com/x402/welcome
 */

// =============================================================================
// Protocol Version
// =============================================================================

/** Current x402 protocol version */
export const X402_VERSION = 2 as const;

// =============================================================================
// Resource Types
// =============================================================================

/** Resource information for payment context */
export interface ResourceInfo {
  /** Resource URL or path */
  url: string;
  /** Human-readable description of the resource */
  description?: string;
  /** MIME type of the resource (if applicable) */
  mimeType?: string;
}

// =============================================================================
// Payment Requirements (Server → Client)
// =============================================================================

/** Extra metadata for payment requirements */
export interface PaymentRequirementsExtra {
  /** Token name for display */
  name?: string;
  /** Description of what the payment is for */
  description?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Payment requirements for a single payment option
 * Sent by server in PAYMENT-REQUIRED header
 */
export interface PaymentRequirements {
  /** Payment scheme - currently only "exact" is supported */
  scheme: "exact";
  /** Network in CAIP-2 format (e.g., "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp") */
  network: string;
  /** Amount in atomic units (e.g., lamports for SOL, smallest unit for SPL) */
  amount: string;
  /** Token mint address (SPL token) */
  asset: string;
  /** Recipient wallet address */
  payTo: string;
  /** Maximum time in seconds for payment to be valid */
  maxTimeoutSeconds: number;
  /** Optional extra metadata */
  extra?: PaymentRequirementsExtra;
}

/**
 * Payment Required response structure
 * Returned with HTTP 402 status and encoded in PAYMENT-REQUIRED header
 */
export interface PaymentRequired {
  /** Protocol version */
  x402Version: typeof X402_VERSION;
  /** Error message if payment cannot be accepted */
  error?: string;
  /** Resource being requested */
  resource?: ResourceInfo;
  /** Accepted payment methods (usually one) */
  accepts: PaymentRequirements[];
  /** Protocol extensions */
  extensions?: Record<string, unknown>;
}

// =============================================================================
// Payment Payload (Client → Server)
// =============================================================================

/** Solana-specific payment payload */
export interface SolanaPaymentPayload {
  /** Base64-encoded signed Solana transaction */
  transaction: string;
  /** Optional message or memo */
  message?: string;
}

/**
 * Payment payload sent by client
 * Sent in PAYMENT-SIGNATURE header as base64-encoded JSON
 */
export interface PaymentPayload {
  /** Protocol version */
  x402Version: typeof X402_VERSION;
  /** Resource being accessed */
  resource?: ResourceInfo;
  /** The payment requirements being fulfilled */
  accepted: PaymentRequirements;
  /** The actual payment data */
  payload: SolanaPaymentPayload;
  /** Protocol extensions */
  extensions?: Record<string, unknown>;
}

// =============================================================================
// Facilitator Types
// =============================================================================

/** Request to verify a payment with the facilitator */
export interface VerifyRequest {
  /** Payment payload from client */
  paymentPayload: PaymentPayload;
  /** Expected payment requirements */
  paymentRequirements: PaymentRequirements;
}

/** Response from facilitator verification */
export interface VerifyResponse {
  /** Whether the payment is valid */
  isValid: boolean;
  /** Wallet address that made the payment */
  payer?: string;
  /** Payment scheme used */
  scheme?: string;
  /** Network the payment was made on */
  network?: string;
  /** Reason for invalid payment */
  invalidReason?: string;
  /** Solana transaction signature (if settled) */
  transactionSignature?: string;
}

/** Request to settle a payment with the facilitator */
export interface SettleRequest {
  /** Payment payload from client */
  paymentPayload: PaymentPayload;
  /** Expected payment requirements */
  paymentRequirements: PaymentRequirements;
}

/** Response from facilitator settlement */
export interface SettleResponse {
  /** Whether settlement succeeded */
  success: boolean;
  /** Solana transaction signature */
  transactionSignature?: string;
  /** Error message if settlement failed */
  error?: string;
}

// =============================================================================
// Endpoint Configuration
// =============================================================================

/** Configuration for a payment-required endpoint */
export interface PaymentEndpointConfig {
  /** Human-readable description of what the payment is for */
  description: string;
  /** Amount in human-readable format (will be converted to atomic units) */
  amount: number;
  /** Optional recipient override (defaults to treasury wallet) */
  recipient?: string;
  /** Optional custom token mint (defaults to LTCG token) */
  tokenMint?: string;
  /** Optional metadata for tracking */
  metadata?: Record<string, string>;
}

// =============================================================================
// Payment Result
// =============================================================================

/** Result of payment verification */
export interface X402PaymentResult {
  /** Whether the payment was valid */
  valid: boolean;
  /** Wallet address that made the payment */
  payer?: string;
  /** Transaction signature */
  signature?: string;
  /** Error message if invalid */
  error?: string;
}

// =============================================================================
// Database Types
// =============================================================================

/** Purchase types for tracking */
export type X402PurchaseType = "gems" | "pack" | "box" | "other";

/** Payment status */
export type X402PaymentStatus = "verified" | "settled" | "failed";
