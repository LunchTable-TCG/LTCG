/**
 * AI Turn Automation
 *
 * Executes a full AI turn using atomic state changes and the sophisticated
 * AI decision engine from aiEngine.ts. Supports all difficulty levels.
 */

import { v } from "convex/values";
import * as generatedApi from "../../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../functions";
import { getCardAbility } from "../../lib/abilityHelpers";
import { getTributeCount } from "../../lib/cardPropertyHelpers";
import { getSpellSpeed } from "../../lib/spellSpeedHelper";
import { recordEventHelper } from "../gameEvents";
import { evaluateChainResponse } from "./aiDifficulty";
import { type AIAction, type FieldSpell, type SpellTrapCard, makeAIDecision } from "./aiEngine";

// Types for atomic state changes
interface BoardCard {
  cardId: Id<"cardDefinitions">;
  position: number;
  attack: number;
  defense: number;
  isFaceDown: boolean;
  hasAttacked: boolean;
  turnSummoned?: number;
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
}

interface AILingeringEffect {
  effectType: string;
  // biome-ignore lint/suspicious/noExplicitAny: Matches schema v.any() for lingering effect values
  value: any;
  sourceCardId?: Id<"cardDefinitions">;
  sourceCardName?: string;
  appliedBy: Id<"users">;
  appliedTurn: number;
  duration: {
    type: "until_end_phase" | "until_turn_end" | "until_next_turn" | "permanent" | "custom";
    endTurn?: number;
    endPhase?: string;
  };
  affectsPlayer?: "host" | "opponent" | "both";
  // biome-ignore lint/suspicious/noExplicitAny: Matches schema v.any() for conditions
  conditions?: any;
}

interface StateChanges {
  opponentBoard: BoardCard[];
  opponentHand: Id<"cardDefinitions">[];
  opponentGraveyard: Id<"cardDefinitions">[];
  opponentDeck: Id<"cardDefinitions">[];
  opponentLifePoints: number;
  opponentBanished: Id<"cardDefinitions">[];
  opponentSpellTrapZone: SpellTrapCard[];
  opponentFieldSpell: FieldSpell | undefined;
  opponentMana: number;
  hostBoard: BoardCard[];
  hostHand: Id<"cardDefinitions">[];
  hostLifePoints: number;
  hostGraveyard: Id<"cardDefinitions">[];
  hostDeck: Id<"cardDefinitions">[];
  hostBanished: Id<"cardDefinitions">[];
  hostSpellTrapZone: SpellTrapCard[];
  hostFieldSpell: FieldSpell | undefined;
  hostMana: number;
  opponentNormalSummonedThisTurn: boolean;
  lingeringEffects: AILingeringEffect[];
}

/** Check if either player's LP has reached 0 (game should end) */
function isGameOver(stateChanges: StateChanges) {
  return stateChanges.hostLifePoints <= 0 || stateChanges.opponentLifePoints <= 0;
}

/** Initialize mutable state changes from current game state (deep copy of mutable arrays) */
function initStateChanges(gameState: Doc<"gameStates">): StateChanges {
  return {
    opponentBoard: gameState.opponentBoard.map((m) => ({ ...m })),
    opponentHand: [...gameState.opponentHand],
    opponentGraveyard: [...gameState.opponentGraveyard],
    opponentDeck: [...gameState.opponentDeck],
    opponentLifePoints: gameState.opponentLifePoints,
    opponentBanished: [...(gameState.opponentBanished || [])],
    opponentSpellTrapZone: (gameState.opponentSpellTrapZone || []).map((s) => ({ ...s })),
    opponentFieldSpell: gameState.opponentFieldSpell
      ? { ...gameState.opponentFieldSpell }
      : undefined,
    opponentMana: gameState.opponentMana ?? 0,
    hostBoard: gameState.hostBoard.map((m) => ({ ...m })),
    hostHand: [...gameState.hostHand],
    hostLifePoints: gameState.hostLifePoints,
    hostGraveyard: [...gameState.hostGraveyard],
    hostDeck: [...gameState.hostDeck],
    hostBanished: [...(gameState.hostBanished || [])],
    hostSpellTrapZone: (gameState.hostSpellTrapZone || []).map((s) => ({ ...s })),
    hostFieldSpell: gameState.hostFieldSpell ? { ...gameState.hostFieldSpell } : undefined,
    hostMana: gameState.hostMana ?? 0,
    opponentNormalSummonedThisTurn: gameState.opponentNormalSummonedThisTurn || false,
    lingeringEffects: ((gameState.lingeringEffects || []) as AILingeringEffect[]).map((e) => ({
      ...e,
      duration: { ...e.duration },
    })),
  };
}

/**
 * Execute card effects from ability definition.
 * Shared by activate_spell, activate_trap, and chain responses.
 */
