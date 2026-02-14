#!/usr/bin/env bun
/**
 * scripts/seed-lunchtable-cards.ts
 *
 * Parses LunchTable CSV card data and generates JSON seed file for Convex.
 *
 * Run with: bun run scripts/seed-lunchtable-cards.ts
 */

import { parseCSV } from "./lib/csv-parser";

// Type definitions
type Archetype = "dropout" | "prep" | "geek" | "freak" | "nerd" | "goodie_two_shoes" | "booster";
type CardType = "stereotype" | "spell" | "trap" | "class";
type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type Attribute = "red" | "blue" | "yellow" | "purple" | "green" | "white";
type SpellType = "normal";
type TrapType = "normal";
type ViceType = string; // Various vice types (crypto, gambling, etc.)

interface CardAbility {
  trigger: string;
  speed: number | string;
  cost?: string;
  targets: string[];
  operations: string[];
}

interface SeedCard {
  name: string;
  rarity: Rarity;
  archetype: Archetype;
  cardType: CardType;
  cost: number;
  attack?: number;
  defense?: number;
  level?: number;
  attribute?: Attribute;
  viceType?: ViceType;
  spellType?: SpellType;
  trapType?: TrapType;
  ability: CardAbility[];
  flavorText: null;
}

interface CSVRow {
  Deck: string;
  Deck_ID: string;
  Card_Name: string;
  Card_ID: string;
  Card_Type: string;
  Copies: string;
  level: string;
  reputation: string;
  stability: string;
  vice: string;
  Clout_Cost: string;
  Rarity: string;
  effects: string;
}

// Mapping functions
function mapArchetype(deck: string): Archetype {
  const normalized = deck.trim().toLowerCase();
  switch (normalized) {
    case "dropouts": return "dropout";
    case "preps": return "prep";
    case "geeks": return "geek";
    case "freaks": return "freak";
    case "nerds": return "nerd";
    case "goodies": return "goodie_two_shoes";
    case "":
    default: return "booster";
  }
}

function mapCardType(type: string): CardType {
  const normalized = type.trim().toLowerCase();
  switch (normalized) {
    case "stereotype": return "stereotype";
    case "spell": return "spell";
    case "trap": return "trap";
    case "environment": return "class";
    default:
      console.warn(`Unknown card type: ${type}, defaulting to spell`);
      return "spell";
  }
}

function mapRarity(rarity: string): Rarity {
  const normalized = rarity.trim().toLowerCase();
  switch (normalized) {
    case "common": return "common";
    case "uncommon": return "uncommon";
    case "rare": return "rare";
    case "ultra rare": return "legendary";
    case "epic": return "epic";
    default:
      console.warn(`Unknown rarity: ${rarity}, defaulting to common`);
      return "common";
  }
}

function deriveAttribute(archetype: Archetype): Attribute {
  switch (archetype) {
    case "dropout": return "red";
    case "prep": return "blue";
    case "geek": return "yellow";
    case "freak": return "purple";
    case "nerd": return "green";
    case "goodie_two_shoes": return "white";
    case "booster": return "white";
  }
}

function normalizeViceType(vice: string): string {
  return vice
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseAbility(effectsJSON: string): CardAbility[] {
  if (!effectsJSON || effectsJSON.trim() === "") {
    return [];
  }

  try {
    return JSON.parse(effectsJSON);
  } catch (error) {
    console.error(`Failed to parse ability JSON: ${effectsJSON}`);
    console.error(error);
    return [];
  }
}

function parseFloat(value: string): number {
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Main transformation
function transformRow(row: CSVRow): SeedCard {
  const archetype = mapArchetype(row.Deck);
  const cardType = mapCardType(row.Card_Type);
  const cost = parseFloat(row.Clout_Cost);
  const rarity = mapRarity(row.Rarity);

  const card: SeedCard = {
    name: row.Card_Name.trim(),
    rarity,
    archetype,
    cardType,
    cost,
    ability: parseAbility(row.effects),
    flavorText: null,
  };

  // Stereotype-specific fields
  if (cardType === "stereotype") {
    card.level = parseFloat(row.level);
    card.attack = parseFloat(row.reputation);
    card.defense = parseFloat(row.stability);
    card.attribute = deriveAttribute(archetype);

    if (row.vice && row.vice.trim() !== "") {
      card.viceType = normalizeViceType(row.vice);
    }
  }

  // Spell-specific fields
  if (cardType === "spell") {
    card.spellType = "normal";
  }

  // Trap-specific fields
  if (cardType === "trap") {
    card.trapType = "normal";
  }

  return card;
}

// Statistics tracking
interface Stats {
  total: number;
  byArchetype: Record<Archetype, number>;
  byCardType: Record<CardType, number>;
  byRarity: Record<Rarity, number>;
}

function initStats(): Stats {
  return {
    total: 0,
    byArchetype: {
      dropout: 0,
      prep: 0,
      geek: 0,
      freak: 0,
      nerd: 0,
      goodie_two_shoes: 0,
      booster: 0,
    },
    byCardType: {
      stereotype: 0,
      spell: 0,
      trap: 0,
      class: 0,
    },
    byRarity: {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    },
  };
}

function updateStats(stats: Stats, card: SeedCard) {
  stats.total++;
  stats.byArchetype[card.archetype]++;
  stats.byCardType[card.cardType]++;
  stats.byRarity[card.rarity]++;
}

function printStats(stats: Stats) {
  console.log("\n=== Card Seed Generation Summary ===\n");
  console.log(`Total cards: ${stats.total}\n`);

  console.log("By Archetype:");
  Object.entries(stats.byArchetype)
    .sort(([, a], [, b]) => b - a)
    .forEach(([archetype, count]) => {
      console.log(`  ${archetype.padEnd(20)} ${count}`);
    });

  console.log("\nBy Card Type:");
  Object.entries(stats.byCardType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(20)} ${count}`);
    });

  console.log("\nBy Rarity:");
  Object.entries(stats.byRarity)
    .sort(([, a], [, b]) => b - a)
    .forEach(([rarity, count]) => {
      console.log(`  ${rarity.padEnd(20)} ${count}`);
    });
}

// Main execution
async function main() {
  const csvPath = "/Users/home/Desktop/LTCG/.claude/lunchtable_card_set_complete (1).csv";
  const outputPath = "/Users/home/Desktop/LTCG/data/lunchtable-seed-cards.json";

  console.log(`Reading CSV from: ${csvPath}`);

  const file = Bun.file(csvPath);
  const csvText = await file.text();

  const rows = parseCSV<CSVRow>(csvText);
  console.log(`Parsed ${rows.length} rows from CSV`);

  const stats = initStats();
  const cards: SeedCard[] = [];

  // CSV has each card twice: once in a deck (archetype-assigned), once standalone (booster).
  // Output both — deck-assigned first, then booster-labeled. Convex seed deduplicates at load time.
  const deckRows = rows.filter(r => r.Deck && r.Deck.trim() !== "");
  const boosterRows = rows.filter(r => !r.Deck || r.Deck.trim() === "");

  for (const row of [...deckRows, ...boosterRows]) {
    try {
      const card = transformRow(row);
      cards.push(card);
      updateStats(stats, card);
    } catch (error) {
      console.error(`Failed to transform row: ${row.Card_Name}`, error);
    }
  }

  console.log(`\nWriting ${cards.length} cards to: ${outputPath}`);
  await Bun.write(outputPath, JSON.stringify(cards, null, 2));

  printStats(stats);
  console.log(`\n✓ Seed file generated successfully!`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
