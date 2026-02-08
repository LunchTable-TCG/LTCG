/**
 * Strategy Evaluator
 *
 * Evaluates strategic decisions before execution and prevents obviously bad plays.
 * Only filters truly terrible plays while allowing risk-taking based on settings.
 */

import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { boardAnalysisProvider } from "../providers/boardAnalysisProvider";
import { gameStateProvider } from "../providers/gameStateProvider";
import { legalActionsProvider } from "../providers/legalActionsProvider";
import type { GameStateResponse } from "../types/api";

export const strategyEvaluator: Evaluator = {
  name: "LTCG_STRATEGY",
  description: "Evaluates strategic decisions and prevents obviously bad plays",
  similes: ["STRATEGY_CHECK", "TACTICAL_VALIDATOR", "PLAY_QUALITY"],

  examples: [
    {
      prompt: "Evaluate attack with weak monster into strong monster",
      messages: [
        {
          name: "{{user1}}",
          content: {
            text: "I want to attack with weak monster into strong monster",
          },
        },
      ],
      outcome:
        "Strategy evaluation: BAD_PLAY. Attack would lead to losing monster for nothing - FILTERED.",
    },
    {
      prompt: "Evaluate summoning strongest monster",
      messages: [
        {
          name: "{{user1}}",
          content: { text: "I will summon my strongest monster" },
        },
      ],
      outcome: "Strategy evaluation: GOOD_PLAY. Allowed.",
    },
  ],

  validate: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    // Always validate strategy - check runs on all gameplay messages
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options?: Record<string, unknown>
  ): Promise<void> => {
    try {
      logger.debug("Evaluating strategic decision");

      // Get game state and analysis
      const gameStateResult = await gameStateProvider.get(runtime, message, state);
      const gameState = gameStateResult.data?.gameState as GameStateResponse;

      if (!gameState) {
        logger.debug("No game state available for strategy evaluation");
        // Store result in state - allow if we can't evaluate
        (state.values as Record<string, unknown>).LTCG_STRATEGY_ALLOWED = true;
        return;
      }

      const boardAnalysisResult = await boardAnalysisProvider.get(runtime, message, state);
      const boardAnalysis = (boardAnalysisResult.data ?? {}) as BoardAnalysis;

      const legalActionsResult = await legalActionsProvider.get(runtime, message, state);
      const legalActions = (legalActionsResult.data ?? {}) as LegalActions;

      // Get intended action and parameters
      const messageContent = message.content as Record<string, unknown>;
      const stateValues = state.values as Record<string, unknown>;
      const intendedAction = (messageContent?.action || stateValues?.currentAction) as
        | string
        | undefined;
      const actionParams = (stateValues?.actionParams || {}) as ActionParams;

      if (!intendedAction) {
        logger.debug("No intended action to evaluate");
        (state.values as Record<string, unknown>).LTCG_STRATEGY_ALLOWED = true;
        return;
      }

      // Get risk tolerance setting
      const riskTolerance = (runtime.getSetting("LTCG_RISK_TOLERANCE") as string) || "medium";

      // Evaluate the strategic quality of the action
      const evaluation = evaluateStrategicDecision(
        intendedAction as string,
        actionParams,
        gameState,
        boardAnalysis,
        legalActions,
        riskTolerance
      );

      // Log evaluation
      logger.debug(
        {
          action: intendedAction,
          quality: evaluation.quality,
          risk: evaluation.risk,
          shouldFilter: evaluation.shouldFilter,
        },
        "Strategic evaluation complete"
      );

      if (evaluation.shouldFilter) {
        logger.warn(
          {
            action: intendedAction,
            reason: evaluation.reason,
            suggestion: evaluation.suggestion,
          },
          "Filtering bad strategic decision"
        );
      }

      // Store evaluation result in state
      stateValues.LTCG_STRATEGY_ALLOWED = !evaluation.shouldFilter;
      stateValues.LTCG_STRATEGY_EVALUATION = evaluation;
    } catch (error) {
      logger.error({ error }, "Error in strategy evaluator");
      // Allow on error to avoid blocking
      (state.values as Record<string, unknown>).LTCG_STRATEGY_ALLOWED = true;
    }
  },
};

/**
 * Play quality assessment
 */
type PlayQuality = "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "QUESTIONABLE" | "BAD" | "TERRIBLE";
type RiskLevel = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Strategic evaluation result
 */
interface StrategicEvaluation {
  quality: PlayQuality;
  risk: RiskLevel;
  shouldFilter: boolean;
  reason?: string;
  suggestion?: string;
}

/**
 * Action parameters - flexible structure for different action types
 */
interface ActionParams {
  attackerCardId?: string;
  targetCardId?: string | null;
  cardId?: string;
  [key: string]: unknown;
}

/**
 * Board analysis data from provider
 */