function executeCardEffects(
  card: Doc<"cardDefinitions">,
  sourceCardId: Id<"cardDefinitions">,
  stateChanges: StateChanges,
  cardDataMap: Map<string, Doc<"cardDefinitions">>,
  turnNumber: number,
  aiPlayerId: Id<"users">
): string[] {
  const ability = getCardAbility(card);
  if (!ability || ability.effects.length === 0) return [];

  const effectResults: string[] = [];

  for (const effect of ability.effects) {
    if (effect.trigger !== "manual") continue;

    switch (effect.type) {
      case "draw": {
        const drawCount = effect.value || 1;
        let actualDrawn = 0;
        for (let i = 0; i < drawCount && stateChanges.opponentDeck.length > 0; i++) {
          const drawnCard = stateChanges.opponentDeck.shift();
          if (drawnCard) {
            stateChanges.opponentHand.push(drawnCard);
            actualDrawn++;
          }
        }
        effectResults.push(`Drew ${actualDrawn} card(s)`);
        break;
      }

      case "destroy": {
        const targetCount = effect.targetCount || 1;
        const targetOwner = effect.targetLocation === "board" ? "opponent" : "self";

        if (targetOwner === "opponent" || effect.condition?.includes("opponent")) {
          let destroyed = 0;
          const remaining: BoardCard[] = [];
          for (const target of stateChanges.hostBoard) {
            if (
              destroyed < targetCount &&
              !target.cannotBeDestroyedByEffects &&
              !target.cannotBeTargeted
            ) {
              stateChanges.hostGraveyard.push(target.cardId);
              destroyed++;
            } else {
              remaining.push(target);
            }
          }
          stateChanges.hostBoard = remaining;
          if (destroyed > 0) {
            effectResults.push(`Destroyed ${destroyed} opponent monster(s)`);
          }
        } else {
          let totalDestroyed = 0;
          const survivingHost: BoardCard[] = [];
          for (const m of stateChanges.hostBoard) {
            if (m.cannotBeDestroyedByEffects) {
              survivingHost.push(m);
            } else {
              stateChanges.hostGraveyard.push(m.cardId);
              totalDestroyed++;
            }
          }
          const survivingOpp: BoardCard[] = [];
          for (const m of stateChanges.opponentBoard) {
            if (m.cannotBeDestroyedByEffects) {
              survivingOpp.push(m);
            } else {
              stateChanges.opponentGraveyard.push(m.cardId);
              totalDestroyed++;
            }
          }
          stateChanges.hostBoard = survivingHost;
          stateChanges.opponentBoard = survivingOpp;
          effectResults.push(`Destroyed ${totalDestroyed} monster(s)`);
        }
        break;
      }

      case "damage": {
        const damageAmount = effect.value || 0;
        stateChanges.hostLifePoints = Math.max(0, stateChanges.hostLifePoints - damageAmount);
        effectResults.push(`Dealt ${damageAmount} damage`);
        break;
      }

      case "gainLP": {
        const healAmount = effect.value || 0;
        stateChanges.opponentLifePoints = Math.min(
          8000,
          stateChanges.opponentLifePoints + healAmount
        );
        effectResults.push(`Gained ${healAmount} LP`);
        break;
      }

      case "modifyATK": {
        const atkMod = effect.value || 0;
        const atkTargetOwner = (effect as { targetOwner?: string }).targetOwner;
        const atkTargetsHost = atkTargetOwner === "opponent" || (!atkTargetOwner && atkMod < 0);
        const atkBoardKey = atkTargetsHost ? "hostBoard" : "opponentBoard";
        stateChanges[atkBoardKey] = stateChanges[atkBoardKey].map((monster) => ({
          ...monster,
          attack: Math.max(0, monster.attack + atkMod),
        }));
        effectResults.push(
          `Modified ATK by ${atkMod} on ${atkTargetsHost ? "opponent's" : "own"} monsters`
        );
        const atkDuration = (effect as { lingeringDuration?: { type: string; turns?: number } })
          .lingeringDuration;
        if (atkDuration) {
          stateChanges.lingeringEffects.push({
            effectType: "modifyATK",
            value: atkMod,
            sourceCardId,
            sourceCardName: card.name,
            appliedBy: aiPlayerId,
            appliedTurn: turnNumber,
            duration: {
              type: atkDuration.type as AILingeringEffect["duration"]["type"],
              endTurn: atkDuration.turns ? turnNumber + atkDuration.turns : undefined,
            },
            affectsPlayer: atkTargetsHost ? "host" : "opponent",
          });
        }
        break;
      }

      case "modifyDEF": {
        const defMod = effect.value || 0;
        const defTargetOwner = (effect as { targetOwner?: string }).targetOwner;
        const defTargetsHost = defTargetOwner === "opponent" || (!defTargetOwner && defMod < 0);
        const defBoardKey = defTargetsHost ? "hostBoard" : "opponentBoard";
        stateChanges[defBoardKey] = stateChanges[defBoardKey].map((monster) => ({
          ...monster,
          defense: Math.max(0, monster.defense + defMod),
        }));
        effectResults.push(
          `Modified DEF by ${defMod} on ${defTargetsHost ? "opponent's" : "own"} monsters`
        );
        const defDuration = (effect as { lingeringDuration?: { type: string; turns?: number } })
          .lingeringDuration;
        if (defDuration) {
          stateChanges.lingeringEffects.push({
            effectType: "modifyDEF",
            value: defMod,
            sourceCardId,
            sourceCardName: card.name,
            appliedBy: aiPlayerId,
            appliedTurn: turnNumber,
            duration: {
              type: defDuration.type as AILingeringEffect["duration"]["type"],
              endTurn: defDuration.turns ? turnNumber + defDuration.turns : undefined,
            },
            affectsPlayer: defTargetsHost ? "host" : "opponent",
          });
        }
        break;
      }

      case "toHand": {
        const bounceTarget = stateChanges.hostBoard.find((m) => !m.cannotBeTargeted);
        if (bounceTarget) {
          stateChanges.hostBoard = stateChanges.hostBoard.filter((m) => m !== bounceTarget);
          stateChanges.hostHand.push(bounceTarget.cardId);
          effectResults.push("Returned a monster to opponent's hand");
        }
        break;
      }

      case "toGraveyard": {
        const gyMillCount = effect.value || 1;
        let gyActualMilled = 0;
        for (let i = 0; i < gyMillCount && stateChanges.hostDeck.length > 0; i++) {
          const milled = stateChanges.hostDeck.shift();
          if (milled) {
            stateChanges.hostGraveyard.push(milled);
            gyActualMilled++;
          }
        }
        effectResults.push(`Sent ${gyActualMilled} card(s) to opponent's graveyard`);
        break;
      }

      case "banish": {
        if (stateChanges.hostGraveyard.length > 0) {
          const banished = stateChanges.hostGraveyard.shift();
          if (banished) {
            stateChanges.hostBanished.push(banished);
          }
          effectResults.push("Banished a card from opponent's graveyard");
        }
        break;
      }

      case "summon": {
        if (stateChanges.opponentBoard.length < 5) {
          const summonTarget = stateChanges.opponentHand.find((id) => {
            const c = cardDataMap.get(id);
            return c && c.cardType === "creature";
          });
          if (summonTarget) {
            const c = cardDataMap.get(summonTarget);
            if (c) {
              stateChanges.opponentHand = stateChanges.opponentHand.filter(
                (id) => id !== summonTarget
              );
              stateChanges.opponentBoard.push({
                cardId: summonTarget,
                position: 1,
                attack: c.attack || 0,
                defense: c.defense || 0,
                isFaceDown: false,
                hasAttacked: false,
                turnSummoned: turnNumber,
              });
              effectResults.push(`Special summoned ${c.name}`);
            }
          }
        }
        break;
      }

      case "search": {
        const searchTarget = stateChanges.opponentDeck.find((id) => {
          const c = cardDataMap.get(id);
          if (!c) return false;
          const targetType = (effect as { targetCardType?: string }).targetCardType;
          return !targetType || c.cardType === targetType;
        });
        if (searchTarget) {
          stateChanges.opponentDeck = stateChanges.opponentDeck.filter((id) => id !== searchTarget);
          stateChanges.opponentHand.push(searchTarget);
          const searchCard = cardDataMap.get(searchTarget);
          effectResults.push(`Searched for ${searchCard?.name || "a card"}`);
        }
        break;
      }

      case "negate":
      case "negateActivation": {
        effectResults.push("Negate effect prepared");
        break;
      }

      case "mill": {
        const helperMillCount = effect.value || 1;
        let helperActualMilled = 0;
        for (let i = 0; i < helperMillCount && stateChanges.hostDeck.length > 0; i++) {
          const milled = stateChanges.hostDeck.shift();
          if (milled) {
            stateChanges.hostGraveyard.push(milled);
            helperActualMilled++;
          }
        }
        effectResults.push(`Milled ${helperActualMilled} card(s) from opponent's deck`);
        break;
      }

      case "discard": {
        const discardCount = effect.value || 1;
        let actualDiscarded = 0;
        for (let i = 0; i < discardCount && stateChanges.hostHand.length > 0; i++) {
          const discarded = stateChanges.hostHand.pop();
          if (discarded) {
            stateChanges.hostGraveyard.push(discarded);
            actualDiscarded++;
          }
        }
        effectResults.push(`Discarded ${actualDiscarded} card(s) from opponent's hand`);
        break;
      }

      case "generateToken": {
        if (stateChanges.opponentBoard.length < 5) {
          const tokenATK = effect.value || 0;
          const tokenDEF =
            (effect as { secondaryValue?: number }).secondaryValue || effect.value || 0;
          stateChanges.opponentBoard.push({
            cardId: sourceCardId,
            position: 1,
            attack: tokenATK,
            defense: tokenDEF,
            isFaceDown: false,
            hasAttacked: false,
            turnSummoned: turnNumber,
          });
          effectResults.push(`Generated token (${tokenATK}/${tokenDEF})`);
        }
        break;
      }

      case "directAttack":
      case "multipleAttack": {
        effectResults.push(`${effect.type} ability noted`);
        break;
      }

      default:
        effectResults.push(`Effect ${effect.type} activated`);
        break;
    }
  }

  return effectResults;
}

/**
 * Execute a single AI action and return updated state changes
 */
