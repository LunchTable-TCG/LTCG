/**
 * Probability Calculator Utility
 *
 * Mathematical utilities for strategic decision-making:
 * - Draw probability calculations
 * - Damage range predictions
 * - Win probability estimation
 * - Combat outcome calculations
 *
 * Used by TurnOrchestrator and providers for informed decisions.
 */

import type { BoardCard, CardInHand, GameStateResponse, MonsterCard } from "../types/api";

// =============================================================================
// DRAW PROBABILITY CALCULATIONS
// =============================================================================

/**
 * Calculate probability of drawing at least one of the target cards
 * Uses hypergeometric distribution
 *
 * @param deckSize - Total cards remaining in deck
 * @param targetCount - Number of desired cards remaining in deck
 * @param drawCount - Number of draws
 * @returns Probability between 0 and 1
 */
export function calculateDrawOdds(
  deckSize: number,
  targetCount: number,
  drawCount: number
): number {
  if (deckSize <= 0 || targetCount <= 0 || drawCount <= 0) return 0;
  if (targetCount >= deckSize) return 1;
  if (drawCount >= deckSize) return targetCount > 0 ? 1 : 0;

  // P(at least 1) = 1 - P(none)
  // P(none) = C(deck-target, draws) / C(deck, draws)
  const pNone = hypergeometricProbability(deckSize, targetCount, drawCount, 0);
  return 1 - pNone;
}

/**
 * Calculate exact hypergeometric probability
 * P(X = k) = C(K, k) * C(N-K, n-k) / C(N, n)
 *
 * @param N - Population size (deck)
 * @param K - Success states in population (target cards)
 * @param n - Number of draws
 * @param k - Desired successes
 */
function hypergeometricProbability(N: number, K: number, n: number, k: number): number {
  if (k > K || k > n || n - k > N - K) return 0;

  // Use log combinations to avoid overflow
  const logProb = logCombination(K, k) + logCombination(N - K, n - k) - logCombination(N, n);

  return Math.exp(logProb);
}

/**
 * Calculate log of combination (n choose k)
 * Uses log to handle large numbers
 */
function logCombination(n: number, k: number): number {
  if (k > n || k < 0) return Number.NEGATIVE_INFINITY;
  if (k === 0 || k === n) return 0;

  // Optimize by using smaller k
  const optimizedK = k > n - k ? n - k : k;

  let result = 0;
  for (let i = 0; i < optimizedK; i++) {
    result += Math.log(n - i) - Math.log(i + 1);
  }
  return result;
}

/**
 * Calculate probability of drawing a specific card type within N turns
 *
 * @param deckSize - Cards remaining in deck
 * @param cardTypeCount - Number of that card type in deck
 * @param turns - Number of turns to draw
 * @returns Probability between 0 and 1
 */
export function calculateDrawByTurnOdds(
  deckSize: number,
  cardTypeCount: number,
  turns: number
): number {
  return calculateDrawOdds(deckSize, cardTypeCount, turns);
}

// =============================================================================
// DAMAGE CALCULATIONS
// =============================================================================

/**
 * Damage calculation result
 */
export interface DamageRange {
  minimum: number;
  maximum: number;
  expected: number;
  lethal: boolean;
  overkill: number;
}

/**
 * Calculate potential damage range from attackers
 *
 * @param attackers - Monsters that can attack
 * @param defenders - Opponent's monsters
 * @param opponentLP - Opponent's life points
 * @returns Damage range with lethal indicator
 */
