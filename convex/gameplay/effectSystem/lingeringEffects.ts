/**
 * Lingering Effects Manager
 *
 * Handles effects that persist for a duration (e.g., stat boosts, restrictions)
 * Manages adding, querying, and cleaning up lingering effects based on turn/phase
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { logger } from "../../lib/debug";
import type { LingeringEffect } from "./types";

/**
 * Add a lingering effect to game state
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param effect - The lingering effect to add
 */
export async function addLingeringEffect(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  effect: LingeringEffect
): Promise<void> {
  const currentEffects = gameState.lingeringEffects || [];

  logger.debug("Adding lingering effect", {
    effectType: effect.effectType,
    durationType: effect.duration.type,
    appliedTurn: effect.appliedTurn,
    sourceCard: effect.sourceCardName,
  });

  await ctx.db.patch(gameState._id, {
    lingeringEffects: [...currentEffects, effect],
  });
}

/**
 * Check and remove expired lingering effects
 *
 * Called at phase/turn transitions to clean up effects that have expired
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param currentPhase - Current game phase
 * @param currentTurn - Current turn number
 */
export async function cleanupLingeringEffects(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  currentPhase: string,
  currentTurn: number
): Promise<void> {
  const effects = gameState.lingeringEffects || [];
  if (effects.length === 0) return;

  const activeEffects = effects.filter((effect) => {
    // Check if effect should expire
    const shouldExpire = isEffectExpired(effect, currentPhase, currentTurn);

    if (shouldExpire) {
      logger.debug("Removing expired lingering effect", {
        effectType: effect.effectType,
        durationType: effect.duration.type,
        appliedTurn: effect.appliedTurn,
        currentTurn,
        currentPhase,
      });
    }

    return !shouldExpire;
  });

  // Only update if effects changed
  if (activeEffects.length !== effects.length) {
    await ctx.db.patch(gameState._id, {
      lingeringEffects: activeEffects,
    });

    logger.debug("Cleaned up lingering effects", {
      removed: effects.length - activeEffects.length,
      remaining: activeEffects.length,
    });
  }
}

/**
 * Check if a lingering effect has expired
 *
 * @param effect - The lingering effect to check
 * @param currentPhase - Current game phase
 * @param currentTurn - Current turn number
 * @returns true if the effect should be removed
 */
function isEffectExpired(
  effect: LingeringEffect,
  currentPhase: string,
  currentTurn: number
): boolean {
  const { duration } = effect;

  switch (duration.type) {
    case "until_end_phase": {
      // Effect expires when we exit the specified phase
      // If no specific phase is set, expire at end phase
      const targetPhase = duration.endPhase || "end";
      return currentPhase === targetPhase;
    }

    case "until_turn_end":
      // Effect expires at the end of the turn it was applied
      return currentTurn > effect.appliedTurn;

    case "until_next_turn":
      // Effect lasts through the next full turn
      return currentTurn > effect.appliedTurn + 1;

    case "permanent":
      // Never expires naturally
      return false;

    case "custom":
      // Custom expiration based on specific turn/phase
      if (duration.endTurn !== undefined && currentTurn >= duration.endTurn) {
        if (duration.endPhase) {
          // Expire at specific phase of specific turn
          return (
            currentTurn > duration.endTurn ||
            (currentTurn === duration.endTurn && currentPhase === duration.endPhase)
          );
        }
        // Expire at start of specific turn
        return currentTurn >= duration.endTurn;
      }
      return false;

    default:
      logger.warn("Unknown duration type", { durationType: duration.type });
      return false;
  }
}

/**
 * Get active lingering effects of a specific type
 *
 * @param gameState - Current game state
 * @param effectType - Type of effect to filter for
 * @param forPlayer - Optional player ID to filter effects affecting that player
 * @returns Array of matching active lingering effects
 */
