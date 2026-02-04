/**
 * Emotional State Evaluator
 *
 * Evaluates the agent's emotional state based on game situation and filters
 * inappropriate responses (e.g., trash talking when losing badly).
 */

import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { boardAnalysisProvider } from "../providers/boardAnalysisProvider";
import { gameStateProvider } from "../providers/gameStateProvider";
import type { GameStateResponse } from "../types/api";
import type { BoardAnalysisData, EmotionalState, LTCGState } from "../types/eliza";

export const emotionalStateEvaluator: Evaluator = {
  name: "LTCG_EMOTIONAL_STATE",
  description:
    "Evaluates emotional state and filters inappropriate responses based on game situation",
  similes: ["EMOTION_CHECK", "MOOD_FILTER", "SENTIMENT_VALIDATOR"],

  examples: [
    {
      prompt: "Evaluate emotional state when dominating",
      messages: [
        {
          name: "{{user1}}",
          content: { text: "I'm dominating! Time to taunt!" },
        },
      ],
      outcome: "Emotional state: CONFIDENT. Trash talk is appropriate.",
    },
    {
      prompt: "Evaluate emotional state when losing badly",
      messages: [
        {
          name: "{{user1}}",
          content: { text: "I'm losing badly but want to trash talk" },
        },
      ],
      outcome: "Emotional state: DESPERATE. Trash talk would be inappropriate - filtered.",
    },
  ],

  validate: async (_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
    // Always validate - emotional state check runs on all messages
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>
  ): Promise<void> => {
    try {
      logger.debug("Evaluating emotional state");

      if (!state) {
        logger.debug("No state available for emotional evaluation");
        return;
      }

      // Get game state and board analysis
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.debug("No game state available for emotional evaluation");
        return; // No game state - nothing to evaluate
      }

      const boardAnalysisResult = await boardAnalysisProvider.get(runtime, message, state);
      const boardAnalysis = boardAnalysisResult.data;

      // Check if board analysis data is available
      if (!boardAnalysis) {
        logger.debug("No board analysis available for emotional evaluation");
        return;
      }

      // Analyze emotional state
      const emotionalState = analyzeEmotionalState(
        gameState,
        boardAnalysis as BoardAnalysisData,
        state
      );

      // Store emotional state in State object for other actions to use
      const ltcgState = state as LTCGState;
      ltcgState.values.LTCG_EMOTIONAL_STATE = emotionalState.state;
      ltcgState.values.LTCG_EMOTIONAL_INTENSITY = emotionalState.intensity;
      ltcgState.values.LTCG_FILTERED_ACTIONS = emotionalState.shouldFilter;

      // Get the intended action from message or state
      const messageContent = message.content as {
        action?: string;
        text: string;
      };
      const intendedAction = messageContent.action || ltcgState.currentAction;

      // Check filter status and log
      const shouldAllow = shouldAllowResponse(emotionalState, intendedAction, runtime);
      ltcgState.values.LTCG_EMOTIONAL_ALLOWED = shouldAllow;

      if (!shouldAllow) {
        logger.info(
          {
            emotionalState: emotionalState.state,
            intendedAction,
            reason: emotionalState.filterReason,
          },
          "Action filtered due to emotional state"
        );
      }
    } catch (error) {
      logger.error({ error }, "Error in emotional state evaluator");
    }
  },
};

/**
 * Emotional state types
 */
type EmotionalStateType =
  | "CONFIDENT"
  | "CAUTIOUS_OPTIMISTIC"
  | "FOCUSED"
  | "CONCERNED"
  | "DESPERATE"
  | "EXCITED"
  | "FRUSTRATED"
  | "WORRIED";

/**
 * Analyze the emotional state based on game situation
 */