interface BoardAnalysis {
  advantage?:
    | "STRONG_ADVANTAGE"
    | "SLIGHT_ADVANTAGE"
    | "EVEN"
    | "SLIGHT_DISADVANTAGE"
    | "STRONG_DISADVANTAGE";
  [key: string]: unknown;
}

/**
 * Legal actions data from provider
 */
interface LegalActions {
  [key: string]: unknown;
}

/**
 * Evaluate the strategic quality of a decision
 */
function evaluateStrategicDecision(
  action: string,
  params: ActionParams,
  gameState: GameStateResponse,
  boardAnalysis: BoardAnalysis,
  legalActions: LegalActions,
  riskTolerance: string
): StrategicEvaluation {
  // Evaluate based on action type
  switch (action) {
    case "ATTACK":
      return evaluateAttack(params, gameState, boardAnalysis, riskTolerance);

    case "SUMMON_MONSTER":
    case "SUMMON":
      return evaluateSummon(params, gameState, boardAnalysis, riskTolerance);

    case "ACTIVATE_SPELL":
    case "ACTIVATE_TRAP":
      return evaluateSpellTrap(params, gameState, boardAnalysis, riskTolerance);

    case "END_TURN":
      return evaluateEndTurn(params, gameState, boardAnalysis, legalActions, riskTolerance);

    default:
      // Unknown action - allow
      return {
        quality: "ACCEPTABLE",
        risk: "LOW",
        shouldFilter: false,
      };
  }
}

/**
 * Evaluate attack decision
 */
function evaluateAttack(
  params: ActionParams,
  gameState: GameStateResponse,
  _boardAnalysis: BoardAnalysis,
  riskTolerance: string
): StrategicEvaluation {
  const attackerCardId = params.attackerCardId;
  const targetCardId = params.targetCardId;

  if (!attackerCardId) {
    return {
      quality: "TERRIBLE",
      risk: "CRITICAL",
      shouldFilter: true,
      reason: "No attacker card ID provided",
      suggestion: "Select a monster to attack with",
    };
  }

  // Use new API fields with fallback to legacy fields
  const myMonsters = gameState.myBoard ?? gameState.hostPlayer?.monsterZone ?? [];
  const oppMonsters = gameState.opponentBoard ?? gameState.opponentPlayer?.monsterZone ?? [];
  const oppBackrow = gameState.opponentPlayer?.spellTrapZone?.length ?? 0;

  const attacker = myMonsters.find(m => m._id === attackerCardId);

  if (!attacker) {
    return {
      quality: "TERRIBLE",
      risk: "CRITICAL",
      shouldFilter: true,
      reason: "Invalid attacker card ID",
      suggestion: "Select a valid monster to attack with",
    };
  }

  // Direct attack evaluation
  if (!targetCardId) {
    // Check if opponent has monsters - attacking directly when they have monsters is usually bad
    if (oppMonsters.length > 0) {
      return {
        quality: "TERRIBLE",
        risk: "CRITICAL",
        shouldFilter: true,
        reason: "Cannot attack directly when opponent has monsters",
        suggestion: "Attack or remove opponent monsters first",
      };
    }

    // Check for trap risk
    if (oppBackrow >= 2) {
      return {
        quality: "QUESTIONABLE",
        risk: "HIGH",
        shouldFilter: riskTolerance === "low",
        reason: "Direct attack with multiple set backrow cards - likely traps",
        suggestion: "Consider removing backrow first",
      };
    }

    return {
      quality: "GOOD",
      risk: "LOW",
      shouldFilter: false,
    };
  }

  // Monster-to-monster attack evaluation
  const target = oppMonsters.find(m => m._id === targetCardId);

  if (!target) {
    return {
      quality: "TERRIBLE",
      risk: "CRITICAL",
      shouldFilter: true,
      reason: "Invalid target card ID",
      suggestion: "Select a valid target monster",
    };
  }

  // Check if attack will succeed (BoardCard uses .attack/.defense and position: 1|2)
  const attackerAtk = attacker.attack ?? 0;
  // BoardCard position: 1 = attack, 2 = defense
  const targetAtk = target.position === 1 ? (target.attack ?? 0) : (target.defense ?? 0);

  if (attackerAtk < targetAtk) {
    // Attacking into stronger monster - bad unless desperate
    const myLP = gameState.myLifePoints ?? gameState.hostPlayer?.lifePoints ?? 8000;
    const oppLP = gameState.opponentLifePoints ?? gameState.opponentPlayer?.lifePoints ?? 8000;
    const lpDifference = myLP - oppLP;
    const isDesperate = lpDifference < -3000 || myLP < 2000;

    if (!isDesperate) {
      return {
        quality: "BAD",
        risk: "HIGH",
        shouldFilter: true,
        reason: `Attacking ${attacker.name} (${attackerAtk} ATK) into stronger ${target.name} (${targetAtk} ${target.position === 1 ? "ATK" : "DEF"}) will lose your monster`,
        suggestion: "Use removal spell or summon stronger monster",
      };
    }
    return {
      quality: "QUESTIONABLE",
      risk: "HIGH",
      shouldFilter: false,
      reason: "Risky attack but desperate situation allows it",
    };
  }

  // Check trap risk
  if (oppBackrow >= 3) {
    return {
      quality: "QUESTIONABLE",
      risk: "HIGH",
      shouldFilter: riskTolerance === "low",
      reason: "Multiple backrow cards - high trap risk",
      suggestion: "Consider removing backrow first",
    };
  }

  return {
    quality: "GOOD",
    risk: "LOW",
    shouldFilter: false,
  };
}

