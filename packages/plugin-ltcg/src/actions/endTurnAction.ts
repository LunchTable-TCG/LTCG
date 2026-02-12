/**
 * End Turn Action
 *
 * Allows the agent to end their current turn and pass to the opponent.
 * Always valid when it's the agent's turn.
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
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import { gameStateProvider } from "../providers/gameStateProvider";
import type { GameStateResponse } from "../types/api";

export const endTurnAction: Action = {
  name: "END_TURN",
  similes: ["PASS_TURN", "FINISH_TURN", "END"],
  description: "End your current turn and pass to the opponent",

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
        logger.warn("No game state available for end turn validation");
        return false;
      }

      // Check if it's our turn
      const isMyTurn = gameStateResult.data?.isMyTurn;

      if (!isMyTurn) {
        logger.debug("Cannot end turn when it is not your turn");
        return false;
      }

      // Always valid when it's your turn
      return true;
    } catch (error) {
      logger.error({ error }, "Error validating end turn action");
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
      logger.info("Handling END_TURN action");

      // Get game state
      const gameStateResult = await gameStateProvider.get(
        runtime,
        message,
        state,
      );
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

      // Make API call
      const result = await client.endTurn({
        gameId: gameState.gameId,
      });

      // Callback to user
      const responseText = "I end my turn.";

      await callback({
        text: responseText,
        actions: ["END_TURN"],
        source: message.content.source,
        thought:
          "Ending turn as all available moves have been evaluated and executed for optimal board position",
      } as Content);

      return {
        success: true,
        text: "Successfully ended turn",
        values: {
          turnNumber: gameState.turnNumber,
        },
        data: {
          actionName: "END_TURN",
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in END_TURN action");

      await callback({
        text: `Failed to end turn: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "End turn action failed due to API communication error or game state inconsistency",
      } as Content);

      return {
        success: false,
        text: "Failed to end turn",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "I have no more moves to make",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I end my turn.",
          actions: ["END_TURN"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "My board is set up, time to pass",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I end my turn.",
          actions: ["END_TURN"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Nothing else I can do this turn",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I end my turn.",
          actions: ["END_TURN"],
        },
      },
    ],
  ],
};
