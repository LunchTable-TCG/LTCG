/**
 * Flip Summon Action
 *
 * Allows the agent to flip a face-down monster to face-up attack position.
 * Strategic for triggering flip effects and transitioning to offensive play.
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

export const flipSummonAction: Action = {
  name: "FLIP_SUMMON",
  similes: ["FLIP", "FLIP_UP", "REVEAL_MONSTER"],
  description: "Flip a face-down monster to face-up attack position",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for flip summon validation");
        return false;
      }

      // Must be in Main Phase
      if (gameState.phase !== "main1" && gameState.phase !== "main2") {
        logger.debug(`Cannot flip summon in ${gameState.phase} phase`);
        return false;
      }

      // Must have at least one face-down monster
      const faceDownMonsters = gameState.hostPlayer.monsterZone.filter(
        (monster) => monster.position === "facedown"
      );

      if (faceDownMonsters.length === 0) {
        logger.debug("No face-down monsters available");
        return false;
      }

      // Note: In a real implementation, you'd also check:
      // - If monster has been set for at least 1 turn
      // - If player hasn't used their Normal Summon yet (flip summon uses it)
      // For now, we assume if face-down monsters exist, they can be flip summoned

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating flip summon action");
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
      logger.info("Handling FLIP_SUMMON action");

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

      // Get face-down monsters
      const faceDownMonsters = gameState.hostPlayer.monsterZone.filter(
        (monster) => monster.position === "facedown"
      );

      if (faceDownMonsters.length === 0) {
        throw new Error("No face-down monsters available");
      }

      // Format monster options
      const monsterOptions = faceDownMonsters
        .map(
          (monster, idx) =>
            `${idx + 1}. Face-down monster at position ${monster.boardIndex} (${monster.name || "Unknown"})`
        )
        .join("\n");

      // Get opponent's strongest monster for comparison
      const opponentMonsters = gameState.opponentPlayer.monsterZone;
      const opponentStrongestAtk =
        opponentMonsters.length > 0 ? Math.max(...opponentMonsters.map((m) => m.atk)) : 0;

      const boardContext = `
Game State:
- Your LP: ${gameState.hostPlayer.lifePoints}
- Opponent LP: ${gameState.opponentPlayer.lifePoints}
- Current Phase: ${gameState.phase}
- Board Advantage: ${boardAnalysis?.advantage || "UNKNOWN"}
- Opponent's Strongest ATK: ${opponentStrongestAtk}
- Opponent Monsters: ${opponentMonsters.length}
- Opponent Backrow: ${gameState.opponentPlayer.spellTrapZone.length} (may have traps)
`;

      const prompt = `${boardContext}

Your Face-Down Monsters:
${monsterOptions}

Decision: Which face-down monster should you flip summon?
Consider:
- What is the flip effect? Is it useful now?
- Is the monster's ATK high enough to be useful in attack position?
- Could the flip effect help your strategy?
- Is it safe to flip now, or might opponent have removal?

Respond with JSON: { "monsterIndex": <index>, "reasoning": "<brief explanation>" }`;

      const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.7,
        maxTokens: 250,
      });

      // Parse LLM decision
      const parsed = extractJsonFromLlmResponse(decision, { monsterIndex: 0, reasoning: "" });
      const selectedMonster = faceDownMonsters[parsed.monsterIndex];

      if (!selectedMonster) {
        throw new Error("Invalid monster selection");
      }

      // Make API call
      const result = await client.flipSummon({
        gameId: gameState.gameId,
        boardIndex: selectedMonster.boardIndex,
      });

      // Callback to user
      const responseText = `I flip summon ${selectedMonster.name}!`;

      await callback({
        text: responseText,
        actions: ["FLIP_SUMMON"],
        source: message.content.source,
        thought: `Flip summoning ${selectedMonster.name} to trigger flip effect and transition to attack position for offensive pressure`,
      } as Content);

      return {
        success: true,
        text: `Successfully flip summoned ${selectedMonster.name}`,
        values: {
          monsterName: selectedMonster.name,
          atk: selectedMonster.atk,
          def: selectedMonster.def,
          level: selectedMonster.level,
          reasoning: parsed.reasoning,
        },
        data: {
          actionName: "FLIP_SUMMON",
          monsterFlipped: selectedMonster,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in FLIP_SUMMON action");

      await callback({
        text: `Failed to flip summon: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Flip summon failed, monster may not have been set for required duration or normal summon already used",
      } as Content);

      return {
        success: false,
        text: "Failed to flip summon",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Time to reveal my face-down monster",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I flip summon Man-Eater Bug!",
          actions: ["FLIP_SUMMON"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I need to trigger that flip effect",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I flip summon Magician of Faith to get back my spell!",
          actions: ["FLIP_SUMMON"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Let me switch to offense",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I flip summon my face-down monster into attack position!",
          actions: ["FLIP_SUMMON"],
        },
      },
    ],
  ],
};
