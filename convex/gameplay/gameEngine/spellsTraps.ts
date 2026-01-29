/**
 * Game Engine - Spells & Traps Module
 *
 * Handles Spell/Trap card mechanics:
 * - Set Spell/Trap
 * - Activate Spell
 * - Activate Trap
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { getSpellSpeed } from "../../lib/spellSpeedHelper";
import { addToChainHelper, type ChainEffect } from "../chainResolver";
import { getCardAbility, getRawJsonAbility } from "../../lib/abilityHelpers";
import { executeSearch } from "../effectSystem/executors/cardMovement/search";
import { recordEventHelper } from "../gameEvents";

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

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Validate it's the current player's turn
    if (lobby.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
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
        turnSet: lobby.turnNumber || 1, // Track when card was set for trap activation rules
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
      turnNumber: lobby.turnNumber ?? 0,
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
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Validate it's the current player's turn (or valid activation timing)
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

    // 7. Validate phase (Main Phases only for Normal Spells)
    const currentPhase = gameState.currentPhase;
    if (currentPhase !== "main1" && currentPhase !== "main2") {
      throw createError(ErrorCode.GAME_INVALID_PHASE, {
        reason: "Can only activate Normal Spells during Main Phase",
      });
    }

    // 8. Remove card from hand or spell/trap zone
    if (inHand) {
      const newHand = hand.filter((c) => c !== args.cardId);
      await ctx.db.patch(gameState._id, {
        [isHost ? "hostHand" : "opponentHand"]: newHand,
      });
    } else {
      // Remove from spell/trap zone
      const newSpellTrapZone = spellTrapZone.filter((st) => st.cardId !== args.cardId);
      await ctx.db.patch(gameState._id, {
        [isHost ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
      });
    }

    // 9. Record spell_activated event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: lobby.turnNumber ?? 0,
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

    // 10. Add to chain system (instead of executing immediately)
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

    // 2. Get game state
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
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Get game state
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

    // 6. Validate trap was set for at least 1 turn
    const currentTurn = lobby.turnNumber || 1;
    const turnWasSet = trapInZone.turnSet || currentTurn;

    // Traps must be set for at least 1 full turn before activation
    // Exception: Some trap cards can be activated same turn (e.g., quick-effect traps)
    if (currentTurn === turnWasSet) {
      throw createError(ErrorCode.GAME_TRAP_SAME_TURN);
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
      turnNumber: lobby.turnNumber ?? 0,
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