export function calculateDamageRange(
  attackers: Array<MonsterCard | BoardCard>,
  defenders: Array<MonsterCard | BoardCard>,
  opponentLP: number
): DamageRange {
  if (attackers.length === 0) {
    return { minimum: 0, maximum: 0, expected: 0, lethal: false, overkill: 0 };
  }

  // Get ATK values from attackers that can attack
  const attackerATKs = attackers
    .filter((a) => {
      // Filter by canAttack if MonsterCard, or hasAttacked if BoardCard
      if ("canAttack" in a) return a.canAttack;
      if ("hasAttacked" in a) return !a.hasAttacked;
      return true;
    })
    .map((a) => {
      if ("atk" in a) return a.atk;
      if ("currentAttack" in a) return a.currentAttack ?? a.attack ?? 0;
      if ("attack" in a) return a.attack ?? 0;
      return 0;
    })
    .sort((a, b) => b - a); // Strongest first

  // Get DEF values from defenders
  const defenderStats = defenders.map((d) => {
    const isDefense =
      ("position" in d && d.position === "defense") || ("position" in d && d.position === 0);
    if ("atk" in d && "def" in d) {
      return { atk: d.atk, def: d.def, isDefense };
    }
    if ("currentAttack" in d || "currentDefense" in d) {
      return {
        atk: d.currentAttack ?? d.attack ?? 0,
        def: d.currentDefense ?? d.defense ?? 0,
        isDefense,
      };
    }
    return { atk: 0, def: 0, isDefense };
  });

  // Calculate scenarios
  let minDamage = 0;
  let maxDamage = 0;
  let expectedDamage = 0;

  if (defenderStats.length === 0) {
    // Direct attacks
    maxDamage = attackerATKs.reduce((sum, atk) => sum + atk, 0);
    minDamage = maxDamage; // No variance without defenders
    expectedDamage = maxDamage;
  } else {
    // Battle calculations
    // Maximum: All attacks go through as direct (defenders destroyed first)
    // Minimum: Attackers trade with strongest defenders

    // Max scenario: optimal attacks clear board then direct
    const sortedDefenders = [...defenderStats].sort((a, b) => {
      const aVal = a.isDefense ? a.def : a.atk;
      const bVal = b.isDefense ? b.def : b.atk;
      return aVal - bVal;
    });

    const remainingAttackers = [...attackerATKs];
    let remainingDefenders = [...sortedDefenders];
    let battleDamage = 0;

    // Assign attackers to destroy defenders efficiently
    for (const atk of remainingAttackers) {
      if (remainingDefenders.length === 0) {
        // Direct attack
        battleDamage += atk;
      } else {
        // Attack weakest defender
        const defender = remainingDefenders[0];
        const defValue = defender.isDefense ? defender.def : defender.atk;
        if (atk > defValue) {
          if (!defender.isDefense) {
            // Battle damage = ATK difference
            battleDamage += atk - defender.atk;
          }
          remainingDefenders.shift();
        }
        // If can't beat defender, no damage
      }
    }

    maxDamage = battleDamage;

    // Min scenario: attack into strongest defenders (worst case)
    remainingDefenders = [...defenderStats].sort((a, b) => {
      const aVal = a.isDefense ? a.def : a.atk;
      const bVal = b.isDefense ? b.def : b.atk;
      return bVal - aVal; // Strongest first
    });

    battleDamage = 0;
    for (const atk of attackerATKs) {
      if (remainingDefenders.length === 0) {
        battleDamage += atk;
      } else {
        const defender = remainingDefenders[0];
        const defValue = defender.isDefense ? defender.def : defender.atk;
        if (atk > defValue && !defender.isDefense) {
          battleDamage += atk - defender.atk;
          remainingDefenders.shift();
        }
      }
    }

    minDamage = Math.max(0, battleDamage);
    expectedDamage = Math.floor((maxDamage + minDamage) / 2);
  }

  return {
    minimum: minDamage,
    maximum: maxDamage,
    expected: expectedDamage,
    lethal: maxDamage >= opponentLP,
    overkill: Math.max(0, maxDamage - opponentLP),
  };
}

/**
 * Calculate specific attack outcome
 *
 * @param attackerATK - Attacker's ATK
 * @param targetATK - Target's ATK (if attack position)
 * @param targetDEF - Target's DEF (if defense position)
 * @param isDefensePosition - Whether target is in defense
 * @returns Outcome details
 */
export function calculateBattleOutcome(
  attackerATK: number,
  targetATK: number,
  targetDEF: number,
  isDefensePosition: boolean
): {
  damageToOpponent: number;
  damageToSelf: number;
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
} {
  if (isDefensePosition) {
    // Attack vs Defense
    if (attackerATK > targetDEF) {
      return {
        damageToOpponent: 0,
        damageToSelf: 0,
        attackerDestroyed: false,
        defenderDestroyed: true,
      };
    }
    if (attackerATK < targetDEF) {
      return {
        damageToOpponent: 0,
        damageToSelf: targetDEF - attackerATK,
        attackerDestroyed: false, // Attacker not destroyed by DEF
        defenderDestroyed: false,
      };
    }
    // Tie
    return {
      damageToOpponent: 0,
      damageToSelf: 0,
      attackerDestroyed: false,
      defenderDestroyed: false,
    };
  }
  // Attack vs Attack
  if (attackerATK > targetATK) {
    return {
      damageToOpponent: attackerATK - targetATK,
      damageToSelf: 0,
      attackerDestroyed: false,
      defenderDestroyed: true,
    };
  }
  if (attackerATK < targetATK) {
    return {
      damageToOpponent: 0,
      damageToSelf: targetATK - attackerATK,
      attackerDestroyed: true,
      defenderDestroyed: false,
    };
  }
  // Tie - both destroyed
  return {
    damageToOpponent: 0,
    damageToSelf: 0,
    attackerDestroyed: true,
    defenderDestroyed: true,
  };
}

