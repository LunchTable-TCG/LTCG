/**
 * Set Card Action
 *
 * Allows the agent to set a card face-down on the field.
 * Can set monsters in defense position or spell/trap cards in backrow.
 */

import type {
  Action,
  ActionResult,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { ModelType, logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import { gameStateProvider } from "../providers/gameStateProvider";
import { handProvider } from "../providers/handProvider";
import type { CardInHand, GameStateResponse } from "../types/api";
import { extractJsonFromLlmResponse } from "../utils/safeParseJson";

export const setCardAction: Action = {
  name: "SET_CARD",
  similes: ["SET", "SET_MONSTER", "SET_SPELL_TRAP"],
  description: "Set a card face-down on the field",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for set validation");
        return false;
      }

      // Must be in Main Phase
      if (gameState.phase !== "main1" && gameState.phase !== "main2") {
        logger.debug(`Cannot set in ${gameState.phase} phase`);
        return false;
      }

      // Must have settable cards in hand
      const handResult = await handProvider.get(runtime, message, state);
      const hand = handResult.data?.hand as CardInHand[];

      if (!hand || hand.length === 0) {
        logger.debug("Hand is empty");
        return false;
      }

      // Check for any cards that can be set
      const monsterZoneFull = gameState.hostPlayer.monsterZone.length >= 5;
      const spellTrapZoneFull = gameState.hostPlayer.spellTrapZone.length >= 5;

      const settableCards = hand.filter((card) => {
        if (card.type === "creature" && !monsterZoneFull) return true;
        if ((card.type === "spell" || card.type === "trap") && !spellTrapZoneFull) return true;
        return false;
      });

      if (settableCards.length === 0) {
        logger.debug("No settable cards or zones full");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating set card action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling SET_CARD action");

      // Get game state and hand
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      const handResult = await handProvider.get(runtime, message, state);
      const hand = handResult.data?.hand as CardInHand[];

      if (!gameState || !hand) {
        throw new Error("Failed to get game state or hand");
      }

      // Get API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

      if (!apiKey || !apiUrl) {
        throw new Error("LTCG API credentials not configured");
      }

      // Create API client
      const client = new LTCGApiClient({
        apiKey,
        baseUrl: apiUrl,
      });

      // Get settable cards
      const monsterZoneFull = gameState.hostPlayer.monsterZone.length >= 5;
      const spellTrapZoneFull = gameState.hostPlayer.spellTrapZone.length >= 5;

      const settableCards = hand.filter((card) => {
        if (card.type === "creature" && !monsterZoneFull) return true;
        if ((card.type === "spell" || card.type === "trap") && !spellTrapZoneFull) return true;
        return false;
      });

      // Use LLM to select which card to set
      // Note: Use cardType (creature/spell/trap) and fall back to type for compatibility
      const cardOptions = settableCards
        .map((card, idx) => {
          const cardTypeName: string = card.cardType || card.type || "unknown";
          const isCreature = cardTypeName === "creature" || cardTypeName === "creature";
          return `${idx + 1}. ${card.name} (${cardTypeName.toUpperCase()})${
            isCreature ? ` - ${card.defense ?? card.def ?? 0} DEF` : ""
          }${card.description ? ` - ${card.description.substring(0, 100)}` : ""}`;
        })
        .join("\n");

      const boardContext = `
Game State:
- Your LP: ${gameState.hostPlayer.lifePoints}
- Opponent LP: ${gameState.opponentPlayer.lifePoints}
- Your monsters: ${gameState.hostPlayer.monsterZone.length}/5
- Your backrow: ${gameState.hostPlayer.spellTrapZone.length}/5
- Opponent monsters: ${gameState.opponentPlayer.monsterZone.length}
- Opponent backrow: ${gameState.opponentPlayer.spellTrapZone.length}
`;

      const prompt = `${boardContext}

You can set one of these cards:
${cardOptions}

Select which card to set. Consider:
- Set defensive monsters if you're threatened
- Set trap cards to protect yourself
- Set spell cards for future use

Respond with JSON: { "handIndex": <index>, "reasoning": "<brief explanation>" }`;

      const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.7,
        maxTokens: 200,
      });

      // Parse LLM decision
      const parsed = extractJsonFromLlmResponse(decision, {
        handIndex: 0,
        zone: "monster",
      });
      const selectedCard = settableCards[parsed.handIndex];

      if (!selectedCard) {
        throw new Error("Invalid card selection");
      }

      // Determine zone based on card type (use cardType, fall back to type)
      const cardTypeName: string = selectedCard.cardType || selectedCard.type || "unknown";
      const isCreature = cardTypeName === "creature" || cardTypeName === "creature";
      const zone = isCreature ? "monster" : "spellTrap";

      // Make API call
      const result = await client.setCard({
        gameId: gameState.gameId,
        handIndex: selectedCard.handIndex ?? 0,
        zone,
      });

      // Callback to user
      const responseText = `I set ${selectedCard.name} face-down!`;

      await callback({
        text: responseText,
        actions: ["SET_CARD"],
        source: message.content.source,
        thought: `Setting ${selectedCard.name} face-down in ${zone} zone to ${selectedCard.type === "creature" ? "protect LP with defense" : "prepare reactive play for future turns"}`,
      } as Content);

      return {
        success: true,
        text: `Successfully set ${selectedCard.name}`,
        values: {
          cardName: selectedCard.name,
          cardType: selectedCard.type,
          zone,
        },
        data: {
          actionName: "SET_CARD",
          cardSet: selectedCard,
          zone,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in SET_CARD action");

      await callback({
        text: `Failed to set card: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Set card action failed, zone may be full or card selection invalid for current game state",
      } as Content);

      return {
        success: false,
        text: "Failed to set card",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "I need to set up some defense",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I set a monster face-down!",
          actions: ["SET_CARD"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Let me prepare a trap",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I set Mirror Force face-down!",
          actions: ["SET_CARD"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I should save this spell for later",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I set a spell card face-down!",
          actions: ["SET_CARD"],
        },
      },
    ],
  ],
};
