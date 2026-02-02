/**
 * Deck Provider
 *
 * Provides information about the agent's deck including:
 * - Card list with names, types, levels, ATK/DEF
 * - Deck composition (monster/spell/trap breakdown)
 * - Archetype information
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { CardDefinition } from "../types/api";

export const deckProvider: Provider = {
  name: "LTCG_MY_DECK",
  description: "Provides information about the agent's current deck and card collection",

  async get(runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> {
    try {
      // Get API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "Not registered yet. Use REGISTER_AGENT to get started.",
          values: { error: "MISSING_CONFIG" },
          data: {},
        };
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Get all decks
      const decks = await client.getDecks();

      if (decks.length === 0) {
        return {
          text: "No decks available. Please create a deck or contact an administrator.",
          values: { deckCount: 0 },
          data: {},
        };
      }

      // Use preferred deck or first available
      const preferredDeckId = runtime.getSetting("LTCG_PREFERRED_DECK_ID") as string;
      const currentDeck = preferredDeckId
        ? decks.find((d) => d.deckId === preferredDeckId) || decks[0]
        : decks[0];

      // Analyze deck composition
      const monsters = currentDeck.cards.filter((c) => c.type === "creature");
      const spells = currentDeck.cards.filter((c) => c.type === "spell");
      const traps = currentDeck.cards.filter((c) => c.type === "trap");

      // Group creatures by level
      const monstersByLevel: Record<number, CardDefinition[]> = {};
      for (const monster of monsters) {
        const level = monster.level || 0;
        if (!monstersByLevel[level]) {
          monstersByLevel[level] = [];
        }
        monstersByLevel[level].push(monster);
      }

      // Find strongest monsters
      const strongestMonsters = [...monsters]
        .sort((a, b) => (b.atk || 0) - (a.atk || 0))
        .slice(0, 3);

      // Build readable text
      const text = `My Deck: "${currentDeck.name}"${currentDeck.archetype ? ` (${currentDeck.archetype})` : ""}

Card Composition:
- ${monsters.length} Monsters (${Object.keys(monstersByLevel).length} different levels)
- ${spells.length} Spells
- ${traps.length} Traps
- Total: ${currentDeck.cards.length} cards

Strongest Monsters:
${strongestMonsters.map((m, i) => `${i + 1}. ${m.name} - Level ${m.level || "?"}, ${m.atk || 0} ATK / ${m.def || 0} DEF`).join("\n")}

Level Distribution:
${Object.entries(monstersByLevel)
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(
    ([level, cards]) =>
      `- Level ${level}: ${cards.length} monster${cards.length > 1 ? "s" : ""} (${cards.map((c) => c.name).join(", ")})`
  )
  .join("\n")}

Available Decks: ${decks.length} total (${decks.map((d) => d.name).join(", ")})`;

      // Structured values for template substitution
      const values = {
        deckId: currentDeck.deckId,
        deckName: currentDeck.name,
        archetype: currentDeck.archetype,
        totalCards: currentDeck.cards.length,
        monsterCount: monsters.length,
        spellCount: spells.length,
        trapCount: traps.length,
        availableDecks: decks.length,
      };

      // Structured data for programmatic access
      const data = {
        currentDeck,
        allDecks: decks,
        composition: {
          monsters,
          spells,
          traps,
          monstersByLevel,
        },
        strongestMonsters,
      };

      return { text, values, data };
    } catch (error) {
      logger.error({ error }, "Error fetching deck information");

      const errorMessage = error instanceof Error ? error.message : "Unknown error fetching deck";

      return {
        text: `Error fetching deck: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};
