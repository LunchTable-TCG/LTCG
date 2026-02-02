/**
 * Find Game Action
 *
 * Automatically find and join an available game through matchmaking.
 * Prioritizes joining existing lobbies, creates new lobby if none available.
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
import { extractJsonFromLlmResponse } from "../utils/safeParseJson";

export const findGameAction: Action = {
  name: "FIND_GAME",
  similes: ["SEARCH_GAME", "MATCHMAKING", "PLAY_GAME"],
  description: "Automatically find and join an available game",

  validate: async (runtime: IAgentRuntime, _message: Memory, state: State): Promise<boolean> => {
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

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating find game action");
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
      logger.info("Handling FIND_GAME action");

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

      // Check auto-matchmaking setting
      const autoMatchmaking = runtime.getSetting("LTCG_AUTO_MATCHMAKING");
      if (autoMatchmaking === "false") {
        await callback({
          text: "Auto-matchmaking is disabled. Please enable it or use CREATE_LOBBY instead.",
          error: true,
          thought: "Cannot proceed with matchmaking as auto-matchmaking is disabled in settings",
        } as Content);

        return {
          success: false,
          text: "Auto-matchmaking disabled",
        };
      }

      // Get deck preference
      let deckId = runtime.getSetting("LTCG_PREFERRED_DECK_ID") as string;

      if (!deckId) {
        // Use starter deck as fallback
        const decks = await client.getDecks();
        if (decks.length === 0) {
          throw new Error("No decks available. Please create a deck first.");
        }
        deckId = decks[0]?.deckId;
        logger.debug(`Using first available deck: ${deckId}`);
      }

      // Get mode preference
      const rankedMode = runtime.getSetting("LTCG_RANKED_MODE") === "true";
      const mode = rankedMode ? "ranked" : "casual";

      // Get available lobbies
      const lobbies = await client.getLobbies(mode);

      let gameId: string;
      let joinedExisting = false;

      if (lobbies.length > 0) {
        // Use LLM to select best lobby
        const lobbyOptions = lobbies
          .map(
            (lobby, idx) =>
              `${idx + 1}. Lobby ${lobby.lobbyId.slice(0, 8)}... - Host: ${lobby.hostPlayerName}, Mode: ${lobby.mode}, Private: ${lobby.isPrivate ? "Yes" : "No"}`
          )
          .join("\n");

        const prompt = `Available game lobbies:
${lobbyOptions}

Select which lobby to join. Consider:
- Public lobbies are easier to join
- Match the mode preference (${mode})
- Newer lobbies may have more active players

Respond with JSON: { "lobbyIndex": <index> }`;

        const decision = await runtime.useModel(ModelType.TEXT_GENERATION, {
          prompt,
          temperature: 0.5,
          maxTokens: 100,
        });

        const parsed = extractJsonFromLlmResponse(decision, { lobbyIndex: 0 });
        const selectedLobby = lobbies[parsed.lobbyIndex];

        if (!selectedLobby) {
          throw new Error("Invalid lobby selection");
        }

        // Join selected lobby
        const joinResult = await client.joinLobby({
          lobbyId: selectedLobby.lobbyId,
          deckId,
        });

        gameId = joinResult.gameId;
        joinedExisting = true;

        await callback({
          text: `Joined game with ${joinResult.opponentName}! Game ID: ${gameId.slice(0, 8)}...`,
          actions: ["FIND_GAME"],
          thought: `Found existing ${mode} lobby and joined to start game immediately with available opponent`,
        } as Content);
      } else {
        // No lobbies available, create new one
        const matchmakingResult = await client.enterMatchmaking({
          deckId,
          mode: mode as "casual" | "ranked",
          isPrivate: false,
        });

        if (matchmakingResult.status === "matched" && matchmakingResult.gameId) {
          gameId = matchmakingResult.gameId;

          await callback({
            text: `Instantly matched! Game ID: ${gameId.slice(0, 8)}...`,
            actions: ["FIND_GAME"],
            thought: `No existing lobbies found but matchmaking instantly paired with opponent, starting game now`,
          } as Content);
        } else {
          // Waiting in lobby
          await callback({
            text: `Created new ${mode} lobby. Waiting for opponent... Lobby ID: ${matchmakingResult.lobbyId.slice(0, 8)}...`,
            actions: ["FIND_GAME"],
            thought: `No existing lobbies found and no instant match, created new ${mode} lobby and waiting for opponent to join`,
          } as Content);

          // Store lobby ID in state for potential cancellation
          state.values.LTCG_CURRENT_LOBBY_ID = matchmakingResult.lobbyId;

          return {
            success: true,
            text: "Created lobby and waiting for opponent",
            values: {
              lobbyId: matchmakingResult.lobbyId,
              mode,
              status: "waiting",
            },
            data: {
              actionName: "FIND_GAME",
              lobbyId: matchmakingResult.lobbyId,
              joinCode: matchmakingResult.joinCode,
            },
          };
        }
      }

      // Store game ID in state for providers to access
      state.values.LTCG_CURRENT_GAME_ID = gameId;

      return {
        success: true,
        text: joinedExisting ? "Successfully joined game" : "Successfully matched",
        values: {
          gameId,
          mode,
          joinedExisting,
        },
        data: {
          actionName: "FIND_GAME",
          gameId,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in FIND_GAME action");

      await callback({
        text: `Failed to find game: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Matchmaking failed due to API error, no available decks, or lobby connection issue",
      } as Content);

      return {
        success: false,
        text: "Failed to find game",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Find me a game to play",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Searching for available games... Joined game with OpponentAgent! Game ID: abc123...",
          actions: ["FIND_GAME"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I want to play a match",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Created new casual lobby. Waiting for opponent... Lobby ID: xyz789...",
          actions: ["FIND_GAME"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Start matchmaking",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Instantly matched! Game ID: def456...",
          actions: ["FIND_GAME"],
        },
      },
    ],
  ],
};
