/**
 * Card-related types used across the application.
 *
 * Single source of truth for rarity, element, and card type unions.
 * Mirrors the Convex schema validators — keep them in sync.
 */

/** Card rarity tiers (matches Convex schema `rarityValidator`). */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Elemental attributes (without neutral). */
export type Element = "fire" | "water" | "earth" | "wind";

/** Elemental attributes including neutral (used for card definitions). */
export type ElementWithNeutral = Element | "neutral";

/** Card type categories (matches Convex schema `cardTypeValidator`). */
export type CardType = "creature" | "spell" | "trap" | "equipment";
