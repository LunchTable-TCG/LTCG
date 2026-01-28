/**
 * Effect System Executor
 *
 * Main dispatcher that routes parsed effects to their specific executor implementations.
 * Handles OPT (Once Per Turn) restrictions and targeting protection checks.
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { hasUsedOPT, markOPTUsed } from "../../lib/gameHelpers";
import { parseAbility } from "./parser";
import type { EffectResult, ParsedAbility, ParsedEffect } from "./types";

// Import all effect executors (organized by category)
import { executeBanish } from "./executors/cardMovement/banish";
import { executeDiscard } from "./executors/cardMovement/discard";
import { executeDraw } from "./executors/cardMovement/draw";
import { executeMill } from "./executors/cardMovement/mill";
import { executeReturnToDeck } from "./executors/cardMovement/returnToDeck";
import { executeSearch } from "./executors/cardMovement/search";
import { executeSendToGraveyard } from "./executors/cardMovement/toGraveyard";
import { executeToHand } from "./executors/cardMovement/toHand";
import { executeDamage } from "./executors/combat/damage";
import { executeGainLP } from "./executors/combat/gainLP";
import { executeModifyATK } from "./executors/combat/modifyATK";
import { executeModifyDEF } from "./executors/combat/modifyDEF";
import { executeDestroy } from "./executors/summon/destroy";
import { executeSpecialSummon } from "./executors/summon/summon";
import { executeNegate } from "./executors/utility/negate";

/**
 * Execute a parsed effect
 *
 * Returns EffectResult which may include selection data for two-step effects.
 */
