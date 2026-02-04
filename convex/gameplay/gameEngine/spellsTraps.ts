/**
 * Game Engine - Spells & Traps Module
 *
 * Handles Spell/Trap card mechanics:
 * - Set Spell/Trap
 * - Activate Spell
 * - Activate Trap
 */

import { v } from "convex/values";
import { mutation } from "../../functions";
import { getCardAbility, getRawJsonAbility } from "../../lib/abilityHelpers";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { validateGameActive } from "../../lib/gameValidation";
import { getSpellSpeed } from "../../lib/spellSpeedHelper";
import { type ChainEffect, addToChainHelper } from "../chainResolver";
import { executeCost, validateCost } from "../effectSystem/costValidator";
import { executeSearch } from "../effectSystem/executors/cardMovement/search";
import { isActionPrevented } from "../effectSystem/lingeringEffects";
import type { ParsedEffect } from "../effectSystem/types";
import { recordEventHelper } from "../gameEvents";
import { scanFieldForTriggers } from "../triggerSystem";

/**
 * Get the effect to use for chain resolution.
 * Returns the JSON ability from the card.
 */
function getChainEffect(card: { ability?: unknown }): ChainEffect {
  const jsonAbility = getRawJsonAbility(card as any);
  return jsonAbility ?? { effects: [] };
}

/**
 * Set a Spell or Trap card face-down in the Spell/Trap Zone
 *
 * Places a Spell or Trap card from hand face-down in the Spell/Trap Zone.
 *
 * Game rules:
 * - Spell/Trap Zone can hold maximum 5 cards
 * - Can only set during your Main Phase
 * - Trap cards must remain set for 1 full turn before activation
 * - Spell cards can be activated same turn when set
 * - Opponent cannot see which card was set
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Spell or Trap card to set from hand
 * @returns Success status with card type (spell or trap)
 */
