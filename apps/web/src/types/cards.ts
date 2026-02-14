/**
 * Card-related types used across the application.
 *
 * Single source of truth for rarity, element, and card type unions.
 * Mirrors the Convex schema validators — keep them in sync.
 */

/** Card rarity tiers (matches Convex schema `rarityValidator`). */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Elemental attributes. */
export type Element = "red" | "blue" | "yellow" | "purple" | "green" | "white";

/** Card type categories (matches Convex schema `cardTypeValidator`). */
export type CardType = "stereotype" | "spell" | "trap" | "class";
