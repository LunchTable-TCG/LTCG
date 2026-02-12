/**
 * Economy-related types used across the application.
 *
 * Covers in-game currencies, reward types, and transaction filters.
 */

/** In-game currency types. */
export type Currency = "gold" | "gems";

/** All possible reward types (battle pass, quests, daily login). */
export type RewardType =
  | "gold"
  | "gems"
  | "xp"
  | "card"
  | "pack"
  | "title"
  | "avatar"
  | "card_back";

/** Transaction history filter options. */
export type TransactionFilter = "all" | "gold" | "gems" | "token";

/** Shop product categories. */
export type ProductType = "pack" | "box" | "currency";
