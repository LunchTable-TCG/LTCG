/**
 * Top-level economy export for backward compatibility
 * Maintains flat API structure (api.economy.*) while code is organized in subdirectories
 */

export {
  initializePlayerCurrency,
  adjustPlayerCurrency,
  getPlayerBalance,
  getTransactionHistory,
  getTransactionHistoryPaginated,
  redeemPromoCode,
} from "./economy/economy";

// Daily & Weekly Rewards
export {
  getDailyRewardStatus,
  getRewardHistory,
  claimDailyPack,
  claimLoginStreak,
  claimWeeklyJackpot,
} from "./economy/dailyRewards";

// Gem Purchases (Token → Gems)
export {
  getTokenPrice,
  getGemPackages,
  getGemPurchaseHistory,
  getPendingPurchases,
  createPendingPurchase,
  updatePurchaseSignature,
  verifyAndConfirmPurchase,
  cleanupExpiredPurchases,
} from "./economy/gemPurchases";

// Sales System
export {
  getActiveSales,
  getSalesForProduct,
  getDiscountedPrice,
  getAvailableSalesForUser,
  getSaleUsageHistory,
  recordSaleUsage,
} from "./economy/sales";

// RNG Configuration (public read-only)
export { getRngConfig } from "./economy/rngConfig";