function executeAction(
  action: AIAction,
  stateChanges: StateChanges,
  cardDataMap: Map<string, Doc<"cardDefinitions">>,
  turnNumber: number,
  aiPlayerId: Id<"users">
): { success: boolean; description: string } {
  switch (action.type) {
    case "summon": {
      if (!action.cardId) return { success: false, description: "No card specified for summon" };

      // One normal summon per turn
      if (stateChanges.opponentNormalSummonedThisTurn) {
        return { success: false, description: "Already used normal summon this turn" };
      }

      // Validate card is actually in hand before summoning
      if (!stateChanges.opponentHand.includes(action.cardId)) {
        return { success: false, description: "Card not in hand" };
      }

      const card = cardDataMap.get(action.cardId);
      if (!card) return { success: false, description: "Card not found" };
      if (card.cardType !== "creature")
        return { success: false, description: "Only creatures can be summoned" };

      // Validate tribute count (use shared helper to match game engine)
      const requiredTributes = getTributeCount(card);
      const providedTributes = action.tributeIds?.length || 0;
      if (providedTributes !== requiredTributes) {
        return {
          success: false,
          description: `Needs ${requiredTributes} tribute(s), got ${providedTributes}`,
        };
      }

      // Handle tribute summons
      if (action.tributeIds && action.tributeIds.length > 0) {
        // Validate all tribute monsters exist on board before removing any
        for (const tributeId of action.tributeIds) {
          const tributeIndex = stateChanges.opponentBoard.findIndex((m) => m.cardId === tributeId);
          if (tributeIndex === -1) {
            return { success: false, description: "Tribute monster not on board" };
          }
        }
        // Remove tributed monsters from board
        for (const tributeId of action.tributeIds) {
          const tributeIndex = stateChanges.opponentBoard.findIndex((m) => m.cardId === tributeId);
          if (tributeIndex !== -1) {
            const removed = stateChanges.opponentBoard.splice(tributeIndex, 1);
            // Add tributed card to graveyard
            if (removed[0]) {
              stateChanges.opponentGraveyard.push(removed[0].cardId);
            }
          }
        }
      }

      // Validate monster zone has space (max 5 slots, checked after tributes removed)
      if (stateChanges.opponentBoard.length >= 5) {
        return { success: false, description: "Monster zone is full" };
      }

      // Remove from hand
      stateChanges.opponentHand = stateChanges.opponentHand.filter((id) => id !== action.cardId);

      // Add to board
      stateChanges.opponentBoard.push({
        cardId: action.cardId,
        position: action.position === "defense" ? -1 : 1,
        attack: card.attack || 0,
        defense: card.defense || 0,
        isFaceDown: false,
        hasAttacked: false,
        turnSummoned: turnNumber,
      });

      stateChanges.opponentNormalSummonedThisTurn = true;

      const tributeCount = action.tributeIds?.length || 0;
      const tributeDesc = tributeCount > 0 ? ` (tributed ${tributeCount})` : "";
      return { success: true, description: `Summoned ${card.name}${tributeDesc}` };
    }

    case "set": {
      if (!action.cardId) return { success: false, description: "No card specified for set" };

      // One normal summon/set per turn
      if (stateChanges.opponentNormalSummonedThisTurn) {
        return { success: false, description: "Already used normal summon this turn" };
      }

      // Validate card is actually in hand before setting
      if (!stateChanges.opponentHand.includes(action.cardId)) {
        return { success: false, description: "Card not in hand" };
      }

      const card = cardDataMap.get(action.cardId);
      if (!card) return { success: false, description: "Card not found" };

      // Only creatures can be set (spell/trap zone not tracked in AI state)
      if (card.cardType !== "creature") {
        return { success: false, description: "Only creatures can be set by AI" };
      }

      // Setting a monster still requires tributes (level 5+ needs tributes)
      // The AI set fallback doesn't provide tributes, so reject high-level monsters
      if (getTributeCount(card) > 0) {
        return { success: false, description: "Cannot set high-level monster without tributes" };
      }

      // Validate monster zone has space (max 5 slots)
      if (stateChanges.opponentBoard.length >= 5) {
        return { success: false, description: "Monster zone is full" };
      }

      // Remove from hand
      stateChanges.opponentHand = stateChanges.opponentHand.filter((id) => id !== action.cardId);

      // Set monster face-down in defense
      stateChanges.opponentBoard.push({
        cardId: action.cardId,
        position: -1, // Defense
        attack: card.attack || 0,
        defense: card.defense || 0,
        isFaceDown: true,
        hasAttacked: false,
        turnSummoned: turnNumber,
      });
      stateChanges.opponentNormalSummonedThisTurn = true;

      return { success: true, description: `Set ${card.name}` };
    }

    case "flip_summon": {
      if (!action.cardId)
        return { success: false, description: "No card specified for flip summon" };

      const monsterIndex = stateChanges.opponentBoard.findIndex((m) => m.cardId === action.cardId);
      if (monsterIndex === -1) return { success: false, description: "Monster not on board" };

      const monster = stateChanges.opponentBoard[monsterIndex];
      if (!monster) return { success: false, description: "Monster not found" };
      if (!monster.isFaceDown) return { success: false, description: "Monster is not face-down" };
      if (monster.turnSummoned === turnNumber)
        return { success: false, description: "Cannot flip summon on the turn it was set" };

      // Flip summon: face-up attack position (does NOT consume normal summon)
      stateChanges.opponentBoard[monsterIndex] = {
        ...monster,
        isFaceDown: false,
        position: 1,
      };

      const flipCard = cardDataMap.get(action.cardId);
      return { success: true, description: `Flip summoned ${flipCard?.name || "monster"}` };
    }

    case "attack": {
      if (!action.cardId) return { success: false, description: "No attacker specified" };

      // Find attacker on board
      const attackerIndex = stateChanges.opponentBoard.findIndex((m) => m.cardId === action.cardId);
      if (attackerIndex === -1) return { success: false, description: "Attacker not on board" };

      const attacker = stateChanges.opponentBoard[attackerIndex];
      if (!attacker) return { success: false, description: "Attacker not found" };
      if (attacker.hasAttacked) return { success: false, description: "Already attacked" };
      if (attacker.position !== 1) return { success: false, description: "Not in attack position" };
      if (attacker.isFaceDown)
        return { success: false, description: "Face-down monster cannot attack" };
      if (attacker.turnSummoned === turnNumber)
        return { success: false, description: "Summoning sickness" };

      const attackerCard = cardDataMap.get(action.cardId);

      // Direct attack if no defenders
      if (stateChanges.hostBoard.length === 0) {
        stateChanges.hostLifePoints = Math.max(0, stateChanges.hostLifePoints - attacker.attack);
        stateChanges.opponentBoard[attackerIndex] = { ...attacker, hasAttacked: true };
        return {
          success: true,
          description: `${attackerCard?.name || "Monster"} attacked directly for ${attacker.attack} damage`,
        };
      }

      // Find target using AI-selected targetId, or fall back to first monster
      const targetIndex = action.targetId
        ? stateChanges.hostBoard.findIndex((m) => m.cardId === action.targetId)
        : 0;
      if (targetIndex === -1) return { success: false, description: "Target not on board" };
      const target = stateChanges.hostBoard[targetIndex];
      if (!target) return { success: false, description: "No valid target" };

      const targetCard = cardDataMap.get(target.cardId);

      // Flip face-down monster before damage calculation
      if (target.isFaceDown) {
        stateChanges.hostBoard[targetIndex] = { ...target, isFaceDown: false };
      }

      const targetDEF = target.position === -1 ? target.defense : target.attack;

      if (attacker.attack > targetDEF) {
        // Destroy target (unless protected)
        if (!target.cannotBeDestroyedByBattle) {
          stateChanges.hostBoard.splice(targetIndex, 1);
          stateChanges.hostGraveyard.push(target.cardId);
        }

        // Calculate and apply damage (only if target was in attack position)
        if (target.position === 1) {
          const damage = attacker.attack - target.attack;
          stateChanges.hostLifePoints = Math.max(0, stateChanges.hostLifePoints - damage);
        }

        stateChanges.opponentBoard[attackerIndex] = { ...attacker, hasAttacked: true };
        return {
          success: true,
          description: target.cannotBeDestroyedByBattle
            ? `${attackerCard?.name || "Monster"} attacked ${targetCard?.name || "monster"} but it survived (battle protection)`
            : `${attackerCard?.name || "Monster"} destroyed ${targetCard?.name || "monster"}`,
        };
      }
      if (attacker.attack === targetDEF && target.position === 1) {
        // Both destroyed (unless protected)
        if (!target.cannotBeDestroyedByBattle) {
          stateChanges.hostBoard.splice(targetIndex, 1);
          stateChanges.hostGraveyard.push(target.cardId);
        }
        if (!attacker.cannotBeDestroyedByBattle) {
          stateChanges.opponentBoard.splice(attackerIndex, 1);
          stateChanges.opponentGraveyard.push(attacker.cardId);
        } else {
          stateChanges.opponentBoard[attackerIndex] = { ...attacker, hasAttacked: true };
        }
        return {
          success: true,
          description: `${attackerCard?.name || "Monster"} and ${targetCard?.name || "monster"} destroyed each other`,
        };
      }
      // Attacker loses — handle differently based on target position
      if (target.position === 1) {
        // ATK vs ATK: Attacker is destroyed, AI takes damage
        const damage = target.attack - attacker.attack;
        if (!attacker.cannotBeDestroyedByBattle) {
          stateChanges.opponentBoard.splice(attackerIndex, 1);
          stateChanges.opponentGraveyard.push(attacker.cardId);
        } else {
          stateChanges.opponentBoard[attackerIndex] = { ...attacker, hasAttacked: true };
        }
        stateChanges.opponentLifePoints = Math.max(0, stateChanges.opponentLifePoints - damage);
        return {
          success: true,
          description: `${attackerCard?.name || "Monster"} was destroyed by ${targetCard?.name || "monster"} (${damage} damage)`,
        };
      }
      // ATK vs DEF: Reflected damage to AI, no destruction on either side
      const reflectedDamage = target.defense - attacker.attack;
      stateChanges.opponentLifePoints = Math.max(
        0,
        stateChanges.opponentLifePoints - reflectedDamage
      );
      stateChanges.opponentBoard[attackerIndex] = { ...attacker, hasAttacked: true };
      return {
        success: true,
        description: `${attackerCard?.name || "Monster"} failed to break ${targetCard?.name || "monster"}'s defense (${reflectedDamage} reflected damage)`,
      };
    }

    case "activate_spell": {
      if (!action.cardId) return { success: false, description: "No spell specified" };

      // Validate card is actually in hand
      if (!stateChanges.opponentHand.includes(action.cardId)) {
        return { success: false, description: "Spell card not in hand" };
      }

      const card = cardDataMap.get(action.cardId);
      if (!card || card.cardType !== "spell") {
        return { success: false, description: "Not a spell card" };
      }

      // Pre-check: ensure at least one manual-trigger effect has valid targets
      // (prevents wasting spells on empty boards)
      const ability = getCardAbility(card);
      if (ability) {
        const hasValidTarget = ability.effects.some((effect) => {
          if (effect.trigger !== "manual") return false;
          switch (effect.type) {
            case "destroy":
            case "toHand":
              return stateChanges.hostBoard.some((m) => !m.cannotBeTargeted);
            case "banish":
              return stateChanges.hostGraveyard.length > 0;
            case "draw":
              return stateChanges.opponentDeck.length > 0;
            case "toGraveyard":
              return stateChanges.hostDeck.length > 0;
            case "modifyATK":
            case "modifyDEF":
              return stateChanges.opponentBoard.length > 0 || stateChanges.hostBoard.length > 0;
            case "damage":
            case "gainLP":
              return true; // Always have a valid target (LP)
            default:
              return true; // Unknown effects — allow activation
          }
        });
        if (!hasValidTarget) {
          return { success: false, description: "No valid targets for spell effects" };
        }
      }

      // Remove from hand
      stateChanges.opponentHand = stateChanges.opponentHand.filter((id) => id !== action.cardId);

      // Move to graveyard (spells go to GY after activation, except continuous/field)
      stateChanges.opponentGraveyard.push(action.cardId);

      // Execute spell effects based on card ability (ability already loaded in pre-check)
      if (!ability || ability.effects.length === 0) {
        return { success: true, description: `Activated spell: ${card.name} (no effect defined)` };
      }

      const effectResults: string[] = [];

      for (const effect of ability.effects) {
        // Only execute manual-trigger effects (spell activations)
        if (effect.trigger !== "manual") continue;

        switch (effect.type) {
          case "draw": {
            // AI draws cards
            const drawCount = effect.value || 1;
            let actualDrawn = 0;
            for (let i = 0; i < drawCount && stateChanges.opponentDeck.length > 0; i++) {
              const drawnCard = stateChanges.opponentDeck.shift();
              if (drawnCard) {
                stateChanges.opponentHand.push(drawnCard);
                actualDrawn++;
              }
            }
            effectResults.push(`Drew ${actualDrawn} card(s)`);
            break;
          }

          case "destroy": {
            // Destroy target cards - AI targets opponent's (host's) monsters
            const targetCount = effect.targetCount || 1;
            const targetOwner = effect.targetLocation === "board" ? "opponent" : "self";

            if (targetOwner === "opponent" || effect.condition?.includes("opponent")) {
              // Destroy opponent's (host's) monsters (skip protected)
              let destroyed = 0;
              const remaining: BoardCard[] = [];
              for (const target of stateChanges.hostBoard) {
                if (
                  destroyed < targetCount &&
                  !target.cannotBeDestroyedByEffects &&
                  !target.cannotBeTargeted
                ) {
                  stateChanges.hostGraveyard.push(target.cardId);
                  destroyed++;
                } else {
                  remaining.push(target);
                }
              }
              stateChanges.hostBoard = remaining;
              if (destroyed > 0) {
                effectResults.push(`Destroyed ${destroyed} opponent monster(s)`);
              }
            } else {
              // Destroy all monsters (both sides) - for effects like "Dark Hole"
              // Respect effect protection
              let totalDestroyed = 0;
              const survivingHost: BoardCard[] = [];
              for (const m of stateChanges.hostBoard) {
                if (m.cannotBeDestroyedByEffects) {
                  survivingHost.push(m);
                } else {
                  stateChanges.hostGraveyard.push(m.cardId);
                  totalDestroyed++;
                }
              }
              const survivingOpp: BoardCard[] = [];
              for (const m of stateChanges.opponentBoard) {
                if (m.cannotBeDestroyedByEffects) {
                  survivingOpp.push(m);
                } else {
                  stateChanges.opponentGraveyard.push(m.cardId);
                  totalDestroyed++;
                }
              }
              stateChanges.hostBoard = survivingHost;
              stateChanges.opponentBoard = survivingOpp;
              effectResults.push(`Destroyed ${totalDestroyed} monster(s)`);
            }
            break;
          }

          case "damage": {
            // Deal damage to opponent (host)
            const damageAmount = effect.value || 0;
            stateChanges.hostLifePoints = Math.max(0, stateChanges.hostLifePoints - damageAmount);
            effectResults.push(`Dealt ${damageAmount} damage`);
            break;
          }

          case "gainLP": {
            // AI gains LP (capped at starting LP of 8000)
            const healAmount = effect.value || 0;
            stateChanges.opponentLifePoints = Math.min(
              8000,
              stateChanges.opponentLifePoints + healAmount
            );
            effectResults.push(`Gained ${healAmount} LP`);
            break;
          }

          case "modifyATK": {
            // Determine target board: debuffs (negative value) or targetOwner="opponent" → host board
            // Buffs (positive value) or targetOwner="self" → AI's own board (opponentBoard)
            const atkMod = effect.value || 0;
            const atkTargetOwner = (effect as { targetOwner?: string }).targetOwner;
            const atkTargetsHost = atkTargetOwner === "opponent" || (!atkTargetOwner && atkMod < 0);
            const atkBoardKey = atkTargetsHost ? "hostBoard" : "opponentBoard";
            stateChanges[atkBoardKey] = stateChanges[atkBoardKey].map((monster) => ({
              ...monster,
              attack: Math.max(0, monster.attack + atkMod),
            }));
            effectResults.push(
              `Modified ATK by ${atkMod} on ${atkTargetsHost ? "opponent's" : "own"} monsters`
            );
            // Track as lingering effect if duration is specified
            const atkDuration = (effect as { lingeringDuration?: { type: string; turns?: number } })
              .lingeringDuration;
            if (atkDuration) {
              stateChanges.lingeringEffects.push({
                effectType: "modifyATK",
                value: atkMod,
                sourceCardId: action.cardId,
                sourceCardName: card.name,
                appliedBy: aiPlayerId,
                appliedTurn: turnNumber,
                duration: {
                  type: atkDuration.type as AILingeringEffect["duration"]["type"],
                  endTurn: atkDuration.turns ? turnNumber + atkDuration.turns : undefined,
                },
                affectsPlayer: atkTargetsHost ? "host" : "opponent",
              });
            }
            break;
          }

          case "modifyDEF": {
            const defMod = effect.value || 0;
            const defTargetOwner = (effect as { targetOwner?: string }).targetOwner;
            const defTargetsHost = defTargetOwner === "opponent" || (!defTargetOwner && defMod < 0);
            const defBoardKey = defTargetsHost ? "hostBoard" : "opponentBoard";
            stateChanges[defBoardKey] = stateChanges[defBoardKey].map((monster) => ({
              ...monster,
              defense: Math.max(0, monster.defense + defMod),
            }));
            effectResults.push(
              `Modified DEF by ${defMod} on ${defTargetsHost ? "opponent's" : "own"} monsters`
            );
            // Track as lingering effect if duration is specified
            const defDuration = (effect as { lingeringDuration?: { type: string; turns?: number } })
              .lingeringDuration;
            if (defDuration) {
              stateChanges.lingeringEffects.push({
                effectType: "modifyDEF",
                value: defMod,
                sourceCardId: action.cardId,
                sourceCardName: card.name,
                appliedBy: aiPlayerId,
                appliedTurn: turnNumber,
                duration: {
                  type: defDuration.type as AILingeringEffect["duration"]["type"],
                  endTurn: defDuration.turns ? turnNumber + defDuration.turns : undefined,
                },
                affectsPlayer: defTargetsHost ? "host" : "opponent",
              });
            }
            break;
          }

          case "toHand": {
            // Return cards to hand - AI returns opponent's monsters (skip untargetable)
            const bounceTarget = stateChanges.hostBoard.find((m) => !m.cannotBeTargeted);
            if (bounceTarget) {
              stateChanges.hostBoard = stateChanges.hostBoard.filter((m) => m !== bounceTarget);
              stateChanges.hostHand.push(bounceTarget.cardId);
              effectResults.push(`Returned a monster to opponent's hand`);
            }
            break;
          }

          case "toGraveyard": {
            // Send cards to graveyard (mill effect)
            const millCount = effect.value || 1;
            let actualMilled = 0;
            for (let i = 0; i < millCount && stateChanges.hostDeck.length > 0; i++) {
              const milled = stateChanges.hostDeck.shift();
              if (milled) {
                stateChanges.hostGraveyard.push(milled);
                actualMilled++;
              }
            }
            effectResults.push(`Sent ${actualMilled} card(s) to opponent's graveyard`);
            break;
          }

          case "banish": {
            // Banish cards - target opponent's graveyard or board
            if (stateChanges.hostGraveyard.length > 0) {
              const banished = stateChanges.hostGraveyard.shift();
              if (banished) {
                stateChanges.hostBanished.push(banished);
              }
              effectResults.push(`Banished a card from opponent's graveyard`);
            }
            break;
          }

          case "summon": {
            // Special summon a monster from hand to the board
            if (stateChanges.opponentBoard.length < 5) {
              const summonTarget = stateChanges.opponentHand.find((id) => {
                const c = cardDataMap.get(id);
                return c && c.cardType === "creature";
              });
              if (summonTarget) {
                const c = cardDataMap.get(summonTarget);
                if (c) {
                  stateChanges.opponentHand = stateChanges.opponentHand.filter(
                    (id) => id !== summonTarget
                  );
                  stateChanges.opponentBoard.push({
                    cardId: summonTarget,
                    position: 1,
                    attack: c.attack || 0,
                    defense: c.defense || 0,
                    isFaceDown: false,
                    hasAttacked: false,
                    turnSummoned: turnNumber,
                  });
                  effectResults.push(`Special summoned ${c.name}`);
                }
              }
            }
            break;
          }

          case "search": {
            // Search deck for a card matching criteria and add to hand
            const searchTarget = stateChanges.opponentDeck.find((id) => {
              const c = cardDataMap.get(id);
              if (!c) return false;
              const targetType = (effect as { targetCardType?: string }).targetCardType;
              return !targetType || c.cardType === targetType;
            });
            if (searchTarget) {
              stateChanges.opponentDeck = stateChanges.opponentDeck.filter(
                (id) => id !== searchTarget
              );
              stateChanges.opponentHand.push(searchTarget);
              const searchCard = cardDataMap.get(searchTarget);
              effectResults.push(`Searched for ${searchCard?.name || "a card"}`);
            }
            break;
          }

          case "negate":
          case "negateActivation": {
            // Negate effects are reactive (chain responses) — in AI spell context, log only
            effectResults.push("Negate effect prepared");
            break;
          }

          case "mill": {
            // Send cards from opponent's (host's) deck to their graveyard
            const millCount = effect.value || 1;
            let actualMilled = 0;
            for (let i = 0; i < millCount && stateChanges.hostDeck.length > 0; i++) {
              const milled = stateChanges.hostDeck.shift();
              if (milled) {
                stateChanges.hostGraveyard.push(milled);
                actualMilled++;
              }
            }
            effectResults.push(`Milled ${actualMilled} card(s) from opponent's deck`);
            break;
          }

          case "discard": {
            // Discard cards from opponent's (host's) hand
            const discardCount = effect.value || 1;
            let actualDiscarded = 0;
            for (let i = 0; i < discardCount && stateChanges.hostHand.length > 0; i++) {
              const discarded = stateChanges.hostHand.pop();
              if (discarded) {
                stateChanges.hostGraveyard.push(discarded);
                actualDiscarded++;
              }
            }
            effectResults.push(`Discarded ${actualDiscarded} card(s) from opponent's hand`);
            break;
          }

          case "generateToken": {
            // Generate a token monster on the AI's board
            if (stateChanges.opponentBoard.length < 5) {
              const tokenATK = effect.value || 0;
              const tokenDEF =
                (effect as { secondaryValue?: number }).secondaryValue || effect.value || 0;
              stateChanges.opponentBoard.push({
                cardId: action.cardId as Id<"cardDefinitions">,
                position: 1,
                attack: tokenATK,
                defense: tokenDEF,
                isFaceDown: false,
                hasAttacked: false,
                turnSummoned: turnNumber,
              });
              effectResults.push(`Generated token (${tokenATK}/${tokenDEF})`);
            }
            break;
          }

          case "directAttack":
          case "multipleAttack": {
            // Passive abilities — handled by combat system, not spell activation
            effectResults.push(`${effect.type} ability noted`);
            break;
          }

          default:
            // Effect type not implemented for AI yet
            effectResults.push(`Effect ${effect.type} activated`);
            break;
        }
      }

      const effectDesc = effectResults.length > 0 ? `: ${effectResults.join(", ")}` : "";
      return { success: true, description: `Activated ${card.name}${effectDesc}` };
    }

    case "set_spell_trap": {
      if (!action.cardId)
        return { success: false, description: "No card specified for set spell/trap" };

      if (!stateChanges.opponentHand.includes(action.cardId)) {
        return { success: false, description: "Card not in hand" };
      }

      const card = cardDataMap.get(action.cardId);
      if (!card) return { success: false, description: "Card not found" };
      if (card.cardType !== "spell" && card.cardType !== "trap") {
        return { success: false, description: "Not a spell or trap card" };
      }

      if (stateChanges.opponentSpellTrapZone.length >= 5) {
        return { success: false, description: "Spell/trap zone is full" };
      }

      stateChanges.opponentHand = stateChanges.opponentHand.filter((id) => id !== action.cardId);
      stateChanges.opponentSpellTrapZone.push({
        cardId: action.cardId,
        isFaceDown: true,
        isActivated: false,
        turnSet: turnNumber,
      });

      return { success: true, description: `Set ${card.name} face-down` };
    }

    case "play_field_spell": {
      if (!action.cardId)
        return { success: false, description: "No card specified for field spell" };

      if (!stateChanges.opponentHand.includes(action.cardId)) {
        return { success: false, description: "Card not in hand" };
      }

      const card = cardDataMap.get(action.cardId);
      if (!card) return { success: false, description: "Card not found" };
      // biome-ignore lint/suspicious/noExplicitAny: spellType field may not be in strict type
      if (card.cardType !== "spell" || (card as any).spellType !== "field") {
        return { success: false, description: "Not a field spell" };
      }

      // Replace existing field spell (send old one to graveyard, remove lingering effects)
      if (stateChanges.opponentFieldSpell) {
        const oldFieldSpellId = stateChanges.opponentFieldSpell.cardId;
        stateChanges.opponentGraveyard.push(oldFieldSpellId);
        stateChanges.lingeringEffects = stateChanges.lingeringEffects.filter(
          (e) => e.sourceCardId !== oldFieldSpellId
        );
      }

      stateChanges.opponentHand = stateChanges.opponentHand.filter((id) => id !== action.cardId);

      stateChanges.opponentFieldSpell = {
        cardId: action.cardId,
        isActive: true,
      };

      // Execute continuous effects via helper
      const effectResults = executeCardEffects(
        card,
        action.cardId,
        stateChanges,
        cardDataMap,
        turnNumber,
        aiPlayerId
      );
      const effectDesc = effectResults.length > 0 ? ` (${effectResults.join(", ")})` : "";
      return { success: true, description: `Activated field spell: ${card.name}${effectDesc}` };
    }

    case "activate_trap": {
      if (!action.cardId)
        return { success: false, description: "No card specified for trap activation" };

      // Find trap in spell/trap zone
      const trapIndex = stateChanges.opponentSpellTrapZone.findIndex(
        (s) => s.cardId === action.cardId && s.isFaceDown
      );
      if (trapIndex === -1) {
        return { success: false, description: "Trap not found face-down in spell/trap zone" };
      }

      const trapSlot = stateChanges.opponentSpellTrapZone[trapIndex];
      if (!trapSlot) return { success: false, description: "Trap slot not found" };

      // Must wait 1 turn before activation
      if (trapSlot.turnSet !== undefined && trapSlot.turnSet >= turnNumber) {
        return { success: false, description: "Cannot activate trap on the turn it was set" };
      }

      const card = cardDataMap.get(action.cardId);
      if (!card) return { success: false, description: "Card not found" };
      if (card.cardType !== "trap") {
        return { success: false, description: "Not a trap card" };
      }

      // Execute trap effects via shared helper
      const effectResults = executeCardEffects(
        card,
        action.cardId,
        stateChanges,
        cardDataMap,
        turnNumber,
        aiPlayerId
      );

      // Determine if continuous or normal trap
      // biome-ignore lint/suspicious/noExplicitAny: trapType field may not be in strict type
      const trapType = (card as any).trapType;
      if (trapType === "continuous") {
        // Continuous trap stays face-up in zone
        stateChanges.opponentSpellTrapZone[trapIndex] = {
          ...trapSlot,
          isFaceDown: false,
          isActivated: true,
        };
      } else {
        // Normal/counter trap goes to graveyard
        stateChanges.opponentSpellTrapZone.splice(trapIndex, 1);
        stateChanges.opponentGraveyard.push(action.cardId);
      }

      const effectDesc = effectResults.length > 0 ? `: ${effectResults.join(", ")}` : "";
      return { success: true, description: `Activated trap ${card.name}${effectDesc}` };
    }

    case "end_phase":
    case "pass":
      return {
        success: true,
        description: action.type === "end_phase" ? "Ending phase" : "Passing",
      };

    default:
      return { success: false, description: "Unknown action type" };
  }
}