/**
 * Evaluate summon decision
 */
function evaluateSummon(
  params: ActionParams,
  gameState: GameStateResponse,
  boardAnalysis: BoardAnalysis,
  _riskTolerance: string
): StrategicEvaluation {
  const cardId = params.cardId;
  const hand = gameState.hand;

  if (!cardId) {
    return {
      quality: "TERRIBLE",
      risk: "CRITICAL",
      shouldFilter: true,
      reason: "No card ID provided",
      suggestion: "Select a card from hand to summon",
    };
  }

  const monsterToSummon = hand.find(c => c._id === cardId);

  if (!monsterToSummon || monsterToSummon.cardType !== "creature") {
    return {
      quality: "TERRIBLE",
      risk: "CRITICAL",
      shouldFilter: true,
      reason: "Invalid monster to summon",
      suggestion: "Select a valid monster from hand",
    };
  }

  // Check if summoning weak monster when stronger one available
  const monstersInHand = hand.filter((card) => card.cardType === "creature");
  const strongestInHand = monstersInHand.reduce((strongest, monster) => {
    return (monster.attack || 0) > (strongest.attack || 0) ? monster : strongest;
  }, monsterToSummon);

  const summonAtk = monsterToSummon.attack || 0;
  const strongestAtk = strongestInHand.attack || 0;

  if (summonAtk < strongestAtk - 500 && !gameState.hasNormalSummoned) {
    // Summoning weak monster when stronger available - questionable
    const advantage = boardAnalysis?.advantage;

    if (advantage === "STRONG_DISADVANTAGE" || advantage === "SLIGHT_DISADVANTAGE") {
      return {
        quality: "QUESTIONABLE",
        risk: "MEDIUM",
        shouldFilter: false,
        reason: `Summoning weak monster (${summonAtk} ATK) when stronger available (${strongestAtk} ATK), but might be strategic`,
        suggestion: "Consider summoning strongest monster when behind",
      };
    }
  }

  return {
    quality: "GOOD",
    risk: "LOW",
    shouldFilter: false,
  };
}

/**
 * Evaluate spell/trap activation
 */
function evaluateSpellTrap(
  params: ActionParams,
  gameState: GameStateResponse,
  _boardAnalysis: BoardAnalysis,
  _riskTolerance: string
): StrategicEvaluation {
  // Basic validation - can be enhanced later
  const cardId = params.cardId;
  const hand = gameState.hand;

  if (!cardId) {
    return {
      quality: "TERRIBLE",
      risk: "CRITICAL",
      shouldFilter: true,
      reason: "No card ID provided",
      suggestion: "Select a card from hand to activate",
    };
  }

  const card = hand.find(c => c._id === cardId);

  if (!card || (card.cardType !== "spell" && card.cardType !== "trap")) {
    return {
      quality: "TERRIBLE",
      risk: "CRITICAL",
      shouldFilter: true,
      reason: "Invalid spell/trap card",
      suggestion: "Select a valid spell or trap from hand",
    };
  }

  // Generally safe to activate spells/traps
  return {
    quality: "GOOD",
    risk: "LOW",
    shouldFilter: false,
  };
}

/**
 * Evaluate end turn decision
 */
function evaluateEndTurn(
  _params: ActionParams,
  gameState: GameStateResponse,
  boardAnalysis: BoardAnalysis,
  _legalActions: LegalActions,
  _riskTolerance: string
): StrategicEvaluation {
  // Check if ending turn without using resources
  const hand = gameState.hand;
  const monstersInHand = hand.filter((card) => card.cardType === "creature" && (card.cost || 4) <= 4);
  const hasNormalSummoned = gameState.hasNormalSummoned;

  // If can summon but haven't and board is empty - questionable
  const myMonsters = gameState.myBoard?.length ?? gameState.hostPlayer?.monsterZone?.length ?? 0;

  if (!hasNormalSummoned && monstersInHand.length > 0 && myMonsters === 0) {
    const advantage = boardAnalysis?.advantage;

    if (advantage === "STRONG_DISADVANTAGE") {
      return {
        quality: "QUESTIONABLE",
        risk: "MEDIUM",
        shouldFilter: false,
        reason: "Ending turn without summoning while board is empty and losing",
        suggestion: "Consider summoning a monster for defense",
      };
    }
  }

  // Generally safe to end turn
  return {
    quality: "ACCEPTABLE",
    risk: "LOW",
    shouldFilter: false,
  };
}
