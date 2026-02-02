/**
 * React To Play Action
 *
 * Emotionally reacts to opponent's moves based on game state and character personality.
 * Provides contextual responses to strong plays, weak plays, threatening plays, etc.
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

export const reactToPlayAction: Action = {
  name: "REACT_TO_PLAY",
  similes: ["RESPOND", "COMMENT", "EMOTE"],
  description: "React emotionally to opponent's moves",

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
        logger.warn("No game state available for react to play validation");
        return false;
      }

      // Must be in an active game
      if (gameState.status !== "active") {
        logger.debug("Game is not active");
        return false;
      }

      // Check if there's a recent opponent action to react to
      const opponentAction = (state as any)?.lastOpponentAction;
      if (!opponentAction) {
        logger.debug("No recent opponent action to react to");
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, "Error validating react to play action");
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
      logger.info("Handling REACT_TO_PLAY action");

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

      // Get opponent action from state
      const opponentAction = (state as any)?.lastOpponentAction || "made a play";

      // Classify opponent's play
      const classification = classifyOpponentPlay(opponentAction, gameState, boardAnalysis);

      // Build prompt
      const prompt = `You are ${characterName}, a card game player with this personality: ${personality}

Your opponent just: ${opponentAction}

Your Analysis:
- Play Type: ${classification.type}
- Threat Level: ${classification.threatLevel}
- Board Situation: ${boardAnalysis?.advantage || "UNKNOWN"}
- Your Life Points: ${gameState.hostPlayer.lifePoints}
- Opponent Life Points: ${gameState.opponentPlayer.lifePoints}

Generate a brief reaction (1 sentence) that shows your emotional response:
${getReactionGuidance(classification.type)}

Your reaction (just the message, no quotes or labels):`;

      // Generate reaction using LLM
      const reaction = await runtime.useModel(ModelType.TEXT_GENERATION, {
        prompt,
        temperature: 0.8, // High temperature for emotional variety
        maxTokens: 80,
      });

      const cleanReaction = reaction.trim().replace(/^["']|["']$/g, "");

      // Send via callback
      await callback({
        text: cleanReaction,
        actions: ["REACT_TO_PLAY"],
        source: message.content.source,
        thought: `Reacting to opponent's ${classification.type.toLowerCase()} with ${classification.threatLevel.toLowerCase()} threat level to acknowledge play and maintain engagement`,
      } as Content);

      return {
        success: true,
        text: cleanReaction,
        values: {
          opponentAction,
          reactionType: classification.type,
          threatLevel: classification.threatLevel,
          characterName,
        },
        data: {
          actionName: "REACT_TO_PLAY",
          classification,
          generatedReaction: cleanReaction,
        },
      };
    } catch (error) {
      logger.error({ error }, "Error in REACT_TO_PLAY action");

      await callback({
        text: `Failed to react to play: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
        thought: "Reaction generation failed due to LLM error or missing opponent action context",
      } as Content);

      return {
        success: false,
        text: "Failed to react to play",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Opponent summoned Blue-Eyes White Dragon",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Whoa, that's a strong monster! I need to be careful.",
          actions: ["REACT_TO_PLAY"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Opponent set a weak monster in defense",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Playing it safe, huh? That won't save you.",
          actions: ["REACT_TO_PLAY"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Opponent activated Mirror Force, destroying all my monsters",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Oof, that trap got me! Well played.",
          actions: ["REACT_TO_PLAY"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Opponent attacked directly for 2000 damage",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "That hurt! I need to set up my defense.",
          actions: ["REACT_TO_PLAY"],
        },
      },
    ],
  ],
};

/**
 * Play classification result
 */
interface PlayClassification {
  type: "STRONG_PLAY" | "WEAK_PLAY" | "THREATENING_PLAY" | "FAILED_PLAY" | "NEUTRAL_PLAY";
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasoning: string;
}

/**
 * Classify opponent's play to determine appropriate reaction
 */
function classifyOpponentPlay(
  action: string,
  gameState: GameStateResponse,
  boardAnalysis: any
): PlayClassification {
  const actionLower = action.toLowerCase();

  // Strong play - high ATK summon, good removal
  if (
    actionLower.includes("summon") &&
    (actionLower.includes("dragon") || actionLower.includes("3000"))
  ) {
    return {
      type: "STRONG_PLAY",
      threatLevel: "HIGH",
      reasoning: "Opponent summoned a powerful monster",
    };
  }

  // Threatening play - direct attack threat
  if (actionLower.includes("attack") && actionLower.includes("direct")) {
    return {
      type: "THREATENING_PLAY",
      threatLevel: gameState.hostPlayer.lifePoints < 2000 ? "CRITICAL" : "MEDIUM",
      reasoning: "Direct attack threatening life points",
    };
  }

  // Failed play - negated card
  if (
    actionLower.includes("negated") ||
    actionLower.includes("failed") ||
    actionLower.includes("blocked")
  ) {
    return {
      type: "FAILED_PLAY",
      threatLevel: "LOW",
      reasoning: "Opponent's play was stopped",
    };
  }

  // Weak play - low ATK summon, defensive play
  if (actionLower.includes("defense") || actionLower.includes("set")) {
    return {
      type: "WEAK_PLAY",
      threatLevel: "LOW",
      reasoning: "Opponent playing defensively",
    };
  }

  // Check board advantage for threat assessment
  const advantage = boardAnalysis?.advantage || "EVEN";
  let threatLevel: PlayClassification["threatLevel"] = "MEDIUM";

  if (advantage === "STRONG_DISADVANTAGE") {
    threatLevel = "HIGH";
  } else if (advantage === "SLIGHT_DISADVANTAGE") {
    threatLevel = "MEDIUM";
  } else {
    threatLevel = "LOW";
  }

  return {
    type: "NEUTRAL_PLAY",
    threatLevel,
    reasoning: "Standard play",
  };
}

/**
 * Get reaction guidance based on play type
 */
function getReactionGuidance(type: PlayClassification["type"]) {
  switch (type) {
    case "STRONG_PLAY":
      return `Be impressed or concerned. Examples:
- "Impressive move!"
- "That's a strong monster..."
- "I need to be careful now."`;

    case "WEAK_PLAY":
      return `Be dismissive or confident. Examples:
- "That's it?"
- "Playing scared?"
- "I can handle that easily."`;

    case "THREATENING_PLAY":
      return `Show worry or defiance. Examples:
- "This isn't good..."
- "I need to defend!"
- "Bring it on!"`;

    case "FAILED_PLAY":
      return `Be mocking or relieved. Examples:
- "Nice try!"
- "Whew, dodged that one."
- "Thanks for wasting that card!"`;

    case "NEUTRAL_PLAY":
    default:
      return `Acknowledge the play. Examples:
- "Alright, your turn."
- "I see what you're doing."
- "Interesting choice."`;
  }
}
