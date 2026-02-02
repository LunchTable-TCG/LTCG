/**
 * Join Lobby Action
 *
 * Join a specific lobby by ID or join code.
 * Supports both public lobbies (by ID) and private lobbies (by join code).
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

export const joinLobbyAction: Action = {
  name: "JOIN_LOBBY",
  similes: ["ENTER_GAME", "JOIN_MATCH", "ACCEPT_CHALLENGE"],
  description: "Join a specific lobby by ID or join code",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Check if already in a game
      const currentGameId = state.values.LTCG_CURRENT_GAME_ID;
      if (currentGameId) {
        logger.debug("Agent already in a game");
        return false;
      }

      // Check API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

      if (!apiKey || !apiUrl) {
        logger.warn("LTCG API credentials not configured");
        return false;
      }

      // Check if message contains lobby ID or join code
      const messageText = message.content.text || "";
      const hasLobbyId = /lobby[:\s]*([a-zA-Z0-9\-_]+)/i.test(messageText);
      const hasJoinCode = /(?:code|join)[:\s]*([A-Z0-9]{6})/i.test(messageText);

      if (!hasLobbyId && !hasJoinCode) {
        logger.debug("No lobby ID or join code found in message");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating join lobby action");
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
      logger.info("Handling JOIN_LOBBY action");

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

      // Extract lobby ID or join code from message
      const messageText = message.content.text || "";
      let lobbyId: string | undefined;
      let joinCode: string | undefined;

      const lobbyIdMatch = messageText.match(/lobby[:\s]*([a-zA-Z0-9\-_]+)/i);
      const joinCodeMatch = messageText.match(/(?:code|join)[:\s]*([A-Z0-9]{6})/i);

      if (joinCodeMatch) {
        joinCode = joinCodeMatch[1]?.toUpperCase();
        logger.debug(`Extracted join code: ${joinCode}`);
      } else if (lobbyIdMatch) {
        lobbyId = lobbyIdMatch[1];
        logger.debug(`Extracted lobby ID: ${lobbyId}`);
      } else {
        throw new Error(
          'Could not extract lobby ID or join code. Please provide in format "lobby: <id>" or "code: <code>"'
        );
      }

      // Get deck preference
      let deckId = runtime.getSetting("LTCG_PREFERRED_DECK_ID") as string;

      if (!deckId) {
        // Use first available deck
        const decks = await client.getDecks();
        if (decks.length === 0) {
          throw new Error("No decks available. Please create a deck first.");
        }
        deckId = decks[0]?.deckId;
        logger.debug(`Using first available deck: ${deckId}`);
      }

      // Join lobby
      const result = await client.joinLobby({
        lobbyId,
        joinCode,
        deckId,
      });

      // Store game ID in runtime state
      state.values.LTCG_CURRENT_GAME_ID = result.gameId;

      const responseText = `Successfully joined game with ${result.opponentName}!\nGame ID: ${result.gameId.slice(0, 8)}...`;

      await callback({
        text: responseText,
        actions: ["JOIN_LOBBY"],
        source: message.content.source,
        thought: `Successfully joined lobby ${joinCode ? "using private join code" : "by lobby ID"} and matched with opponent`,
      } as Content);

      return {
        success: true,
        text: "Successfully joined lobby",
        values: {
          gameId: result.gameId,
          opponentName: result.opponentName,
          joinedVia: joinCode ? "joinCode" : "lobbyId",
        },
        data: {
          actionName: "JOIN_LOBBY",
          gameId: result.gameId,
          opponentName: result.opponentName,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in JOIN_LOBBY action");

      await callback({
        text: `Failed to join lobby: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought: "Join lobby failed due to invalid lobby ID/code, lobby full, or connection error",
      } as Content);

      return {
        success: false,
        text: "Failed to join lobby",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Join lobby: abc123-def456-ghi789",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully joined game with OpponentAgent!\nGame ID: abc123...",
          actions: ["JOIN_LOBBY"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Join with code: XYZ789",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully joined game with FriendAgent!\nGame ID: def456...",
          actions: ["JOIN_LOBBY"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Accept challenge, join code ABC123",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully joined game with ChallengerAgent!\nGame ID: ghi789...",
          actions: ["JOIN_LOBBY"],
        },
      },
    ],
  ],
};
