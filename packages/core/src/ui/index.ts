/**
 * @module @ltcg/core/ui
 *
 * Shared UI constants for consistent styling across LTCG applications.
 * These Tailwind CSS class mappings ensure visual consistency between
 * the web app and admin dashboard.
 */

import type { Attribute, CardType, Rarity } from "../types";

// =============================================================================
// Rarity Colors
// =============================================================================

export const RARITY_TEXT_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

export const RARITY_BORDER_COLORS: Record<Rarity, string> = {
  common: "border-gray-400/30",
  uncommon: "border-green-400/30",
  rare: "border-blue-400/30",
  epic: "border-purple-400/30",
  legendary: "border-yellow-400/30",
};

export const RARITY_BG_COLORS: Record<Rarity, string> = {
  common: "bg-gray-500/10",
  uncommon: "bg-green-500/10",
  rare: "bg-blue-500/10",
  epic: "bg-purple-500/10",
  legendary: "bg-yellow-500/10",
};

export const RARITY_GLOW_COLORS: Record<Rarity, string> = {
  common: "",
  uncommon: "shadow-green-500/20",
  rare: "shadow-blue-500/20",
  epic: "shadow-purple-500/20",
  legendary: "shadow-yellow-500/30",
};

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
// Attribute Colors (Archetype Colors)
// =============================================================================

export const ELEMENT_TEXT_COLORS: Record<Attribute, string> = {
  red: "text-red-400",
  blue: "text-blue-400",
  yellow: "text-amber-400",
  purple: "text-violet-400",
  green: "text-emerald-400",
  white: "text-gray-300",
};

export const ELEMENT_BG_COLORS: Record<Attribute, string> = {
  red: "bg-red-500/10",
  blue: "bg-blue-500/10",
  yellow: "bg-amber-500/10",
  purple: "bg-violet-500/10",
  green: "bg-emerald-500/10",
  white: "bg-gray-500/10",
};

export const ELEMENT_BORDER_COLORS: Record<Attribute, string> = {
  red: "border-red-400/30",
  blue: "border-blue-400/30",
  yellow: "border-amber-400/30",
  purple: "border-violet-400/30",
  green: "border-emerald-400/30",
  white: "border-gray-400/30",
};

export const ELEMENT_ICONS: Record<Attribute, string> = {
  red: "🔥",
  blue: "🎉",
  yellow: "🧠",
  purple: "🧪",
  green: "📐",
  white: "🙏",
};

// =============================================================================
// Card Type Colors
// =============================================================================

export const CARD_TYPE_TEXT_COLORS: Record<CardType, string> = {
  stereotype: "text-amber-400",
  spell: "text-cyan-400",
  trap: "text-rose-400",
  class: "text-violet-400",
};

export const CARD_TYPE_BG_COLORS: Record<CardType, string> = {
  stereotype: "bg-amber-500/10",
  spell: "bg-cyan-500/10",
  trap: "bg-rose-500/10",
  class: "bg-violet-500/10",
};

export const CARD_TYPE_BORDER_COLORS: Record<CardType, string> = {
  stereotype: "border-amber-400/30",
  spell: "border-cyan-400/30",
  trap: "border-rose-400/30",
  class: "border-violet-400/30",
};

export const CARD_TYPE_ICONS: Record<CardType, string> = {
  stereotype: "🎭",
  spell: "✨",
  trap: "⚠️",
  class: "🏫",
};

// =============================================================================
// Helper Functions
// =============================================================================

export function getRarityTextColor(rarity: string | undefined): string {
  if (!rarity) return RARITY_TEXT_COLORS.common;
  return RARITY_TEXT_COLORS[rarity as Rarity] ?? RARITY_TEXT_COLORS.common;
}

export function getElementTextColor(element: string | undefined): string {
  if (!element) return ELEMENT_TEXT_COLORS.white;
  return ELEMENT_TEXT_COLORS[element as Attribute] ?? ELEMENT_TEXT_COLORS.white;
}

export function getCardTypeTextColor(cardType: string | undefined): string {
  if (!cardType) return CARD_TYPE_TEXT_COLORS.stereotype;
  return CARD_TYPE_TEXT_COLORS[cardType as CardType] ?? CARD_TYPE_TEXT_COLORS.stereotype;
}

export function getRarityStyle(rarity: string | undefined): {
  bg: string;
  text: string;
  border: string;
  glow: string;
} {
  if (!rarity) return RARITY_STYLES.common;
  return RARITY_STYLES[rarity as Rarity] ?? RARITY_STYLES.common;
}
