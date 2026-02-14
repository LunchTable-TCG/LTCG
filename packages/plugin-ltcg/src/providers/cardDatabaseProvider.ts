/**
 * Card Database Provider
 *
 * Provides comprehensive card knowledge to the agent:
 * - All available cards in the game
 * - Card effects and abilities
 * - Threat categorization (removal, board wipes, negation)
 * - Archetype groupings
 *
 * This enables agents to understand opponent cards they haven't seen before.
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { CardDefinition } from "../types/api";

// Card threat levels for strategic awareness
type ThreatLevel = "critical" | "high" | "medium" | "low";

interface CategorizedCard extends CardDefinition {
  threatLevel: ThreatLevel;
  threatReason?: string;
}

interface CardDatabaseCache {
  cards: CardDefinition[];
  byName: Map<string, CardDefinition>;
  byArchetype: Map<string, CardDefinition[]>;
  byType: Map<string, CardDefinition[]>;
  threatCards: CategorizedCard[];
  lastUpdated: number;
}

// Cache expiration time (30 minutes)
const CACHE_TTL_MS = 30 * 60 * 1000;

// Module-level cache shared across provider calls
let cardCache: CardDatabaseCache | null = null;

/**
 * Keywords that indicate high-threat cards
 */
const THREAT_KEYWORDS = {
  critical: [
    "destroy all",
    "negate",
    "banish all",
    "cannot be destroyed",
    "win the duel",
    "take control",
  ],
  high: [
    "destroy",
    "banish",
    "return to hand",
    "discard",
    "cannot attack",
    "negate the activation",
    "special summon from",
  ],
  medium: [
    "draw",
    "add to hand",
    "increase ATK",
    "reduce ATK",
    "change position",
    "flip face-down",
  ],
};

/**
 * Categorize a card by threat level based on its effects
 */
function categorizeCardThreat(card: CardDefinition): CategorizedCard {
  const description = card.description?.toLowerCase() || "";
  const abilities = JSON.stringify(card.abilities || []).toLowerCase();
  const combined = `${description} ${abilities}`;

  // Check critical threats first
  for (const keyword of THREAT_KEYWORDS.critical) {
    if (combined.includes(keyword)) {
      return {
        ...card,
        threatLevel: "critical",
        threatReason: `Contains effect: ${keyword}`,
      };
    }
  }

  // Check high threats
  for (const keyword of THREAT_KEYWORDS.high) {
    if (combined.includes(keyword)) {
      return {
        ...card,
        threatLevel: "high",
        threatReason: `Contains effect: ${keyword}`,
      };
    }
  }

  // Check medium threats
  for (const keyword of THREAT_KEYWORDS.medium) {
    if (combined.includes(keyword)) {
      return {
        ...card,
        threatLevel: "medium",
        threatReason: `Contains effect: ${keyword}`,
      };
    }
  }

  // High ATK monsters are medium threats
  if (card.type === "stereotype" && (card.atk || 0) >= 2500) {
    return {
      ...card,
      threatLevel: "medium",
      threatReason: `High ATK monster (${card.atk})`,
    };
  }

  return { ...card, threatLevel: "low" };
}

/**
 * Build the card database cache from API data
 */
async function buildCardCache(client: LTCGApiClient): Promise<CardDatabaseCache> {
  const cards = await client.getCards();

  const byName = new Map<string, CardDefinition>();
  const byArchetype = new Map<string, CardDefinition[]>();
  const byType = new Map<string, CardDefinition[]>();
  const threatCards: CategorizedCard[] = [];

  for (const card of cards) {
    // Index by name (lowercase for case-insensitive lookup)
    byName.set(card.name.toLowerCase(), card);

    // Group by archetype
    const archetype = card.attribute || "neutral";
    if (!byArchetype.has(archetype)) {
      byArchetype.set(archetype, []);
    }
    byArchetype.get(archetype)?.push(card);

    // Group by type
    if (!byType.has(card.type)) {
      byType.set(card.type, []);
    }
    byType.get(card.type)?.push(card);

    // Categorize threats
    const categorized = categorizeCardThreat(card);
    if (categorized.threatLevel !== "low") {
      threatCards.push(categorized);
    }
  }

  // Sort threats by level (critical first)
  const threatOrder: Record<ThreatLevel, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  threatCards.sort((a, b) => threatOrder[a.threatLevel] - threatOrder[b.threatLevel]);

  return {
    cards,
    byName,
    byArchetype,
    byType,
    threatCards,
    lastUpdated: Date.now(),
  };
}

