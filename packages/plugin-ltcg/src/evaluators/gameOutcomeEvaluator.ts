/**
 * Game Outcome Evaluator
 *
 * Post-game learning evaluator that analyzes completed games:
 * - Identifies key decisions that influenced the outcome
 * - Extracts lessons learned from wins and losses
 * - Stores insights for future strategic improvement
 *
 * Trigger: Game completion (status === 'completed')
 */

import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { GameEvent, GameStateResponse } from "../types/api";
import type { LTCGState } from "../types/eliza";

/**
 * Decision record with outcome impact assessment
 */
interface AnalyzedDecision {
  turnNumber: number;
  phase: string;
  action: string;
  reasoning: string;
  impact: "positive" | "negative" | "neutral" | "pivotal";
  impactReason?: string;
}

/**
 * Game outcome analysis result
 */
interface GameOutcomeAnalysis {
  gameId: string;
  result: "win" | "loss" | "draw";
  finalLP: { agent: number; opponent: number };
  totalTurns: number;
  keyDecisions: AnalyzedDecision[];
  turningPoints: TurningPoint[];
  lessonsLearned: string[];
  strategyAdjustments: string[];
  performanceMetrics: PerformanceMetrics;
}

/**
 * Turning point in the game
 */
interface TurningPoint {
  turnNumber: number;
  description: string;
  lpSwing: number;
  boardAdvantageChange: "gained" | "lost" | "neutral";
}

/**
 * Performance metrics for learning
 */
interface PerformanceMetrics {
  damageDealt: number;
  damageTaken: number;
  monstersDestroyed: number;
  monstersLost: number;
  spellsUsed: number;
  trapsActivated: number;
  attacksLaunched: number;
  lethalMissed: boolean;
  unnecessaryRisks: number;
}

/**
 * Keywords indicating bad plays for pattern recognition
 */
const BAD_PLAY_INDICATORS = [
  "attacked into stronger monster",
  "lost monster for nothing",
  "wasted removal",
  "missed lethal",
  "overextended",
  "walked into trap",
  "unnecessary tribute",
];

/**
 * Keywords indicating good plays
 */
const GOOD_PLAY_INDICATORS = [
  "dealt lethal damage",
  "removed threat",
  "protected life points",
  "baited trap",
  "established board",
  "efficient trade",
  "perfect read",
];

export const gameOutcomeEvaluator: Evaluator = {
  name: "LTCG_GAME_OUTCOME",
  description: "Analyzes completed games and extracts lessons for strategic improvement",
  similes: ["POST_GAME_ANALYSIS", "GAME_REVIEW", "LEARNING_EVALUATOR"],

  examples: [
    {
      prompt: "Analyze game outcome after winning",
      messages: [
        {
          name: "{{user1}}",
          content: { text: "Game over! You won with 2500 LP remaining." },
        },
      ],
      outcome:
        "Game analysis complete. Key insight: Aggressive early summons established board control leading to victory.",
    },
    {
      prompt: "Analyze game outcome after losing",
      messages: [
        {
          name: "{{user1}}",
          content: { text: "Game over! You lost. Opponent had 4000 LP." },
        },
      ],
      outcome:
        "Game analysis complete. Lesson learned: Attacking into stronger monsters on turns 3-4 led to resource disadvantage.",
    },
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Only trigger on game completion
    const messageContent = message.content as Record<string, unknown>;
    const stateContent = state as unknown as Record<string, unknown>;

    // Check if this is a game completion message
    const isGameComplete =
      messageContent?.gameStatus === "completed" ||
      stateContent?.gameStatus === "completed" ||
      (typeof messageContent?.text === "string" &&
        messageContent.text.toLowerCase().includes("game over"));

    // Check if we have a gameId to analyze
    const gameId =
      (messageContent?.gameId as string) ||
      (stateContent?.currentGameId as string) ||
      (stateContent?.gameId as string);

    if (!isGameComplete || !gameId) {
      return false;
    }

    // Verify API credentials exist
    const apiKey = runtime.getSetting("LTCG_API_KEY");
    const apiUrl = runtime.getSetting("LTCG_API_URL");

    return Boolean(apiKey && apiUrl);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options?: Record<string, unknown>
  ): Promise<void> => {
    try {
      logger.info("Starting game outcome analysis");

      // Get API client
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      const client = new LTCGApiClient({ apiKey, baseUrl: apiUrl });

      // Extract gameId
      const messageContent = message.content as Record<string, unknown>;
      const stateContent = state as unknown as Record<string, unknown>;
      const gameId =
        (messageContent?.gameId as string) ||
        (stateContent?.currentGameId as string) ||
        (stateContent?.gameId as string);

      const ltcgState = state as LTCGState;

      if (!gameId) {
        logger.warn("No gameId found for outcome analysis");
        ltcgState.values.LTCG_GAME_OUTCOME_SUCCESS = false;
        return;
      }

      // Fetch game data in parallel
      const [gameState, gameHistory, decisionsResult] = await Promise.all([
        client.getGameState(gameId).catch(() => null),
        client.getGameHistory(gameId).catch(() => [] as GameEvent[]),
        client.getDecisions({ gameId, limit: 100 }).catch(() => ({ decisions: [] })),
      ]);

      if (!gameState) {
        logger.warn({ gameId }, "Could not fetch game state for analysis");
        ltcgState.values.LTCG_GAME_OUTCOME_SUCCESS = false;
        return;
      }

      // Determine game outcome
      const result = determineGameResult(gameState);

      // Analyze the game
      const analysis = analyzeGame(
        gameId,
        gameState,
        gameHistory,
        decisionsResult.decisions,
        result
      );

      // Log the analysis
      logger.info(
        {
          gameId,
          result: analysis.result,
          totalTurns: analysis.totalTurns,
          keyDecisionCount: analysis.keyDecisions.length,
          turningPointCount: analysis.turningPoints.length,
          lessonsCount: analysis.lessonsLearned.length,
        },
        "Game outcome analysis complete"
      );

      // Store analysis insights (could be saved to memory/database in future)
      await storeAnalysisInsights(runtime, client, analysis);

      // Generate summary for the agent
      const summaryText = generateAnalysisSummary(analysis);
      logger.info({ summary: summaryText }, "Game analysis summary");

      // Store success in state
      ltcgState.values.LTCG_GAME_OUTCOME_SUCCESS = true;
      ltcgState.values.LTCG_GAME_ANALYSIS = analysis;
    } catch (error) {
      logger.error({ error }, "Error in game outcome evaluator");
      const ltcgState = state as LTCGState;
      ltcgState.values.LTCG_GAME_OUTCOME_SUCCESS = false;
    }
  },
};

