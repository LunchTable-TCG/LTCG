/**
 * Win Condition Provider
 *
 * Calculates and tracks win conditions and paths to victory:
 * - Turns to lethal (exact damage paths)
 * - Opponent's potential lethal threat
 * - "Must answer" threats that need immediate response
 * - Alternative win conditions
 *
 * This helps the agent prioritize actions based on game-ending scenarios.
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { BoardCard, GameStateResponse } from "../types/api";
import { calculateBattleOutcome, estimateWinProbability } from "../utils/probabilityCalculator";

/**
 * Attack sequence for lethal calculation
 */
interface AttackSequence {
  attacker: { index: number; name: string; atk: number };
  target: { index: number; name: string; isDefense: boolean; value: number } | "direct";
  damage: number;
  destroysTarget: boolean;
}

/**
 * Lethal path calculation
 */
interface LethalPath {
  available: boolean;
  turnsAway: number;
  sequence: AttackSequence[];
  totalDamage: number;
  overkill: number;
  requiresNoInterference: boolean;
  blockers: string[];
}

/**
 * Threat assessment for opponent's board
 */
interface ThreatAssessment {
  threatLevel: "lethal" | "critical" | "high" | "medium" | "low";
  opponentLethalInTurns: number | null;
  mustAnswerThreats: MustAnswerThreat[];
  potentialDamage: number;
  riskFactors: string[];
}

/**
 * A threat that must be answered immediately
 */
interface MustAnswerThreat {
  cardName: string;
  cardId: string;
  reason: string;
  priority: "immediate" | "high" | "medium";
  suggestedAnswer: string;
}

/**
 * Full win condition analysis
 */
interface WinConditionAnalysis {
  gameId: string;
  currentTurn: number;
  myLP: number;
  opponentLP: number;

  // Lethal analysis
  lethalPath: LethalPath;

  // Threat analysis
  threatAssessment: ThreatAssessment;

  // Win probability
  winProbability: number;
  confidence: "low" | "medium" | "high";

  // Strategic recommendations
  primaryObjective: string;
  secondaryObjectives: string[];
  warnings: string[];
}