/**
 * Execute a complete AI turn
 *
 * Uses atomic state changes to avoid race conditions and integrates
 * the sophisticated AI decision engine.
 */
export const executeAITurn = mutation({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .unique();

    // Soft returns — game may have ended, or server-side scheduler already handled this turn
    if (!gameState) {
      return {
        success: false,
        message: "Game not found",
        actionsTaken: 0,
        actions: [] as string[],
        difficulty: "medium" as const,
      };
    }

    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby || lobby.status !== "active") {
      return {
        success: false,
        message: "Game not active",
        actionsTaken: 0,
        actions: [] as string[],
        difficulty: "medium" as const,
      };
    }

    // Determine AI player
    const aiPlayerId = gameState.opponentId; // AI is always the opponent in story mode

    // If it's no longer AI's turn (server scheduler may have already handled it), skip silently
    if (gameState.currentTurnPlayerId !== aiPlayerId) {
      return {
        success: false,
        message: "Not AI turn",
        actionsTaken: 0,
        actions: [] as string[],
        difficulty: "medium" as const,
      };
    }

    // Load all card data for decision making
    const allCards = await ctx.db.query("cardDefinitions").collect();
    const cardDataMap = new Map(allCards.map((c) => [c._id, c]));

    // Get AI difficulty from game state (defaults to medium)
    const difficulty = (gameState.aiDifficulty as "easy" | "medium" | "hard" | "boss") || "medium";

    // Initialize atomic state changes from current game state
    const stateChanges: StateChanges = initStateChanges(gameState);

    const actionsLog: string[] = [];
    let aiActionsSucceeded = false;

    try {
      // MAIN PHASE 1: Make decisions until AI passes or has nothing to do
      let mainPhaseActions = 0;
      let mainPhaseFailures = 0;
      const maxMainPhaseActions = 5; // Prevent infinite loops

      while (mainPhaseActions < maxMainPhaseActions && mainPhaseFailures < 2) {
        // Create a temporary game state view for AI decision making
        const tempState = { ...gameState, ...stateChanges } as Doc<"gameStates">;

        const decision = await makeAIDecision(
          tempState as Doc<"gameStates">,
          aiPlayerId,
          "main1",
          cardDataMap,
          difficulty
        );

        if (decision.type === "pass" || decision.type === "end_phase") {
          break;
        }

        const result = executeAction(
          decision,
          stateChanges,
          cardDataMap,
          gameState.turnNumber || 1,
          aiPlayerId
        );
        if (result.success) {
          actionsLog.push(`[Main1] ${result.description}`);
          mainPhaseActions++;
          mainPhaseFailures = 0; // Reset on success
          if (isGameOver(stateChanges)) break; // LP=0: stop immediately
        } else {
          mainPhaseFailures++; // Allow retry with different decision, break after 2 consecutive failures
        }
      }

      // BATTLE PHASE: Attack decisions
      let battlePhaseActions = 0;
      let battlePhaseFailures = 0;
      const maxBattleActions = 5; // Max 5 monsters can attack

      while (battlePhaseActions < maxBattleActions && battlePhaseFailures < 2) {
        const tempState = { ...gameState, ...stateChanges } as Doc<"gameStates">;

        const decision = await makeAIDecision(
          tempState as Doc<"gameStates">,
          aiPlayerId,
          "battle",
          cardDataMap,
          difficulty
        );

        if (decision.type === "pass" || decision.type === "end_phase") {
          break;
        }

        if (decision.type === "attack") {
          const result = executeAction(
            decision,
            stateChanges,
            cardDataMap,
            gameState.turnNumber || 1,
            aiPlayerId
          );
          if (result.success) {
            actionsLog.push(`[Battle] ${result.description}`);
            battlePhaseActions++;
            battlePhaseFailures = 0;
            if (isGameOver(stateChanges)) break; // LP=0: stop attacking
          } else {
            battlePhaseFailures++;
          }
        } else {
          break; // Non-attack action in battle phase
        }
      }

      // MAIN PHASE 2: Flip, spells, and set (skip if game is already over)
      if (!isGameOver(stateChanges)) {
        let main2Actions = 0;
        let main2Failures = 0;
        const maxMain2Actions = 5;

        while (main2Actions < maxMain2Actions && main2Failures < 2) {
          const tempState2 = { ...gameState, ...stateChanges } as Doc<"gameStates">;

          const main2Decision = await makeAIDecision(
            tempState2 as Doc<"gameStates">,
            aiPlayerId,
            "main2",
            cardDataMap,
            difficulty
          );

          if (main2Decision.type === "pass" || main2Decision.type === "end_phase") break;

          const result = executeAction(
            main2Decision,
            stateChanges,
            cardDataMap,
            gameState.turnNumber || 1,
            aiPlayerId
          );
          if (result.success) {
            actionsLog.push(`[Main2] ${result.description}`);
            main2Actions++;
            main2Failures = 0;
            if (isGameOver(stateChanges)) break;
          } else {
            main2Failures++;
          }
        }
      }

      aiActionsSucceeded = true;
    } catch (error) {
      console.error("AI decision phase failed, skipping actions:", error);
      // AI actions failed — skip state changes but still end the turn
    }

    // Apply state changes only if AI actions succeeded
    if (aiActionsSucceeded) {
      await ctx.db.patch(gameState._id, {
        opponentBoard: stateChanges.opponentBoard,
        opponentHand: stateChanges.opponentHand,
        opponentGraveyard: stateChanges.opponentGraveyard,
        opponentDeck: stateChanges.opponentDeck,
        opponentLifePoints: stateChanges.opponentLifePoints,
        opponentNormalSummonedThisTurn: stateChanges.opponentNormalSummonedThisTurn,
        opponentBanished: stateChanges.opponentBanished,
        opponentSpellTrapZone: stateChanges.opponentSpellTrapZone,
        opponentFieldSpell: stateChanges.opponentFieldSpell,
        opponentMana: stateChanges.opponentMana,
        hostBoard: stateChanges.hostBoard,
        hostHand: stateChanges.hostHand,
        hostLifePoints: stateChanges.hostLifePoints,
        hostGraveyard: stateChanges.hostGraveyard,
        hostDeck: stateChanges.hostDeck,
        hostBanished: stateChanges.hostBanished,
        hostSpellTrapZone: stateChanges.hostSpellTrapZone,
        hostFieldSpell: stateChanges.hostFieldSpell,
        hostMana: stateChanges.hostMana,
        lingeringEffects: stateChanges.lingeringEffects,
      });
    }

    // Turn ending via separate transaction (prevents rollback of AI actions if endTurn fails)
    await ctx.scheduler.runAfter(100, internalAny.gameplay.gameEngine.turns.endTurnInternal, {
      gameId: args.gameId,
      userId: aiPlayerId,
    });

    // Watchdog fallback — force-end turn if still stuck after 15 seconds
    // Pass turnNumber so the watchdog can verify it's still the same AI turn.
    await ctx.scheduler.runAfter(15000, internalAny.gameplay.ai.aiTurn.forceEndAITurn, {
      gameId: args.gameId,
      expectedTurnNumber: gameState.turnNumber ?? 0,
    });

    return {
      success: true,
      message: aiActionsSucceeded
        ? "AI turn executed successfully"
        : "AI turn skipped (error recovery)",
      actionsTaken: actionsLog.length,
      actions: actionsLog,
      difficulty,
    };
  },
});