export const setSpellTrap = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 4. Get game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    // 4. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    const isHost = user.userId === gameState.hostId;
    const hand = isHost ? gameState.hostHand : gameState.opponentHand;
    const spellTrapZone = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;

    // 5. Validate card is in hand
    if (!hand.includes(args.cardId)) {
      throw createError(ErrorCode.GAME_CARD_NOT_IN_HAND);
    }

    // 6. Get card details
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw createError(ErrorCode.GAME_CARD_NOT_FOUND);
    }

    if (card.cardType !== "spell" && card.cardType !== "trap") {
      throw createError(ErrorCode.GAME_INVALID_CARD_TYPE, {
        reason: "Card must be a spell or trap card",
      });
    }

    // 7. Validate Spell/Trap Zone space (max 5)
    if (spellTrapZone.length >= 5) {
      throw createError(ErrorCode.GAME_ZONE_FULL, {
        reason: "Spell/Trap Zone is full (max 5 cards)",
      });
    }

    // 8. Remove card from hand and add to spell/trap zone
    const newHand = hand.filter((c) => c !== args.cardId);
    const newSpellTrapZone = [
      ...spellTrapZone,
      {
        cardId: args.cardId,
        isFaceDown: true,
        isActivated: false,
        turnSet: gameState.turnNumber || 1, // Track when card was set for trap activation rules
      },
    ];

    await ctx.db.patch(gameState._id, {
      [isHost ? "hostHand" : "opponentHand"]: newHand,
      [isHost ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
    });

    // 9. Record event
    const eventType = card.cardType === "spell" ? "spell_set" : "trap_set";
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: gameState.turnNumber ?? 0,
      eventType,
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username} Set a ${card.cardType} card`,
      metadata: {
        cardId: args.cardId,
        // Don't reveal card name for face-down cards
      },
    });

    // 10. Return success
    return {
      success: true,
      cardType: card.cardType,
    };
  },
});

/**
 * Activate a Spell card from hand or field
 *
 * Activates a Spell card from your hand or from the Spell/Trap Zone.
 * Spell card is added to the chain and opponent can respond before resolution.
 *
 * Game rules:
 * - Normal Spells can only be activated during your Main Phase
 * - Quick-Play Spells can be activated during either player's turn
 * - Spell Speed determines what can be chained in response
 * - After activation, card is sent to graveyard (unless Continuous/Field/Equip)
 * - Targets must be declared at activation
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Spell card to activate
 * @param targets - Optional array of card IDs targeted by the spell effect
 * @returns Success status with spell name, chain link number, and priority status
 */
export const activateSpell = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    targets: v.optional(v.array(v.id("cardDefinitions"))),
    costTargets: v.optional(v.array(v.id("cardDefinitions"))),
    effectIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 4. Validate it's the current player's turn (or valid activation timing)
    // Note: Quick-Play spells can be activated on opponent's turn
    // For MVP, we'll only allow activation on your own turn

    // 4. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    const isHost = user.userId === gameState.hostId;
    const hand = isHost ? gameState.hostHand : gameState.opponentHand;
    const spellTrapZone = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;

    // 5. Validate card is in hand or set on field
    const inHand = hand.includes(args.cardId);
    const inSpellTrapZone = spellTrapZone.some((st) => st.cardId === args.cardId);

    if (!inHand && !inSpellTrapZone) {
      throw createError(ErrorCode.GAME_CARD_NOT_IN_ZONE, {
        reason: "Card is not in your hand or spell/trap zone",
      });
    }

    // 6. Get card details
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw createError(ErrorCode.GAME_CARD_NOT_FOUND);
    }

    if (card.cardType !== "spell") {
      throw createError(ErrorCode.GAME_INVALID_CARD_TYPE, {
        reason: "Card is not a spell card",
      });
    }

    // 6.5. Check if spell activation is prevented by lingering effects
    const preventionCheck = isActionPrevented(gameState, "activate_spell", user.userId);
    if (preventionCheck.prevented) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: preventionCheck.reason || "Cannot activate spell cards",
      });
    }

    // 7. Validate phase - depends on spell type
    const currentPhase = gameState.currentPhase;
    const spellType = card.spellType || "normal"; // Default to normal if not specified
    const isQuickPlay =
      spellType === "quick_play" ||
      (card.ability &&
        (card.ability.trigger === "quick" ||
          card.ability.trigger === "on_opponent_summon" ||
          card.ability.trigger === "on_opponent_attacks" ||
          card.ability.trigger === "on_opponent_activates"));
    const isFieldSpell = spellType === "field";
    const isEquipSpell = spellType === "equip";

    // Equip Spells require a target monster
    if (isEquipSpell) {
      if (!args.targets || args.targets.length === 0) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Equip Spells require a target monster",
        });
      }

      // Validate target is a monster on the field and face-up
      const targetCardId = args.targets[0];
      const hostBoard = gameState.hostBoard;
      const opponentBoard = gameState.opponentBoard;
      const allMonsters = [...hostBoard, ...opponentBoard];
      const targetMonster = allMonsters.find((m) => m.cardId === targetCardId);

      if (!targetMonster) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Target must be a monster on the field",
        });
      }

      if (targetMonster.isFaceDown) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Cannot equip to face-down monsters",
        });
      }

      // Equip Spells can only be activated during Main Phase on your turn
      if (gameState.currentTurnPlayerId !== user.userId) {
        throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
      }
      if (currentPhase !== "main1" && currentPhase !== "main2") {
        throw createError(ErrorCode.GAME_INVALID_PHASE, {
          reason: "Equip Spells can only be activated during Main Phase",
        });
      }
    }

    // Field Spells can only be activated during Main Phase on your turn
    if (isFieldSpell) {
      if (gameState.currentTurnPlayerId !== user.userId) {
        throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
      }
      if (currentPhase !== "main1" && currentPhase !== "main2") {
        throw createError(ErrorCode.GAME_INVALID_PHASE, {
          reason: "Field Spells can only be activated during Main Phase",
        });
      }
    }

    // Normal Spells can only be activated during Main Phase
    if (
      !isQuickPlay &&
      !isFieldSpell &&
      !isEquipSpell &&
      currentPhase !== "main1" &&
      currentPhase !== "main2"
    ) {
      throw createError(ErrorCode.GAME_INVALID_PHASE, {
        reason: "Normal Spells can only be activated during Main Phase",
      });
    }

    // Quick-Play Spells from hand can be activated during your turn, any phase
    // Quick-Play Spells set on field can be activated during either player's turn
    if (inHand && isQuickPlay) {
      // From hand - can activate during your turn
      if (gameState.currentTurnPlayerId !== user.userId) {
        throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
      }
    }

    // 7.5. Check and execute cost payment
    if (card.ability) {
      let parsedAbility: { effects: ParsedEffect[] };
      try {
        if (typeof card.ability === "string") {
          parsedAbility = JSON.parse(card.ability);
        } else {
          parsedAbility = card.ability as { effects: ParsedEffect[] };
        }

        const effectIndex = args.effectIndex ?? 0;
        const effect = parsedAbility.effects[effectIndex];

        if (effect?.cost) {
          // Validate cost can be paid
          const validation = await validateCost(
            ctx,
            gameState,
            user.userId,
            effect,
            args.costTargets
          );

          if (!validation.canPay) {
            throw createError(ErrorCode.GAME_INVALID_MOVE, {
              reason: validation.reason || "Cannot pay activation cost",
            });
          }

          // If cost requires selection but no targets provided, return error
          if (
            validation.requiresSelection &&
            (!args.costTargets || args.costTargets.length === 0)
          ) {
            throw createError(ErrorCode.GAME_INVALID_MOVE, {
              reason: "Cost payment requires card selection",
              requiresSelection: true,
              availableTargets: validation.availableTargets,
              selectionPrompt: validation.selectionPrompt,
            });
          }

          // Execute cost payment
          const costResult = await executeCost(
            ctx,
            gameState,
            user.userId,
            effect,
            args.costTargets
          );

          if (!costResult.success) {
            throw createError(ErrorCode.GAME_INVALID_MOVE, {
              reason: costResult.message,
            });
          }
        }
      } catch (error) {
        // Re-throw if it's already an error code
        if (error && typeof error === "object" && "code" in error) {
          throw error;
        }
        // Otherwise just log and continue
      }
    }

    // 8. Handle field spell placement or remove card from hand/zone
    if (isFieldSpell) {
      // Field spell replacement rule: If player already has a field spell, send old one to graveyard
      const currentFieldSpell = isHost ? gameState.hostFieldSpell : gameState.opponentFieldSpell;
      const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;

      if (currentFieldSpell) {
        // Send old field spell to graveyard
        const newGraveyard = [...graveyard, currentFieldSpell.cardId];
        await ctx.db.patch(gameState._id, {
          [isHost ? "hostGraveyard" : "opponentGraveyard"]: newGraveyard,
        });

        // Record field spell replacement event
        const oldFieldCard = await ctx.db.get(currentFieldSpell.cardId);
        if (oldFieldCard) {
          await recordEventHelper(ctx, {
            lobbyId: args.lobbyId,
            gameId: lobby.gameId ?? "",
            turnNumber: gameState.turnNumber ?? 0,
            eventType: "card_destroyed",
            playerId: user.userId,
            playerUsername: user.username,
            description: `${oldFieldCard.name} was sent to the Graveyard (replaced by new Field Spell)`,
            metadata: {
              cardId: currentFieldSpell.cardId,
              cardName: oldFieldCard.name,
              reason: "field_spell_replacement",
            },
          });
        }
      }

      // Remove card from hand or spell/trap zone
      if (inHand) {
        const newHand = hand.filter((c) => c !== args.cardId);
        await ctx.db.patch(gameState._id, {
          [isHost ? "hostHand" : "opponentHand"]: newHand,
        });
      } else {
        const newSpellTrapZone = spellTrapZone.filter((st) => st.cardId !== args.cardId);
        await ctx.db.patch(gameState._id, {
          [isHost ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
        });
      }

      // Place new field spell in field spell zone
      await ctx.db.patch(gameState._id, {
        [isHost ? "hostFieldSpell" : "opponentFieldSpell"]: {
          cardId: args.cardId,
          isActive: true,
        },
      });
    } else {
      // Continuous/Normal/Quick-Play/Equip spells
      const isContinuous = spellType === "continuous";

      if (inHand) {
        const newHand = hand.filter((c) => c !== args.cardId);

        if (isContinuous) {
          // Place continuous spell on field (face-up in spell/trap zone)
          const newSpellTrapZone = [
            ...spellTrapZone,
            {
              cardId: args.cardId,
              isFaceDown: false,
              isActivated: true,
              turnSet: gameState.turnNumber || 1,
            },
          ];

          await ctx.db.patch(gameState._id, {
            [isHost ? "hostHand" : "opponentHand"]: newHand,
            [isHost ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
          });
        } else {
          // Normal/Quick-Play/Equip spells: just remove from hand
          // Equip spells will be placed on field after chain resolution
          await ctx.db.patch(gameState._id, {
            [isHost ? "hostHand" : "opponentHand"]: newHand,
          });
        }
      } else {
        // Card was already set in spell/trap zone
        if (isContinuous) {
          // Flip face-up and mark as activated
          const newSpellTrapZone = spellTrapZone.map((st) =>
            st.cardId === args.cardId ? { ...st, isFaceDown: false, isActivated: true } : st
          );

          await ctx.db.patch(gameState._id, {
            [isHost ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
          });
        } else {
          // Normal/Quick-Play/Equip spells: remove from spell/trap zone
          // Equip spells will be placed on field after chain resolution
          const newSpellTrapZone = spellTrapZone.filter((st) => st.cardId !== args.cardId);
          await ctx.db.patch(gameState._id, {
            [isHost ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
          });
        }
      }
    }

    // 9. Record spell_activated event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "spell_activated",
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username} activated ${card.name}`,
      metadata: {
        cardId: args.cardId,
        cardName: card.name,
        targets: args.targets,
      },
    });

    // 9b. Execute on_spell_activated triggers
    // Any card on field that has this trigger should activate
    const refreshedStateForSpellTrigger = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (refreshedStateForSpellTrigger) {
      await scanFieldForTriggers(
        ctx,
        args.lobbyId,
        refreshedStateForSpellTrigger,
        "on_spell_activated",
        refreshedStateForSpellTrigger.turnNumber || 1
      );
    }

    // 10. Handle chain system
    if (isFieldSpell) {
      // Field spells don't go on chain - they activate immediately as continuous effects
      // No chain resolution needed, the continuous effect system handles their effects
      return {
        success: true,
        spellName: card.name,
        chainStarted: false,
        chainLinkNumber: 0,
        currentChainLength: 0,
        priorityPassed: false,
        fieldSpellActivated: true,
      };
    }
    // Normal/Quick-Play spells: Add to chain system
    const spellSpeed = getSpellSpeed(card);
    const effect = getChainEffect(card);

    // Add to chain
    const chainResult = await addToChainHelper(ctx, {
      lobbyId: args.lobbyId,
      cardId: args.cardId,
      playerId: user.userId,
      playerUsername: user.username,
      spellSpeed,
      effect,
      targets: args.targets,
    });

    // 11. Return success with chain status
    return {
      success: true,
      spellName: card.name,
      chainStarted: true,
      chainLinkNumber: chainResult.chainLinkNumber,
      currentChainLength: chainResult.currentChainLength,
      priorityPassed: true, // Priority is now with opponent
    };
  },
});