/**
 * Format threat card summary
 */
function formatThreatSummary(threats: CategorizedCard[]): string {
  const criticalThreats = threats.filter((t) => t.threatLevel === "critical");
  const highThreats = threats.filter((t) => t.threatLevel === "high");

  const lines: string[] = ["## Key Threat Cards to Watch For"];

  if (criticalThreats.length > 0) {
    lines.push("\n### CRITICAL THREATS (Game-Changing):");
    criticalThreats.slice(0, 5).forEach((card) => {
      lines.push(`- ${card.name}: ${card.threatReason}`);
    });
  }

  if (highThreats.length > 0) {
    lines.push("\n### HIGH THREATS (Significant Impact):");
    highThreats.slice(0, 10).forEach((card) => {
      lines.push(`- ${card.name}: ${card.threatReason}`);
    });
  }

  return lines.join("\n");
}

export const cardDatabaseProvider: Provider = {
  name: "LTCG_CARD_DATABASE",
  description:
    "Provides comprehensive card knowledge including all cards, effects, and threat assessments",

  async get(runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> {
    try {
      // Get API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "Card database unavailable - API credentials not configured.",
          values: { error: "MISSING_CONFIG" },
          data: {},
        };
      }

      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Check cache validity
      const now = Date.now();
      if (!cardCache || now - cardCache.lastUpdated > CACHE_TTL_MS) {
        logger.info("Building card database cache...");
        cardCache = await buildCardCache(client);
        logger.info(
          { cardCount: cardCache.cards.length, threatCount: cardCache.threatCards.length },
          "Card database cache built"
        );
      }

      // Build LLM-friendly text
      const textParts: string[] = [];

      textParts.push("# LTCG Card Database\n");
      textParts.push(`Total cards available: ${cardCache.cards.length}`);
      textParts.push(`Archetypes: ${[...cardCache.byArchetype.keys()].join(", ")}`);
      textParts.push(`Card types: ${[...cardCache.byType.keys()].join(", ")}\n`);

      // Add threat summary
      textParts.push(formatThreatSummary(cardCache.threatCards));

      // Build structured data
      const data = {
        totalCards: cardCache.cards.length,
        archetypes: [...cardCache.byArchetype.keys()],
        cardTypes: [...cardCache.byType.keys()],
        threatCards: cardCache.threatCards.slice(0, 20), // Top 20 threats
        // Lookup functions exposed via data
        lookupCard: (name: string) => cardCache?.byName.get(name.toLowerCase()),
        getByArchetype: (archetype: string) => cardCache?.byArchetype.get(archetype) || [],
        getByType: (type: string) => cardCache?.byType.get(type) || [],
      };

      const values = {
        totalCards: cardCache.cards.length,
        archetypeCount: cardCache.byArchetype.size,
        threatCardCount: cardCache.threatCards.length,
        cacheAge: Math.floor((now - cardCache.lastUpdated) / 1000),
      };

      return {
        text: textParts.join("\n"),
        values,
        data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error fetching card database";

      logger.error({ error }, "Failed to fetch card database");

      return {
        text: `Error loading card database: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Lookup a specific card by name
 * Utility function for use outside the provider context
 */
export function lookupCard(name: string): CardDefinition | undefined {
  return cardCache?.byName.get(name.toLowerCase());
}

/**
 * Get all cards of a specific type
 */
export function getCardsByType(type: string): CardDefinition[] {
  return cardCache?.byType.get(type) || [];
}

/**
 * Get all threat cards
 */
export function getThreatCards(): CategorizedCard[] {
  return cardCache?.threatCards || [];
}

/**
 * Force refresh the card cache
 */
export async function refreshCardCache(client: LTCGApiClient): Promise<void> {
  cardCache = await buildCardCache(client);
}
