import { readFileSync } from "node:fs";
import * as p from "@clack/prompts";

export interface ParsedCard {
  name: string;
  rarity: string;
  archetype: string;
  cardType: "stereotype" | "spell" | "trap";
  cost: number;
  level?: number;
  attack?: number;
  defense?: number;
  attribute?: string;
  spellType?: string;
  trapType?: string;
  ability?: unknown[];
}

export interface ParsedDeck {
  name: string;
  deckCode: string;
  archetype: string;
  description: string;
  playstyle: string;
  cardCount: number;
}

export interface DeckRecipeEntry {
  cardName: string;
  copies: number;
}

export interface ParsedCSVData {
  cards: ParsedCard[];
  decks: ParsedDeck[];
  deckRecipes: Record<string, DeckRecipeEntry[]>;
}

const ARCHETYPE_META: Record<string, { displayName: string; description: string; playstyle: string }> = {
  dropouts: { displayName: "Dropout Gang", description: "High-risk, high-reward chaos", playstyle: "Aggro" },
  preps: { displayName: "Prep Squad", description: "Status and social warfare", playstyle: "Midrange" },
  geeks: { displayName: "Geek Squad", description: "Card draw and tech control", playstyle: "Control" },
  freaks: { displayName: "Freak Show", description: "Disruption and chaos", playstyle: "Tempo" },
  nerds: { displayName: "Nerd Herd", description: "Knowledge and calculated strategy", playstyle: "Combo" },
  goodies: { displayName: "Goody Gang", description: "Healing and community support", playstyle: "Stall" },
};

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseEffects(effectsStr: string): unknown[] | undefined {
  if (!effectsStr || effectsStr === "[]" || effectsStr === "none") return undefined;

  try {
    // CSV effects may use single quotes — normalize to double quotes for JSON
    const normalized = effectsStr
      .replace(/'/g, '"')
      .replace(/None/g, "null")
      .replace(/True/g, "true")
      .replace(/False/g, "false");
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // If JSON parsing fails, return the raw string wrapped in an array
    if (effectsStr.trim().length > 2) {
      return [{ raw: effectsStr }];
    }
  }
  return undefined;
}

function mapCardType(csvType: string): "stereotype" | "spell" | "trap" {
  const lower = csvType.toLowerCase();
  if (lower === "stereotype") return "stereotype";
  if (lower === "spell") return "spell";
  if (lower === "trap") return "trap";
  if (lower === "environment") return "spell"; // environments map to spell with spellType "field"
  return "stereotype";
}

export function parseCardCSV(filePath: string): ParsedCSVData {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("CSV file must have a header row and at least one data row.");
  }

  // Find header line (skip blank lines)
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim());

  // Locate column indices
  const col = (name: string) => {
    const idx = headers.indexOf(name);
    return idx;
  };

  const iDeck = col("deck");
  const iDeckId = col("deck_id");
  const iCardName = col("card_name");
  const iCardType = col("card_type");
  const iCopies = col("copies");
  const iLevel = col("level");
  const iReputation = col("reputation");
  const iStability = col("stability");
  const iVice = col("vice");
  const iCloutCost = col("clout_cost");
  const iRarity = col("rarity");
  const iEffects = col("effects");

  if (iCardName === -1) {
    throw new Error("CSV must have a 'Card_Name' column.");
  }

  const seenCards = new Map<string, ParsedCard>();
  const deckRecipes: Record<string, DeckRecipeEntry[]> = {};
  const deckArchetypes = new Map<string, string>();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 3) continue;

    const cardName = fields[iCardName] || "";
    if (!cardName) continue;

    const csvCardType = iCardType >= 0 ? fields[iCardType] || "Stereotype" : "Stereotype";
    const deckName = iDeck >= 0 ? fields[iDeck] || "" : "";
    const deckId = iDeckId >= 0 ? (fields[iDeckId] || "").toLowerCase().replace(/\s+/g, "_") : "";
    const copies = iCopies >= 0 ? parseInt(fields[iCopies], 10) || 1 : 1;
    const level = iLevel >= 0 ? parseInt(fields[iLevel], 10) || undefined : undefined;
    const reputation = iReputation >= 0 ? parseInt(fields[iReputation], 10) || 0 : 0;
    const stability = iStability >= 0 ? parseInt(fields[iStability], 10) || 0 : 0;
    const cloutCost = iCloutCost >= 0 ? parseInt(fields[iCloutCost], 10) || 1 : 1;
    const rarity = iRarity >= 0 ? (fields[iRarity] || "common").toLowerCase() : "common";
    const effectsStr = iEffects >= 0 ? fields[iEffects] || "" : "";
    const vice = iVice >= 0 ? fields[iVice] || "" : "";

    // Derive archetype from deck name
    const archetype = deckName.toLowerCase().replace(/\s+/g, "");

    // Track deck-archetype mapping
    if (deckId && deckName) {
      deckArchetypes.set(deckId, archetype);
    }

    // Build card if not seen
    if (!seenCards.has(cardName)) {
      const mappedType = mapCardType(csvCardType);
      const isEnvironment = csvCardType.toLowerCase() === "environment";

      const card: ParsedCard = {
        name: cardName,
        rarity,
        archetype,
        cardType: mappedType,
        cost: cloutCost,
      };

      if (mappedType === "stereotype") {
        card.level = level;
        card.attack = reputation;
        card.defense = stability;
        if (vice) card.attribute = vice;
        const effects = parseEffects(effectsStr);
        if (effects) card.ability = effects;
      } else if (mappedType === "spell") {
        card.spellType = isEnvironment ? "field" : "normal";
        const effects = parseEffects(effectsStr);
        if (effects) card.ability = effects;
      } else if (mappedType === "trap") {
        card.trapType = "normal";
        const effects = parseEffects(effectsStr);
        if (effects) card.ability = effects;
      }

      seenCards.set(cardName, card);
    }

    // Build deck recipe
    if (deckId) {
      const deckCode = `${deckId}_starter`;
      if (!deckRecipes[deckCode]) deckRecipes[deckCode] = [];

      const existing = deckRecipes[deckCode].find((e) => e.cardName === cardName);
      if (existing) {
        existing.copies = copies;
      } else {
        deckRecipes[deckCode].push({ cardName, copies });
      }
    }
  }

  // Build starter decks from discovered archetypes
  const decks: ParsedDeck[] = [];
  for (const [deckId, archetype] of deckArchetypes) {
    const deckCode = `${deckId}_starter`;
    const recipe = deckRecipes[deckCode];
    if (!recipe) continue;

    const cardCount = recipe.reduce((sum, r) => sum + r.copies, 0);
    const meta = ARCHETYPE_META[archetype] ?? {
      displayName: `${archetype.charAt(0).toUpperCase() + archetype.slice(1)} Deck`,
      description: `Starter deck for ${archetype}`,
      playstyle: "Balanced",
    };

    decks.push({
      name: meta.displayName,
      deckCode,
      archetype,
      description: meta.description,
      playstyle: meta.playstyle,
      cardCount,
    });
  }

  const cards = Array.from(seenCards.values());

  p.log.info(`Parsed ${cards.length} unique cards, ${decks.length} starter decks from CSV.`);

  return { cards, decks, deckRecipes };
}
