/**
 * Activate Spell Action
 *
 * Allows the agent to activate a spell card from hand or field.
 * Handles targeting if required by the spell effect.
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
import type {
  CardInHand,
  GameStateResponse,
  SpellTrapCard,
} from "../types/api";
import { extractJsonFromLlmResponse } from "../utils/safeParseJson";

export const activateSpellAction: Action = {
  name: "ACTIVATE_SPELL",
  similes: ["CAST_SPELL", "USE_SPELL", "ACTIVATE"],
  description: "Activate a spell card from your hand or field",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
  ): Promise<boolean> => {
    try {
      // Get game state
      const gameStateResult = await gameStateProvider.get(
        runtime,
        message,
        state,
      );
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for activate spell validation");
        return false;
      }

      // Check hand for spell cards
      const handResult = await handProvider.get(runtime, message, state);
      const hand = handResult.data?.hand as CardInHand[];

      const spellsInHand =
        hand?.filter((card) => card.cardType === "spell") || [];

      // Check field for face-up spells that can be activated
      // spellTrapZone items use `type` field (not `cardType`)
      const spellsOnField = gameState.hostPlayer.spellTrapZone.filter(
        (card) => card.type === "spell" && card.faceUp,
      );

      const hasActivatableSpells =
        spellsInHand.length > 0 || spellsOnField.length > 0;

      if (!hasActivatableSpells) {
        logger.debug("No activatable spell cards");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating activate spell action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling ACTIVATE_SPELL action");

      // Get game state and hand
      const gameStateResult = await gameStateProvider.get(
        runtime,
        message,
        state,
      );
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

      // Get activatable spells
      const spellsInHand = hand.filter((card) => card.cardType === "spell");
      // spellTrapZone items use `type` field (not `cardType`)
      const spellsOnField = gameState.hostPlayer.spellTrapZone.filter(
        (card) => card.type === "spell" && card.faceUp,
      );

      // Use LLM to select which spell to activate
      const handOptions = spellsInHand
        .map(
          (card, idx) =>
            `Hand ${idx + 1}. ${card.name} - ${card.description?.substring(0, 100) || "No description"}`,
        )
        .join("\n");

      const fieldOptions = spellsOnField
        .map(
          (card, idx) =>
            `Field ${idx + 1}. ${card.name} - ${card.description?.substring(0, 100) || "No description"}`,
        )
        .join("\n");

      const boardContext = `
Game State:
- Your LP: ${gameState.myLifePoints}
- Opponent LP: ${gameState.opponentLifePoints}
- Your monsters: ${gameState.myBoard.length}
- Opponent monsters: ${gameState.opponentBoard.length}
`;

      const prompt = `${boardContext}

Available spells to activate:
From Hand:
${handOptions || "None"}

From Field:
${fieldOptions || "None"}

Select which spell to activate and consider if you need targets.

Respond with JSON: { "location": "hand" or "field", "index": <index>, "targets": [<indices if needed>] }`;

      const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.7,
        maxTokens: 250,
      });

      // Parse LLM decision
      const parsed = extractJsonFromLlmResponse(decision, {
        location: "hand",
        index: 0,
        targets: [],
      });

      let selectedCard: CardInHand | SpellTrapCard | undefined;

      if (parsed.location === "hand") {
        selectedCard = spellsInHand[parsed.index];
      } else {
        selectedCard = spellsOnField[parsed.index];
      }

      if (!selectedCard) {
        throw new Error("Invalid spell selection");
      }

      // Make API call
      const cardId =
        parsed.location === "hand"
          ? (selectedCard as CardInHand)._id
          : (selectedCard as SpellTrapCard).cardId;
      const result = await client.activateSpell({
        gameId: gameState.gameId,
        cardId,
        targets: parsed.targets?.map((t: any) =>
          typeof t === "string" ? t : String(t),
        ),
      });

      // Callback to user
      const responseText = `I activate ${selectedCard.name}!`;

      await callback({
        text: responseText,
        actions: ["ACTIVATE_SPELL"],
        source: message.content.source,
        thought: `Activating ${selectedCard.name} from ${parsed.location} to leverage spell effect at optimal timing for board control`,
      } as Content);

      return {
        success: true,
        text: `Successfully activated ${selectedCard.name}`,
        values: {
          spellName: selectedCard.name,
          location: parsed.location,
        },
        data: {
          actionName: "ACTIVATE_SPELL",
          spellActivated: selectedCard,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in ACTIVATE_SPELL action");

      await callback({
        text: `Failed to activate spell: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Spell activation failed due to invalid targeting, timing restrictions, or missing activation conditions",
      } as Content);

      return {
        success: false,
        text: "Failed to activate spell",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "I need to destroy that monster",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I activate Dark Hole!",
          actions: ["ACTIVATE_SPELL"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Let me boost my monster",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I activate Polymerization!",
          actions: ["ACTIVATE_SPELL"],
        },
      },
    ],
  ],
};