/**
 * Determine the result of the game from game state
 */
function determineGameResult(gameState: GameStateResponse): "win" | "loss" | "draw" {
  const myLP = gameState.myLifePoints;
  const oppLP = gameState.opponentLifePoints;

  if (myLP <= 0 && oppLP <= 0) return "draw";
  if (oppLP <= 0) return "win";
  if (myLP <= 0) return "loss";

  // If both have LP, check deck out or other conditions
  if (gameState.myDeckCount === 0) return "loss";
  if (gameState.opponentDeckCount === 0) return "win";

  // Default to checking who has more LP (shouldn't normally reach here)
  return myLP > oppLP ? "win" : myLP < oppLP ? "loss" : "draw";
}

/**
 * Main game analysis function
 */
function analyzeGame(
  gameId: string,
  gameState: GameStateResponse,
  history: GameEvent[],
  decisions: Array<{
    turnNumber: number;
    phase: string;
    action: string;
    reasoning: string;
    result?: string;
  }>,
  result: "win" | "loss" | "draw"
): GameOutcomeAnalysis {
  const keyDecisions = analyzeDecisions(decisions, result);
  const turningPoints = identifyTurningPoints(history);
  const metrics = calculateMetrics(history);
  const lessonsLearned = extractLessons(keyDecisions, turningPoints, metrics, result);
  const strategyAdjustments = generateAdjustments(lessonsLearned, result);

  return {
    gameId,
    result,
    finalLP: {
      agent: gameState.myLifePoints,
      opponent: gameState.opponentLifePoints,
    },
    totalTurns: gameState.turnNumber,
    keyDecisions,
    turningPoints,
    lessonsLearned,
    strategyAdjustments,
    performanceMetrics: metrics,
  };
}

/**
 * Analyze decisions and assess their impact
 */
function analyzeDecisions(
  decisions: Array<{
    turnNumber: number;
    phase: string;
    action: string;
    reasoning: string;
    result?: string;
  }>,
  gameResult: "win" | "loss" | "draw"
): AnalyzedDecision[] {
  const analyzed: AnalyzedDecision[] = [];

  for (const decision of decisions) {
    const impact = assessDecisionImpact(decision, gameResult);
    analyzed.push({
      turnNumber: decision.turnNumber,
      phase: decision.phase,
      action: decision.action,
      reasoning: decision.reasoning,
      ...impact,
    });
  }

  // Sort by impact importance (pivotal > positive/negative > neutral)
  const impactOrder = { pivotal: 0, positive: 1, negative: 1, neutral: 2 };
  analyzed.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

  // Return top decisions (limit to most impactful)
  return analyzed.slice(0, 10);
}

