/**
 * Summon Monster Action
 *
 * Allows the agent to summon a monster from hand to the field.
 * Handles tribute requirements for Level 5-6 (1 tribute) and Level 7+ (2 tributes).
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

export const summonAction: Action = {
  name: "SUMMON_MONSTER",
  similes: ["SUMMON", "PLAY_MONSTER", "NORMAL_SUMMON"],
  description: "Summon a monster from your hand to the field",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for summon validation");
        return false;
      }

      // Must be in Main Phase
      if (gameState.phase !== "main1" && gameState.phase !== "main2") {
        logger.debug(`Cannot summon in ${gameState.phase} phase`);
        return false;
      }

      // Must not have already summoned this turn
      if (gameState.hasNormalSummoned) {
        logger.debug("Already summoned this turn");
        return false;
      }

      // Must have summonable monsters in hand
      const handResult = await handProvider.get(runtime, message, state);
      const hand = handResult.data?.hand as CardInHand[];

      if (!hand || hand.length === 0) {
        logger.debug("Hand is empty");
        return false;
      }

      // Check for summonable monsters
      const monstersOnField = gameState.hostPlayer.monsterZone.length;
      const summonableMonsters = hand.filter((card) => {
        if (card.type !== "creature") return false;

        const level = card.level || 0;

        // Level 1-4: No tributes needed
        if (level <= 4) return true;

        // Level 5-6: Need 1 tribute
        if (level <= 6) return monstersOnField >= 1;

        // Level 7+: Need 2 tributes
        return monstersOnField >= 2;
      });

      if (summonableMonsters.length === 0) {
        logger.debug("No summonable monsters in hand");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating summon action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling SUMMON_MONSTER action");

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

      // Get summonable monsters
      const monstersOnField = gameState.hostPlayer.monsterZone;
      const summonableMonsters = hand.filter((card) => {
        if (card.type !== "creature") return false;

        const level = card.level || 0;

        if (level <= 4) return true;
        if (level <= 6) return monstersOnField.length >= 1;
        return monstersOnField.length >= 2;
      });

      // Use LLM to select which monster to summon
      const monsterOptions = summonableMonsters
        .map(
          (card, idx) =>
            `${idx + 1}. ${card.name} (Level ${card.level}, ${card.atk} ATK, ${card.def} DEF)${
              (card.level || 0) > 6
                ? " - requires 2 tributes"
                : (card.level || 0) >= 5
                  ? " - requires 1 tribute"
                  : ""
            }`
        )
        .join("\n");

      const boardContext = `
Game State:
- Your LP: ${gameState.hostPlayer.lifePoints}
- Opponent LP: ${gameState.opponentPlayer.lifePoints}
- Your field: ${monstersOnField.length} monsters
- Opponent field: ${gameState.opponentPlayer.monsterZone.length} monsters
`;

      const prompt = `${boardContext}

You can summon one of these monsters:
${monsterOptions}

Select which monster to summon and in what position (attack or defense).
Consider the board state and choose strategically.

Respond with JSON: { "handIndex": <index>, "position": "attack" or "defense", "tributeIndices": [<indices if needed>] }`;

      const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.7,
        maxTokens: 200,
      });

      // Parse LLM decision
      const parsed = extractJsonFromLlmResponse(decision, {
        handIndex: 0,
        position: "attack",
        tributeIndices: [],
      });
      const selectedCard = summonableMonsters[parsed.handIndex];

      if (!selectedCard) {
        throw new Error("Invalid monster selection");
      }

      // Determine tributes if needed
      const level = selectedCard.level || 0;
      let tributeIndices: number[] = [];

      if (level >= 5) {
        const tributesNeeded = level >= 7 ? 2 : 1;

        // Use provided tribute indices or select automatically
        if (parsed.tributeIndices && parsed.tributeIndices.length >= tributesNeeded) {
          tributeIndices = parsed.tributeIndices.slice(0, tributesNeeded);
        } else {
          // Auto-select weakest monsters as tributes
          const sortedMonsters = [...monstersOnField]
            .map((m, idx) => ({ monster: m, boardIndex: idx }))
            .sort((a, b) => a.monster.atk - b.monster.atk);

          tributeIndices = sortedMonsters.slice(0, tributesNeeded).map((m) => m.boardIndex);
        }
      }

      // Make API call
      const position = (parsed.position === "defense" ? "defense" : "attack") as
        | "attack"
        | "defense";
      const result = await client.summon({
        gameId: gameState.gameId,
        handIndex: selectedCard.handIndex ?? 0,
        position,
        tributeIndices: tributeIndices.length > 0 ? tributeIndices : undefined,
      });

      // Callback to user
      const responseText = `I summon ${selectedCard.name} in ${parsed.position || "attack"} position!${
        tributeIndices.length > 0
          ? ` (Tributed ${tributeIndices.length} monster${tributeIndices.length > 1 ? "s" : ""})`
          : ""
      }`;

      await callback({
        text: responseText,
        actions: ["SUMMON_MONSTER"],
        source: message.content.source,
        thought: `Selected ${selectedCard.name} (${selectedCard.atk} ATK) for optimal field presence${tributeIndices.length > 0 ? ` after tributing ${tributeIndices.length} weaker monster(s)` : " without tributes"}`,
      } as Content);

      return {
        success: true,
        text: `Successfully summoned ${selectedCard.name}`,
        values: {
          monsterName: selectedCard.name,
          position: parsed.position || "attack",
          level: selectedCard.level,
          atk: selectedCard.atk,
          def: selectedCard.def,
          tributeCount: tributeIndices.length,
        },
        data: {
          actionName: "SUMMON_MONSTER",
          cardSummoned: selectedCard,
          tributeIndices,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in SUMMON_MONSTER action");

      await callback({
        text: `Failed to summon monster: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Summon action failed, likely due to invalid tribute selection or game state constraints preventing the summon",
      } as Content);

      return {
        success: false,
        text: "Failed to summon monster",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "I should summon a strong monster",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I summon Blue-Eyes White Dragon in attack position!",
          actions: ["SUMMON_MONSTER"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Let me play a defensive monster",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I summon Marshmallon in defense position!",
          actions: ["SUMMON_MONSTER"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I need to tribute summon my boss monster",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I summon Dark Magician in attack position! (Tributed 1 monster)",
          actions: ["SUMMON_MONSTER"],
        },
      },
    ],
  ],
};
