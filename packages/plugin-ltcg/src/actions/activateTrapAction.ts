/**
 * Activate Trap Action
 *
 * Allows the agent to activate a set trap card in response to opponent's action.
 * Traps are reactive cards that require strategic timing.
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
import type { GameEvent, GameStateResponse } from "../types/api";
import type { ActionHandlerOptions } from "../types/action";
import { extractJsonFromLlmResponse } from "../utils/safeParseJson";

export const activateTrapAction: Action = {
  name: "ACTIVATE_TRAP",
  similes: ["TRIGGER_TRAP", "USE_TRAP", "SPRING_TRAP"],
  description: "Activate a set trap card in response to opponent's action",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for activate trap validation");
        return false;
      }

      // Must have at least one set trap
      const setTraps = gameState.hostPlayer.spellTrapZone.filter(
        (card) => card.type === "trap" && !card.faceUp
      );

      if (setTraps.length === 0) {
        logger.debug("No set traps available");
        return false;
      }

      // Note: In a real implementation, you'd also check:
      // - If trap has been set for at least 1 turn (unless quick-effect)
      // - If there's a valid activation condition
      // For now, we assume if traps are set, they can be activated

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating activate trap action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: ActionHandlerOptions,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling ACTIVATE_TRAP action");

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

      // Get set traps
      const setTraps = gameState.hostPlayer.spellTrapZone.filter(
        (card) => card.type === "trap" && !card.faceUp
      );

      if (setTraps.length === 0) {
        throw new Error("No set traps available");
      }

      // Get recent game events for context
      let recentEvents: GameEvent[] = [];
      try {
        recentEvents = await client.getGameHistory(gameState.gameId);
        // Get last 3 events for context
        recentEvents = recentEvents.slice(-3);
      } catch (_error) {
        logger.warn("Failed to get game history for trap context");
      }

      // Build context about what just happened
      const recentContext =
        recentEvents.length > 0
          ? recentEvents.map((e) => `- ${e.description}`).join("\n")
          : "No recent events";

      // Format trap options
      const trapOptions = setTraps
        .map((card, idx) => `${idx + 1}. ${card.name} (Set at board position ${card.boardIndex})`)
        .join("\n");

      const boardContext = `
Game Context:
- Your LP: ${gameState.hostPlayer.lifePoints}
- Opponent LP: ${gameState.opponentPlayer.lifePoints}
- Current Phase: ${gameState.phase}
- Board Advantage: ${boardAnalysis?.advantage || "UNKNOWN"}
- Threat Level: ${boardAnalysis?.threatLevel || "UNKNOWN"}

Recent Events:
${recentContext}

Opponent's Field:
- Monsters: ${gameState.opponentPlayer.monsterZone.length}
- Backrow: ${gameState.opponentPlayer.spellTrapZone.length}
`;

      const prompt = `${boardContext}

Your Set Traps:
${trapOptions}

Decision: Should you activate a trap now?
Consider:
- Is this the right moment? (e.g., opponent just attacked, summoned strong monster)
- Will activating now stop a threat or protect your position?
- Or should you wait for a better opportunity?

Respond with JSON: { "shouldActivate": true/false, "trapIndex": <index if activating>, "targets": [<target indices if needed>], "reasoning": "<brief>" }`;

      const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.7,
        maxTokens: 300,
      });

      // Parse LLM decision
      const parsed = extractJsonFromLlmResponse(decision, {
        shouldActivate: false,
        trapIndex: 0,
        targets: [],
        reasoning: "",
      });

      if (!parsed.shouldActivate) {
        // Agent decided not to activate trap
        await callback({
          text: `I'll hold my traps for now. ${parsed.reasoning || ""}`,
          actions: ["ACTIVATE_TRAP"],
          source: message.content.source,
          thought:
            "Choosing not to activate trap now to save resources for more critical moment or better activation window",
        } as Content);

        return {
          success: true,
          text: "Decided not to activate trap",
          values: {
            activated: false,
            reasoning: parsed.reasoning,
          },
          data: {
            actionName: "ACTIVATE_TRAP",
            decision: "hold",
          },
        };
      }

      // Activate the selected trap
      const selectedTrap = setTraps[parsed.trapIndex];

      if (!selectedTrap) {
        throw new Error("Invalid trap selection");
      }

      // Make API call
      const result = await client.activateTrap({
        gameId: gameState.gameId,
        boardIndex: selectedTrap.boardIndex,
        targets: parsed.targets,
      });

      // Callback to user
      const responseText = `I activate my trap card - ${selectedTrap.name}!`;

      await callback({
        text: responseText,
        actions: ["ACTIVATE_TRAP"],
        source: message.content.source,
        thought: `Activating ${selectedTrap.name} now to counter opponent's play and prevent potential damage or board loss`,
      } as Content);

      return {
        success: true,
        text: `Successfully activated ${selectedTrap.name}`,
        values: {
          trapName: selectedTrap.name,
          activated: true,
          reasoning: parsed.reasoning,
        },
        data: {
          actionName: "ACTIVATE_TRAP",
          trapActivated: selectedTrap,
          targets: parsed.targets,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in ACTIVATE_TRAP action");

      await callback({
        text: `Failed to activate trap: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Trap activation failed due to invalid timing window, missing activation conditions, or incorrect targeting",
      } as Content);

      return {
        success: false,
        text: "Failed to activate trap",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Opponent just summoned a strong monster",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I activate my trap card - Trap Hole!",
          actions: ["ACTIVATE_TRAP"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "They're attacking with all monsters",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I activate my trap card - Mirror Force!",
          actions: ["ACTIVATE_TRAP"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Should I activate my trap now?",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I'll hold my traps for now. Better to save them for a critical moment.",
          actions: ["ACTIVATE_TRAP"],
        },
      },
    ],
  ],
};
