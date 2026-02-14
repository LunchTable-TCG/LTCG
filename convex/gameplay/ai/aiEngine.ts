/**
 * AI Decision Engine
 *
 * Makes strategic decisions for AI opponents in story mode battles.
 * Currently implements Normal difficulty strategy.
 */

import type { Doc, Id } from "../../_generated/dataModel";
import { getCardLevel, getTributeCount } from "../../lib/cardPropertyHelpers";
import { handleBattlePhase, handleMainPhase } from "./aiDifficulty";

export interface AIAction {
  type:
    | "summon"
    | "set"
    | "flip_summon"
    | "attack"
    | "activate_spell"
    | "set_spell_trap"
    | "play_field_spell"
    | "activate_trap"
    | "end_phase"
    | "pass";
  cardId?: Id<"cardDefinitions">;
  tributeIds?: Id<"cardDefinitions">[];
  position?: "attack" | "defense";
  targetId?: Id<"cardDefinitions">;
}

export interface SpellTrapCard {
  cardId: Id<"cardDefinitions">;
  isFaceDown: boolean;
  isActivated: boolean;
  turnSet?: number;
  equippedTo?: Id<"cardDefinitions">;
}

export interface FieldSpell {
  cardId: Id<"cardDefinitions">;
  isActive: boolean;
}

/**
 * Evaluates the current board state from AI's perspective
 */
export function evaluateBoard(gameState: Doc<"gameStates">, aiPlayerId: Id<"users">) {
  const isHost = gameState.hostId === aiPlayerId;
  const myBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const oppBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
  const myLP = isHost ? gameState.hostLifePoints : gameState.opponentLifePoints;
  const oppLP = isHost ? gameState.opponentLifePoints : gameState.hostLifePoints;
  const myHand = isHost ? gameState.hostHand : gameState.opponentHand;

  return {
    myBoardSize: myBoard.length,
    oppBoardSize: oppBoard.length,
    myTotalATK: myBoard.reduce((sum, card) => sum + (card.isFaceDown ? 0 : card.attack), 0),
    oppTotalATK: oppBoard.reduce((sum, card) => sum + (card.isFaceDown ? 0 : card.attack), 0),
    myLP,
    oppLP,
    myHandSize: myHand.length,
    hasMonsterZoneSpace: myBoard.length < 3,
    isWinning: myLP > oppLP,
    attackAdvantage: myBoard.some(
      (m) =>
        !m.hasAttacked &&
        m.position === 1 &&
        (oppBoard.length === 0 || oppBoard.some((o) => m.attack > o.attack || m.attack > o.defense))
    ),
  };
}

/**
 * Finds the strongest monster in hand (by ATK + DEF)
 */
export function findStrongestMonster(
  cards: Id<"cardDefinitions">[],
  cardData: Map<string, Doc<"cardDefinitions">>
): Id<"cardDefinitions"> | null {
  let strongest: Id<"cardDefinitions"> | null = null;
  let maxPower = -1;

  for (const cardId of cards) {
    const card = cardData.get(cardId);
    if (!card || card.cardType !== "stereotype") continue;

    const power = (card.attack || 0) + (card.defense || 0);
    if (power > maxPower) {
      maxPower = power;
      strongest = cardId;
    }
  }

  return strongest;
}

/**
 * Finds the weakest monster on the board (for tribute selection)
 */
export function findWeakestMonster(
  board: Array<{ cardId: Id<"cardDefinitions">; attack: number; defense: number }>
): Id<"cardDefinitions"> | null {
  if (board.length === 0) return null;

  let weakest = board[0];
  if (!weakest) return null;

  for (const monster of board) {
    if (monster.attack + monster.defense < weakest.attack + weakest.defense) {
      weakest = monster;
    }
  }

  return weakest.cardId;
}

/**
 * Checks if a monster can be summoned without tribute (level ≤ 4)
 */
export function canSummonWithoutTribute(card: Doc<"cardDefinitions">): boolean {
  return card.cardType === "stereotype" && getTributeCount(card) === 0;
}

/**
 * Re-export for AI modules that need level/tribute info
 */
export { getCardLevel, getTributeCount };

/**
 * Main AI decision function for Normal difficulty
 *
 * Strategy:
 * - Main Phase: Summon strongest monster, use spells randomly
 * - Combat Phase: Attack when safe (higher ATK/DEF)
 * - End Phase: Pass
 */
export async function makeAIDecision(
  gameState: Doc<"gameStates">,
  aiPlayerId: Id<"users">,
  phase: string,
  cardData: Map<string, Doc<"cardDefinitions">>,
  difficulty: "easy" | "medium" | "hard" | "boss" = "medium"
): Promise<AIAction> {
  const isHost = gameState.hostId === aiPlayerId;
  const myHand = isHost ? gameState.hostHand : gameState.opponentHand;
  const myBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const oppBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
  const hasNormalSummoned = isHost
    ? gameState.hostNormalSummonedThisTurn || false
    : gameState.opponentNormalSummonedThisTurn || false;
  const mySpellTrapZone = ((isHost
    ? gameState.hostSpellTrapZone
    : gameState.opponentSpellTrapZone) || []) as SpellTrapCard[];
  const myFieldSpell = (isHost ? gameState.hostFieldSpell : gameState.opponentFieldSpell) as
    | FieldSpell
    | undefined;

  const evaluation = evaluateBoard(gameState, aiPlayerId);

  // MAIN PHASE
  if (phase === "main") {
    return handleMainPhase(
      difficulty,
      hasNormalSummoned,
      evaluation,
      myHand,
      myBoard,
      oppBoard,
      cardData,
      gameState.turnNumber ?? 1,
      mySpellTrapZone,
      myFieldSpell
    );
  }

  // COMBAT PHASE
  if (phase === "combat") {
    return handleBattlePhase(difficulty, myBoard, oppBoard, gameState.turnNumber ?? 1);
  }

  // END PHASE - always end turn
  if (phase === "end") {
    return { type: "end_phase" };
  }

  // Default: pass
  return { type: "pass" };
}
