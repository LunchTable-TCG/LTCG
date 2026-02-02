/**
 * Attack Action
 *
 * Allows the agent to declare an attack with a monster.
 * Can target opponent's monster or declare direct attack.
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
import { boardAnalysisProvider } from "../providers/boardAnalysisProvider";
import { gameStateProvider } from "../providers/gameStateProvider";
import type { GameStateResponse } from "../types/api";
import { extractJsonFromLlmResponse } from "../utils/safeParseJson";

export const attackAction: Action = {
  name: "ATTACK",
  similes: ["ATTACK_OPPONENT", "BATTLE", "DECLARE_ATTACK"],
  description: "Declare an attack with one of your monsters",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for attack validation");
        return false;
      }

      // Must be Battle Phase
      if (gameState.phase !== "battle") {
        logger.debug(`Cannot attack in ${gameState.phase} phase`);
        return false;
      }

      // Must have at least one monster that can attack
      const myMonsters = gameState.hostPlayer.monsterZone;
      const canAttackMonsters = myMonsters.filter((monster) => monster.canAttack);

      if (canAttackMonsters.length === 0) {
        logger.debug("No monsters can attack");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating attack action");
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
      logger.info("Handling ATTACK action");

      // Get game state and board analysis
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      const boardAnalysisResult = await boardAnalysisProvider.get(runtime, message, state);
      const boardAnalysis = boardAnalysisResult.data;

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

      // Get attackers and targets
      const myMonsters = gameState.hostPlayer.monsterZone;
      const attackers = myMonsters.filter((monster) => monster.canAttack);
      const opponentMonsters = gameState.opponentPlayer.monsterZone;

      // Build attack options
      const attackerOptions = attackers
        .map(
          (monster, idx) =>
            `${idx + 1}. ${monster.name} (${monster.atk} ATK, Position: ${monster.position})`
        )
        .join("\n");

      const targetOptions =
        opponentMonsters.length > 0
          ? opponentMonsters
              .map(
                (monster, idx) =>
                  `${idx + 1}. ${monster.name} (${monster.faceUp ? `${monster.atk} ATK, ${monster.def} DEF` : "Face-down"}, Position: ${monster.position})`
              )
              .join("\n")
          : "None - direct attack available";

      const boardContext = `
Game State:
- Your LP: ${gameState.hostPlayer.lifePoints}
- Opponent LP: ${gameState.opponentPlayer.lifePoints}
- Board Advantage: ${boardAnalysis?.advantage || "UNKNOWN"}
- Opponent Backrow: ${gameState.opponentPlayer.spellTrapZone.length} cards (may have traps!)
`;

      const prompt = `${boardContext}

Your Attackers:
${attackerOptions}

Opponent's Monsters:
${targetOptions}

Select which monster to attack with and what to target.
Consider:
- Will you win the battle? (Compare ATK values)
- Could opponent have Mirror Force or other traps?
- Is direct attack safe?

Respond with JSON: { "attackerIndex": <index>, "targetIndex": <index or null for direct>, "reasoning": "<brief>" }`;

      const decision = await runtime.useModel(ModelType.TEXT_GENERATION, {
        prompt,
        temperature: 0.7,
        maxTokens: 250,
      });

      // Parse LLM decision
      const parsed = extractJsonFromLlmResponse(decision, { attackerIndex: 0, targetIndex: null });
      const attacker = attackers[parsed.attackerIndex];

      if (!attacker) {
        throw new Error("Invalid attacker selection");
      }

      // Make API call
      const result = await client.attack({
        gameId: gameState.gameId,
        attackerBoardIndex: attacker.boardIndex,
        targetBoardIndex: parsed.targetIndex !== null ? parsed.targetIndex : undefined,
      });

      // Callback to user
      const target =
        parsed.targetIndex !== null
          ? opponentMonsters[parsed.targetIndex]?.name || "unknown target"
          : "directly";

      const responseText = `${attacker.name} attacks ${target}!`;

      await callback({
        text: responseText,
        actions: ["ATTACK"],
        source: message.content.source,
        thought: `Attacking ${parsed.targetIndex !== null ? "opponent monster to remove board threat" : "directly to reduce opponent life points"} with ${attacker.name} (${attacker.atk} ATK)`,
      } as Content);

      return {
        success: true,
        text: `Successfully declared attack with ${attacker.name}`,
        values: {
          attackerName: attacker.name,
          attackerAtk: attacker.atk,
          isDirect: parsed.targetIndex === null,
          targetName:
            parsed.targetIndex !== null ? opponentMonsters[parsed.targetIndex]?.name : null,
        },
        data: {
          actionName: "ATTACK",
          attacker,
          targetIndex: parsed.targetIndex,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in ATTACK action");

      await callback({
        text: `Failed to attack: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Attack action failed, likely due to invalid target or battle phase timing restrictions",
      } as Content);

      return {
        success: false,
        text: "Failed to declare attack",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "I should attack their weak monster",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Blue-Eyes White Dragon attacks Dark Magician!",
          actions: ["ATTACK"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "They have no monsters, direct attack!",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Celtic Guardian attacks directly!",
          actions: ["ATTACK"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Time to finish them off",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "All monsters attack directly for game!",
          actions: ["ATTACK"],
        },
      },
    ],
  ],
};
