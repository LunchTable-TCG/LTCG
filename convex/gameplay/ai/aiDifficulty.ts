/**
 * AI Difficulty-Specific Strategies
 *
 * Implements different decision-making logic for each difficulty level
 */

import type { Doc, Id } from "../../_generated/dataModel";
import { getCardAbility } from "../../lib/abilityHelpers";
import type { AIAction, FieldSpell, SpellTrapCard } from "./aiEngine";
import {
  canSummonWithoutTribute,
  findStrongestMonster,
  findWeakestMonster,
  getTributeCount,
} from "./aiEngine";

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
  cardData: Map<string, Doc<"cardDefinitions">>,
  turnNumber = 1,
  mySpellTrapZone: SpellTrapCard[] = [],
  myFieldSpell: FieldSpell | undefined = undefined
): AIAction {
  // Flip face-down monsters first (does NOT consume normal summon)
  // Face-down monsters are dead weight — they can't attack or contribute
  const faceDownMonsters = myBoard.filter((m) => m.isFaceDown && m.turnSummoned !== turnNumber);
  if (faceDownMonsters.length > 0) {
    const flipChance = { easy: 0.3, medium: 0.6, hard: 0.8, boss: 1.0 };
    if (Math.random() < flipChance[difficulty]) {
      return { type: "flip_summon", cardId: faceDownMonsters[0].cardId };
    }
  }

  // Play field spell if available (provides continuous board advantage)
  const fieldSpells = myHand.filter((cardId) => {
    const card = cardData.get(cardId);
    // biome-ignore lint/suspicious/noExplicitAny: spellType not in strict type
    return card && card.cardType === "spell" && (card as any).spellType === "field";
  });

  if (fieldSpells.length > 0) {
    // Don't play if we already have the same field spell active
    const newFieldSpell = fieldSpells.find((id) => id !== myFieldSpell?.cardId);
    if (newFieldSpell) {
      const fieldChance = { easy: 0.2, medium: 0.5, hard: 0.8, boss: 0.95 };
      if (Math.random() < fieldChance[difficulty]) {
        return { type: "play_field_spell", cardId: newFieldSpell };
      }
    }
  }

  // Try to summon a monster if we haven't yet
  if (!hasNormalSummoned && evaluation.hasMonsterZoneSpace) {
    // Find monsters we can summon
    const summonableMonsters = myHand.filter((cardId) => {
      const card = cardData.get(cardId);
      return card && canSummonWithoutTribute(card);
    });

    // Check for tribute summons (level 5+)
    const highCostMonsters = myHand.filter((cardId) => {
      const card = cardData.get(cardId);
      return card && card.cardType === "creature" && getTributeCount(card) > 0;
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
          const requiredTributes = getTributeCount(highCostCard);

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
            const requiredTributes = getTributeCount(highCostCard);

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
  }

  // Activate spells based on difficulty (checked BEFORE set fallback)
  // Only consider spells that have manual-trigger effects (avoid burning spells for nothing)
  const spells = myHand.filter((cardId) => {
    const card = cardData.get(cardId);
    if (!card || card.cardType !== "spell") return false;
    const ability = getCardAbility(card);
    return ability?.effects.some((e) => e.trigger === "manual") ?? false;
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

  // Activate traps from spell/trap zone (must have been set on a prior turn)
  const activatableTraps = mySpellTrapZone.filter((slot) => {
    if (!slot.isFaceDown || slot.isActivated) return false;
    if (slot.turnSet !== undefined && slot.turnSet >= turnNumber) return false;
    const card = cardData.get(slot.cardId);
    if (!card || card.cardType !== "trap") return false;
    // biome-ignore lint/suspicious/noExplicitAny: trapType not in strict type
    if ((card as any).trapType === "counter") return false;
    const ability = getCardAbility(card);
    return ability?.effects.some((e) => e.trigger === "manual") ?? false;
  });

  if (activatableTraps.length > 0) {
    const trapChance = { easy: 0.1, medium: 0.3, hard: 0.5, boss: 0.7 };
    if (Math.random() < trapChance[difficulty]) {
      const firstTrap = activatableTraps[0];
      if (firstTrap) {
        return { type: "activate_trap", cardId: firstTrap.cardId };
      }
    }
  }

  // Set spells/traps from hand face-down
  const setableSpellTraps = myHand.filter((cardId) => {
    const card = cardData.get(cardId);
    if (!card) return false;
    if (card.cardType === "trap") return true;
    if (card.cardType === "spell") {
      // biome-ignore lint/suspicious/noExplicitAny: spellType not in strict type
      const spellType = (card as any).spellType;
      // Don't set normal spells (better to activate directly) or field spells (handled separately)
      return spellType === "continuous" || spellType === "quick_play" || spellType === "equip";
    }
    return false;
  });

  if (setableSpellTraps.length > 0 && mySpellTrapZone.length < 5) {
    const setChance = { easy: 0.1, medium: 0.3, hard: 0.6, boss: 0.8 };
    if (Math.random() < setChance[difficulty]) {
      // Prefer setting traps over spells
      const traps = setableSpellTraps.filter((id) => {
        const c = cardData.get(id);
        return c?.cardType === "trap";
      });
      const toSet = traps.length > 0 ? traps[0] : setableSpellTraps[0];
      if (toSet) {
        return { type: "set_spell_trap", cardId: toSet };
      }
    }
  }

  // Set a monster face-down if we can't summon AND didn't activate a spell
  if (!hasNormalSummoned && evaluation.hasMonsterZoneSpace) {
    const setableMonsters = myHand.filter((cardId) => {
      const card = cardData.get(cardId);
      return card && card.cardType === "creature" && getTributeCount(card) === 0;
    });

    if (setableMonsters.length > 0) {
      return {
        type: "set",
        cardId: setableMonsters[0],
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
  oppBoard: any[],
  turnNumber: number
): AIAction {
  // Easy: Sometimes attacks recklessly (never falls through to strategic logic)
  if (difficulty === "easy") {
    // Find all eligible attackers (not just the first one)
    const eligibleAttackers = myBoard.filter(
      (m) =>
        !m.hasAttacked &&
        m.position === 1 &&
        !m.isFaceDown &&
        m.turnSummoned !== turnNumber
    );

    if (eligibleAttackers.length > 0 && Math.random() > 0.5) {
      // Pick a random eligible attacker
      const randomAttacker =
        eligibleAttackers[Math.floor(Math.random() * eligibleAttackers.length)];
      if (randomAttacker) {
        return {
          type: "attack",
          cardId: randomAttacker.cardId,
        };
      }
    }
    return { type: "end_phase" };
  }

  // Medium/Hard/Boss: Strategic attacks
  for (const monster of myBoard) {
    if (
      monster.hasAttacked ||
      monster.position !== 1 ||
      monster.isFaceDown ||
      monster.turnSummoned === turnNumber
    )
      continue;

    // Direct attack if no opposition
    if (oppBoard.length === 0) {
      return {
        type: "attack",
        cardId: monster.cardId,
      };
    }

    // Sort opponent monsters: target strongest beatable first (maximize board impact)
    const sortedTargets = [...oppBoard].sort((a, b) => {
      const aVal = a.position === -1 ? a.defense : a.attack;
      const bVal = b.position === -1 ? b.defense : b.attack;
      return bVal - aVal; // Descending — strongest first
    });

    // Find strongest target this monster can beat
    let bestTarget = null;
    let bestEvenTrade = null;

    for (const oppMonster of sortedTargets) {
      const targetDEF = oppMonster.position === -1 ? oppMonster.defense : oppMonster.attack;

      if (monster.attack > targetDEF) {
        bestTarget = oppMonster;
        break; // Strongest beatable found (list is sorted descending)
      }

      // Boss difficulty: Track even trades for board control
      if (
        difficulty === "boss" &&
        monster.attack === targetDEF &&
        myBoard.length > oppBoard.length &&
        !bestEvenTrade
      ) {
        bestEvenTrade = oppMonster;
      }
    }

    if (bestTarget) {
      return {
        type: "attack",
        cardId: monster.cardId,
        targetId: bestTarget.cardId,
      };
    }

    if (bestEvenTrade) {
      return {
        type: "attack",
        cardId: monster.cardId,
        targetId: bestEvenTrade.cardId,
      };
    }
  }

  // No good attacks, end phase
  return { type: "end_phase" };
}

/**
 * Evaluate whether the AI should respond during a chain/response window.
 *
 * Returns the card to activate (and whether it's from zone vs hand),
 * or null if the AI decides not to respond.
 */
export function evaluateChainResponse(
  difficulty: "easy" | "medium" | "hard" | "boss",
  windowType: string,
  availableTraps: SpellTrapCard[],
  quickPlaySpells: Id<"cardDefinitions">[],
  cardData: Map<string, Doc<"cardDefinitions">>,
  // biome-ignore lint/suspicious/noExplicitAny: Chain link structure varies
  _currentChain: any[],
  stateContext: { myLP: number; oppLP: number; myBoardSize: number; oppBoardSize: number }
): { respond: boolean; cardId: Id<"cardDefinitions">; fromZone: boolean } | null {
  // Difficulty-weighted base chance to respond
  const responseChance = { easy: 0.1, medium: 0.3, hard: 0.6, boss: 0.85 };
  if (Math.random() >= responseChance[difficulty]) {
    return null; // AI decides not to respond
  }

  // Collect eligible responses with priority scoring
  const candidates: Array<{
    cardId: Id<"cardDefinitions">;
    fromZone: boolean;
    priority: number;
  }> = [];

  // Check traps in spell/trap zone
  for (const trap of availableTraps) {
    const card = cardData.get(trap.cardId);
    if (!card) continue;

    // biome-ignore lint/suspicious/noExplicitAny: trapType not in strict type
    const trapType = (card as any).trapType;
    const isCounter = trapType === "counter";

    // Counter traps only respond to spell/trap/effect activations
    if (isCounter) {
      if (
        windowType !== "spell_activation" &&
        windowType !== "trap_activation" &&
        windowType !== "effect_activation"
      ) {
        continue;
      }
      // Counter traps get highest priority
      candidates.push({ cardId: trap.cardId, fromZone: true, priority: 10 });
      continue;
    }

    // Match non-counter traps to appropriate window types
    let priority = 5;
    const ability = getCardAbility(card);
    const hasDestroy = ability?.effects.some((e) => e.type === "destroy") ?? false;
    const hasDamage = ability?.effects.some((e) => e.type === "damage") ?? false;
    const hasNegate =
      ability?.effects.some((e) => e.type === "negate" || e.type === "negateActivation") ?? false;

    if (windowType === "summon" && (hasDestroy || hasNegate)) {
      priority = 8; // Destruction trap vs summon is high value
    } else if (windowType === "attack_declaration" && (hasDestroy || hasDamage)) {
      priority = 8; // Battle traps vs attacks
    } else if (windowType === "spell_activation" && hasNegate) {
      priority = 7;
    } else if (windowType === "effect_activation") {
      priority = 6;
    }

    // Boss AI: Don't waste destruction trap on weak monsters
    if (difficulty === "boss" && hasDestroy && windowType === "summon") {
      if (stateContext.oppBoardSize <= 1 && stateContext.myBoardSize >= 2) {
        priority -= 3; // Less value if we already dominate board
      }
    }

    candidates.push({ cardId: trap.cardId, fromZone: true, priority });
  }

  // Check quick-play spells from hand (Speed 2)
  for (const spellId of quickPlaySpells) {
    const card = cardData.get(spellId);
    if (!card) continue;

    const ability = getCardAbility(card);
    const hasNegate =
      ability?.effects.some((e) => e.type === "negate" || e.type === "negateActivation") ?? false;
    const hasDestroy = ability?.effects.some((e) => e.type === "destroy") ?? false;

    let priority = 4;
    if (hasNegate && (windowType === "spell_activation" || windowType === "effect_activation")) {
      priority = 7;
    } else if (hasDestroy && windowType === "summon") {
      priority = 6;
    }

    candidates.push({ cardId: spellId, fromZone: false, priority });
  }

  if (candidates.length === 0) return null;

  // Sort by priority (highest first) and pick the best
  candidates.sort((a, b) => b.priority - a.priority);
  const best = candidates[0];
  if (!best) return null;

  // Boss AI: additional validation — skip low-value responses
  if (difficulty === "boss" && best.priority < 4) {
    return null;
  }

  return { respond: true, cardId: best.cardId, fromZone: best.fromZone };
}