// =============================================================================
// WIN PROBABILITY ESTIMATION
// =============================================================================

/**
 * Win probability factors
 */
export interface WinProbabilityFactors {
  lpAdvantage: number; // -1 to 1 scale
  boardAdvantage: number; // -1 to 1 scale
  handAdvantage: number; // -1 to 1 scale
  resourceAdvantage: number; // -1 to 1 scale
  lethalThreat: number; // 0 to 1, how close to lethal
  defensivePosition: number; // 0 to 1, how safe
}

/**
 * Estimate win probability based on game state
 *
 * @param gameState - Current game state
 * @returns Probability between 0 and 1, plus breakdown
 */
export function estimateWinProbability(gameState: GameStateResponse): {
  probability: number;
  confidence: "low" | "medium" | "high";
  factors: WinProbabilityFactors;
  reasoning: string;
} {
  const myLP = gameState.myLifePoints;
  const oppLP = gameState.opponentLifePoints;
  const myBoard = gameState.myBoard || [];
  const oppBoard = gameState.opponentBoard || [];
  const myHand = gameState.hand?.length || 0;
  const oppHand = gameState.opponentHandCount || 0;
  const myDeck = gameState.myDeckCount;
  const oppDeck = gameState.opponentDeckCount;

  // Calculate individual factors
  const factors: WinProbabilityFactors = {
    lpAdvantage: calculateLPAdvantage(myLP, oppLP),
    boardAdvantage: calculateBoardAdvantage(myBoard, oppBoard),
    handAdvantage: calculateHandAdvantage(myHand, oppHand),
    resourceAdvantage: calculateResourceAdvantage(myDeck, oppDeck, myHand, oppHand),
    lethalThreat: calculateLethalThreat(myBoard, oppBoard, oppLP),
    defensivePosition: calculateDefensiveStrength(myBoard, myLP),
  };

  // Weighted combination
  const weights = {
    lpAdvantage: 0.2,
    boardAdvantage: 0.3,
    handAdvantage: 0.15,
    resourceAdvantage: 0.1,
    lethalThreat: 0.15,
    defensivePosition: 0.1,
  };

  const rawScore =
    factors.lpAdvantage * weights.lpAdvantage +
    factors.boardAdvantage * weights.boardAdvantage +
    factors.handAdvantage * weights.handAdvantage +
    factors.resourceAdvantage * weights.resourceAdvantage +
    factors.lethalThreat * weights.lethalThreat +
    factors.defensivePosition * weights.defensivePosition;

  // Convert to probability (sigmoid-like transformation)
  // Raw score ranges from -1 to 1, map to 0.1-0.9 probability
  const probability = 0.5 + rawScore * 0.4;
  const clampedProb = Math.max(0.05, Math.min(0.95, probability));

  // Determine confidence
  const variance =
    Math.abs(factors.lpAdvantage - rawScore) +
    Math.abs(factors.boardAdvantage - rawScore) +
    Math.abs(factors.handAdvantage - rawScore);

  const confidence: "low" | "medium" | "high" =
    variance > 1.5 ? "low" : variance > 0.8 ? "medium" : "high";

  // Generate reasoning
  const reasoning = generateWinProbabilityReasoning(factors, clampedProb);

  return {
    probability: Math.round(clampedProb * 100) / 100,
    confidence,
    factors,
    reasoning,
  };
}

/**
 * Calculate LP advantage factor
 */
function calculateLPAdvantage(myLP: number, oppLP: number): number {
  const totalLP = myLP + oppLP;
  if (totalLP === 0) return 0;
  // Range from -1 (losing badly) to 1 (winning badly)
  return (myLP - oppLP) / 8000; // Normalized to starting LP
}

/**
 * Calculate board advantage factor
 */
function calculateBoardAdvantage(myBoard: BoardCard[], oppBoard: BoardCard[]): number {
  const myStrength = myBoard.reduce((sum, card) => {
    const atk = card.currentAttack ?? card.attack ?? 0;
    return sum + atk;
  }, 0);

  const oppStrength = oppBoard.reduce((sum, card) => {
    const atk = card.currentAttack ?? card.attack ?? 0;
    return sum + atk;
  }, 0);

  // Also consider monster count
  const countDiff = (myBoard.length - oppBoard.length) * 500;

  const totalStrength = myStrength + oppStrength + Math.abs(countDiff);
  if (totalStrength === 0) return 0;

  return Math.max(-1, Math.min(1, (myStrength - oppStrength + countDiff) / 5000));
}

