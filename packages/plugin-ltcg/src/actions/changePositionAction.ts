/**
 * Change Position Action
 *
 * Allows the agent to change a monster's battle position.
 * Can switch between attack and defense position.
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
import type { GameStateResponse } from "../types/api";
import { extractJsonFromLlmResponse } from "../utils/safeParseJson";

export const changePositionAction: Action = {
  name: "CHANGE_POSITION",
  similes: ["SWITCH_POSITION", "FLIP_POSITION", "DEFENSE_MODE", "ATTACK_MODE"],
  description: "Change a monster's battle position between attack and defense",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for change position validation");
        return false;
      }

      // Must be Main Phase
      if (gameState.phase !== "main1" && gameState.phase !== "main2") {
        logger.debug(`Cannot change position in ${gameState.phase} phase`);
        return false;
      }

      // Must have monsters that can change position
      const myMonsters = gameState.hostPlayer.monsterZone;
      const canChangePosition = gameState.canChangePosition || [];

      const changeableMonsters = myMonsters.filter((_monster, idx) => {
        // Check if this monster can change position (not already changed this turn)
        return canChangePosition[idx] !== false;
      });

      if (changeableMonsters.length === 0) {
        logger.debug("No monsters can change position");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating change position action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling CHANGE_POSITION action");

      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, _message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        throw new Error("Failed to get game state");
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

      // Get changeable monsters
      const myMonsters = gameState.hostPlayer.monsterZone;
      const canChangePosition = gameState.canChangePosition || [];

      const changeableMonsters = myMonsters
        .map((monster, idx) => ({
          monster,
          boardIndex: idx,
          canChange: canChangePosition[idx] !== false,
        }))
        .filter((m) => m.canChange);

      // Use LLM to select which monster to change position
      const monsterOptions = changeableMonsters
        .map(
          (m, idx) =>
            `${idx + 1}. ${m.monster.name} (${m.monster.atk} ATK / ${m.monster.def} DEF) - Currently in ${m.monster.position} position`
        )
        .join("\n");

      const boardContext = `
Game State:
- Your LP: ${gameState.hostPlayer.lifePoints}
- Opponent LP: ${gameState.opponentPlayer.lifePoints}
- Opponent monsters: ${gameState.opponentPlayer.monsterZone.length}
- Opponent's strongest ATK: ${Math.max(...gameState.opponentPlayer.monsterZone.map((m) => m.atk), 0)}
`;

      const prompt = `${boardContext}

Your monsters that can change position:
${monsterOptions}

Select which monster to change position.
Consider:
- Switch to defense if threatened by stronger monsters
- Switch to attack if you want to battle
- Keep strong ATK monsters in attack position
- Protect weak monsters in defense position

Respond with JSON: { "monsterIndex": <index>, "reasoning": "<brief explanation>" }`;

      const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.7,
        maxTokens: 200,
      });

      // Parse LLM decision
      const parsed = extractJsonFromLlmResponse(decision, {
        monsterIndex: 0,
        newPosition: "defense",
      });
      const selected = changeableMonsters[parsed.monsterIndex];

      if (!selected) {
        throw new Error("Invalid monster selection");
      }

      // Determine new position
      const newPosition = selected.monster.position === "attack" ? "defense" : "attack";

      // Make API call
      const result = await client.changePosition({
        gameId: gameState.gameId,
        boardIndex: selected.boardIndex,
        newPosition,
      });

      // Callback to user
      const responseText = `I switch ${selected.monster.name} to ${newPosition} position!`;

      await callback({
        text: responseText,
        actions: ["CHANGE_POSITION"],
        thought: `Switching ${selected.monster.name} to ${newPosition} position to ${newPosition === "defense" ? "protect against stronger opponent monsters" : "prepare for offensive battle phase"}`,
      } as Content);

      return {
        success: true,
        text: `Successfully changed ${selected.monster.name} to ${newPosition} position`,
        values: {
          monsterName: selected.monster.name,
          oldPosition: selected.monster.position,
          newPosition,
        },
        data: {
          actionName: "CHANGE_POSITION",
          monster: selected.monster,
          newPosition,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in CHANGE_POSITION action");

      await callback({
        text: `Failed to change position: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Position change failed, monster may have already changed position this turn or invalid selection",
      } as Content);

      return {
        success: false,
        text: "Failed to change monster position",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Their monster is too strong, I need to defend",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I switch Kuriboh to defense position!",
          actions: ["CHANGE_POSITION"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Time to go on the offensive",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I switch Blue-Eyes White Dragon to attack position!",
          actions: ["CHANGE_POSITION"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Better protect my weaker monsters",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I switch my monster to defense position!",
          actions: ["CHANGE_POSITION"],
        },
      },
    ],
  ],
};
