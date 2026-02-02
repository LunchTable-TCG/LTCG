/**
 * GG Action
 *
 * Sends a good game message at the end of a match.
 * Adapts the message based on win/loss and character personality.
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
import { gameStateProvider } from "../providers/gameStateProvider";
import type { GameStateResponse } from "../types/api";

export const ggAction: Action = {
  name: "GG",
  similes: ["GOOD_GAME", "WELL_PLAYED", "GAME_END_MESSAGE"],
  description: "Send a good game message at the end of a match",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Check if chat is enabled
      const chatEnabled = runtime.getSetting("LTCG_CHAT_ENABLED") !== "false";
      if (!chatEnabled) {
        logger.debug("Chat is disabled");
        return false;
      }

      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for GG validation");
        return false;
      }

      // Game must be completed or about to end
      const isCompleted = gameState.status === "completed";
      const isAboutToEnd =
        gameState.hostPlayer.lifePoints === 0 ||
        gameState.opponentPlayer.lifePoints === 0 ||
        gameState.hostPlayer.deckCount === 0 ||
        gameState.opponentPlayer.deckCount === 0;

      if (!isCompleted && !isAboutToEnd) {
        logger.debug("Game is not completed or about to end");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating GG action");
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
      logger.info("Handling GG action");

      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        throw new Error("Failed to get game state");
      }

      // Get character personality
      const characterName = runtime.character?.name || "AI Agent";
      const personality = runtime.character?.bio || "Strategic and thoughtful card game player";

      // Determine game outcome
      const outcome = determineGameOutcome(gameState);

      // Build prompt
      const prompt = `You are ${characterName}, a card game player with this personality: ${personality}

Game Result:
- Outcome: ${outcome.result}
- Your Life Points: ${outcome.myLP}
- Opponent Life Points: ${outcome.oppLP}
- Game Duration: ${gameState.turnNumber} turns
- Close Game: ${outcome.wasClose ? "Yes" : "No"}

Generate a brief good game message (1-2 sentences) that:
1. Shows good sportsmanship
2. Fits your personality
3. Acknowledges the outcome appropriately

${getGGGuidance(outcome)}

Your message (just the message, no quotes or labels):`;

      // Generate GG message using LLM
      const ggMessage = await runtime.useModel(ModelType.TEXT_GENERATION, {
        prompt,
        temperature: 0.7, // Moderate temperature for consistent sportsmanship
        maxTokens: 100,
      });

      const cleanMessage = ggMessage.trim().replace(/^["']|["']$/g, "");

      // Send via callback
      await callback({
        text: cleanMessage,
        actions: ["GG"],
        source: message.content.source,
        thought: `Sending ${outcome.result === "WON" ? "gracious victory" : outcome.result === "LOST" ? "respectful defeat" : "friendly game end"} message to show sportsmanship`,
      } as Content);

      return {
        success: true,
        text: cleanMessage,
        values: {
          outcome: outcome.result,
          wasClose: outcome.wasClose,
          characterName,
        },
        data: {
          actionName: "GG",
          outcome,
          generatedMessage: cleanMessage,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in GG action");

      await callback({
        text: `Failed to send GG message: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought:
          "GG message generation failed due to LLM error or unable to determine game outcome",
      } as Content);

      return {
        success: false,
        text: "Failed to send GG message",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "I won the game!",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "GG! That was a great match. Well played!",
          actions: ["GG"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I lost the game",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "GG! You got me this time. Nice strategy!",
          actions: ["GG"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "That was an intense close game",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "GG! What an intense match! That could have gone either way.",
          actions: ["GG"],
        },
      },
    ],
  ],
};

/**
 * Game outcome information
 */
interface GameOutcome {
  result: "WON" | "LOST" | "UNKNOWN";
  myLP: number;
  oppLP: number;
  wasClose: boolean;
  margin: number;
}

/**
 * Determine the game outcome
 */
function determineGameOutcome(gameState: GameStateResponse): GameOutcome {
  const myLP = gameState.hostPlayer.lifePoints;
  const oppLP = gameState.opponentPlayer.lifePoints;

  let result: GameOutcome["result"];

  if (myLP > oppLP) {
    result = "WON";
  } else if (oppLP > myLP) {
    result = "LOST";
  } else {
    result = "UNKNOWN";
  }

  // Determine if game was close
  const lpDifference = Math.abs(myLP - oppLP);
  const wasClose = lpDifference < 2000 || gameState.turnNumber > 10;

  return {
    result,
    myLP,
    oppLP,
    wasClose,
    margin: lpDifference,
  };
}

/**
 * Get guidance for GG message based on outcome
 */
function getGGGuidance(outcome: GameOutcome) {
  if (outcome.result === "WON") {
    if (outcome.wasClose) {
      return `You won a close game. Be gracious and acknowledge the competition. Examples:
- "GG! That was intense! You had me worried there."
- "Great match! That could have gone either way."
- "GG! You really pushed me to my limits."`;
    } else {
      return `You won decisively. Be humble and gracious. Examples:
- "GG! Well played, thanks for the match."
- "Good game! You put up a good fight."
- "GG! That was fun, thanks for playing."`;
    }
  } else if (outcome.result === "LOST") {
    if (outcome.wasClose) {
      return `You lost a close game. Show respect and determination. Examples:
- "GG! So close! Next time I'll get you."
- "Great game! That was really close."
- "GG! You just barely edged me out there."`;
    } else {
      return `You lost decisively. Be gracious in defeat. Examples:
- "GG! You got me this time. Well played!"
- "Good game! Your strategy was solid."
- "GG! Nice win, I'll come back stronger."`;
    }
  } else {
    return `Unclear outcome. Be friendly and sportsmanlike. Examples:
- "GG! Thanks for the game!"
- "Good match! That was fun."
- "GG! Enjoyed playing with you."`;
  }
}
