import type { CardDefinition } from "./types/index.js";

/**
 * Shape matching the Convex cardDefinitions table.
 * This is a plain object — no Convex runtime dependency.
 */
export interface ConvexCardRow {
  name: string;
  rarity: string;
  archetype: string;
  cardType: string;
  attack?: number;
  defense?: number;
  cost: number;
  level?: number;
  attribute?: string;
  spellType?: string;
  trapType?: string;
  viceType?: string;
  breakdownEffect?: unknown;
  breakdownFlavorText?: string;
  ability?: unknown;
  flavorText?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: number;
}

/**
 * Convert engine CardDefinition[] to Convex cardDefinitions row format.
 * Pure mapping function — does not touch the database.
 */
export function toConvexCardRows(cards: CardDefinition[]): ConvexCardRow[] {
  const now = Date.now();
  return cards.map((card) => ({
    name: card.name,
    rarity: card.rarity,
    archetype: card.archetype ?? "",
    cardType: card.type,
    attack: card.type === "stereotype" ? card.attack : undefined,
    defense: card.type === "stereotype" ? card.defense : undefined,
    cost: card.cost ?? 0,
    level: card.level,
    attribute: card.attribute,
    spellType: card.spellType,
    trapType: card.trapType,
    viceType: card.viceType,
    ability: card.effects,
    flavorText: card.flavorText,
    imageUrl: card.imageUrl,
    isActive: true,
    createdAt: now,
  }));
}