export function getActiveLingeringEffects(
  gameState: Doc<"gameStates">,
  effectType: string,
  forPlayer?: Id<"users">
): LingeringEffect[] {
  const effects = gameState.lingeringEffects || [];

  return effects.filter((effect) => {
    // Match effect type
    if (effect.effectType !== effectType) return false;

    // If player filter specified, check if effect affects that player
    if (forPlayer !== undefined && effect.affectsPlayer) {
      const isHost = forPlayer === gameState.hostId;
      const playerRole = isHost ? "host" : "opponent";

      // Effect must affect this player or both players
      if (effect.affectsPlayer !== playerRole && effect.affectsPlayer !== "both") {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check if an action is prevented by lingering effects
 *
 * Used to check restrictions like "cannot activate spells", "cannot attack", etc.
 *
 * @param gameState - Current game state
 * @param actionType - Type of action being attempted (e.g., "activate_spell", "summon_monster", "declare_attack")
 * @param playerId - Player attempting the action
 * @returns Object with prevented flag and optional reason message
 */
export function isActionPrevented(
  gameState: Doc<"gameStates">,
  actionType: string,
  playerId: Id<"users">
): { prevented: boolean; reason?: string } {
  const preventionEffects = getActiveLingeringEffects(gameState, "preventActivation", playerId);

  for (const effect of preventionEffects) {
    // Check if this prevention effect applies to the action type
    if (effect.value && typeof effect.value === "object") {
      const preventionConfig = effect.value as {
        cardType?: string;
        actionType?: string;
      };

      // Check if action type matches
      if (preventionConfig.actionType === actionType) {
        return {
          prevented: true,
          reason: effect.sourceCardName
            ? `${effect.sourceCardName} prevents this action`
            : "This action is currently prevented by an effect",
        };
      }

      // Check card type restrictions (e.g., cannot activate spells)
      if (actionType.startsWith("activate_") && preventionConfig.cardType) {
        const cardType = actionType.replace("activate_", "");
        if (preventionConfig.cardType === cardType || preventionConfig.cardType === "any") {
          return {
            prevented: true,
            reason: effect.sourceCardName
              ? `${effect.sourceCardName} prevents activating ${cardType} cards`
              : `Cannot activate ${cardType} cards`,
          };
        }
      }
    }
  }

  return { prevented: false };
}

/**
 * Get all lingering stat modifications for a specific card
 *
 * @param gameState - Current game state
 * @param cardId - Card to get stat modifications for
 * @returns Object with total ATK and DEF bonuses
 */
export function getLingeringStatModifications(
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">
): { atkBonus: number; defBonus: number } {
  const effects = gameState.lingeringEffects || [];
  let atkBonus = 0;
  let defBonus = 0;

  for (const effect of effects) {
    // Check for ATK modification effects
    if (effect.effectType === "modifyATK") {
      // Check if this effect applies to the specific card or all matching cards
      if (shouldEffectApplyToCard(effect, cardId)) {
        atkBonus += typeof effect.value === "number" ? effect.value : 0;
      }
    }

    // Check for DEF modification effects
    if (effect.effectType === "modifyDEF") {
      if (shouldEffectApplyToCard(effect, cardId)) {
        defBonus += typeof effect.value === "number" ? effect.value : 0;
      }
    }
  }

  return { atkBonus, defBonus };
}

/**
 * Check if a lingering effect should apply to a specific card
 *
 * @param effect - The lingering effect
 * @param cardId - Card to check
 * @returns true if effect applies to this card
 */
function shouldEffectApplyToCard(effect: LingeringEffect, cardId: Id<"cardDefinitions">): boolean {
  // If effect specifies a source card and has conditions, check if card matches
  if (effect.conditions && typeof effect.conditions === "object") {
    const conditions = effect.conditions as {
      targetAll?: boolean;
      targetSelf?: boolean;
      targetArchetype?: string;
      targetCardId?: Id<"cardDefinitions">;
    };

    // Specific card target
    if (conditions.targetCardId) {
      return conditions.targetCardId === cardId;
    }

    // All matching cards
    if (conditions.targetAll) {
      // Additional filtering could go here (archetype, type, etc.)
      return true;
    }

    // Self-target only
    if (conditions.targetSelf && effect.sourceCardId) {
      return effect.sourceCardId === cardId;
    }
  }

  // Default: effect applies to all cards
  return true;
}