/**
 * Execute AI turn (internal mutation for API key auth)
 *
 * Same as executeAITurn but as an internal mutation for HTTP actions.
 * Uses atomic state changes and integrates the AI decision engine.
 */
export const executeAITurnInternal = internalMutation({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .unique();

    // Soft returns — game may have ended or been cleaned up between scheduling and execution
    if (!gameState) {
      console.warn("AI turn: game state not found, skipping", { gameId: args.gameId });
      return {
        success: false,
        message: "Game not found",
        actionsTaken: 0,
        actions: [],
        difficulty: "medium" as const,
      };
    }

    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby || lobby.status !== "active") {
      console.warn("AI turn: game not active, skipping", {
        lobbyId: gameState.lobbyId,
        status: lobby?.status,
      });
      return {
        success: false,
        message: "Game not active",
        actionsTaken: 0,
        actions: [],
        difficulty: "medium" as const,
      };
    }

    // Determine AI player
    const aiPlayerId = gameState.opponentId; // AI is always the opponent in story mode

    // If it's no longer AI's turn (e.g., game was force-ended), skip silently
    if (gameState.currentTurnPlayerId !== aiPlayerId) {
      console.warn("AI turn: not AI's turn anymore, skipping");
      return {
        success: false,
        message: "Not AI turn",
        actionsTaken: 0,
        actions: [],
        difficulty: "medium" as const,
      };
    }

    // Load all card data for decision making
    const allCards = await ctx.db.query("cardDefinitions").collect();
    const cardDataMap = new Map(allCards.map((c) => [c._id, c]));

    // Get AI difficulty from game state (defaults to medium)
    const difficulty = (gameState.aiDifficulty as "easy" | "medium" | "hard" | "boss") || "medium";

    // Initialize atomic state changes from current game state
    const stateChanges: StateChanges = initStateChanges(gameState);

    const actionsLog: string[] = [];
    let aiActionsSucceeded = false;

    // === AI DECISION PHASE (fault-tolerant) ===
    // If AI actions fail, we skip them and just end the turn.
    try {
      // MAIN PHASE 1: Make decisions until AI passes
      let mainPhaseActions = 0;
      let mainPhaseFailures = 0;
      const maxMainPhaseActions = 5;

      while (mainPhaseActions < maxMainPhaseActions && mainPhaseFailures < 2) {
        const tempState = { ...gameState, ...stateChanges } as Doc<"gameStates">;

        const decision = await makeAIDecision(
          tempState as Doc<"gameStates">,
          aiPlayerId,
          "main1",
          cardDataMap,
          difficulty
        );

        if (decision.type === "pass" || decision.type === "end_phase") break;

        const result = executeAction(
          decision,
          stateChanges,
          cardDataMap,
          gameState.turnNumber || 1,
          aiPlayerId
        );
        if (result.success) {
          actionsLog.push(`[Main1] ${result.description}`);
          mainPhaseActions++;
          mainPhaseFailures = 0;
          if (isGameOver(stateChanges)) break; // LP=0: stop immediately
        } else {
          mainPhaseFailures++;
        }
      }

      // BATTLE PHASE: Attack decisions
      let battlePhaseActions = 0;
      let battlePhaseFailures = 0;
      const maxBattleActions = 5;

      while (battlePhaseActions < maxBattleActions && battlePhaseFailures < 2) {
        const tempState = { ...gameState, ...stateChanges } as Doc<"gameStates">;

        const decision = await makeAIDecision(
          tempState as Doc<"gameStates">,
          aiPlayerId,
          "battle",
          cardDataMap,
          difficulty
        );

        if (decision.type === "pass" || decision.type === "end_phase") break;

        if (decision.type === "attack") {
          const result = executeAction(
            decision,
            stateChanges,
            cardDataMap,
            gameState.turnNumber || 1,
            aiPlayerId
          );
          if (result.success) {
            actionsLog.push(`[Battle] ${result.description}`);
            battlePhaseActions++;
            battlePhaseFailures = 0;
            if (isGameOver(stateChanges)) break; // LP=0: stop attacking
          } else {
            battlePhaseFailures++;
          }
        } else {
          break;
        }
      }

      // MAIN PHASE 2: Flip, spells, and set (skip if game is already over)
      if (!isGameOver(stateChanges)) {
        let main2Actions = 0;
        let main2Failures = 0;
        const maxMain2Actions = 5;

        while (main2Actions < maxMain2Actions && main2Failures < 2) {
          const tempState2 = { ...gameState, ...stateChanges } as Doc<"gameStates">;

          const main2Decision = await makeAIDecision(
            tempState2 as Doc<"gameStates">,
            aiPlayerId,
            "main2",
            cardDataMap,
            difficulty
          );

          if (main2Decision.type === "pass" || main2Decision.type === "end_phase") break;

          const result = executeAction(
            main2Decision,
            stateChanges,
            cardDataMap,
            gameState.turnNumber || 1,
            aiPlayerId
          );
          if (result.success) {
            actionsLog.push(`[Main2] ${result.description}`);
            main2Actions++;
            main2Failures = 0;
            if (isGameOver(stateChanges)) break;
          } else {
            main2Failures++;
          }
        }
      }

      aiActionsSucceeded = true;
    } catch (error) {
      console.error("AI decision phase failed, skipping actions:", error);
      // AI actions failed — we'll skip applying state changes but still end the turn
    }

    // === APPLY STATE CHANGES (only if AI actions succeeded) ===
    if (aiActionsSucceeded) {
      await ctx.db.patch(gameState._id, {
        opponentBoard: stateChanges.opponentBoard,
        opponentHand: stateChanges.opponentHand,
        opponentGraveyard: stateChanges.opponentGraveyard,
        opponentDeck: stateChanges.opponentDeck,
        opponentLifePoints: stateChanges.opponentLifePoints,
        opponentNormalSummonedThisTurn: stateChanges.opponentNormalSummonedThisTurn,
        opponentBanished: stateChanges.opponentBanished,
        opponentSpellTrapZone: stateChanges.opponentSpellTrapZone,
        opponentFieldSpell: stateChanges.opponentFieldSpell,
        opponentMana: stateChanges.opponentMana,
        hostBoard: stateChanges.hostBoard,
        hostHand: stateChanges.hostHand,
        hostLifePoints: stateChanges.hostLifePoints,
        hostGraveyard: stateChanges.hostGraveyard,
        hostDeck: stateChanges.hostDeck,
        hostBanished: stateChanges.hostBanished,
        hostSpellTrapZone: stateChanges.hostSpellTrapZone,
        hostFieldSpell: stateChanges.hostFieldSpell,
        hostMana: stateChanges.hostMana,
        lingeringEffects: stateChanges.lingeringEffects,
      });
    }

    // === TURN ENDING (separate transaction via scheduler) ===
    // Schedule endTurnInternal as a SEPARATE mutation so that if it fails,
    // the AI's state changes are still committed and the watchdog can recover.
    await ctx.scheduler.runAfter(100, internalAny.gameplay.gameEngine.turns.endTurnInternal, {
      gameId: args.gameId,
      userId: aiPlayerId,
    });

    // Schedule a watchdog fallback — if endTurnInternal fails and the turn
    // is still stuck on the AI after 15 seconds, force-end it.
    // Pass turnNumber so the watchdog can verify it's still the same AI turn.
    await ctx.scheduler.runAfter(15000, internalAny.gameplay.ai.aiTurn.forceEndAITurn, {
      gameId: args.gameId,
      expectedTurnNumber: gameState.turnNumber ?? 0,
    });

    return {
      success: true,
      message: aiActionsSucceeded
        ? "AI turn executed successfully"
        : "AI turn skipped (error recovery)",
      actionsTaken: actionsLog.length,
      actions: actionsLog,
      difficulty,
    };
  },
});

