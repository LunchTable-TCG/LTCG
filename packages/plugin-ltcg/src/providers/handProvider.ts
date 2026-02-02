/**
 * Hand Provider
 *
 * Provides detailed information about cards in agent's hand:
 * - Each card's name, type, level (for monsters)
 * - ATK/DEF values for monsters
 * - Tribute requirements (e.g., "Level 7 - requires 2 tributes")
 * - Special abilities summary
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { CardInHand, GameStateResponse } from "../types/api";

export const handProvider: Provider = {
  name: "LTCG_HAND",
  description: "Provides detailed information about cards currently in your hand",

  async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> {
    try {
      // Get game ID from state first, then message content
      const gameId = state.values?.['LTCG_CURRENT_GAME_ID'] || (message.content as any)?.gameId;

      if (!gameId) {
        return {
          text: "No active game. Use FIND_GAME or JOIN_LOBBY to start playing.",
          values: { error: "NO_GAME_ID" },
          data: {},
        };
      }

      // Get API credentials from runtime settings
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "LTCG API credentials not configured. Please set LTCG_API_KEY and LTCG_API_URL.",
          values: { error: "MISSING_CONFIG" },
          data: {},
        };
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Fetch game state
      const gameState: GameStateResponse = await client.getGameState(gameId);

      // Format hand cards
      const hand = gameState.hand;

      if (hand.length === 0) {
        return {
          text: "Your hand is empty.",
          values: { handSize: 0 },
          data: { hand: [] },
        };
      }

      // Build human-readable text
      let text = `Your Hand (${hand.length} cards):\n`;

      hand.forEach((card, index) => {
        text += `${index + 1}. ${formatCard(card)}\n`;
      });

      // Structured values for template substitution
      // Note: cardType uses 'creature' not 'monster' in the backend schema
      const values = {
        handSize: hand.length,
        hasMonsters: hand.some((c) => c.cardType === "creature"),
        hasSpells: hand.some((c) => c.cardType === "spell"),
        hasTraps: hand.some((c) => c.cardType === "trap"),
        monsterCount: hand.filter((c) => c.cardType === "creature").length,
        spellCount: hand.filter((c) => c.cardType === "spell").length,
        trapCount: hand.filter((c) => c.cardType === "trap").length,
      };

      // Structured data for programmatic access
      const data = {
        hand,
        cardsByType: {
          monsters: hand.filter((c) => c.cardType === "creature"),
          spells: hand.filter((c) => c.cardType === "spell"),
          traps: hand.filter((c) => c.cardType === "trap"),
        },
      };

      return { text, values, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error fetching hand";

      return {
        text: `Error fetching hand: ${errorMessage}`,
        values: { error: "FETCH_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Format a card for display
 * Note: cardType uses 'creature' not 'monster' in the backend schema
 */
function formatCard(card: CardInHand): string {
  if (card.cardType === "creature") {
    const tributeText = getTributeRequirementText(card.cost || 0);
    const abilityText =
      card.abilities && card.abilities.length > 0
        ? `   - Abilities: ${card.abilities.map((a: any) => a.name || a.description).join(", ")}`
        : "   - No special effects";

    return `${card.name} [Creature, Cost ${card.cost || 0}] ATK: ${card.attack || 0}, DEF: ${card.defense || 0}
   - ${tributeText}
${abilityText}`;
  } else if (card.cardType === "spell") {
    const effectText = card.description
      ? `   - Effect: ${card.description}`
      : card.abilities && card.abilities.length > 0
        ? `   - Effect: ${card.abilities.map((a: any) => a.description || a.name).join(", ")}`
        : "";

    return `${card.name} [Spell]
${effectText}`;
  } else if (card.cardType === "trap") {
    const effectText = card.description
      ? `   - Effect: ${card.description}`
      : card.abilities && card.abilities.length > 0
        ? `   - Effect: ${card.abilities.map((a: any) => a.description || a.name).join(", ")}`
        : "";

    return `${card.name} [Trap]
${effectText}`;
  } else {
    // Equipment or other
    return `${card.name} [${card.cardType}]`;
  }
}

/**
 * Get tribute requirement text based on cost
 * Cost 0-4: No tributes, Cost 5-6: 1 tribute, Cost 7+: 2 tributes
 */
function getTributeRequirementText(cost: number): string {
  if (cost <= 4) {
    return "No tributes required";
  } else if (cost <= 6) {
    return "Requires 1 tribute to summon";
  } else {
    return "Requires 2 tributes to summon";
  }
}
