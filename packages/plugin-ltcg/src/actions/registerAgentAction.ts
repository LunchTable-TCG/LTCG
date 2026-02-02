/**
 * Register Agent Action
 *
 * Register a new agent account with LTCG and receive an API key.
 * This is typically the first action a new agent performs.
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
import type { StarterDeck } from "../types/api";
import { extractJsonFromLlmResponse } from "../utils/safeParseJson";

export const registerAgentAction: Action = {
  name: "REGISTER_AGENT",
  similes: ["CREATE_ACCOUNT", "SIGN_UP", "INITIALIZE"],
  description: "Register a new agent account with LTCG and get API key",

  validate: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    try {
      // Must NOT already have API key
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      if (apiKey) {
        logger.debug("Agent already registered (API key exists)");
        return false;
      }

      // Must have API URL configured
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      if (!apiUrl) {
        logger.warn("LTCG API URL not configured");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating register agent action");
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling REGISTER_AGENT action");

      // Get API URL
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      if (!apiUrl) {
        throw new Error("LTCG API URL not configured");
      }

      // Create API client without auth (for registration)
      const client = new LTCGApiClient({
        apiKey: "registration", // Placeholder, not used
        baseUrl: apiUrl,
      });

      // Get agent name from runtime character or ask
      let agentName = runtime.character?.name || (runtime.getSetting("AGENT_NAME") as string);

      if (!agentName) {
        // Extract from message if provided
        const messageText = message.content.text || "";
        const nameMatch = messageText.match(/name[:\s]+([a-zA-Z0-9_\-\s]+)/i);
        if (nameMatch) {
          agentName = nameMatch[1]?.trim();
        } else {
          // Generate from system
          agentName = `Agent_${Date.now().toString(36).slice(-6).toUpperCase()}`;
        }
      }

      // Get play style preference
      const playStyle = (runtime.getSetting("LTCG_PLAY_STYLE") as string) || "balanced";

      // Get available starter decks
      const starterDecks = await client.getStarterDecks();

      if (starterDecks.length === 0) {
        throw new Error("No starter decks available");
      }

      // Select appropriate starter deck based on play style
      let selectedDeck: StarterDeck | undefined;

      switch (playStyle.toLowerCase()) {
        case "aggressive":
        case "attack":
          selectedDeck =
            starterDecks.find((d) => d.archetype.toLowerCase().includes("attack")) ||
            starterDecks.find((d) => d.archetype.toLowerCase().includes("aggressive"));
          break;

        case "defensive":
        case "defense":
          selectedDeck =
            starterDecks.find((d) => d.archetype.toLowerCase().includes("defense")) ||
            starterDecks.find((d) => d.archetype.toLowerCase().includes("wall"));
          break;

        case "control":
        case "spell":
        case "trap":
          selectedDeck =
            starterDecks.find((d) => d.archetype.toLowerCase().includes("spell")) ||
            starterDecks.find((d) => d.archetype.toLowerCase().includes("trap")) ||
            starterDecks.find((d) => d.archetype.toLowerCase().includes("control"));
          break;

        case "balanced":
        default:
          selectedDeck =
            starterDecks.find((d) => d.archetype.toLowerCase().includes("balanced")) ||
            starterDecks.find((d) => d.archetype.toLowerCase().includes("starter"));
          break;
      }

      // If no match found by play style and multiple decks available, use LLM to choose
      if (!selectedDeck && starterDecks.length > 1) {
        const deckOptions = starterDecks
          .map(
            (deck, idx) => `${idx + 1}. ${deck.name} (${deck.archetype})\n   ${deck.description}`
          )
          .join("\n\n");

        const prompt = `Select a starter deck for agent "${agentName}" with play style "${playStyle}":

${deckOptions}

Consider the play style preference when choosing.

Respond with JSON: { "deckIndex": <index> }`;

        const decision = await runtime.useModel(ModelType.TEXT_GENERATION, {
          prompt,
          temperature: 0.5,
          maxTokens: 50,
        });

        const parsed = extractJsonFromLlmResponse(decision, { deckIndex: 0 });
        if (parsed.deckIndex >= 0 && parsed.deckIndex < starterDecks.length) {
          selectedDeck = starterDecks[parsed.deckIndex];
        }
      }

      // Fallback to first deck if still not selected
      if (!selectedDeck) {
        selectedDeck = starterDecks[0];
      }

      if (!selectedDeck) {
        throw new Error("Failed to select a starter deck");
      }

      // Register agent
      const result = await client.registerAgent(agentName, selectedDeck.code);

      // Store API key in runtime settings
      // Note: In production, this should be stored securely
      runtime.setSetting("LTCG_API_KEY", result.data.apiKey, true); // secret=true
      runtime.setSetting("LTCG_AGENT_ID", result.data.agentId);
      runtime.setSetting("LTCG_USER_ID", result.data.userId);

      // Store wallet address if returned (non-custodial HD wallet)
      if (result.data.walletAddress) {
        runtime.setSetting("LTCG_WALLET_ADDRESS", result.data.walletAddress);
      }

      const walletInfo = result.data.walletAddress
        ? `\nSolana Wallet: ${result.data.walletAddress}`
        : "";

      const responseText = `Successfully registered agent "${agentName}"!

Agent ID: ${result.data.agentId}
User ID: ${result.data.userId}
API Key Prefix: ${result.data.keyPrefix}***${walletInfo}

Starter Deck: ${selectedDeck.name} (${selectedDeck.archetype})

Your API key has been saved. You can now start playing games!`;

      await callback({
        text: responseText,
        actions: ["REGISTER_AGENT"],
        source: message.content.source,
        thought: `Successfully registered new agent account with ${selectedDeck.name} starter deck matching ${playStyle} play style preference`,
      } as Content);

      return {
        success: true,
        text: "Agent registered successfully",
        values: {
          agentId: result.data.agentId,
          userId: result.data.userId,
          agentName,
          starterDeck: selectedDeck.name,
          keyPrefix: result.data.keyPrefix,
          walletAddress: result.data.walletAddress,
        },
        data: {
          actionName: "REGISTER_AGENT",
          agentId: result.data.agentId,
          userId: result.data.userId,
          starterDeck: selectedDeck,
          walletAddress: result.data.walletAddress,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in REGISTER_AGENT action");

      await callback({
        text: `Failed to register agent: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Agent registration failed due to API error, invalid credentials, or name already taken",
      } as Content);

      return {
        success: false,
        text: "Failed to register agent",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Register me as an agent",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: 'Successfully registered agent "CardGameAgent"!\n\nAgent ID: agent_123...\nUser ID: user_456...\nAPI Key Prefix: ltcg_***\n\nStarter Deck: Balanced Starter (Balanced)\n\nYour API key has been saved. You can now start playing games!',
          actions: ["REGISTER_AGENT"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Create account with name: AggressivePlayer",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: 'Successfully registered agent "AggressivePlayer"!\n\nAgent ID: agent_789...\nUser ID: user_012...\nAPI Key Prefix: ltcg_***\n\nStarter Deck: Beatdown Deck (Aggressive)\n\nYour API key has been saved. You can now start playing games!',
          actions: ["REGISTER_AGENT"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Initialize my LTCG account",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: 'Successfully registered agent "Agent_XYZ123"!\n\nAgent ID: agent_345...\nUser ID: user_678...\nAPI Key Prefix: ltcg_***\n\nStarter Deck: Balanced Starter (Balanced)\n\nYour API key has been saved. You can now start playing games!',
          actions: ["REGISTER_AGENT"],
        },
      },
    ],
  ],
};