/**
 * Complete a search effect with player's card selection
 *
 * Second step of search effect: Player has selected a card from available search results.
 * This mutation completes the search by adding the selected card to hand.
 *
 * Game rules:
 * - Must be preceded by a search effect activation
 * - Selected card must match search criteria from source card
 * - Selected card is added to hand
 * - Deck is shuffled after search completes
 *
 * @param lobbyId - Game lobby ID
 * @param sourceCardId - The card that initiated the search effect
 * @param selectedCardId - The card selected from search results to add to hand
 * @returns Success status with message describing the search result
 */
export const completeSearchEffect = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    sourceCardId: v.id("cardDefinitions"), // The card that initiated the search
    selectedCardId: v.id("cardDefinitions"), // The card selected from search results
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    // 3. Get source card to re-parse the search effect
    const sourceCard = await ctx.db.get(args.sourceCardId);
    if (!sourceCard || !sourceCard.ability) {
      throw createError(ErrorCode.GAME_CARD_NOT_FOUND, {
        reason: "Source card not found or has no ability",
      });
    }

    // 4. Parse ability to get search effect
    const parsedAbility = getCardAbility(sourceCard);
    const searchEffect = parsedAbility?.effects.find((e) => e.type === "search");
    if (!searchEffect) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Source card does not have a search effect",
      });
    }

    // 5. Execute search with selected card
    const result = await executeSearch(
      ctx,
      gameState,
      user.userId,
      searchEffect,
      args.selectedCardId
    );

    return {
      success: result.success,
      message: result.message,
    };
  },
});

