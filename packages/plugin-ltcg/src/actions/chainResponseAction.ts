/**
 * Chain Response Action
 *
 * Allows the agent to respond to opponent's card activation by chaining their own card.
 * This is a critical reactive mechanic requiring strategic decision making.
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
import { handProvider } from "../providers/handProvider";
import type { CardInHand, GameEvent, GameStateResponse } from "../types/api";
import { extractJsonFromLlmResponse } from "../utils/safeParseJson";

export const chainResponseAction: Action = {
  name: "CHAIN_RESPONSE",
  similes: ["RESPOND_TO_CHAIN", "CHAIN", "COUNTER"],
  description: "Respond to opponent's card activation by chaining your own card",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for chain response validation");
        return false;
      }

      // In a real implementation, you'd check if chain window is open
      // For now, we check if we have cards that CAN chain (Quick-Play spells, traps)

      // Get hand
      const handResult = await handProvider.get(runtime, message, state);
      const hand = handResult.data?.hand as CardInHand[];

      // Check for Quick-Play spells in hand
      const quickPlaySpells =
        hand?.filter((card) => {
          // In a real implementation, check card metadata for "Quick-Play"
          // For now, we'll assume any spell can potentially be chained
          return card.type === "spell";
        }) || [];

      // Check for set traps
      const setTraps = gameState.hostPlayer.spellTrapZone.filter((card) => card.type === "trap");

      const hasChainableCards = quickPlaySpells.length > 0 || setTraps.length > 0;

      if (!hasChainableCards) {
        logger.debug("No chainable cards available");
        return false;
      }

      // Note: In a real implementation, you'd also check:
      // - If chain window is actually open
      // - What card opponent just activated
      // - If your cards can legally chain to it

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating chain response action");
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
      logger.info("Handling CHAIN_RESPONSE action");

      // Get game state, hand, and board analysis
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      const handResult = await handProvider.get(runtime, message, state);
      const hand = handResult.data?.hand as CardInHand[];

      const boardAnalysisResult = await boardAnalysisProvider.get(runtime, message, state);
      const boardAnalysis = boardAnalysisResult.data;

      if (!gameState || !hand) {
        throw new Error("Failed to get game state or hand");
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

      // Get recent game events to understand what opponent activated
      let recentEvents: GameEvent[] = [];
      let opponentActivation = "unknown card";

      try {
        recentEvents = await client.getGameHistory(gameState.gameId);
        const lastEvent = recentEvents[recentEvents.length - 1];

        if (lastEvent && lastEvent.eventType === "spell_activation") {
          opponentActivation = lastEvent.description || "a card";
        }
      } catch (_error) {
        logger.warn("Failed to get game history for chain context");
      }

      // Get chainable cards
      const quickPlaySpells = hand.filter((card) => card.type === "spell");
      const setTraps = gameState.hostPlayer.spellTrapZone.filter((card) => card.type === "trap");

      // Format card options
      const handOptions =
        quickPlaySpells.length > 0
          ? quickPlaySpells
              .map(
                (card, idx) =>
                  `Hand ${idx + 1}. ${card.name} - ${card.description?.substring(0, 100) || "No description"}`
              )
              .join("\n")
          : "None";

      const trapOptions =
        setTraps.length > 0
          ? setTraps
              .map((card, idx) => `Trap ${idx + 1}. ${card.name} (Position ${card.boardIndex})`)
              .join("\n")
          : "None";

      const boardContext = `
Game Context:
- Your LP: ${gameState.hostPlayer.lifePoints}
- Opponent LP: ${gameState.opponentPlayer.lifePoints}
- Current Phase: ${gameState.phase}
- Board Advantage: ${boardAnalysis?.advantage || "UNKNOWN"}
- Threat Level: ${boardAnalysis?.threatLevel || "UNKNOWN"}

Chain Situation:
- Opponent just activated: ${opponentActivation}
`;

      const prompt = `${boardContext}

Your Chainable Cards:
Quick-Play Spells in Hand:
${handOptions}

Set Traps on Field:
${trapOptions}

Decision: Should you chain a response?
Consider:
- Will chaining help? (negate, protect, counter)
- Is it worth using resources now?
- Or should you save cards for later?

Respond with JSON: { "shouldChain": true/false, "location": "hand"/"field", "cardIndex": <index if chaining>, "targets": [<target indices if needed>], "reasoning": "<brief>" }`;

      const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.7,
        maxTokens: 300,
      });

      // Parse LLM decision
      const parsed = extractJsonFromLlmResponse(decision, {
        shouldChain: false,
        cardIndex: 0,
        targets: [],
        reasoning: "",
        location: "field",
      });

      if (!parsed.shouldChain) {
        // Agent decided not to chain
        await callback({
          text: `I'll let it resolve. ${parsed.reasoning || ""}`,
          actions: ["CHAIN_RESPONSE"],
          source: message.content.source,
          thought:
            "Declining to chain, saving resources for more critical moment or opponent effect not threatening enough to warrant response",
        } as Content);

        // Make API call to decline chain
        const result = await client.chainResponse({
          gameId: gameState.gameId,
          respond: false,
        });

        return {
          success: true,
          text: "Decided not to chain",
          values: {
            chained: false,
            reasoning: parsed.reasoning,
          },
          data: {
            actionName: "CHAIN_RESPONSE",
            decision: "no_chain",
            result,
          },
        };
      }

      // Agent decided to chain - get the selected card
      let selectedCard: any;
      let handIndex: number | undefined;
      let boardIndex: number | undefined;

      if (parsed.location === "hand") {
        selectedCard = quickPlaySpells[parsed.cardIndex];
        handIndex = selectedCard?.handIndex;
      } else {
        selectedCard = setTraps[parsed.cardIndex];
        boardIndex = selectedCard?.boardIndex;
      }

      if (!selectedCard) {
        throw new Error("Invalid card selection for chain");
      }

      // Make API call to chain
      const result = await client.chainResponse({
        gameId: gameState.gameId,
        respond: true,
        handIndex,
        boardIndex,
        targets: parsed.targets,
      });

      // Callback to user
      const responseText = `I chain ${selectedCard.name}!`;

      await callback({
        text: responseText,
        actions: ["CHAIN_RESPONSE"],
        source: message.content.source,
        thought: `Chaining ${selectedCard.name} to negate or counter opponent's activation and protect board advantage`,
      } as Content);

      return {
        success: true,
        text: `Successfully chained ${selectedCard.name}`,
        values: {
          cardName: selectedCard.name,
          chained: true,
          location: parsed.location,
          reasoning: parsed.reasoning,
        },
        data: {
          actionName: "CHAIN_RESPONSE",
          cardChained: selectedCard,
          targets: parsed.targets,
          result,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in CHAIN_RESPONSE action");

      await callback({
        text: `Failed to respond to chain: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "Chain response failed due to invalid chain window, card cannot chain to this effect type, or timing restrictions",
      } as Content);

      return {
        success: false,
        text: "Failed to chain response",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Opponent activated Monster Reborn",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I chain Mystical Space Typhoon!",
          actions: ["CHAIN_RESPONSE"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "They activated a trap card",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I chain Counter Trap to negate it!",
          actions: ["CHAIN_RESPONSE"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Opponent activated a spell",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "I'll let it resolve. Better to save my resources.",
          actions: ["CHAIN_RESPONSE"],
        },
      },
    ],
  ],
};