/**
 * Calculate hand advantage factor
 */
function calculateHandAdvantage(myHand: number, oppHand: number): number {
  const diff = myHand - oppHand;
  // Normalize to reasonable hand size (6 cards)
  return Math.max(-1, Math.min(1, diff / 4));
}

/**
 * Calculate overall resource advantage
 */
function calculateResourceAdvantage(
  myDeck: number,
  oppDeck: number,
  myHand: number,
  oppHand: number
): number {
  const myResources = myDeck + myHand;
  const oppResources = oppDeck + oppHand;
  const total = myResources + oppResources;
  if (total === 0) return 0;

  return Math.max(-1, Math.min(1, (myResources - oppResources) / 20));
}

/**
 * Calculate how close we are to lethal
 */
function calculateLethalThreat(myBoard: BoardCard[], oppBoard: BoardCard[], oppLP: number): number {
  const attackers = myBoard
    .filter((card) => !card.hasAttacked)
    .map((card) => card.currentAttack ?? card.attack ?? 0);

  const totalATK = attackers.reduce((sum, atk) => sum + atk, 0);

  // If no blockers, direct lethal check
  if (oppBoard.length === 0) {
    if (totalATK >= oppLP) return 1.0;
    return totalATK / oppLP;
  }

  // With blockers, estimate damage potential
  const damageRange = calculateDamageRange(myBoard, oppBoard, oppLP);

  if (damageRange.lethal) return 1.0;
  return Math.min(1, damageRange.maximum / oppLP);
}

/**
 * Calculate defensive strength
 */
function calculateDefensiveStrength(myBoard: BoardCard[], myLP: number): number {
  const hasDefenders = myBoard.length > 0;
  const highLP = myLP >= 4000;
  const strongDefender = myBoard.some((card) => {
    const def = card.currentDefense ?? card.defense ?? 0;
    return def >= 2000;
  });

  let score = 0;
  if (hasDefenders) score += 0.3;
  if (highLP) score += 0.4;
  if (strongDefender) score += 0.3;

  return score;
}

/**
 * Generate human-readable reasoning for win probability
 */
function generateWinProbabilityReasoning(
  factors: WinProbabilityFactors,
  probability: number
): string {
  const reasons: string[] = [];

  if (factors.lethalThreat >= 0.9) {
    reasons.push("Lethal damage available");
  } else if (factors.lethalThreat >= 0.5) {
    reasons.push("Significant damage potential");
  }

  if (factors.boardAdvantage > 0.3) {
    reasons.push("Board advantage");
  } else if (factors.boardAdvantage < -0.3) {
    reasons.push("Board disadvantage");
  }

  if (factors.lpAdvantage > 0.3) {
    reasons.push("LP advantage");
  } else if (factors.lpAdvantage < -0.3) {
    reasons.push("LP disadvantage");
  }

  if (factors.handAdvantage > 0.3) {
    reasons.push("Hand advantage");
  } else if (factors.handAdvantage < -0.3) {
    reasons.push("Low hand resources");
  }

  if (reasons.length === 0) {
    return probability > 0.5 ? "Slight advantage" : "Slight disadvantage";
  }

  return reasons.join(", ");
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate turns until potential lethal
 */
export function turnsToLethal(
  gameState: GameStateResponse
): { turns: number; path: string } | null {
  const myBoard = gameState.myBoard || [];
  const oppBoard = gameState.opponentBoard || [];
  const oppLP = gameState.opponentLifePoints;

  const damageRange = calculateDamageRange(myBoard, oppBoard, oppLP);

  if (damageRange.lethal) {
    return { turns: 0, path: "Lethal available this turn" };
  }

  // Estimate turns based on expected damage
  if (damageRange.expected <= 0) {
    return null; // Cannot deal damage
  }

  const turnsNeeded = Math.ceil(oppLP / damageRange.expected);

  return {
    turns: turnsNeeded,
    path: `~${turnsNeeded} turns at ${damageRange.expected} damage/turn`,
  };
}

/**
 * Check if a specific card draw would enable lethal
 */
export function cardEnablesLethal(card: CardInHand, gameState: GameStateResponse): boolean {
  // Simplistic check - if it's a high ATK monster and we can summon
  if (card.cardType === "creature" || card.type === "creature") {
    const atk = card.attack ?? card.atk ?? 0;
    const currentDamage = calculateDamageRange(
      gameState.myBoard || [],
      gameState.opponentBoard || [],
      gameState.opponentLifePoints
    ).maximum;

    const potentialDamage = currentDamage + atk;
    return potentialDamage >= gameState.opponentLifePoints;
  }

  // Direct damage spells would need effect parsing
  return false;
}
