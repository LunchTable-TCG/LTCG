/**
 * Create Lobby Action
 *
 * Create a new game lobby and wait for an opponent to join.
 * Supports both public and private lobbies with join codes.
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

export const createLobbyAction: Action = {
  name: "CREATE_LOBBY",
  similes: ["HOST_GAME", "START_LOBBY", "NEW_GAME"],
  description: "Create a new game lobby and wait for opponent",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Check if already in a game
      const currentGameId = state.values.LTCG_CURRENT_GAME_ID;
      if (currentGameId) {
        logger.debug("Agent already in a game");
        return false;
      }

      // Check if already in a lobby
      const currentLobbyId = state.values.LTCG_CURRENT_LOBBY_ID;
      if (currentLobbyId) {
        logger.debug("Agent already in a lobby");
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
      logger.error({ error }, "Error validating create lobby action");
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
      logger.info("Handling CREATE_LOBBY action");

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

      // Get deck preference
      let deckId = runtime.getSetting("LTCG_PREFERRED_DECK_ID") as string;

      if (!deckId) {
        // Use LLM to select deck
        const decks = await client.getDecks();
        if (decks.length === 0) {
          throw new Error("No decks available. Please create a deck first.");
        }

        if (decks.length === 1) {
          deckId = decks[0].deckId;
        } else {
          const deckOptions = decks
            .map(
              (deck, idx) =>
                `${idx + 1}. ${deck.name} (${deck.cards.length} cards)${deck.archetype ? ` - ${deck.archetype}` : ""}`
            )
            .join("\n");

          const prompt = `Select a deck for this game:
${deckOptions}

Respond with JSON: { "deckIndex": <index> }`;

          const decision = await runtime.useModel(ModelType.TEXT_GENERATION, {
            prompt,
            temperature: 0.5,
            maxTokens: 50,
          });

          const parsed = extractJsonFromLlmResponse(decision, { deckIndex: 0 });
          deckId = decks[parsed.deckIndex].deckId;
        }
      }

      // Get mode preference
      let mode: "casual" | "ranked";
      const rankedModeSetting = runtime.getSetting("LTCG_RANKED_MODE");

      if (rankedModeSetting !== undefined) {
        mode = rankedModeSetting === "true" ? "ranked" : "casual";
      } else {
        // Ask LLM
        const prompt = `Should this lobby be ranked or casual?

Ranked: Competitive play with ELO rating changes
Casual: Practice and fun without rating changes

Respond with JSON: { "mode": "ranked" or "casual" }`;

        const decision = await runtime.useModel(ModelType.TEXT_GENERATION, {
          prompt,
          temperature: 0.3,
          maxTokens: 20,
        });

        const parsed = extractJsonFromLlmResponse(decision, { mode: "casual" });
        mode = parsed.mode === "ranked" ? "ranked" : "casual";
      }

      // Determine if lobby should be private
      let isPrivate = false;
      const messageText = message.content.text?.toLowerCase() || "";

      if (messageText.includes("private") || messageText.includes("join code")) {
        isPrivate = true;
      } else if (messageText.includes("public")) {
        isPrivate = false;
      } else {
        // Ask LLM
        const prompt = `Should this lobby be private (requires join code) or public (anyone can join)?

Private lobbies are good for playing with specific opponents.
Public lobbies are better for quick matchmaking.

Respond with JSON: { "isPrivate": true or false }`;

        const decision = await runtime.useModel(ModelType.TEXT_GENERATION, {
          prompt,
          temperature: 0.3,
          maxTokens: 20,
        });

        const parsed = extractJsonFromLlmResponse(decision, { isPrivate: false });
        isPrivate = parsed.isPrivate === true;
      }

      // Create lobby
      const result = await client.enterMatchmaking({
        deckId,
        mode,
        isPrivate,
      });

      // Store lobby ID in runtime state
      state.values.LTCG_CURRENT_LOBBY_ID = result.lobbyId;

      // Build response text
      let responseText = `Created ${mode} lobby (${isPrivate ? "Private" : "Public"})!`;
      if (isPrivate && result.joinCode) {
        responseText += `\n🔑 Join Code: ${result.joinCode}`;
      }
      responseText += `\nLobby ID: ${result.lobbyId.slice(0, 8)}...`;
      responseText += "\nWaiting for opponent...";

      await callback({
        text: responseText,
        actions: ["CREATE_LOBBY"],
        source: message.content.source,
        thought: `Created ${mode} lobby (${isPrivate ? "private with join code for specific opponent" : "public for quick matchmaking"})`,
      } as Content);

      return {
        success: true,
        text: "Lobby created successfully",
        values: {
          lobbyId: result.lobbyId,
          joinCode: result.joinCode,
          mode,
          isPrivate,
          status: result.status,
        },
        data: {
          actionName: "CREATE_LOBBY",
          lobbyId: result.lobbyId,
          joinCode: result.joinCode,
          mode,
          isPrivate,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in CREATE_LOBBY action");

      await callback({
        text: `Failed to create lobby: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Lobby creation failed due to API error, invalid deck selection, or server connection issue",
      } as Content);

      return {
        success: false,
        text: "Failed to create lobby",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Create a lobby for me",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Created casual lobby (Public)!\nLobby ID: abc123...\nWaiting for opponent...",
          actions: ["CREATE_LOBBY"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Host a private ranked game",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Created ranked lobby (Private)!\n🔑 Join Code: XYZ789\nLobby ID: def456...\nWaiting for opponent...",
          actions: ["CREATE_LOBBY"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Start a public game",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Created casual lobby (Public)!\nLobby ID: ghi789...\nWaiting for opponent...",
          actions: ["CREATE_LOBBY"],
        },
      },
    ],
  ],
};
