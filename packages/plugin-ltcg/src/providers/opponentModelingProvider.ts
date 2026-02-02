/**
 * Opponent Modeling Provider
 *
 * Tracks opponent behavior within the current game to inform decisions:
 * - Cards opponent has played (reveals deck strategy)
 * - Attack patterns (aggressive vs defensive)
 * - Trap activation timing and targets
 * - Resource usage patterns
 *
 * This helps the agent predict opponent moves and adapt strategy.
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { GameEvent, GameStateResponse } from "../types/api";

/**
 * Opponent playstyle classification
 */
type PlaystyleType = "aggressive" | "defensive" | "control" | "balanced" | "unknown";

/**
 * Card play record
 */
interface CardPlayRecord {
  cardName: string;
  cardType: "creature" | "spell" | "trap" | "equipment";
  turnPlayed: number;
  phase: string;
  wasEffective: boolean;
}

/**
 * Attack pattern analysis
 */
interface AttackPattern {
  totalAttacks: number;
  directAttacks: number;
  monsterAttacks: number;
  aggressionScore: number; // 0-1, higher = more aggressive
  preferredTargets: "weakest" | "strongest" | "random" | "none";
}

/**
 * Trap behavior analysis
 */
interface TrapBehavior {
  trapsSet: number;
  trapsActivated: number;
  averageActivationTurn: number;
  preferredTriggers: string[];
  holdsTraps: boolean; // Does opponent save traps for important moments?
}

/**
 * Opponent model for current game
 */
interface OpponentModel {
  gameId: string;
  turnsAnalyzed: number;
  cardsPlayed: CardPlayRecord[];
  detectedArchetype: string | null;
  playstyle: PlaystyleType;
  attackPattern: AttackPattern;
  trapBehavior: TrapBehavior;
  resourceManagement: {
    averageCardsPerTurn: number;
    overextends: boolean;
    conservesResources: boolean;
  };
  predictions: {
    likelyNextAction: string;
    trapRisk: "low" | "medium" | "high";
    expectedDamageRange: { min: number; max: number };
  };
}

// Module-level cache for opponent model (per game)
const opponentModelCache = new Map<string, OpponentModel>();