/**
 * Activate a face-down Trap card from the field
 *
 * Activates a face-down Trap card from the Spell/Trap Zone.
 * Trap card is added to the chain and opponent can respond before resolution.
 *
 * Game rules:
 * - Traps must be set for at least 1 full turn before activation
 * - Can be activated during either player's turn in response to actions
 * - Trap Speed determines what can be chained in response
 * - After activation, card is sent to graveyard (unless Continuous)
 * - Targets must be declared at activation
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Face-down Trap card to activate
 * @param targets - Optional array of card IDs targeted by the trap effect
 * @returns Success status with trap name, chain link number, and priority status
 */
export const activateTrap = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    targets: v.optional(v.array(v.id("cardDefinitions"))),
    costTargets: v.optional(v.array(v.id("cardDefinitions"))),
    effectIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 4. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    const isHost = user.userId === gameState.hostId;
    const spellTrapZone = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;

    // 4. Validate trap is set on field
    const trapInZone = spellTrapZone.find((st) => st.cardId === args.cardId);
    if (!trapInZone) {
      throw createError(ErrorCode.GAME_CARD_NOT_IN_ZONE, {
        reason: "Trap card is not set on your field",
      });
    }

    if (!trapInZone.isFaceDown) {
      throw createError(ErrorCode.GAME_CARD_ALREADY_FACE_UP);
    }

    // 5. Get card details
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw createError(ErrorCode.GAME_CARD_NOT_FOUND);
    }

    if (card.cardType !== "trap") {
      throw createError(ErrorCode.GAME_INVALID_CARD_TYPE, {
        reason: "Card is not a trap card",
      });
    }

    // 5.5. Check if trap activation is prevented by lingering effects
    const preventionCheck = isActionPrevented(gameState, "activate_trap", user.userId);
    if (preventionCheck.prevented) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: preventionCheck.reason || "Cannot activate trap cards",
      });
    }

    // 6. Validate trap was set for at least 1 turn
    const currentTurn = gameState.turnNumber || 1;
    const turnWasSet = trapInZone.turnSet || currentTurn;

    // Traps must be set for at least 1 full turn before activation
    // Block if trap was set on or after current turn (defensive check)
    // Exception: Some trap cards can be activated same turn (e.g., quick-effect traps)
    if (turnWasSet >= currentTurn) {
      throw createError(ErrorCode.GAME_TRAP_SAME_TURN, {
        reason: "Trap cards must wait at least one full turn before activation",
        currentTurn,
        turnWasSet,
      });
    }

    // 6.5. Check and execute cost payment
    if (card.ability) {
      let parsedAbility: { effects: ParsedEffect[] };
      try {
        if (typeof card.ability === "string") {
          parsedAbility = JSON.parse(card.ability);
        } else {
          parsedAbility = card.ability as { effects: ParsedEffect[] };
        }

        const effectIndex = args.effectIndex ?? 0;
        const effect = parsedAbility.effects[effectIndex];

        if (effect?.cost) {
          // Validate cost can be paid
          const validation = await validateCost(
            ctx,
            gameState,
            user.userId,
            effect,
            args.costTargets
          );

          if (!validation.canPay) {
            throw createError(ErrorCode.GAME_INVALID_MOVE, {
              reason: validation.reason || "Cannot pay activation cost",
            });
          }

          // If cost requires selection but no targets provided, return error
          if (
            validation.requiresSelection &&
            (!args.costTargets || args.costTargets.length === 0)
          ) {
            throw createError(ErrorCode.GAME_INVALID_MOVE, {
              reason: "Cost payment requires card selection",
              requiresSelection: true,
              availableTargets: validation.availableTargets,
              selectionPrompt: validation.selectionPrompt,
            });
          }

          // Execute cost payment
          const costResult = await executeCost(
            ctx,
            gameState,
            user.userId,
            effect,
            args.costTargets
          );

          if (!costResult.success) {
            throw createError(ErrorCode.GAME_INVALID_MOVE, {
              reason: costResult.message,
            });
          }
        }
      } catch (error) {
        // Re-throw if it's already an error code
        if (error && typeof error === "object" && "code" in error) {
          throw error;
        }
        // Otherwise just log and continue
      }
    }

    // 7. Remove from spell/trap zone
    const newSpellTrapZone = spellTrapZone.filter((st) => st.cardId !== args.cardId);
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
    });

    // 8. Record trap_activated event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "trap_activated",
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username} activated ${card.name}`,
      metadata: {
        cardId: args.cardId,
        cardName: card.name,
        targets: args.targets,
      },
    });

    // 8b. Execute on_trap_activated triggers
    // Any card on field that has this trigger should activate
    const refreshedStateForTrapTrigger = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (refreshedStateForTrapTrigger) {
      await scanFieldForTriggers(
        ctx,
        args.lobbyId,
        refreshedStateForTrapTrigger,
        "on_trap_activated",
        refreshedStateForTrapTrigger.turnNumber || 1
      );
    }

    // 9. Add to chain system (instead of executing immediately)
    const trapSpeed = getSpellSpeed(card);
    const effect = getChainEffect(card);

    // Add to chain
    const chainResult = await addToChainHelper(ctx, {
      lobbyId: args.lobbyId,
      cardId: args.cardId,
      playerId: user.userId,
      playerUsername: user.username,
      spellSpeed: trapSpeed,
      effect,
      targets: args.targets,
    });

    // 10. Return success with chain status
    return {
      success: true,
      trapName: card.name,
      chainStarted: true,
      chainLinkNumber: chainResult.chainLinkNumber,
      currentChainLength: chainResult.currentChainLength,
      priorityPassed: true, // Priority is now with opponent
    };
  },
});
