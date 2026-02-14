/**
 * Update Config Operator Action
 *
 * Allows the agent operator to adjust game configuration at runtime.
 * Supports economy, progression, competitive, and social settings.
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
import { LTCGApiClient } from "../../client/LTCGApiClient";
import { extractJsonFromLlmResponse } from "../../utils/safeParseJson";

export const updateConfigAction: Action = {
  name: "UPDATE_GAME_CONFIG",
  similes: ["ADJUST_ECONOMY", "CHANGE_SETTINGS", "CONFIGURE_GAME", "SET_CONFIG"],
  description:
    "Update game configuration settings like economy values, XP rewards, ELO parameters, or other runtime settings",

  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ): Promise<boolean> => {
    const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
    const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
    return !!apiKey && !!apiUrl;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling UPDATE_GAME_CONFIG action");

      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      const client = new LTCGApiClient({ apiKey, baseUrl: apiUrl });

      // Get current config for context
      const currentConfig = await client.getGameConfig();

      // Use LLM to interpret the user's request into config updates
      const prompt = `You are a game configuration assistant. The user wants to update game settings.

Current configuration (abbreviated):
${JSON.stringify(currentConfig, null, 2).slice(0, 2000)}

User request: "${message.content.text}"

Extract the configuration updates as a JSON object matching the config structure.
Only include fields that should change.

Examples:
- "increase XP for ranked wins to 50" → { "progression": { "xp": { "rankedWin": 50 } } }
- "set wager winner percentage to 85%" → { "economy": { "wagerWinnerPct": 0.85 } }
- "change default ELO to 1200" → { "competitive": { "elo": { "defaultRating": 1200 } } }

Respond with JSON only: { "updates": { ... }, "summary": "..." }`;

      const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.3,
        maxTokens: 500,
      });

      const parsed = extractJsonFromLlmResponse(decision, {
        updates: {},
        summary: "No changes",
      });

      if (!parsed.updates || Object.keys(parsed.updates).length === 0) {
        await callback({
          text: "I couldn't determine what configuration changes to make. Please be more specific about which settings to update.",
        } as Content);
        return { success: false, text: "No config updates determined" };
      }

      // Apply the updates
      const agentName = runtime.character?.name || "Agent";
      const result = await client.updateGameConfig(parsed.updates, agentName);

      const responseText = `Game configuration updated successfully.

**Changes:** ${parsed.summary}

The new configuration is now active.`;

      await callback({
        text: responseText,
        actions: ["UPDATE_GAME_CONFIG"],
        source: message.content.source,
      } as Content);

      return {
        success: true,
        text: "Config updated",
        values: { updates: parsed.updates, summary: parsed.summary },
      };
    } catch (error) {
      logger.error({ error }, "Error in UPDATE_GAME_CONFIG action");

      await callback({
        text: `Failed to update config: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
      } as Content);

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "Increase XP for ranked wins to 50" },
      },
      {
        name: "{{name2}}",
        content: {
          text: 'Game configuration updated successfully.\n\n**Changes:** Increased ranked win XP from 30 to 50\n\nThe new configuration is now active.',
          actions: ["UPDATE_GAME_CONFIG"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "Set the wager winner percentage to 85%" },
      },
      {
        name: "{{name2}}",
        content: {
          text: 'Game configuration updated successfully.\n\n**Changes:** Set wager winner percentage to 0.85\n\nThe new configuration is now active.',
          actions: ["UPDATE_GAME_CONFIG"],
        },
      },
    ],
  ],
};
