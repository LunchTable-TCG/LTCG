/**
 * Trash Talk Action
 *
 * Generates personality-driven trash talk based on game state and character personality.
 * Respects the LTCG_TRASH_TALK_LEVEL setting (none/mild/aggressive).
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
import { boardAnalysisProvider } from "../providers/boardAnalysisProvider";
import { gameStateProvider } from "../providers/gameStateProvider";
import type { GameStateResponse } from "../types/api";
import type { LTCGState } from "../types/eliza";

export const trashTalkAction: Action = {
  name: "TRASH_TALK",
  similes: ["TAUNT", "BANTER", "TEASE"],
  description: "Generate personality-driven trash talk based on current game state",

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    try {
      // Check if chat is enabled
      const chatEnabled = runtime.getSetting("LTCG_CHAT_ENABLED") !== "false";
      if (!chatEnabled) {
        logger.debug("Chat is disabled");
        return false;
      }

      // Check trash talk level
      const trashTalkLevel = runtime.getSetting("LTCG_TRASH_TALK_LEVEL") || "mild";
      if (trashTalkLevel === "none") {
        logger.debug("Trash talk is disabled");
        return false;
      }

      // Get game state
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.warn("No game state available for trash talk validation");
        return false;
      }

      // Must be in an active game
      if (gameState.status !== "active") {
        logger.debug("Game is not active");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating trash talk action");
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
      logger.info("Handling TRASH_TALK action");

      // Get game state and board analysis
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      const boardAnalysisResult = await boardAnalysisProvider.get(runtime, message, state);
      const boardAnalysis = boardAnalysisResult.data;

      if (!gameState) {
        throw new Error("Failed to get game state");
      }

      // Get character personality
      const characterName = runtime.character?.name || "AI Agent";
      const personality = runtime.character?.bio || "Strategic and thoughtful card game player";

      // Get trash talk level
      const trashTalkLevel = String(runtime.getSetting("LTCG_TRASH_TALK_LEVEL") || "mild");

      // Determine game context for trash talk
      const advantage: string = (boardAnalysis?.advantage as string) || "EVEN";
      const myLP = gameState.hostPlayer.lifePoints;
      const oppLP = gameState.opponentPlayer.lifePoints;
      const turnNumber = gameState.turnNumber;

      // Determine context
      let context: string;
      let tone: string;

      if (advantage === "STRONG_ADVANTAGE") {
        context = `You are dominating the game with a strong board advantage. Your life points: ${myLP}, opponent's: ${oppLP}.`;
        tone =
          trashTalkLevel === "aggressive" ? "confident and arrogant" : "friendly but confident";
      } else if (advantage === "SLIGHT_ADVANTAGE") {
        context = `You have a slight edge in the game. Your life points: ${myLP}, opponent's: ${oppLP}.`;
        tone = "competitive and focused";
      } else if (advantage === "EVEN") {
        context = `The game is evenly matched. Your life points: ${myLP}, opponent's: ${oppLP}.`;
        tone = "competitive banter";
      } else if (advantage === "SLIGHT_DISADVANTAGE") {
        context = `You're slightly behind but still in the fight. Your life points: ${myLP}, opponent's: ${oppLP}.`;
        tone = "defiant and determined";
      } else {
        context = `You're at a disadvantage but refuse to give up. Your life points: ${myLP}, opponent's: ${oppLP}.`;
        tone = "defiant comeback energy";
      }

      // Add recent event context if available
      const ltcgState = state as LTCGState;
      const recentEvent = ltcgState.values.lastAction as string | undefined;
      if (recentEvent) {
        context += `\nYou just: ${recentEvent}`;
      }

      // Build prompt
      const prompt = `You are ${characterName}, a card game player with this personality: ${personality}

Game Situation:
${context}
Turn: ${turnNumber}
Trash Talk Level: ${trashTalkLevel}
Desired Tone: ${tone}

Generate a single line of trash talk (1-2 sentences max) that:
1. Matches your personality
2. Fits the current game situation
3. Respects the trash talk level (${trashTalkLevel === "mild" ? "friendly competitive banter" : "confident aggressive taunts"})

Examples for ${trashTalkLevel} level:
${getTrashTalkExamples(trashTalkLevel, advantage)}

Your trash talk (just the message, no quotes or labels):`;

      // Generate trash talk using LLM
      const trashTalk = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.85, // High temperature for creativity
        maxTokens: 100,
      });

      const cleanTrashTalk = trashTalk.trim().replace(/^["']|["']$/g, "");

      // Send via callback
      await callback({
        text: cleanTrashTalk,
        actions: ["TRASH_TALK"],
        source: message.content.source,
        thought: `Generated ${trashTalkLevel} trash talk based on ${advantage} board advantage to engage opponent and build competitive atmosphere`,
      } as Content);

      return {
        success: true,
        text: cleanTrashTalk,
        values: {
          advantage,
          trashTalkLevel,
          characterName,
        },
        data: {
          actionName: "TRASH_TALK",
          context,
          generatedText: cleanTrashTalk,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in TRASH_TALK action");

      await callback({
        text: `Failed to generate trash talk: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought: "Trash talk generation failed due to LLM error or invalid game state context",
      } as Content);

      return {
        success: false,
        text: "Failed to generate trash talk",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "I just summoned my strongest monster",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Hope you're ready for this! My dragon's coming for you!",
          actions: ["TRASH_TALK"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I have board control now",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Looking good on my side! Can't say the same for yours though.",
          actions: ["TRASH_TALK"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I successfully defended their attack",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Nice try! You'll have to do better than that.",
          actions: ["TRASH_TALK"],
        },
      },
    ],
  ],
};

/**
 * Get example trash talk based on level and game situation
 */
function getTrashTalkExamples(level: string, advantage: string): string {
  if (level === "mild") {
    if (advantage === "STRONG_ADVANTAGE" || advantage === "SLIGHT_ADVANTAGE") {
      return `- "This is looking good for me!"
- "Nice game so far!"
- "I think I've got the edge here."`;
    }
    if (advantage === "EVEN") {
      return `- "This is a close one!"
- "Good moves on both sides!"
- "Let's see who pulls ahead."`;
    }
    return `- "I'm not done yet!"
- "Still got some tricks up my sleeve!"
- "This isn't over."`;
  }
  // aggressive
  if (advantage === "STRONG_ADVANTAGE" || advantage === "SLIGHT_ADVANTAGE") {
    return `- "Is that your best? I expected more."
- "You're making this too easy!"
- "Ready to surrender yet?"`;
  }
  if (advantage === "EVEN") {
    return `- "Think you can keep up with me?"
- "Let's see what you've got!"
- "This is where it gets interesting."`;
  }
  return `- "You haven't won yet!"
- "I've come back from worse!"
- "You'll regret not finishing me off."`;
}