/**
 * Assess the impact of a single decision
 */
function assessDecisionImpact(
  decision: { action: string; reasoning: string; result?: string },
  gameResult: "win" | "loss" | "draw"
): {
  impact: "positive" | "negative" | "neutral" | "pivotal";
  impactReason?: string;
} {
  const reasoningLower = decision.reasoning.toLowerCase();
  const resultLower = (decision.result || "").toLowerCase();
  const combined = `${reasoningLower} ${resultLower}`;

  // Check for pivotal indicators
  if (combined.includes("lethal") && gameResult === "win") {
    return {
      impact: "pivotal",
      impactReason: "Executed lethal damage for the win",
    };
  }
  if (combined.includes("missed lethal") && gameResult === "loss") {
    return {
      impact: "pivotal",
      impactReason: "Missed lethal opportunity that could have won",
    };
  }

  // Check for good play indicators
  for (const indicator of GOOD_PLAY_INDICATORS) {
    if (combined.includes(indicator)) {
      return { impact: "positive", impactReason: `Good play: ${indicator}` };
    }
  }

  // Check for bad play indicators
  for (const indicator of BAD_PLAY_INDICATORS) {
    if (combined.includes(indicator)) {
      return { impact: "negative", impactReason: `Mistake: ${indicator}` };
    }
  }

  // Assess based on action type and result
  if (decision.action === "attack" && resultLower.includes("destroyed")) {
    if (resultLower.includes("opponent")) {
      return {
        impact: "positive",
        impactReason: "Successful attack destroyed opponent monster",
      };
    }
    if (resultLower.includes("your") || resultLower.includes("my")) {
      return {
        impact: "negative",
        impactReason: "Attack resulted in losing own monster",
      };
    }
  }

  return { impact: "neutral" };
}

/**
 * Identify turning points from game history
 */
function identifyTurningPoints(history: GameEvent[]): TurningPoint[] {
  const turningPoints: TurningPoint[] = [];
  let _prevLP = 8000; // Starting LP

  for (const event of history) {
    // Check for significant damage events
    if (event.eventType === "damage" && event.metadata) {
      const damage = (event.metadata.damage as number) || 0;
      if (damage >= 2000) {
        turningPoints.push({
          turnNumber: event.turnNumber,
          description: event.description,
          lpSwing: damage,
          boardAdvantageChange: damage > 3000 ? "gained" : "neutral",
        });
      }
      _prevLP -= damage;
    }

    // Check for board-clearing events
    if (
      event.eventType === "spell_activation" &&
      event.description.toLowerCase().includes("destroy all")
    ) {
      turningPoints.push({
        turnNumber: event.turnNumber,
        description: `Board clear: ${event.description}`,
        lpSwing: 0,
        boardAdvantageChange: "gained",
      });
    }
  }

  return turningPoints.slice(0, 5); // Top 5 turning points
}

/**
 * Calculate performance metrics from game history
 */
function calculateMetrics(history: GameEvent[]): PerformanceMetrics {
  const metrics: PerformanceMetrics = {
    damageDealt: 0,
    damageTaken: 0,
    monstersDestroyed: 0,
    monstersLost: 0,
    spellsUsed: 0,
    trapsActivated: 0,
    attacksLaunched: 0,
    lethalMissed: false,
    unnecessaryRisks: 0,
  };

  for (const event of history) {
    switch (event.eventType) {
      case "damage":
        if (event.metadata?.target === "opponent") {
          metrics.damageDealt += (event.metadata?.damage as number) || 0;
        } else {
          metrics.damageTaken += (event.metadata?.damage as number) || 0;
        }
        break;

      case "attack":
        metrics.attacksLaunched++;
        if (event.metadata?.monsterDestroyed === "opponent") {
          metrics.monstersDestroyed++;
        } else if (event.metadata?.monsterDestroyed === "self") {
          metrics.monstersLost++;
        }
        break;

      case "spell_activation":
        metrics.spellsUsed++;
        break;
    }
  }

  return metrics;
}

/**
 * Extract lessons from the analysis
 */
