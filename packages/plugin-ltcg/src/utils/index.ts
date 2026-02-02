/**
 * Utility Functions
 */

export { safeParseJson, extractJsonFromLlmResponse } from "./safeParseJson";
export {
  calculateDrawOdds,
  calculateDrawByTurnOdds,
  calculateDamageRange,
  calculateBattleOutcome,
  estimateWinProbability,
  turnsToLethal,
  cardEnablesLethal,
  type DamageRange,
  type WinProbabilityFactors,
} from "./probabilityCalculator";
export { normalizeGameState, type NormalizedGameState } from "./normalizeGameState";
export {
  // Card type guards
  isCreatureCard,
  isSpellCard,
  isTrapCard,
  isEquipmentCard,
  isBoardCreature,
  isBoardSpellTrap,
  // Board card type guards
  isMonsterCard,
  isSpellTrapCard,
  isGraveyardCard,
  // API response type guards
  isApiSuccessResponse,
  isApiErrorResponse,
  // Game state type guards
  isMainPhase,
  isBattlePhase,
  canSummonInPhase,
  canAttackInPhase,
  // Position guards
  isAttackPosition,
  isDefensePosition,
  isFaceDown,
} from "./typeGuards";