export async function executeEffect(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  effect: ParsedEffect,
  playerId: Id<"users">,
  cardId: Id<"cardDefinitions">,
  targets?: Id<"cardDefinitions">[]
): Promise<EffectResult> {
  // Edge case: Validate effect object is not null/undefined
  if (!effect || typeof effect !== "object") {
    return { success: false, message: "Invalid effect object" };
  }

  // Edge case: Validate required effect properties
  if (!effect.type) {
    return { success: false, message: "Effect missing type property" };
  }

  // Edge case: Validate gameState has required properties
  if (!gameState.hostId || !gameState.opponentId) {
    return { success: false, message: "Invalid game state" };
  }

  // Check OPT restriction
  if (effect.isOPT && hasUsedOPT(gameState, cardId)) {
    return { success: false, message: "This card's effect can only be used once per turn" };
  }

  const isHost = playerId === gameState.hostId;
  const opponentId = isHost ? gameState.opponentId : gameState.hostId;

  // Check targeting protection for effects that target cards
  if (targets && targets.length > 0) {
    // Edge case: Validate boards are arrays
    const hostBoard = gameState.hostBoard;
    const opponentBoard = gameState.opponentBoard;

    if (!Array.isArray(hostBoard) || !Array.isArray(opponentBoard)) {
      return {
        success: false,
        message: "Invalid board state",
      };
    }

    // Edge case: Filter out null/undefined target IDs
    const validTargets = targets.filter((t) => t != null);
    if (validTargets.length === 0) {
      return {
        success: false,
        message: "No valid targets provided",
      };
    }

    for (const targetId of validTargets) {
      const targetCard = [...hostBoard, ...opponentBoard].find((bc) => bc.cardId === targetId);
      if (targetCard?.cannotBeTargeted) {
        const card = await ctx.db.get(targetId);
        return {
          success: false,
          message: `${card?.name || "Card"} cannot be targeted`,
        };
      }
    }
  }

  // Execute the effect and capture result
  let result: EffectResult;

  switch (effect.type) {
    case "draw":
      // Edge case: Validate draw value is positive
      const drawValue = effect.value || 1;
      if (drawValue <= 0 || Number.isNaN(drawValue)) {
        result = { success: false, message: "Invalid draw count" };
      } else {
        result = await executeDraw(ctx, gameState, playerId, drawValue);
      }
      break;

    case "destroy":
      if (!targets || targets.length === 0) {
        result = { success: false, message: "No targets selected" };
      } else if (effect.targetCount && effect.targetCount > 1) {
        // Multi-target destroy (e.g., "Destroy 2 target monsters")
        const destroyResults: string[] = [];
        let allSucceeded = true;

        // Edge case: Validate targetCount is positive
        const safeTargetCount = Math.max(1, Math.min(effect.targetCount, targets.length));

        for (let i = 0; i < safeTargetCount; i++) {
          // Edge case: Check array bounds
          if (i >= targets.length) break;

          const target = targets[i];
          if (!target) continue;

          const destroyResult = await executeDestroy(ctx, gameState, lobbyId, target, playerId);
          destroyResults.push(destroyResult.message);
          if (!destroyResult.success) {
            allSucceeded = false;
          }

          // Handle on_destroy trigger for each destroyed card
          if (
            destroyResult.success &&
            destroyResult.hadDestroyTrigger &&
            destroyResult.destroyedCardId
          ) {
            const destroyedCard = await ctx.db.get(destroyResult.destroyedCardId);
            if (destroyedCard?.ability) {
              const parsedEffect = parseAbility(destroyedCard.ability);
              if (parsedEffect && parsedEffect.trigger === "on_destroy") {
                // Refresh game state
                const refreshedState = await ctx.db
                  .query("gameStates")
                  .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
                  .first();

                if (refreshedState && destroyResult.destroyedCardOwnerId) {
                  const triggerResult = await executeEffect(
                    ctx,
                    refreshedState,
                    lobbyId,
                    parsedEffect,
                    destroyResult.destroyedCardOwnerId,
                    destroyResult.destroyedCardId,
                    []
                  );

                  if (triggerResult.success) {
                    destroyResults.push(`${destroyedCard.name} effect: ${triggerResult.message}`);
                  }
                }
              }
            }
          }
        }

        result = {
          success: allSucceeded,
          message: destroyResults.join("; "),
        };
      } else {
        // Single target destroy
        // Edge case: Validate array has at least one element
        if (targets.length === 0) {
          result = { success: false, message: "No targets provided" };
          break;
        }

        const target = targets[0];
        if (!target) {
          result = { success: false, message: "No target selected" };
        } else {
          const destroyResult = await executeDestroy(ctx, gameState, lobbyId, target, playerId);
          result = destroyResult;

          // Handle on_destroy trigger if card had one
          if (
            destroyResult.success &&
            destroyResult.hadDestroyTrigger &&
            destroyResult.destroyedCardId
          ) {
            const destroyedCard = await ctx.db.get(destroyResult.destroyedCardId);
            if (destroyedCard?.ability) {
              const parsedEffect = parseAbility(destroyedCard.ability);
              if (parsedEffect && parsedEffect.trigger === "on_destroy") {
                // Refresh game state before executing trigger
                const refreshedState = await ctx.db
                  .query("gameStates")
                  .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
                  .first();

                if (refreshedState && destroyResult.destroyedCardOwnerId) {
                  // Execute the on_destroy trigger
                  const triggerResult = await executeEffect(
                    ctx,
                    refreshedState,
                    lobbyId,
                    parsedEffect,
                    destroyResult.destroyedCardOwnerId,
                    destroyResult.destroyedCardId,
                    []
                  );

                  // Append trigger result to message
                  if (triggerResult.success) {
                    result.message += ` → ${destroyedCard.name} effect: ${triggerResult.message}`;
                  }
                }
              }
            }
          }
        }
      }
      break;

    case "damage":
      // Edge case: Validate damage value is non-negative
      const damageValue = effect.value || 0;
      if (damageValue < 0 || Number.isNaN(damageValue)) {
        result = { success: false, message: "Invalid damage value" };
      } else {
        result = await executeDamage(ctx, gameState, lobbyId, opponentId, damageValue);
      }
      break;

    case "gainLP":
      // Edge case: Validate LP gain value is non-negative
      const lpValue = effect.value || 0;
      if (lpValue < 0 || Number.isNaN(lpValue)) {
        result = { success: false, message: "Invalid LP gain value" };
      } else {
        result = await executeGainLP(ctx, gameState, lobbyId, playerId, lpValue);
      }
      break;

    case "modifyATK":
      if (!targets || targets.length === 0) {
        result = { success: false, message: "No targets selected" };
      } else {
        // Edge case: Check array bounds
        if (targets.length === 0) {
          result = { success: false, message: "No targets provided" };
          break;
        }

        const target = targets[0];
        if (!target) {
          result = { success: false, message: "No target selected" };
        } else {
          // Edge case: Validate ATK modifier value is not NaN
          const atkModifier = effect.value || 0;
          if (Number.isNaN(atkModifier)) {
            result = { success: false, message: "Invalid ATK modifier value" };
          } else {
            result = await executeModifyATK(ctx, gameState, target, atkModifier, isHost);
          }
        }
      }
      break;

    case "modifyDEF":
      if (!targets || targets.length === 0) {
        result = { success: false, message: "No targets selected" };
      } else {
        // Edge case: Check array bounds
        if (targets.length === 0) {
          result = { success: false, message: "No targets provided" };
          break;
        }

        const target = targets[0];
        if (!target) {
          result = { success: false, message: "No target selected" };
        } else {
          // Edge case: Validate DEF modifier value is not NaN
          const defModifier = effect.value || 0;
          if (Number.isNaN(defModifier)) {
            result = { success: false, message: "Invalid DEF modifier value" };
          } else {
            result = await executeModifyDEF(ctx, gameState, target, defModifier, isHost);
          }
        }
      }
      break;

    case "summon":
      if (!targets || targets.length === 0) {
        result = { success: false, message: "No targets selected" };
      } else {
        const target = targets[0];
        if (!target) {
          result = { success: false, message: "No target selected" };
        } else {
          result = await executeSpecialSummon(
            ctx,
            gameState,
            target,
            playerId,
            effect.targetLocation || "hand"
          );
        }
      }
      break;

    case "toHand":
      if (!targets || targets.length === 0) {
        result = { success: false, message: "No targets selected" };
      } else {
        const target = targets[0];
        if (!target) {
          result = { success: false, message: "No target selected" };
        } else {
          result = await executeToHand(
            ctx,
            gameState,
            lobbyId,
            target,
            playerId,
            effect.targetLocation || "graveyard"
          );
        }
      }
      break;

    case "search":
      // Search deck for cards matching criteria
      // Note: In a real implementation, this would require a two-step process:
      // 1. Call executeSearch without selectedCardId to get matching cards
      // 2. Present choices to player
      // 3. Call executeSearch again with selectedCardId to add to hand
      // For now, we'll return the matching cards for UI selection
      result = await executeSearch(ctx, gameState, playerId, effect, targets?.[0]);
      break;

    case "negate":
      if (!targets || targets.length === 0) {
        result = { success: false, message: "No targets selected for negation" };
      } else {
        const target = targets[0];
        if (!target) {
          result = { success: false, message: "No target selected" };
        } else {
          result = await executeNegate(ctx, gameState, target, effect);
        }
      }
      break;

    case "toGraveyard":
      if (!targets || targets.length === 0) {
        result = { success: false, message: "No targets selected" };
      } else {
        const target = targets[0];
        if (!target) {
          result = { success: false, message: "No target selected" };
        } else {
          // Filter targetLocation to valid source locations for sending to GY
          const validLocation =
            effect.targetLocation === "board" ||
            effect.targetLocation === "hand" ||
            effect.targetLocation === "deck"
              ? effect.targetLocation
              : "board";

          result = await executeSendToGraveyard(
            ctx,
            gameState,
            lobbyId,
            target,
            playerId,
            validLocation
          );
        }
      }
      break;

    case "banish":
      if (!targets || targets.length === 0) {
        result = { success: false, message: "No targets selected" };
      } else {
        const target = targets[0];
        if (!target) {
          result = { success: false, message: "No target selected" };
        } else {
          result = await executeBanish(
            ctx,
            gameState,
            target,
            playerId,
            effect.targetLocation || "board"
          );
        }
      }
      break;

    case "directAttack":
      // directAttack is a passive ability checked in combatSystem.ts during attack declaration
      // This executor is a no-op for consistency - the effect is not "executed", it's evaluated
      result = { success: true, message: "Direct attack ability active" };
      break;

    case "mill":
      // Edge case: Validate mill value is positive
      const millValue = effect.value || 1;
      if (millValue <= 0 || Number.isNaN(millValue)) {
        result = { success: false, message: "Invalid mill count" };
      } else {
        result = await executeMill(ctx, gameState, opponentId, millValue);
      }
      break;

    case "discard":
      // Edge case: Validate discard value is positive
      const discardValue = effect.value || 1;
      if (discardValue <= 0 || Number.isNaN(discardValue)) {
        result = { success: false, message: "Invalid discard count" };
      } else {
        // Discard effects can target specific cards or be random
        result = await executeDiscard(ctx, gameState, playerId, discardValue, targets);
      }
      break;

    case "multipleAttack":
      // multipleAttack is a passive ability checked in combatSystem.ts
      // This executor is a no-op - the ability is evaluated during attack validation
      result = { success: true, message: "Can attack multiple times per turn" };
      break;

    default:
      result = { success: false, message: `Unknown effect type: ${effect.type}` };
  }

  // Mark card as having used OPT effect if successful
  if (result.success && effect.isOPT) {
    await markOPTUsed(ctx, gameState, cardId);
  }

  return result;
}