function extractLessons(
  decisions: AnalyzedDecision[],
  turningPoints: TurningPoint[],
  metrics: PerformanceMetrics,
  result: "win" | "loss" | "draw"
): string[] {
  const lessons: string[] = [];

  // Lessons from decisions
  const negativeDecisions = decisions.filter((d) => d.impact === "negative");
  const positiveDecisions = decisions.filter(
    (d) => d.impact === "positive" || d.impact === "pivotal"
  );

  if (negativeDecisions.length > 0) {
    lessons.push(`Avoid: ${negativeDecisions.map((d) => d.impactReason || d.action).join(", ")}`);
  }

  if (positiveDecisions.length > 0 && result === "win") {
    lessons.push(
      `Winning plays: ${positiveDecisions.map((d) => d.impactReason || d.action).join(", ")}`
    );
  }

  // Lessons from metrics
  if (metrics.monstersLost > metrics.monstersDestroyed && result === "loss") {
    lessons.push("Trade efficiency needs improvement - lost more monsters than destroyed");
  }

  if (metrics.damageDealt > 6000 && result === "loss") {
    lessons.push("Dealt significant damage but lost - focus on finishing when ahead");
  }

  if (metrics.lethalMissed) {
    lessons.push(
      "CRITICAL: Missed lethal opportunity - always calculate total damage before attacks"
    );
  }

  // Lessons from turning points
  if (turningPoints.some((tp) => tp.boardAdvantageChange === "lost")) {
    lessons.push("Lost board advantage at critical moment - consider holding removal for threats");
  }

  return lessons.slice(0, 5); // Top 5 lessons
}

/**
 * Generate strategy adjustments based on lessons
 */
function generateAdjustments(lessons: string[], result: "win" | "loss" | "draw"): string[] {
  const adjustments: string[] = [];

  if (result === "loss") {
    // Defensive adjustments for losses
    if (lessons.some((l) => l.includes("trade efficiency"))) {
      adjustments.push("ADJUST: Only attack when ATK advantage is clear or removal is available");
    }
    if (lessons.some((l) => l.includes("missed lethal"))) {
      adjustments.push("ADJUST: Prioritize lethal calculation at start of battle phase");
    }
    if (lessons.some((l) => l.includes("board advantage"))) {
      adjustments.push("ADJUST: Hold removal spells for high-threat monsters");
    }
    // General loss adjustments
    adjustments.push("REVIEW: Consider more conservative plays until board is stable");
  } else if (result === "win") {
    // Reinforce winning patterns
    if (lessons.some((l) => l.includes("Winning plays"))) {
      adjustments.push("REINFORCE: Continue aggressive board control strategy");
    }
  }

  return adjustments.slice(0, 3);
}

/**
 * Store analysis insights for future reference
 */
async function storeAnalysisInsights(
  _runtime: IAgentRuntime,
  client: LTCGApiClient,
  analysis: GameOutcomeAnalysis
): Promise<void> {
  // Save a summary decision record for the game outcome
  try {
    await client.saveDecision({
      gameId: analysis.gameId,
      turnNumber: analysis.totalTurns,
      phase: "game_over",
      action: `GAME_${analysis.result.toUpperCase()}`,
      reasoning: analysis.lessonsLearned.join(" | "),
      parameters: {
        finalLP: analysis.finalLP,
        keyDecisionCount: analysis.keyDecisions.length,
        turningPointCount: analysis.turningPoints.length,
        metrics: analysis.performanceMetrics,
      },
      result: analysis.strategyAdjustments.join(" | "),
    });

    logger.debug({ gameId: analysis.gameId }, "Game outcome insights saved");
  } catch (error) {
    logger.warn({ error }, "Could not save game outcome insights");
  }
}

/**
 * Generate a human-readable summary of the analysis
 */
function generateAnalysisSummary(analysis: GameOutcomeAnalysis): string {
  const lines: string[] = [];

  lines.push(`=== GAME ANALYSIS: ${analysis.result.toUpperCase()} ===`);
  lines.push(`Final LP: You ${analysis.finalLP.agent} | Opponent ${analysis.finalLP.opponent}`);
  lines.push(`Duration: ${analysis.totalTurns} turns`);

  if (analysis.keyDecisions.length > 0) {
    lines.push("\nKey Decisions:");
    analysis.keyDecisions.slice(0, 3).forEach((d) => {
      lines.push(
        `  Turn ${d.turnNumber}: ${d.action} [${d.impact}] - ${d.impactReason || d.reasoning}`
      );
    });
  }

  if (analysis.lessonsLearned.length > 0) {
    lines.push("\nLessons Learned:");
    analysis.lessonsLearned.forEach((l) => lines.push(`  - ${l}`));
  }

  if (analysis.strategyAdjustments.length > 0) {
    lines.push("\nStrategy Adjustments:");
    analysis.strategyAdjustments.forEach((a) => lines.push(`  - ${a}`));
  }

  return lines.join("\n");
}
