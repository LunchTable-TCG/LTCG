/**
 * Crypto Wager Tier Constants
 *
 * Defines the fixed wager tiers for SOL and USDC crypto wagers.
 * These tiers are enforced both on the frontend (UI) and backend (validation).
 *
 * The gold wager system (free-form amounts) is separate and unchanged.
 */

// ============================================================================
// TIER DEFINITIONS
// ============================================================================

export const SOL_WAGER_TIERS = [0.001, 0.01, 0.05, 0.1, 1] as const;
export const USDC_WAGER_TIERS = [1, 5, 10, 25, 100] as const;

export type WagerCurrency = "sol" | "usdc";

// ============================================================================
// TOKEN CONFIGURATION
// ============================================================================

export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;

/** Native SOL sentinel — System Program ID used as "mint" for native SOL */
export const SOL_MINT = "11111111111111111111111111111111";

/** USDC SPL token mint on Solana mainnet */
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** USDC SPL token mint on Solana devnet */
export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// ============================================================================
// FEE CONFIGURATION
// ============================================================================

/** 10% treasury fee in basis points */
export const CRYPTO_WAGER_FEE_BPS = 1000;

/** Winner receives 90% of total pot */
export const CRYPTO_WAGER_WINNER_PERCENTAGE = 0.9;

// ============================================================================
// DISCONNECT TIMEOUT
// ============================================================================

/** 30 seconds disconnect timeout for crypto wager matches */
export const DC_TIMEOUT_MS = 30_000;

/** Heartbeat interval — clients send heartbeat every 5s during crypto wager games */
export const HEARTBEAT_INTERVAL_MS = 5_000;

/** If no heartbeat received for 15s, player is considered disconnected */
export const HEARTBEAT_STALE_THRESHOLD_MS = 15_000;

/** Monitor checks for disconnects every 10s */
export const DC_MONITOR_INTERVAL_SECONDS = 10;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if an amount is a valid wager tier for the given currency.
 * Only exact tier amounts are accepted — no arbitrary values.
 */
export function isValidWagerTier(amount: number, currency: WagerCurrency) {
  if (currency === "sol") {
    return (SOL_WAGER_TIERS as readonly number[]).includes(amount);
  }
  return (USDC_WAGER_TIERS as readonly number[]).includes(amount);
}

/**
 * Convert a human-readable amount to atomic units (lamports or smallest USDC unit).
 */
export function toAtomicUnits(amount: number, currency: WagerCurrency) {
  const decimals = currency === "sol" ? SOL_DECIMALS : USDC_DECIMALS;
  return BigInt(Math.round(amount * 10 ** decimals));
}

/**
 * Convert atomic units back to human-readable amount.
 */
export function fromAtomicUnits(atomicAmount: bigint, currency: WagerCurrency) {
  const decimals = currency === "sol" ? SOL_DECIMALS : USDC_DECIMALS;
  return Number(atomicAmount) / 10 ** decimals;
}

/**
 * Get the token mint address for a given currency.
 */
export function getMintForCurrency(currency: WagerCurrency) {
  return currency === "sol" ? SOL_MINT : USDC_MINT;
}

/**
 * Get the number of decimals for a given currency.
 */
export function getDecimalsForCurrency(currency: WagerCurrency) {
  return currency === "sol" ? SOL_DECIMALS : USDC_DECIMALS;
}

/**
 * Get the tier list for a given currency.
 */
export function getTiersForCurrency(currency: WagerCurrency) {
  return currency === "sol" ? SOL_WAGER_TIERS : USDC_WAGER_TIERS;
}

/**
 * Format a wager amount for display.
 * SOL: "0.05 SOL", USDC: "$10 USDC"
 */
export function formatWagerAmount(amount: number, currency: WagerCurrency) {
  if (currency === "usdc") {
    return `$${amount} USDC`;
  }
  return `${amount} SOL`;
}
