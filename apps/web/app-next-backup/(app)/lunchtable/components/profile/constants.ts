/**
 * Profile Component Constants
 * Configuration constants for ranks, elements, rarities, and badges
 */

import {
  ELEMENT_BG_COLORS,
  ELEMENT_TEXT_COLORS,
  RARITY_BORDER_COLORS,
  RARITY_GLOW_COLORS,
  RARITY_TEXT_COLORS,
} from "@ltcg/core/ui";
import {
  Crown,
  Droplets,
  Flame,
  Heart,
  Medal,
  Mountain,
  Star,
  Swords,
  Target,
  Wind,
  Zap,
} from "lucide-react";

export const RANK_COLORS: Record<
  "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master" | "Legend",
  { text: string; bg: string; border: string }
> = {
  Bronze: { text: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" },
  Silver: { text: "text-gray-300", bg: "bg-gray-400/20", border: "border-gray-400/30" },
  Gold: { text: "text-yellow-500", bg: "bg-yellow-500/20", border: "border-yellow-500/30" },
  Platinum: { text: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" },
  Diamond: { text: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30" },
  Master: { text: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30" },
  Legend: { text: "text-yellow-400", bg: "bg-yellow-400/20", border: "border-yellow-400/30" },
};

// Element config combining core colors with lucide icons
export const ELEMENT_CONFIG = {
  fire: { icon: Flame, color: ELEMENT_TEXT_COLORS.fire, bg: ELEMENT_BG_COLORS.fire },
  water: { icon: Droplets, color: ELEMENT_TEXT_COLORS.water, bg: ELEMENT_BG_COLORS.water },
  earth: { icon: Mountain, color: ELEMENT_TEXT_COLORS.earth, bg: ELEMENT_BG_COLORS.earth },
  wind: { icon: Wind, color: ELEMENT_TEXT_COLORS.wind, bg: ELEMENT_BG_COLORS.wind },
};

// Rarity config using core colors (subset without uncommon for this UI)
export const RARITY_CONFIG = {
  common: {
    color: RARITY_TEXT_COLORS.common,
    border: RARITY_BORDER_COLORS.common,
    glow: RARITY_GLOW_COLORS.common,
  },
  rare: {
    color: RARITY_TEXT_COLORS.rare,
    border: RARITY_BORDER_COLORS.rare,
    glow: RARITY_GLOW_COLORS.rare,
  },
  epic: {
    color: RARITY_TEXT_COLORS.epic,
    border: RARITY_BORDER_COLORS.epic,
    glow: RARITY_GLOW_COLORS.epic,
  },
  legendary: {
    color: RARITY_TEXT_COLORS.legendary,
    border: RARITY_BORDER_COLORS.legendary,
    glow: `${RARITY_GLOW_COLORS.legendary} shadow-lg`,
  },
};

export const BADGE_ICONS: Record<string, typeof Crown> = {
  crown: Crown,
  flame: Flame,
  swords: Swords,
  star: Star,
  zap: Zap,
  heart: Heart,
  target: Target,
  medal: Medal,
};
