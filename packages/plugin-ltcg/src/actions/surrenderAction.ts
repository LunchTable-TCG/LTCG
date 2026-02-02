/**
 * Surrender Action
 *
 * Forfeit the current game and concede the match to the opponent.
 * Clears the current game state from runtime.
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

export const surrenderAction: Action = {
  name: "SURRENDER",
  similes: ["FORFEIT", "CONCEDE", "GIVE_UP"],
  description: "Forfeit the current game",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Must be in an active game
      const currentGameId = state.values.LTCG_CURRENT_GAME_ID;
      if (!currentGameId) {
        logger.debug("No active game to surrender");
        return false;
      }

      // Check API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

      if (!apiKey || !apiUrl) {
        logger.warn("LTCG API credentials not configured");
        return false;
      }

      // Get game state to verify game is not already completed
      try {
        const gameStateResult = await gameStateProvider.get(runtime, message, state);
        const gameState = gameStateResult.data?.gameState as GameStateResponse;

        if (!gameState) {
          logger.debug("Could not get game state");
          return false;
        }

        if (gameState.status === "completed") {
          logger.debug("Game already completed");
          return false;
        }

        return true;
      } catch (error) {
        // If we can't get game state, still allow surrender as cleanup
        logger.warn({ error }, "Could not verify game state, allowing surrender");
        return true;
      }
    } catch (error) {
      logger.error({ error }, "Error validating surrender action");
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
      logger.info("Handling SURRENDER action");

      // Get current game ID
      const gameId = state.values.LTCG_CURRENT_GAME_ID as string;

      if (!gameId) {
        throw new Error("No active game found");
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

      // Optional confirmation via LLM
      const autoSurrender = runtime.getSetting("LTCG_AUTO_SURRENDER");
      if (autoSurrender !== "true") {
        // Ask LLM for confirmation
        const gameStateResult = await gameStateProvider.get(runtime, message, state);
        const gameState = gameStateResult.data?.gameState as GameStateResponse;

        if (gameState) {
          const prompt = `You are about to surrender this game.

Current Game State:
- Your LP: ${gameState.hostPlayer.lifePoints}
- Opponent LP: ${gameState.opponentPlayer.lifePoints}
- Your monsters: ${gameState.hostPlayer.monsterZone.length}
- Opponent monsters: ${gameState.opponentPlayer.monsterZone.length}
- Turn: ${gameState.turnNumber}

Are you sure you want to surrender? This will count as a loss.

Respond with JSON: { "confirm": true or false }`;

          const decision = await runtime.useModel(ModelType.TEXT_GENERATION, {
            prompt,
            temperature: 0.3,
            maxTokens: 20,
          });

          const parsed = extractJsonFromLlmResponse(decision, { confirm: false });
          if (!parsed.confirm) {
            await callback({
              text: "Surrender cancelled. Continuing the game.",
              actions: ["SURRENDER"],
              source: message.content.source,
              thought:
                "Evaluated game state and decided to continue fighting instead of surrendering",
            } as Content);

            return {
              success: false,
              text: "Surrender cancelled by agent decision",
            };
          }
        }
      }

      // Surrender the game
      const result = await client.surrender({ gameId });

      // Clear game ID from runtime state
      await runtime.delete?.("LTCG_CURRENT_GAME_ID");

      // Also clear lobby ID if present
      await runtime.delete?.("LTCG_CURRENT_LOBBY_ID");

      await callback({
        text: `Surrendered the game. ${result.message}`,
        actions: ["SURRENDER"],
        source: message.content.source,
        thought:
          "Decided to surrender as game state is unwinnable or continuation would waste resources",
      } as Content);

      return {
        success: true,
        text: "Successfully surrendered",
        values: {
          gameId,
          message: result.message,
        },
        data: {
          actionName: "SURRENDER",
          gameId,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in SURRENDER action");

      // Even if API call failed, try to clean up state
      try {
        await runtime.delete?.("LTCG_CURRENT_GAME_ID");
        await runtime.delete?.("LTCG_CURRENT_LOBBY_ID");
      } catch (cleanupError) {
        logger.error({ cleanupError }, "Failed to clean up state after surrender error");
      }

      await callback({
        text: `Failed to surrender: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Surrender attempt failed due to API error or game already ended, but cleaning up local state",
      } as Content);

      return {
        success: false,
        text: "Failed to surrender",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "I can't win this, I surrender",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Surrendered the game. Game ended by surrender.",
          actions: ["SURRENDER"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Forfeit the match",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Surrendered the game. Game ended by surrender.",
          actions: ["SURRENDER"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Give up, opponent is too strong",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Surrendered the game. Game ended by surrender.",
          actions: ["SURRENDER"],
        },
      },
    ],
  ],
};