export const opponentModelingProvider: Provider = {
  name: "LTCG_OPPONENT_MODEL",
  description: "Analyzes opponent behavior patterns and predicts likely actions",

  async get(runtime: IAgentRuntime, _message: Memory, state: State): Promise<ProviderResult> {
    try {
      // Get API credentials
      const apiKey = runtime.getSetting("LTCG_API_KEY");
      const apiUrl = runtime.getSetting("LTCG_API_URL");

      if (!apiKey || !apiUrl) {
        return {
          text: "Opponent modeling unavailable - API credentials not configured.",
          values: { error: "MISSING_CONFIG" },
          data: {},
        };
      }

      // Get current game ID
      const stateContent = state as unknown as Record<string, unknown>;
      const gameId = (stateContent?.currentGameId as string) || (stateContent?.gameId as string);

      if (!gameId) {
        return {
          text: "No active game - opponent modeling not available.",
          values: { error: "NO_GAME" },
          data: {},
        };
      }

      const client = new LTCGApiClient({
        apiKey: apiKey as string,
        baseUrl: apiUrl as string,
      });

      // Fetch game data
      const [gameState, gameHistory] = await Promise.all([
        client.getGameState(gameId),
        client.getGameHistory(gameId).catch(() => [] as GameEvent[]),
      ]);

      // Build or update opponent model
      const model = buildOpponentModel(gameId, gameState, gameHistory);

      // Cache the model
      opponentModelCache.set(gameId, model);

      // Build LLM-friendly text
      const textParts: string[] = [];
      textParts.push("# Opponent Analysis\n");

      textParts.push(`## Playstyle: ${model.playstyle.toUpperCase()}`);
      if (model.detectedArchetype) {
        textParts.push(`Detected Archetype: ${model.detectedArchetype}`);
      }
      textParts.push("");

      // Attack patterns
      textParts.push("## Attack Behavior");
      textParts.push(`- Aggression: ${Math.round(model.attackPattern.aggressionScore * 100)}%`);
      textParts.push(`- Total attacks: ${model.attackPattern.totalAttacks}`);
      textParts.push(
        `- Prefers: ${model.attackPattern.preferredTargets === "none" ? "No clear pattern" : `${model.attackPattern.preferredTargets} targets`}`
      );
      textParts.push("");

      // Trap behavior
      textParts.push("## Trap Usage");
      textParts.push(`- Traps set: ${model.trapBehavior.trapsSet}`);
      textParts.push(`- Traps activated: ${model.trapBehavior.trapsActivated}`);
      textParts.push(
        `- Holds traps for key moments: ${model.trapBehavior.holdsTraps ? "YES - be cautious" : "No"}`
      );
      textParts.push("");

      // Predictions
      textParts.push("## Strategic Predictions");
      textParts.push(`- **Trap risk**: ${model.predictions.trapRisk.toUpperCase()}`);
      textParts.push(`- **Likely next action**: ${model.predictions.likelyNextAction}`);
      textParts.push(
        `- **Expected damage**: ${model.predictions.expectedDamageRange.min}-${model.predictions.expectedDamageRange.max}`
      );
      textParts.push("");

      // Cards played
      if (model.cardsPlayed.length > 0) {
        textParts.push("## Cards Opponent Has Played");
        const recentCards = model.cardsPlayed.slice(-10);
        recentCards.forEach((card) => {
          textParts.push(`- ${card.cardName} (${card.cardType}) on turn ${card.turnPlayed}`);
        });
      }

      // Build structured data
      const data = {
        model,
        playstyle: model.playstyle,
        trapRisk: model.predictions.trapRisk,
        aggressionScore: model.attackPattern.aggressionScore,
        cardsPlayedCount: model.cardsPlayed.length,
      };

      const values = {
        playstyle: model.playstyle,
        trapRisk: model.predictions.trapRisk,
        aggression: model.attackPattern.aggressionScore,
        turnsAnalyzed: model.turnsAnalyzed,
      };

      return {
        text: textParts.join("\n"),
        values,
        data,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error analyzing opponent";

      logger.error({ error }, "Failed to analyze opponent");

      return {
        text: `Error analyzing opponent: ${errorMessage}`,
        values: { error: "ANALYSIS_ERROR" },
        data: { errorDetails: error },
      };
    }
  },
};

/**
 * Build opponent model from game data
 */
function buildOpponentModel(
  gameId: string,
  gameState: GameStateResponse,
  history: GameEvent[]
): OpponentModel {
  // Check if we have a cached model we can update
  const existingModel = opponentModelCache.get(gameId);
  const currentTurn = gameState.turnNumber;

  if (existingModel && existingModel.turnsAnalyzed >= currentTurn) {
    return existingModel;
  }

  // Filter opponent events
  const opponentEvents = history.filter(
    (e) => e.playerId !== gameState.currentTurnPlayer || !gameState.isMyTurn
  );

  // Analyze cards played
  const cardsPlayed = extractCardsPlayed(opponentEvents);

  // Analyze attack patterns
  const attackPattern = analyzeAttackPattern(opponentEvents);

  // Analyze trap behavior
  const trapBehavior = analyzeTrapBehavior(opponentEvents, gameState);

  // Determine playstyle
  const playstyle = determinePlaystyle(attackPattern, trapBehavior, cardsPlayed);

  // Detect archetype from cards
  const detectedArchetype = detectArchetype(cardsPlayed);

  // Resource management
  const resourceManagement = analyzeResourceManagement(opponentEvents, currentTurn);

  // Generate predictions
  const predictions = generatePredictions(playstyle, attackPattern, trapBehavior, gameState);

  return {
    gameId,
    turnsAnalyzed: currentTurn,
    cardsPlayed,
    detectedArchetype,
    playstyle,
    attackPattern,
    trapBehavior,
    resourceManagement,
    predictions,
  };
}

/**
 * Extract cards played from game events
 */
function extractCardsPlayed(events: GameEvent[]): CardPlayRecord[] {
  const cards: CardPlayRecord[] = [];

  for (const event of events) {
    if (event.eventType === "summon" || event.eventType === "spell_activation") {
      const cardName = event.metadata?.cardName as string;
      const cardType = event.eventType === "summon" ? "creature" : "spell";

      if (cardName) {
        cards.push({
          cardName,
          cardType: cardType as "creature" | "spell",
          turnPlayed: event.turnNumber,
          phase: event.phase,
          wasEffective: true, // Simplified - would need more context
        });
      }
    }
  }

  return cards;
}

/**
 * Analyze opponent's attack patterns
 */
function analyzeAttackPattern(events: GameEvent[]): AttackPattern {
  const attacks = events.filter((e) => e.eventType === "attack");
  const directAttacks = attacks.filter(
    (a) => a.metadata?.targetType === "direct" || a.metadata?.isDirect
  );

  let preferredTargets: "weakest" | "strongest" | "random" | "none" = "none";
  if (attacks.length >= 3) {
    // Simplified pattern detection
    const targetStrengths = attacks
      .filter((a) => a.metadata?.targetAtk !== undefined)
      .map((a) => a.metadata?.targetAtk as number);

    if (targetStrengths.length >= 2) {
      const avgTarget = targetStrengths.reduce((a, b) => a + b, 0) / targetStrengths.length;
      if (avgTarget < 1500) preferredTargets = "weakest";
      else if (avgTarget > 2000) preferredTargets = "strongest";
      else preferredTargets = "random";
    }
  }

  // Aggression score based on attack frequency
  const turns = new Set(events.map((e) => e.turnNumber)).size || 1;
  const aggressionScore = Math.min(1, attacks.length / turns);

  return {
    totalAttacks: attacks.length,
    directAttacks: directAttacks.length,
    monsterAttacks: attacks.length - directAttacks.length,
    aggressionScore,
    preferredTargets,
  };
}

/**
 * Analyze opponent's trap behavior
 */
function analyzeTrapBehavior(events: GameEvent[], gameState: GameStateResponse): TrapBehavior {
  const trapActivations = events.filter(
    (e) => e.eventType === "spell_activation" && e.metadata?.cardType === "trap"
  );

  const currentBackrow = gameState.opponentPlayer?.spellTrapZone?.length || 0;

  const avgTurn =
    trapActivations.length > 0
      ? trapActivations.reduce((sum, e) => sum + e.turnNumber, 0) / trapActivations.length
      : 0;

  // Determine if opponent holds traps
  const holdsTraps = currentBackrow >= 2 && trapActivations.length < currentBackrow;

  // Extract preferred triggers
  const triggers = trapActivations.map((e) => e.metadata?.trigger as string).filter(Boolean);

  return {
    trapsSet: currentBackrow + trapActivations.length,
    trapsActivated: trapActivations.length,
    averageActivationTurn: avgTurn,
    preferredTriggers: [...new Set(triggers)],
    holdsTraps,
  };
}

/**
 * Determine opponent playstyle
 */
function determinePlaystyle(
  attackPattern: AttackPattern,
  trapBehavior: TrapBehavior,
  cardsPlayed: CardPlayRecord[]
): PlaystyleType {
  const aggression = attackPattern.aggressionScore;
  const trapUsage = trapBehavior.trapsSet > 0 ? trapBehavior.holdsTraps : false;
  const monsterCount = cardsPlayed.filter((c) => c.cardType === "creature").length;
  const spellCount = cardsPlayed.filter((c) => c.cardType === "spell").length;

  if (aggression >= 0.7 && !trapUsage) {
    return "aggressive";
  }

  if (aggression <= 0.3 && trapBehavior.trapsSet >= 2) {
    return "defensive";
  }

  if (trapUsage && spellCount > monsterCount) {
    return "control";
  }

  if (cardsPlayed.length >= 3) {
    return "balanced";
  }

  return "unknown";
}

/**
 * Detect archetype from played cards
 */
function detectArchetype(cardsPlayed: CardPlayRecord[]): string | null {
  // Simple keyword-based detection
  const cardNames = cardsPlayed.map((c) => c.cardName.toLowerCase());

  const archetypeKeywords: Record<string, string[]> = {
    fire: ["flame", "fire", "burn", "inferno", "blaze"],
    water: ["water", "aqua", "sea", "ocean", "wave"],
    earth: ["earth", "rock", "stone", "golem", "mountain"],
    wind: ["wind", "air", "storm", "gust", "breeze"],
    dark: ["dark", "shadow", "demon", "void", "curse"],
    light: ["light", "holy", "angel", "divine", "radiant"],
  };

  for (const [archetype, keywords] of Object.entries(archetypeKeywords)) {
    const matches = cardNames.filter((name) => keywords.some((kw) => name.includes(kw)));
    if (matches.length >= 2) {
      return archetype;
    }
  }

  return null;
}

/**
 * Analyze resource management
 */
function analyzeResourceManagement(
  events: GameEvent[],
  currentTurn: number
): { averageCardsPerTurn: number; overextends: boolean; conservesResources: boolean } {
  const cardPlays = events.filter(
    (e) => e.eventType === "summon" || e.eventType === "spell_activation"
  );

  const avgCardsPerTurn = currentTurn > 0 ? cardPlays.length / currentTurn : 0;

  // Overextends if playing many cards early
  const earlyTurnPlays = cardPlays.filter((e) => e.turnNumber <= 2).length;
  const overextends = earlyTurnPlays >= 4;

  // Conserves if playing few cards overall
  const conservesResources = avgCardsPerTurn <= 1;

  return {
    averageCardsPerTurn: Math.round(avgCardsPerTurn * 10) / 10,
    overextends,
    conservesResources,
  };
}

/**
 * Generate predictions based on opponent model
 */
function generatePredictions(
  playstyle: PlaystyleType,
  attackPattern: AttackPattern,
  trapBehavior: TrapBehavior,
  gameState: GameStateResponse
): {
  likelyNextAction: string;
  trapRisk: "low" | "medium" | "high";
  expectedDamageRange: { min: number; max: number };
} {
  // Predict trap risk
  let trapRisk: "low" | "medium" | "high" = "low";
  const backrowCount = gameState.opponentPlayer?.spellTrapZone?.length || 0;

  if (backrowCount >= 3 || (trapBehavior.holdsTraps && backrowCount >= 2)) {
    trapRisk = "high";
  } else if (backrowCount >= 1) {
    trapRisk = "medium";
  }

  // Predict likely action
  let likelyNextAction: string;
  switch (playstyle) {
    case "aggressive":
      likelyNextAction = "Summon and attack immediately";
      break;
    case "defensive":
      likelyNextAction = "Set monsters/traps, minimal attacks";
      break;
    case "control":
      likelyNextAction = "Hold responses, counter key plays";
      break;
    default:
      likelyNextAction = "Standard play - summon then evaluate";
  }

  // Expected damage from opponent board
  const oppBoard = gameState.opponentBoard || [];
  const totalATK = oppBoard.reduce((sum, card) => {
    const atk = card.currentAttack ?? card.attack ?? 0;
    return sum + atk;
  }, 0);

  const aggressionFactor = attackPattern.aggressionScore;
  const expectedMin = Math.floor(totalATK * aggressionFactor * 0.5);
  const expectedMax = Math.floor(totalATK * (0.5 + aggressionFactor * 0.5));

  return {
    likelyNextAction,
    trapRisk,
    expectedDamageRange: { min: expectedMin, max: expectedMax },
  };
}

/**
 * Get cached opponent model for a game
 */
export function getOpponentModel(gameId: string): OpponentModel | undefined {
  return opponentModelCache.get(gameId);
}

/**
 * Clear opponent model cache
 */
export function clearOpponentModelCache(): void {
  opponentModelCache.clear();
}
