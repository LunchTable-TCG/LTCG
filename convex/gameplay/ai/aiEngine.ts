/**
 * AI Decision Engine
 *
 * Makes strategic decisions for AI opponents in story mode battles.
 * Currently implements Normal difficulty strategy.
 */

import type { Doc, Id } from "../../_generated/dataModel";
import { handleBattlePhase, handleMainPhase } from "./aiDifficulty";

export interface AIAction {
  type: "summon" | "set" | "attack" | "activate_spell" | "end_phase" | "pass";
  cardId?: Id<"cardDefinitions">;
  tributeIds?: Id<"cardDefinitions">[];
  position?: "attack" | "defense";
  targetId?: Id<"cardDefinitions">;
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
    myTotalATK: myBoard.reduce((sum, card) => sum + card.attack, 0),
    oppTotalATK: oppBoard.reduce((sum, card) => sum + card.attack, 0),
    myLP,
    oppLP,
    myHandSize: myHand.length,
    hasMonsterZoneSpace: myBoard.length < 5,
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
    if (!card || card.cardType !== "creature") continue;

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
 * Checks if a monster can be summoned without tribute (cost ≤ 4)
 */
export function canSummonWithoutTribute(card: Doc<"cardDefinitions">): boolean {
  return card.cardType === "creature" && card.cost <= 4;
}

/**
 * Determines if AI should attack with a specific monster
 */
export function shouldAttack(
  myMonster: { attack: number; hasAttacked: boolean; position: number },
  oppBoard: Array<{ attack: number; defense: number; position: number; isFaceDown: boolean }>
): { shouldAttack: boolean; targetId?: string; directAttack?: boolean } {
  // Already attacked
  if (myMonster.hasAttacked) {
    return { shouldAttack: false };
  }

  // Not in attack position
  if (myMonster.position !== 1) {
    return { shouldAttack: false };
  }

  // Opponent has no monsters - direct attack
  if (oppBoard.length === 0) {
    return { shouldAttack: true, directAttack: true };
  }

  // Find best target (prioritize monsters we can destroy)
  for (const oppMonster of oppBoard) {
    const targetDEF = oppMonster.position === -1 ? oppMonster.defense : oppMonster.attack;

    // Can destroy opponent's monster
    if (myMonster.attack > targetDEF) {
      return { shouldAttack: true };
    }
  }

  // Don't attack if we can't win any battle
  return { shouldAttack: false };
}

/**
 * Main AI decision function for Normal difficulty
 *
 * Strategy:
 * - Main Phase: Summon strongest monster, use spells randomly
 * - Battle Phase: Attack when safe (higher ATK/DEF)
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
    ? gameState.hostNormalSummonedThisTurn
    : gameState.opponentNormalSummonedThisTurn;

  const evaluation = evaluateBoard(gameState, aiPlayerId);

  // MAIN PHASE 1
  if (phase === "main1") {
    // Try to summon a monster if we haven't yet
    if (!hasNormalSummoned && evaluation.hasMonsterZoneSpace) {
      // Find monsters we can summon
      const summonableMonsters = myHand.filter((cardId) => {
        const card = cardData.get(cardId);
        return card && canSummonWithoutTribute(card);
      });

      // Summon strongest monster without tribute
      if (summonableMonsters.length > 0) {
        const strongest = findStrongestMonster(summonableMonsters, cardData);
        if (strongest) {
          return {
            type: "summon",
            cardId: strongest,
            position: "attack", // Default to attack for aggression
          };
        }
      }

      // Check for tribute summons
      const highCostMonsters = myHand.filter((cardId) => {
        const card = cardData.get(cardId);
        return card && card.cardType === "creature" && card.cost >= 5;
      });

      if (highCostMonsters.length > 0 && myBoard.length >= 1) {
        const firstHighCost = highCostMonsters[0];
        if (!firstHighCost) return { type: "pass" };
        const highCostCard = cardData.get(firstHighCost);
        if (highCostCard) {
          const requiredTributes = highCostCard.cost >= 7 ? 2 : 1;

          if (myBoard.length >= requiredTributes) {
            // Calculate if tribute is worth it (gain > 1000 ATK)
            const weakestTributes: Id<"cardDefinitions">[] = [];
            let tributePower = 0;

            for (let i = 0; i < requiredTributes; i++) {
              const weakest = findWeakestMonster(
                myBoard.filter((m) => !weakestTributes.includes(m.cardId))
              );
              if (weakest) {
                weakestTributes.push(weakest);
                const weakCard = myBoard.find((m) => m.cardId === weakest);
                if (weakCard) {
                  tributePower += weakCard.attack;
                }
              }
            }

            const newPower = highCostCard.attack || 0;
            if (newPower - tributePower > 1000) {
              return {
                type: "summon",
                cardId: highCostMonsters[0],
                position: "attack",
                tributeIds: weakestTributes,
              };
            }
          }
        }
      }

      // Set a monster face-down if we can't summon
      const setableMonsters = myHand.filter((cardId) => {
        const card = cardData.get(cardId);
        return card && card.cardType === "creature";
      });

      if (setableMonsters.length > 0) {
        return {
          type: "set",
          cardId: setableMonsters[0],
        };
      }
    }

    // Activate a spell (50% chance for randomness)
    const spells = myHand.filter((cardId) => {
      const card = cardData.get(cardId);
      return card && card.cardType === "spell";
    });

    if (spells.length > 0 && Math.random() > 0.5) {
      return {
        type: "activate_spell",
        cardId: spells[0],
      };
    }

    // Pass if nothing to do
    return { type: "pass" };
  }

  // BATTLE PHASE
  if (phase === "battle") {
    return handleBattlePhase(difficulty, myBoard, oppBoard);
  }

  // MAIN PHASE 2
  if (phase === "main2") {
    // Set remaining cards if hand is too full
    if (myHand.length > 4 && evaluation.hasMonsterZoneSpace) {
      const setableCards = myHand.filter((cardId) => {
        const card = cardData.get(cardId);
        return (
          card &&
          (card.cardType === "creature" || card.cardType === "spell" || card.cardType === "trap")
        );
      });

      if (setableCards.length > 0) {
        return {
          type: "set",
          cardId: setableCards[0],
        };
      }
    }

    // Otherwise pass
    return { type: "pass" };
  }

  // END PHASE - always end turn
  if (phase === "end") {
    return { type: "end_phase" };
  }

  // Default: pass
  return { type: "pass" };
}
