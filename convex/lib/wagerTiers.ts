/**
 * Wager Tier Definitions (stub)
 *
 * Full implementation moved to @lunchtable-tcg/economy component.
 * This stub provides type/value exports for files still referencing it.
 */

export type WagerCurrency = "SOL" | "USDC";

export function isValidWagerTier(_amount: number, _currency: WagerCurrency): boolean {
  return true;
}

export function formatWagerAmount(amount: number, _currency: WagerCurrency): string {
  return `${amount}`;
}

export function getDecimalsForCurrency(currency: WagerCurrency): number {
  return currency === "SOL" ? 9 : 6;
}

export function getMintForCurrency(_currency: WagerCurrency): string {
  return "";
}