export const winConditionProvider: Provider = {
  name: "LTCG_WIN_CONDITIONS",
  description: "Analyzes win conditions, lethal paths, and threats to inform strategic priorities",

  async get(runtime: IAgentRuntime, _message: Memory, state: State): Promise<ProviderResult> {
    try {
      // Get API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "Win condition analysis unavailable - API credentials not configured.",
          values: { error: "MISSING_CONFIG" },
          data: {},
        };
      }

      // Get current game ID
      const stateContent = state as unknown as Record<string, unknown>;
      const gameId = (stateContent?.currentGameId as string) || (stateContent?.gameId as string);

      if (!gameId) {
        return {
          text: "No active game - win condition analysis not available.",
          values: { error: "NO_GAME" },
          data: {},
        };
      }

      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Fetch game state
      const gameState = await client.getGameState(gameId);

      // Perform analysis
      const analysis = analyzeWinConditions(gameId, gameState);

      // Build LLM-friendly text
      const textParts: string[] = [];
      textParts.push("# Win Condition Analysis\n");

      // Lethal section
      if (analysis.lethalPath.available) {
        textParts.push("## **LETHAL AVAILABLE**");
        textParts.push(
          `Total damage: ${analysis.lethalPath.totalDamage} (Overkill: ${analysis.lethalPath.overkill})`
        );
        textParts.push("\n**Attack Sequence:**");
        analysis.lethalPath.sequence.forEach((step, i) => {
          const targetDesc =
            step.target === "direct"
              ? "DIRECT ATTACK"
              : `${step.target.name} (${step.target.isDefense ? "DEF" : "ATK"}: ${step.target.value})`;
          textParts.push(
            `${i + 1}. ${step.attacker.name} (${step.attacker.atk} ATK) -> ${targetDesc} = ${step.damage} damage`
          );
        });

        if (analysis.lethalPath.blockers.length > 0) {
          textParts.push(`\n**Potential Blockers:** ${analysis.lethalPath.blockers.join(", ")}`);
        }
        textParts.push("");
      } else {
        textParts.push(
          `## Turns to Lethal: ${analysis.lethalPath.turnsAway === Number.POSITIVE_INFINITY ? "N/A" : analysis.lethalPath.turnsAway}`
        );
        textParts.push(`Current damage potential: ${analysis.lethalPath.totalDamage}`);
        textParts.push(
          `Needed: ${analysis.opponentLP - analysis.lethalPath.totalDamage} more damage`
        );
        textParts.push("");
      }

      // Threat section
      textParts.push(`## Threat Level: ${analysis.threatAssessment.threatLevel.toUpperCase()}`);
      if (analysis.threatAssessment.opponentLethalInTurns !== null) {
        textParts.push(
          `**WARNING: Opponent lethal in ${analysis.threatAssessment.opponentLethalInTurns} turn(s)**`
        );
      }
      textParts.push(
        `Potential damage from opponent: ${analysis.threatAssessment.potentialDamage}`
      );

      if (analysis.threatAssessment.mustAnswerThreats.length > 0) {
        textParts.push("\n**Must Answer Threats:**");
        analysis.threatAssessment.mustAnswerThreats.forEach((threat) => {
          textParts.push(
            `- [${threat.priority.toUpperCase()}] ${threat.cardName}: ${threat.reason}`
          );
          textParts.push(`  Suggested: ${threat.suggestedAnswer}`);
        });
      }

      if (analysis.threatAssessment.riskFactors.length > 0) {
        textParts.push("\n**Risk Factors:**");
        analysis.threatAssessment.riskFactors.forEach((risk) => {
          textParts.push(`- ${risk}`);
        });
      }
      textParts.push("");

      // Win probability
      textParts.push(
        `## Win Probability: ${Math.round(analysis.winProbability * 100)}% (${analysis.confidence} confidence)`
      );
      textParts.push("");

      // Strategic guidance
      textParts.push(`## Primary Objective: ${analysis.primaryObjective}`);
      if (analysis.secondaryObjectives.length > 0) {
        textParts.push("Secondary:");
        analysis.secondaryObjectives.forEach((obj) => textParts.push(`- ${obj}`));
      }

      if (analysis.warnings.length > 0) {
        textParts.push("\n**Warnings:**");
        analysis.warnings.forEach((w) => textParts.push(`- ${w}`));
      }

      // Build structured data
      const data = {
        analysis,
        lethalAvailable: analysis.lethalPath.available,
        threatLevel: analysis.threatAssessment.threatLevel,
        winProbability: analysis.winProbability,
        mustAnswerCount: analysis.threatAssessment.mustAnswerThreats.length,
      };

      const values = {
        lethalAvailable: analysis.lethalPath.available,
        turnsToLethal: analysis.lethalPath.turnsAway,
        threatLevel: analysis.threatAssessment.threatLevel,
        winProbability: Math.round(analysis.winProbability * 100),
        mustAnswerCount: analysis.threatAssessment.mustAnswerThreats.length,
      };

      return {
        text: textParts.join("\n"),
        values,
        data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error analyzing win conditions";

      logger.error({ error }, "Failed to analyze win conditions");

      return {
        text: `Error analyzing win conditions: ${errorMessage}`,
        values: { error: "ANALYSIS_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Main analysis function
 */
function analyzeWinConditions(gameId: string, gameState: GameStateResponse): WinConditionAnalysis {
  const myBoard = gameState.myBoard || [];
  const oppBoard = gameState.opponentBoard || [];
  const myLP = gameState.myLifePoints;
  const oppLP = gameState.opponentLifePoints;

  // Calculate lethal path
  const lethalPath = calculateLethalPath(myBoard, oppBoard, oppLP);

  // Assess threats
  const threatAssessment = assessThreats(oppBoard, myBoard, myLP, gameState);

  // Win probability
  const winProbResult = estimateWinProbability(gameState);

  // Generate strategic guidance
  const { primaryObjective, secondaryObjectives, warnings } = generateStrategicGuidance(
    lethalPath,
    threatAssessment,
    winProbResult.probability
  );

  return {
    gameId,
    currentTurn: gameState.turnNumber,
    myLP,
    opponentLP: oppLP,
    lethalPath,
    threatAssessment,
    winProbability: winProbResult.probability,
    confidence: winProbResult.confidence,
    primaryObjective,
    secondaryObjectives,
    warnings,
  };
}

/**
 * Calculate the optimal path to lethal damage
 */
function calculateLethalPath(
  myBoard: BoardCard[],
  oppBoard: BoardCard[],
  oppLP: number
): LethalPath {
  const attackers = myBoard.filter((card) => !card.hasAttacked);
  const defenders = [...oppBoard];

  if (attackers.length === 0) {
    return {
      available: false,
      turnsAway: Number.POSITIVE_INFINITY,
      sequence: [],
      totalDamage: 0,
      overkill: 0,
      requiresNoInterference: true,
      blockers: [],
    };
  }

  // Sort attackers by ATK (strongest first for optimal damage)
  const sortedAttackers = attackers
    .map((a, i) => ({
      index: i,
      name: a.name,
      atk: a.currentAttack ?? a.attack ?? 0,
    }))
    .sort((a, b) => b.atk - a.atk);

  // Sort defenders by ease of destruction (weakest first)
  const sortedDefenders = defenders
    .map((d, i) => {
      const isDefense = d.position === 2;
      return {
        index: i,
        name: d.name,
        isDefense,
        atk: d.currentAttack ?? d.attack ?? 0,
        def: d.currentDefense ?? d.defense ?? 0,
        value: isDefense
          ? (d.currentDefense ?? d.defense ?? 0)
          : (d.currentAttack ?? d.attack ?? 0),
      };
    })
    .sort((a, b) => a.value - b.value);

  // Calculate optimal attack sequence
  const sequence: AttackSequence[] = [];
  let totalDamage = 0;
  const remainingDefenders = [...sortedDefenders];
  const remainingAttackers = [...sortedAttackers];

  // Strategy: Destroy defenders with minimal attackers, then go for direct damage
  while (remainingAttackers.length > 0) {
    const attacker = remainingAttackers.shift();
    if (!attacker) {
      break; // Should not happen but guard against undefined
    }

    if (remainingDefenders.length === 0) {
      // Direct attack
      sequence.push({
        attacker,
        target: "direct",
        damage: attacker.atk,
        destroysTarget: false,
      });
      totalDamage += attacker.atk;
    } else {
      // Find weakest defender we can destroy
      const targetIdx = remainingDefenders.findIndex((d) => attacker.atk > d.value);

      if (targetIdx !== -1) {
        const target = remainingDefenders[targetIdx];
        const outcome = calculateBattleOutcome(
          attacker.atk,
          target.atk,
          target.def,
          target.isDefense
        );

        sequence.push({
          attacker,
          target,
          damage: outcome.damageToOpponent,
          destroysTarget: outcome.defenderDestroyed,
        });
        totalDamage += outcome.damageToOpponent;

        if (outcome.defenderDestroyed) {
          remainingDefenders.splice(targetIdx, 1);
        }
      } else {
        // Can't beat any defender, skip or attack anyway
        const weakestDef = remainingDefenders[0];
        sequence.push({
          attacker,
          target: weakestDef,
          damage: 0,
          destroysTarget: false,
        });
      }
    }
  }

  const lethalAvailable = totalDamage >= oppLP;
  const turnsAway = lethalAvailable
    ? 0
    : Math.ceil((oppLP - totalDamage) / Math.max(1, totalDamage));

  // Identify potential blockers
  const blockers: string[] = [];
  const oppBackrow = defenders.filter((d) => d.isFaceDown);
  if (oppBackrow.length > 0) {
    blockers.push(`${oppBackrow.length} face-down card(s) may be traps`);
  }

  return {
    available: lethalAvailable,
    turnsAway,
    sequence,
    totalDamage,
    overkill: Math.max(0, totalDamage - oppLP),
    requiresNoInterference: blockers.length > 0,
    blockers,
  };
}

/**
 * Assess threats from opponent's board
 */
function assessThreats(
  oppBoard: BoardCard[],
  myBoard: BoardCard[],
  myLP: number,
  gameState: GameStateResponse
): ThreatAssessment {
  const mustAnswerThreats: MustAnswerThreat[] = [];
  const riskFactors: string[] = [];

  // Calculate opponent's potential damage
  const oppAttackers = oppBoard.filter((card) => !card.hasAttacked);
  const potentialDamage = oppAttackers.reduce((sum, card) => {
    return sum + (card.currentAttack ?? card.attack ?? 0);
  }, 0);

  // Check for lethal threat
  let opponentLethalInTurns: number | null = null;
  if (myBoard.length === 0 && potentialDamage >= myLP) {
    opponentLethalInTurns = 1;
    riskFactors.push("LETHAL: Open board, opponent can attack directly");
  } else if (potentialDamage >= myLP * 0.75) {
    riskFactors.push("HIGH DAMAGE: Opponent can deal significant damage");
  }

  // Identify must-answer threats
  for (let i = 0; i < oppBoard.length; i++) {
    const card = oppBoard[i];
    const atk = card.currentAttack ?? card.attack ?? 0;

    // High ATK monsters
    if (atk >= 2500) {
      mustAnswerThreats.push({
        cardName: card.name,
        cardId: card._id,
        reason: `High ATK (${atk}) - can destroy most monsters`,
        priority: atk >= 3000 ? "immediate" : "high",
        suggestedAnswer: "Destroy with spell/trap or summon stronger monster",
      });
    }

    // Effect monsters (simplified - check for indicators)
    if (card.name.toLowerCase().includes("effect") || atk === 0) {
      mustAnswerThreats.push({
        cardName: card.name,
        cardId: card._id,
        reason: "Possible effect monster - may have dangerous abilities",
        priority: "medium",
        suggestedAnswer: "Consider removing before it activates effect",
      });
    }
  }

  // Backrow risk
  const backrowCount = gameState.opponentPlayer?.spellTrapZone?.length || 0;
  if (backrowCount >= 3) {
    riskFactors.push(`Heavy backrow (${backrowCount} cards) - likely traps`);
  }

  // Determine threat level
  let threatLevel: "lethal" | "critical" | "high" | "medium" | "low";
  if (opponentLethalInTurns === 1) {
    threatLevel = "lethal";
  } else if (mustAnswerThreats.some((t) => t.priority === "immediate")) {
    threatLevel = "critical";
  } else if (potentialDamage >= myLP * 0.5) {
    threatLevel = "high";
  } else if (mustAnswerThreats.length > 0) {
    threatLevel = "medium";
  } else {
    threatLevel = "low";
  }

  return {
    threatLevel,
    opponentLethalInTurns,
    mustAnswerThreats,
    potentialDamage,
    riskFactors,
  };
}

/**
 * Generate strategic guidance based on analysis
 */
function generateStrategicGuidance(
  lethalPath: LethalPath,
  threatAssessment: ThreatAssessment,
  winProbability: number
): {
  primaryObjective: string;
  secondaryObjectives: string[];
  warnings: string[];
} {
  const secondaryObjectives: string[] = [];
  const warnings: string[] = [];
  let primaryObjective: string;

  // Primary objective determination
  if (lethalPath.available) {
    primaryObjective = "EXECUTE LETHAL - Attack in optimal sequence to win";
    if (lethalPath.blockers.length > 0) {
      warnings.push("Potential traps may interrupt lethal sequence");
      secondaryObjectives.push("Consider removing backrow first if possible");
    }
  } else if (threatAssessment.threatLevel === "lethal") {
    primaryObjective = "SURVIVE - Must block or remove lethal threats immediately";
    secondaryObjectives.push("Summon defender or activate removal");
    warnings.push("Opponent has lethal next turn if not addressed");
  } else if (threatAssessment.threatLevel === "critical") {
    primaryObjective = "STABILIZE - Address critical threats before pushing damage";
    secondaryObjectives.push("Remove must-answer threats");
    secondaryObjectives.push("Establish board presence");
  } else if (winProbability >= 0.7) {
    primaryObjective = "PRESS ADVANTAGE - Continue aggressive play";
    secondaryObjectives.push("Deal maximum damage");
    secondaryObjectives.push("Maintain board control");
  } else if (winProbability <= 0.3) {
    primaryObjective = "BUILD RESOURCES - Play conservatively and look for openings";
    secondaryObjectives.push("Draw cards if possible");
    secondaryObjectives.push("Set up defensive position");
  } else {
    primaryObjective = "DEVELOP BOARD - Summon monsters and set up for next turn";
    secondaryObjectives.push("Establish card advantage");
    secondaryObjectives.push("Prepare for battle phase");
  }

  // Add threat-based warnings
  threatAssessment.riskFactors.forEach((risk) => warnings.push(risk));

  return { primaryObjective, secondaryObjectives, warnings };
}
