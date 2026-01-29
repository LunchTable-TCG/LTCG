/**
 * AI Difficulty-Specific Strategies
 *
 * Implements different decision-making logic for each difficulty level
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { AIAction } from "./aiEngine";
import { canSummonWithoutTribute, findStrongestMonster, findWeakestMonster } from "./aiEngine";

/**
 * Handle Main Phase decisions based on difficulty
 */
export function handleMainPhase(
  difficulty: "easy" | "medium" | "hard" | "boss",
  hasNormalSummoned: boolean,
  // biome-ignore lint/suspicious/noExplicitAny: AI evaluation object has flexible structure
  evaluation: any,
  myHand: Id<"cardDefinitions">[],
  // biome-ignore lint/suspicious/noExplicitAny: Board card structure varies
  myBoard: any[],
  // biome-ignore lint/suspicious/noExplicitAny: Board card structure varies
  oppBoard: any[],
  cardData: Map<string, Doc<"cardDefinitions">>
): AIAction {
  // Try to summon a monster if we haven't yet
  if (!hasNormalSummoned && evaluation.hasMonsterZoneSpace) {
    // Find monsters we can summon
    const summonableMonsters = myHand.filter((cardId) => {
      const card = cardData.get(cardId);
      return card && canSummonWithoutTribute(card);
    });

    // Check for tribute summons
    const highCostMonsters = myHand.filter((cardId) => {
      const card = cardData.get(cardId);
      return card && card.cardType === "creature" && card.cost >= 5;
    });

    // Difficulty-based summon logic
    if (difficulty === "easy") {
      // Easy: Random summon, sometimes makes bad decisions
      if (Math.random() > 0.3 && summonableMonsters.length > 0) {
        const randomCard =
          summonableMonsters[Math.floor(Math.random() * summonableMonsters.length)];
        return {
          type: "summon",
          cardId: randomCard,
          position: Math.random() > 0.5 ? "attack" : "defense",
        };
      }
    } else if (difficulty === "medium" || difficulty === "hard") {
      // Medium/Hard: Summon strongest or tribute intelligently
      if (summonableMonsters.length > 0) {
        const strongest = findStrongestMonster(summonableMonsters, cardData);
        if (strongest) {
          return {
            type: "summon",
            cardId: strongest,
            position: "attack",
          };
        }
      }

      // Hard difficulty: Better tribute logic
      const firstHighCostHard = highCostMonsters[0];
      if (
        difficulty === "hard" &&
        firstHighCostHard &&
        highCostMonsters.length > 0 &&
        myBoard.length >= 1
      ) {
        const highCostCard = cardData.get(firstHighCostHard);
        if (highCostCard) {
          const requiredTributes = highCostCard.cost >= 7 ? 2 : 1;

          if (myBoard.length >= requiredTributes) {
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
            // Hard: More aggressive tribute (gain > 800 ATK)
            if (newPower - tributePower > 800) {
              return {
                type: "summon",
                cardId: firstHighCostHard,
                position: "attack",
                tributeIds: weakestTributes,
              };
            }
          }
        }
      }
    } else if (difficulty === "boss") {
      // Boss: Optimal tribute decisions and combo awareness
      // First check if tribute summon is optimal
      if (highCostMonsters.length > 0 && myBoard.length >= 1) {
        const firstHighCostBoss = highCostMonsters[0];
        if (firstHighCostBoss) {
          const highCostCard = cardData.get(firstHighCostBoss);
          if (highCostCard) {
            const requiredTributes = highCostCard.cost >= 7 ? 2 : 1;

            if (myBoard.length >= requiredTributes) {
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
              const oppHighestATK = Math.max(...oppBoard.map((m) => m.attack), 0);

              // Boss: Tribute if new monster can beat opponent's strongest
              if (newPower > oppHighestATK && newPower - tributePower > 500) {
                return {
                  type: "summon",
                  cardId: firstHighCostBoss,
                  position: "attack",
                  tributeIds: weakestTributes,
                };
              }
            }
          }
        }
      }

      // Otherwise summon strongest
      if (summonableMonsters.length > 0) {
        const strongest = findStrongestMonster(summonableMonsters, cardData);
        if (strongest) {
          return {
            type: "summon",
            cardId: strongest,
            position: "attack",
          };
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

  // Activate spells based on difficulty
  const spells = myHand.filter((cardId) => {
    const card = cardData.get(cardId);
    return card && card.cardType === "spell";
  });

  if (spells.length > 0) {
    const spellChance = {
      easy: 0.2, // 20% chance
      medium: 0.5, // 50% chance
      hard: 0.7, // 70% chance
      boss: 0.9, // 90% chance (almost always)
    };

    if (Math.random() < spellChance[difficulty]) {
      return {
        type: "activate_spell",
        cardId: spells[0],
      };
    }
  }

  // Pass if nothing to do
  return { type: "pass" };
}

/**
 * Handle Battle Phase attack decisions based on difficulty
 */
export function handleBattlePhase(
  difficulty: "easy" | "medium" | "hard" | "boss",
  // biome-ignore lint/suspicious/noExplicitAny: Board card structure varies
  myBoard: any[],
  // biome-ignore lint/suspicious/noExplicitAny: Board card structure varies
  oppBoard: any[]
): AIAction {
  // Easy: Sometimes attacks recklessly
  if (difficulty === "easy") {
    // 50% chance to just attack with first monster
    if (myBoard.length > 0 && Math.random() > 0.5) {
      const firstMonster = myBoard[0];
      if (!firstMonster.hasAttacked && firstMonster.position === 1) {
        return {
          type: "attack",
          cardId: firstMonster.cardId,
        };
      }
    }
  }

  // Medium/Hard/Boss: Strategic attacks
  for (const monster of myBoard) {
    if (monster.hasAttacked || monster.position !== 1) continue;

    // Direct attack if no opposition
    if (oppBoard.length === 0) {
      return {
        type: "attack",
        cardId: monster.cardId,
      };
    }

    // Find best target
    for (const oppMonster of oppBoard) {
      const targetDEF = oppMonster.position === -1 ? oppMonster.defense : oppMonster.attack;

      // Can destroy opponent's monster
      if (monster.attack > targetDEF) {
        return {
          type: "attack",
          cardId: monster.cardId,
        };
      }

      // Boss difficulty: Even trade if it helps board control
      if (
        difficulty === "boss" &&
        monster.attack === targetDEF &&
        myBoard.length > oppBoard.length
      ) {
        return {
          type: "attack",
          cardId: monster.cardId,
        };
      }
    }
  }

  // No good attacks, end phase
  return { type: "end_phase" };
}