/**
 * Watchdog: Force-end AI turn if it's still stuck
 *
 * Scheduled as a fallback 15 seconds after the AI turn.
 * If endTurnInternal succeeded, the turn already switched to the player and
 * this is a no-op. If endTurnInternal failed, this does a minimal turn switch
 * so the game doesn't hang permanently.
 */
export const forceEndAITurn = internalMutation({
  args: {
    gameId: v.string(),
    expectedTurnNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .unique();

    if (!gameState) return; // Game gone

    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby || lobby.status !== "active") return; // Game over

    const aiPlayerId = gameState.opponentId;

    // Only act if it's STILL the AI's turn (endTurnInternal failed)
    if (gameState.currentTurnPlayerId !== aiPlayerId) return;

    // If turnNumber changed since this watchdog was scheduled, the original
    // AI turn completed and this is a different cycle — skip.
    if (
      args.expectedTurnNumber !== undefined &&
      (gameState.turnNumber ?? 0) !== args.expectedTurnNumber
    )
      return;

    console.warn("forceEndAITurn: AI turn stuck, forcing turn switch", {
      gameId: args.gameId,
      turnNumber: gameState.turnNumber,
    });

    const isHost = aiPlayerId === gameState.hostId;
    const nextPlayerId = isHost ? gameState.opponentId : gameState.hostId;
    const nextTurnNumber = (gameState.turnNumber ?? 0) + 1;

    // Reset board flags for both sides
    const resetPlayerBoard = (isHost ? gameState.hostBoard : gameState.opponentBoard).map(
      (card) => ({
        ...card,
        hasAttacked: false,
        hasChangedPosition: false,
      })
    );
    const resetOpponentBoard = (isHost ? gameState.opponentBoard : gameState.hostBoard).map(
      (card) => ({
        ...card,
        hasAttacked: false,
        hasChangedPosition: false,
      })
    );

    // Draw a card for the next player (skip on turn 1 for host)
    const shouldSkipDraw = nextTurnNumber === 1 && nextPlayerId === lobby.hostId;
    const sourceDeck =
      nextPlayerId === gameState.hostId ? gameState.hostDeck : gameState.opponentDeck;
    const sourceHand =
      nextPlayerId === gameState.hostId ? gameState.hostHand : gameState.opponentHand;

    // Check for deck-out: next player must draw but has no cards
    if (!shouldSkipDraw && sourceDeck.length === 0) {
      // Deck-out: next player loses (can't draw)
      const winnerId = nextPlayerId === gameState.hostId ? gameState.opponentId : gameState.hostId;
      console.warn("forceEndAITurn: deck-out detected, ending game", {
        gameId: args.gameId,
        loser: nextPlayerId,
      });
      await ctx.scheduler.runAfter(0, internalAny.gameplay.games.lifecycle.completeGame, {
        lobbyId: gameState.lobbyId,
        winnerId,
        finalTurnNumber: nextTurnNumber,
      });
      return;
    }

    const shouldDraw = !shouldSkipDraw && sourceDeck.length > 0;
    const newDeck = shouldDraw ? sourceDeck.slice(1) : [...sourceDeck];
    const newHand = shouldDraw ? [...sourceHand, sourceDeck[0]] : [...sourceHand];

    const nextIsHost = nextPlayerId === gameState.hostId;

    // Minimal atomic turn switch — no effects, no SBA, no events
    await ctx.db.patch(gameState._id, {
      currentTurnPlayerId: nextPlayerId,
      turnNumber: nextTurnNumber,
      currentPhase: "main1",
      [isHost ? "hostBoard" : "opponentBoard"]: resetPlayerBoard,
      [isHost ? "opponentBoard" : "hostBoard"]: resetOpponentBoard,
      hostNormalSummonedThisTurn: false,
      opponentNormalSummonedThisTurn: false,
      segocQueue: [],
      pendingOptionalTriggers: [],
      skippedOptionalTriggers: [],
      ...(nextIsHost
        ? { hostDeck: newDeck, hostHand: newHand }
        : { opponentDeck: newDeck, opponentHand: newHand }),
    });

    // Update lastMoveAt so the cleanup cron doesn't forfeit during recovery
    await ctx.db.patch(gameState.lobbyId, {
      lastMoveAt: Date.now(),
    });
  },
});