/**
 * Execute all effects from a multi-part ability
 *
 * For cards with multiple effects (protection + continuous + triggered):
 * - Protection effects are passive (just flags)
 * - Continuous effects are calculated dynamically
 * - Triggered effects execute based on trigger condition
 *
 * Returns combined results from all executed effects
 */
export async function executeMultiPartAbility(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  parsedAbility: ParsedAbility,
  playerId: Id<"users">,
  cardId: Id<"cardDefinitions">,
  targets?: Id<"cardDefinitions">[]
): Promise<{ success: boolean; messages: string[]; effectsExecuted: number }> {
  // Edge case: Validate parsedAbility has effects array
  if (!parsedAbility || !Array.isArray(parsedAbility.effects)) {
    return {
      success: false,
      messages: ["Invalid ability structure"],
      effectsExecuted: 0,
    };
  }

  // Edge case: Handle empty effects array
  if (parsedAbility.effects.length === 0) {
    return {
      success: false,
      messages: ["No effects to execute"],
      effectsExecuted: 0,
    };
  }

  const messages: string[] = [];
  let effectsExecuted = 0;
  let anySuccess = false;

  for (const effect of parsedAbility.effects) {
    // Edge case: Skip null/undefined effects
    if (!effect) {
      messages.push("Skipped invalid effect");
      continue;
    }
    // Skip protection-only effects (these are passive flags, not executed)
    if (effect.type === "modifyATK" && effect.value === 0 && effect.protection) {
      continue;
    }

    // Skip continuous effects (these are calculated dynamically, not executed)
    if (effect.continuous && effect.type === "modifyATK") {
      continue;
    }

    // Execute triggered or manual effects
    const result = await executeEffect(ctx, gameState, lobbyId, effect, playerId, cardId, targets);
    if (result.success) {
      anySuccess = true;
      effectsExecuted++;
    }
    messages.push(result.message);
  }

  return {
    success: anySuccess,
    messages,
    effectsExecuted,
  };
}
