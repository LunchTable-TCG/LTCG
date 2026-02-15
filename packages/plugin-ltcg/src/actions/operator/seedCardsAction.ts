/**
 * Seed Cards Operator Action
 *
 * Validates card definitions using @lunchtable-tcg/engine,
 * converts to Convex row format, and seeds them into the database.
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
import { loadCardsFromJSON, toConvexCardRows } from "@lunchtable-tcg/engine";
import { LTCGApiClient } from "../../client/LTCGApiClient";

export const seedCardsAction: Action = {
  name: "SEED_CARDS",
  similes: ["CREATE_CARDS", "ADD_CARDS", "IMPORT_CARDS", "UPLOAD_CARDS"],
  description:
    "Validate and seed card definitions into the game database using the engine's card format",

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
      logger.info("Handling SEED_CARDS action");

      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      const client = new LTCGApiClient({ apiKey, baseUrl: apiUrl });

      const messageText = message.content.text || "";

      // Check if the message contains JSON card data directly
      let cardsJson: string | null = null;
      const jsonMatch = messageText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cardsJson = jsonMatch[0];
      }

      if (!cardsJson) {
        // Use LLM to generate cards from natural language description
        const prompt = `Generate trading card game card definitions as a JSON array.

User request: "${messageText}"

Each card must have: id, name, type ("stereotype"|"spell"|"trap"), description, rarity ("common"|"uncommon"|"rare"|"epic"|"legendary").

Stereotypes also need: attack (number), defense (number), level (1-12).
Spells need: spellType ("normal"|"continuous"|"equip"|"field"|"quick-play"|"ritual").
Traps need: trapType ("normal"|"continuous"|"counter").

Optional fields: attribute, archetype, viceType, flavorText, cost, effects.

Respond with ONLY a JSON array of card objects.`;

        const generated = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt,
          temperature: 0.7,
          maxTokens: 2000,
        });

        cardsJson = generated;
      }

      // Validate cards using engine
      let lookup;
      try {
        lookup = loadCardsFromJSON(cardsJson);
      } catch (validationError) {
        await callback({
          text: `Card validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
          error: true,
        } as Content);
        return {
          success: false,
          error:
            validationError instanceof Error
              ? validationError
              : new Error(String(validationError)),
        };
      }

      const cardCount = Object.keys(lookup).length;
      const cards = Object.values(lookup);

      // Convert to Convex row format
      const rows = toConvexCardRows(cards);

      // Seed via admin API
      const result = await client.seedCards(rows as unknown as Array<Record<string, unknown>>);

      const cardNames = cards
        .slice(0, 5)
        .map((c) => c.name)
        .join(", ");
      const moreText = cardCount > 5 ? ` and ${cardCount - 5} more` : "";

      await callback({
        text: `Successfully seeded ${result.seeded} cards: ${cardNames}${moreText}`,
        actions: ["SEED_CARDS"],
        source: message.content.source,
      } as Content);

      return {
        success: true,
        text: `Seeded ${result.seeded} cards`,
        values: { seeded: result.seeded, total: result.total },
      };
    } catch (error) {
      logger.error({ error }, "Error in SEED_CARDS action");

      await callback({
        text: `Failed to seed cards: ${error instanceof Error ? error.message : String(error)}`,
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
        content: {
          text: 'Seed these cards: [{"id":"fire-knight","name":"Fire Knight","type":"stereotype","description":"A blazing warrior","rarity":"rare","attack":1800,"defense":1200,"level":4,"attribute":"fire"}]',
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully seeded 1 cards: Fire Knight",
          actions: ["SEED_CARDS"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "Create 3 water-themed stereotype cards for a new expansion" },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully seeded 3 cards: Tidal Guardian, Ocean Sage, Deep Sea Leviathan",
          actions: ["SEED_CARDS"],
        },
      },
    ],
  ],
};
