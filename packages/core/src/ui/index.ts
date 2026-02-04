/**
 * @module @ltcg/core/ui
 *
 * Shared UI constants for consistent styling across LTCG applications.
 * These Tailwind CSS class mappings ensure visual consistency between
 * the web app and admin dashboard.
 */

import type { CardType, Element, Rarity } from "../types/api";

// =============================================================================
// Rarity Colors
// =============================================================================

/**
 * Rarity color mappings for text classes.
 * Use with Tailwind's `text-*` utilities.
 *
 * @example
 * ```tsx
 * <span className={RARITY_TEXT_COLORS[card.rarity]}>
 *   {card.name}
 * </span>
 * ```
 */
export const RARITY_TEXT_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

/**
 * Rarity border color mappings.
 * Use with Tailwind's `border-*` utilities.
 */
export const RARITY_BORDER_COLORS: Record<Rarity, string> = {
  common: "border-gray-400/30",
  uncommon: "border-green-400/30",
  rare: "border-blue-400/30",
  epic: "border-purple-400/30",
  legendary: "border-yellow-400/30",
};

/**
 * Rarity background color mappings.
 * Use with Tailwind's `bg-*` utilities.
 */
export const RARITY_BG_COLORS: Record<Rarity, string> = {
  common: "bg-gray-500/10",
  uncommon: "bg-green-500/10",
  rare: "bg-blue-500/10",
  epic: "bg-purple-500/10",
  legendary: "bg-yellow-500/10",
};

/**
 * Rarity glow/shadow color mappings.
 * Use with Tailwind's `shadow-*` utilities for glowing effects.
 */
export const RARITY_GLOW_COLORS: Record<Rarity, string> = {
  common: "",
  uncommon: "shadow-green-500/20",
  rare: "shadow-blue-500/20",
  epic: "shadow-purple-500/20",
  legendary: "shadow-yellow-500/30",
};

/**
 * Complete rarity style object combining all color variants.
 * Useful when you need multiple style properties at once.
 *
 * @example
 * ```tsx
 * const style = RARITY_STYLES[card.rarity];
 * <div className={`${style.bg} ${style.border} ${style.text}`}>
 *   {card.name}
 * </div>
 * ```
 */
export const RARITY_STYLES: Record<
  Rarity,
  { bg: string; text: string; border: string; glow: string }
> = {
  common: {
    bg: RARITY_BG_COLORS.common,
    text: RARITY_TEXT_COLORS.common,
    border: RARITY_BORDER_COLORS.common,
    glow: RARITY_GLOW_COLORS.common,
  },
  uncommon: {
    bg: RARITY_BG_COLORS.uncommon,
    text: RARITY_TEXT_COLORS.uncommon,
    border: RARITY_BORDER_COLORS.uncommon,
    glow: RARITY_GLOW_COLORS.uncommon,
  },
  rare: {
    bg: RARITY_BG_COLORS.rare,
    text: RARITY_TEXT_COLORS.rare,
    border: RARITY_BORDER_COLORS.rare,
    glow: RARITY_GLOW_COLORS.rare,
  },
  epic: {
    bg: RARITY_BG_COLORS.epic,
    text: RARITY_TEXT_COLORS.epic,
    border: RARITY_BORDER_COLORS.epic,
    glow: RARITY_GLOW_COLORS.epic,
  },
  legendary: {
    bg: RARITY_BG_COLORS.legendary,
    text: RARITY_TEXT_COLORS.legendary,
    border: RARITY_BORDER_COLORS.legendary,
    glow: RARITY_GLOW_COLORS.legendary,
  },
};

// =============================================================================
// Element Colors
// =============================================================================

/**
 * Element color mappings for text classes.
 */
export const ELEMENT_TEXT_COLORS: Record<Element, string> = {
  fire: "text-red-400",
  water: "text-blue-400",
  earth: "text-amber-400",
  wind: "text-emerald-400",
  neutral: "text-gray-400",
};

/**
 * Element background color mappings.
 */
export const ELEMENT_BG_COLORS: Record<Element, string> = {
  fire: "bg-red-500/10",
  water: "bg-blue-500/10",
  earth: "bg-amber-500/10",
  wind: "bg-emerald-500/10",
  neutral: "bg-gray-500/10",
};

/**
 * Element border color mappings.
 */
export const ELEMENT_BORDER_COLORS: Record<Element, string> = {
  fire: "border-red-400/30",
  water: "border-blue-400/30",
  earth: "border-amber-400/30",
  wind: "border-emerald-400/30",
  neutral: "border-gray-400/30",
};

/**
 * Element icon/emoji mappings.
 */
export const ELEMENT_ICONS: Record<Element, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🪨",
  wind: "🌪️",
  neutral: "⚪",
};

// =============================================================================
// Card Type Colors
// =============================================================================

/**
 * Card type color mappings for text classes.
 */
export const CARD_TYPE_TEXT_COLORS: Record<CardType, string> = {
  creature: "text-amber-400",
  spell: "text-cyan-400",
  trap: "text-rose-400",
  equipment: "text-violet-400",
};

/**
 * Card type background color mappings.
 */
export const CARD_TYPE_BG_COLORS: Record<CardType, string> = {
  creature: "bg-amber-500/10",
  spell: "bg-cyan-500/10",
  trap: "bg-rose-500/10",
  equipment: "bg-violet-500/10",
};

/**
 * Card type border color mappings.
 */
export const CARD_TYPE_BORDER_COLORS: Record<CardType, string> = {
  creature: "border-amber-400/30",
  spell: "border-cyan-400/30",
  trap: "border-rose-400/30",
  equipment: "border-violet-400/30",
};

/**
 * Card type icon/emoji mappings.
 */
export const CARD_TYPE_ICONS: Record<CardType, string> = {
  creature: "🐉",
  spell: "✨",
  trap: "⚠️",
  equipment: "🛡️",
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get rarity text color with fallback.
 *
 * @param rarity - The rarity string
 * @returns Tailwind text color class
 */
export function getRarityTextColor(rarity: string | undefined): string {
  if (!rarity) return RARITY_TEXT_COLORS.common;
  return RARITY_TEXT_COLORS[rarity as Rarity] ?? RARITY_TEXT_COLORS.common;
}

/**
 * Get element text color with fallback.
 *
 * @param element - The element string
 * @returns Tailwind text color class
 */
export function getElementTextColor(element: string | undefined): string {
  if (!element) return ELEMENT_TEXT_COLORS.neutral;
  return ELEMENT_TEXT_COLORS[element as Element] ?? ELEMENT_TEXT_COLORS.neutral;
}

/**
 * Get card type text color with fallback.
 *
 * @param cardType - The card type string
 * @returns Tailwind text color class
 */
export function getCardTypeTextColor(cardType: string | undefined): string {
  if (!cardType) return CARD_TYPE_TEXT_COLORS.creature;
  return CARD_TYPE_TEXT_COLORS[cardType as CardType] ?? CARD_TYPE_TEXT_COLORS.creature;
}

/**
 * Get complete rarity style object with fallback.
 *
 * @param rarity - The rarity string
 * @returns Object with bg, text, border, and glow classes
 */
export function getRarityStyle(rarity: string | undefined): {
  bg: string;
  text: string;
  border: string;
  glow: string;
} {
  if (!rarity) return RARITY_STYLES.common;
  return RARITY_STYLES[rarity as Rarity] ?? RARITY_STYLES.common;
}