function analyzeEmotionalState(
  gameState: GameStateResponse,
  boardAnalysis: BoardAnalysisData,
  state: State
): EmotionalState {
  const advantage = boardAnalysis?.advantage || "EVEN";
  // Use new API fields with fallback to legacy hostPlayer/opponentPlayer
  const myLP = gameState.myLifePoints ?? gameState.hostPlayer?.lifePoints ?? 8000;
  const oppLP = gameState.opponentLifePoints ?? gameState.opponentPlayer?.lifePoints ?? 8000;
  const myMonsters = gameState.myBoard?.length ?? gameState.hostPlayer?.monsterZone?.length ?? 0;
  const oppMonsters =
    gameState.opponentBoard?.length ?? gameState.opponentPlayer?.monsterZone?.length ?? 0;

  // Check recent events from state
  const ltcgState = state as LTCGState;
  const lastAction = ltcgState.values.lastAction as string | undefined;
  const lastResult = ltcgState.values.lastActionResult as string | undefined;

  let emotionalState: EmotionalStateType;
  let intensity: number;
  let shouldFilter: string[] = [];

  // Determine base emotional state from board position
  if (advantage === "STRONG_ADVANTAGE") {
    emotionalState = "CONFIDENT";
    intensity = 8;
    shouldFilter = []; // Can do anything when winning
  } else if (advantage === "SLIGHT_ADVANTAGE") {
    emotionalState = "CAUTIOUS_OPTIMISTIC";
    intensity = 6;
    shouldFilter = []; // Can still trash talk when ahead
  } else if (advantage === "EVEN") {
    emotionalState = "FOCUSED";
    intensity = 5;
    shouldFilter = []; // Neutral state - allow most things
  } else if (advantage === "SLIGHT_DISADVANTAGE") {
    emotionalState = "CONCERNED";
    intensity = 6;
    shouldFilter = ["TRASH_TALK"]; // Don't trash talk when behind
  } else {
    emotionalState = "DESPERATE";
    intensity = 8;
    shouldFilter = ["TRASH_TALK", "GG"]; // Don't trash talk or GG prematurely when losing badly
  }

  // Adjust based on recent events
  if (lastAction === "ATTACK" && lastResult === "success") {
    emotionalState = "EXCITED";
    intensity = Math.min(10, intensity + 2);
    shouldFilter = []; // Just made good play - celebrate!
  } else if (lastResult === "failed" || lastResult === "negated") {
    if (emotionalState === "CONFIDENT") {
      emotionalState = "FRUSTRATED";
      intensity = 7;
    } else {
      emotionalState = "WORRIED";
      intensity = Math.min(10, intensity + 2);
    }
  }

  // Critical life point threshold
  if (myLP < 1000 && oppLP > 4000) {
    emotionalState = "DESPERATE";
    intensity = 10;
    shouldFilter = ["TRASH_TALK", "GG"]; // Don't celebrate when about to lose
  }

  // Empty board is concerning
  if (myMonsters === 0 && oppMonsters >= 2) {
    emotionalState = "WORRIED";
    intensity = Math.min(10, intensity + 1);
    shouldFilter.push("TRASH_TALK"); // Don't trash talk with empty board
  }

  return {
    state: emotionalState,
    intensity,
    shouldFilter,
  };
}

/**
 * Determine if response should be allowed based on emotional state
 */
function shouldAllowResponse(
  emotionalState: EmotionalState,
  intendedAction: string | undefined,
  runtime: IAgentRuntime
): boolean {
  if (!intendedAction) {
    return true; // No specific action - allow
  }

  // Check if action is filtered for this emotional state
  if (emotionalState.shouldFilter.includes(intendedAction)) {
    // Check character personality - some characters are defiant
    const bio = runtime.character?.bio;
    const personality = Array.isArray(bio) ? bio.join(" ") : bio || "";
    const personalityLower = personality.toLowerCase();
    const isDefiant =
      personalityLower.includes("defiant") ||
      personalityLower.includes("never gives up") ||
      personalityLower.includes("trash talk");

    // Allow defiant characters to trash talk even when losing
    if (intendedAction === "TRASH_TALK" && isDefiant) {
      logger.debug("Allowing trash talk for defiant character despite emotional state");
      return true;
    }

    emotionalState.filterReason = `${intendedAction} is inappropriate in ${emotionalState.state} state`;
    return false;
  }

  // Special case: Don't celebrate prematurely
  if (intendedAction === "GG" && emotionalState.state === "CONFIDENT") {
    // Only allow GG if game is actually over
    return true; // The GG action itself validates game completion
  }

  return true; // Allow by default
}