/**
 * AI Chain Response
 *
 * Scheduled when the AI gets priority during a response window.
 * Evaluates available traps/quick-play spells and decides whether to respond
 * or pass priority.
 */
export const executeAIChainResponse = internalMutation({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .unique();

    if (!gameState) return;

    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby || lobby.status !== "active") return;
    if (lobby.mode !== "story") return;

    const aiPlayerId = gameState.opponentId;

    // Verify AI has priority in the response window
    const window = gameState.responseWindow;
    if (!window || window.activePlayerId !== aiPlayerId) return;

    const difficulty = (gameState.aiDifficulty as "easy" | "medium" | "hard" | "boss") || "medium";
    const turnNumber = gameState.turnNumber ?? 1;

    // Load card data
    const allCards = await ctx.db.query("cardDefinitions").collect();
    const cardDataMap = new Map(allCards.map((c) => [c._id, c]));

    // Find available traps in AI's spell/trap zone (face-down, set on prior turn, not counter unless appropriate)
    const aiSpellTrapZone = (gameState.opponentSpellTrapZone || []) as SpellTrapCard[];
    const availableTraps = aiSpellTrapZone.filter((slot) => {
      if (!slot.isFaceDown || slot.isActivated) return false;
      if (slot.turnSet !== undefined && slot.turnSet >= turnNumber) return false;
      const card = cardDataMap.get(slot.cardId);
      if (!card || card.cardType !== "trap") return false;
      return true;
    });

    // Find quick-play spells in AI's hand
    const aiHand = gameState.opponentHand;
    const quickPlaySpells = aiHand.filter((cardId) => {
      const card = cardDataMap.get(cardId);
      if (!card || card.cardType !== "spell") return false;
      // biome-ignore lint/suspicious/noExplicitAny: spellType not in strict type
      return (card as any).spellType === "quick_play";
    });

    // Check current chain for spell speed validation
    const currentChain = gameState.currentChain || [];

    // Evaluate whether to respond
    const stateContext = {
      myLP: gameState.opponentLifePoints,
      oppLP: gameState.hostLifePoints,
      myBoardSize: gameState.opponentBoard.length,
      oppBoardSize: gameState.hostBoard.length,
    };

    const decision = evaluateChainResponse(
      difficulty,
      window.type,
      availableTraps,
      quickPlaySpells,
      cardDataMap,
      currentChain,
      stateContext
    );

    if (!decision) {
      // Pass priority — import passResponsePriority dynamically to avoid circular deps
      // Use the chain resolver's pass mechanism via scheduler
      const { passResponsePriority } = await import("../responseWindow");
      await passResponsePriority(ctx, gameState.lobbyId, gameState, aiPlayerId);
      return;
    }

    // AI responds with a card
    const card = cardDataMap.get(decision.cardId);
    if (!card) {
      const { passResponsePriority } = await import("../responseWindow");
      await passResponsePriority(ctx, gameState.lobbyId, gameState, aiPlayerId);
      return;
    }

    const spellSpeed = getSpellSpeed(card);

    // Validate spell speed against current chain
    if (currentChain.length > 0) {
      const lastLink = currentChain[currentChain.length - 1];
      if (lastLink && spellSpeed < lastLink.spellSpeed) {
        // Can't chain lower speed — pass instead
        const { passResponsePriority } = await import("../responseWindow");
        await passResponsePriority(ctx, gameState.lobbyId, gameState, aiPlayerId);
        return;
      }
    }

    // Build the effect from card ability
    const ability = getCardAbility(card);
    if (!ability) {
      const { passResponsePriority } = await import("../responseWindow");
      await passResponsePriority(ctx, gameState.lobbyId, gameState, aiPlayerId);
      return;
    }

    // If from zone (trap), update zone state
    if (decision.fromZone) {
      const trapIndex = aiSpellTrapZone.findIndex((s) => s.cardId === decision.cardId);
      if (trapIndex !== -1) {
        const updatedZone = [...aiSpellTrapZone];
        // biome-ignore lint/suspicious/noExplicitAny: trapType not in strict type
        const trapType = (card as any).trapType;
        if (trapType === "continuous") {
          const existing = updatedZone[trapIndex];
          if (existing) {
            updatedZone[trapIndex] = { ...existing, isFaceDown: false, isActivated: true };
          }
        } else {
          updatedZone.splice(trapIndex, 1);
          await ctx.db.patch(gameState._id, {
            opponentGraveyard: [...gameState.opponentGraveyard, decision.cardId],
          });
        }
        await ctx.db.patch(gameState._id, {
          opponentSpellTrapZone: updatedZone,
        });
      }
    } else {
      // From hand (quick-play spell) — remove from hand, send to graveyard
      await ctx.db.patch(gameState._id, {
        opponentHand: gameState.opponentHand.filter((id) => id !== decision.cardId),
        opponentGraveyard: [...gameState.opponentGraveyard, decision.cardId],
      });
    }

    // Mark response in window, then add to chain
    const { respondInWindow } = await import("../responseWindow");
    await respondInWindow(ctx, gameState, aiPlayerId);

    const { addToChainHelper } = await import("../chainResolver");
    await addToChainHelper(ctx, {
      lobbyId: gameState.lobbyId,
      cardId: decision.cardId,
      playerId: aiPlayerId,
      playerUsername: "AI",
      spellSpeed,
      // biome-ignore lint/suspicious/noExplicitAny: ParsedAbility runtime-compatible with ChainEffect (JsonAbility)
      effect: ability as any,
    });
  },
});

