/**
 * Wager Tier Definitions
 *
 * Crypto wager tier validation and formatting.
 * Provides Solana SPL token mint addresses and decimal formatting.
 */

export type WagerCurrency = "SOL" | "USDC";

/**
 * Known SPL token mint addresses per currency
 */
const CURRENCY_MINTS: Record<WagerCurrency, string> = {
  SOL: "So11111111111111111111111111111111111111112", // Wrapped SOL
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC (mainnet)
};

/**
 * Supported wager amounts per currency
 */
const WAGER_TIERS: Record<WagerCurrency, number[]> = {
  SOL: [0.01, 0.05, 0.1, 0.25, 0.5, 1],
  USDC: [1, 5, 10, 25, 50, 100],
};

/**
 * Validate that a wager amount is one of the supported tiers
 */
export function isValidWagerTier(amount: number, currency: WagerCurrency): boolean {
  const tiers = WAGER_TIERS[currency];
  if (!tiers) return false;
  return tiers.includes(amount);
}

/**
 * Format a wager amount with currency symbol
 */
export function formatWagerAmount(amount: number, currency: WagerCurrency): string {
  const decimals = getDecimalsForCurrency(currency);
  const formatted = amount.toFixed(decimals > 6 ? 4 : 2);
  return `${formatted} ${currency}`;
}

/**
 * Get the number of decimal places for a currency's smallest unit
 */
export function getDecimalsForCurrency(currency: WagerCurrency): number {
  return currency === "SOL" ? 9 : 6;
}

/**
 * Get the SPL token mint address for a currency
 */
export function getMintForCurrency(currency: WagerCurrency): string {
  return CURRENCY_MINTS[currency] ?? "";
}