/**
 * AI Optional Trigger Response
 *
 * Scheduled when the AI has a pending optional trigger.
 * Accepts or rejects based on difficulty level.
 */
export const executeAIOptionalTriggerResponse = internalMutation({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .unique();

    if (!gameState) return;

    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby || lobby.status !== "active") return;
    if (lobby.mode !== "story") return;

    const aiPlayerId = gameState.opponentId;
    const pending = gameState.pendingOptionalTriggers || [];

    // Find AI's pending triggers
    const aiTriggers = pending.filter((t) => t.playerId === aiPlayerId);
    if (aiTriggers.length === 0) return;

    const difficulty = (gameState.aiDifficulty as "easy" | "medium" | "hard" | "boss") || "medium";

    // Difficulty-weighted accept chance
    const acceptChance = { easy: 0.3, medium: 0.5, hard: 0.75, boss: 1.0 };

    for (const trigger of aiTriggers) {
      const shouldAccept = Math.random() < acceptChance[difficulty];

      // Re-fetch state each iteration (previous trigger may have changed it)
      const freshState = await ctx.db.get(gameState._id);
      if (!freshState) return;

      const freshPending = freshState.pendingOptionalTriggers || [];
      const triggerIndex = freshPending.findIndex(
        (pt) => pt.cardId === trigger.cardId && pt.effectIndex === trigger.effectIndex
      );
      if (triggerIndex === -1) continue;

      const updatedPending = [...freshPending];
      updatedPending.splice(triggerIndex, 1);

      if (shouldAccept) {
        const card = await ctx.db.get(trigger.cardId);
        if (!card) {
          await ctx.db.patch(freshState._id, { pendingOptionalTriggers: updatedPending });
          continue;
        }

        const ability = getCardAbility(card);
        const effect = ability?.effects[trigger.effectIndex];
        if (!effect) {
          await ctx.db.patch(freshState._id, { pendingOptionalTriggers: updatedPending });
          continue;
        }

        await ctx.db.patch(freshState._id, { pendingOptionalTriggers: updatedPending });

        // Record game event so frontend can show toast
        await recordEventHelper(ctx, {
          lobbyId: gameState.lobbyId,
          gameId: args.gameId,
          turnNumber: freshState.turnNumber ?? 1,
          eventType: "effect_activated",
          playerId: aiPlayerId,
          playerUsername: "AI",
          description: `AI activated optional trigger: ${card.name}`,
          metadata: { trigger: "optional_ai", cardName: card.name },
        });

        // Execute the effect via the effect system
        const { executeEffect } = await import("../effectSystem/index");
        const latestState = await ctx.db.get(gameState._id);
        if (latestState) {
          await executeEffect(
            ctx,
            latestState,
            gameState.lobbyId,
            effect,
            aiPlayerId,
            trigger.cardId,
            []
          );
        }
      } else {
        // Skip the trigger
        const skippedTriggers = freshState.skippedOptionalTriggers || [];
        await ctx.db.patch(freshState._id, {
          pendingOptionalTriggers: updatedPending,
          skippedOptionalTriggers: [
            ...skippedTriggers,
            {
              cardId: trigger.cardId,
              trigger: trigger.trigger,
              turnSkipped: freshState.turnNumber,
            },
          ],
        });
      }
    }
  },
});
