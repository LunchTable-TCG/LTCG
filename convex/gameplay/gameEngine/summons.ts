/**
 * Game Engine - Summons Module
 *
 * Handles monster summoning mechanics:
 * - Normal Summon / Tribute Summon
 * - Set Monster
 * - Flip Summon
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "../../functions";
import { getCardAbility } from "../../lib/abilityHelpers";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { moveCard } from "../../lib/gameHelpers";
import { validateGameActive } from "../../lib/gameValidation";
import { validateMonsterZone } from "../../lib/validation";
import { executeEffect } from "../effectSystem";
import { isActionPrevented } from "../effectSystem/lingeringEffects";
import { recordEventHelper } from "../gameEvents";
import { validateFlipSummon, validateNormalSummon, validateSetMonster } from "../summonValidator";

/**
 * Normal summon a monster from hand to the field
 *
 * Summons a monster from hand to the field in face-up Attack or Defense Position.
 * Monsters level 4 or lower can be summoned without tributes.
 * Level 5-6 monsters require 1 tribute, level 7+ require 2 tributes.
 * This action counts as your 1 Normal Summon per turn.
 *
 * Game rules:
 * - Only one Normal Summon/Set per turn
 * - Must have required number of tributes on field
 * - Monster zone must have available space (max 5 monsters)
 * - Can only summon during your Main Phase
 * - Face-up summons trigger "on_summon" effects
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Monster card to summon from hand
 * @param tributeCardIds - Optional array of monster card IDs to tribute
 * @param position - "attack" for Attack Position or "defense" for Defense Position
 * @returns Success status with card name, position, tributes used, and trigger effect message
 */
export const normalSummon = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    tributeCardIds: v.optional(v.array(v.id("cardDefinitions"))),
    position: v.union(v.literal("attack"), v.literal("defense")),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby (for gameId/status only - turn state is in gameStates)
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
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found",
      });
    }

    // 3.5. Validate game is active
    if (!lobby.gameId || gameState.turnNumber === undefined) {
      throw createError(ErrorCode.GAME_NOT_STARTED);
    }

    // 4. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 4.5. Check if summon is prevented by lingering effects
    const preventionCheck = isActionPrevented(gameState, "summon_monster", user.userId);
    if (preventionCheck.prevented) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: preventionCheck.reason || "Cannot summon monsters",
      });
    }

    // 5. Validate summon
    const validation = await validateNormalSummon(
      ctx,
      gameState,
      user.userId,
      args.cardId,
      args.tributeCardIds
    );

    if (!validation.valid) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: validation.error,
      });
    }

    const isHost = user.userId === gameState.hostId;
    const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

    // 5.5. Validate monster zone has space (max 5 monsters)
    validateMonsterZone(board, 5);

    // 6. Get card details
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Card not found",
        cardId: args.cardId,
      });
    }

    // 7. Process tributes (if any)
    const tributeCount = args.tributeCardIds?.length || 0;
    if (tributeCount > 0 && args.tributeCardIds) {
      // Record tribute_paid event
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: gameState.turnNumber,
        eventType: "tribute_paid",
        playerId: user.userId,
        playerUsername: user.username,
        description: `${user.username} tributed ${tributeCount} monster(s)`,
        metadata: {
          tributeCards: args.tributeCardIds,
          forCard: args.cardId,
        },
      });

      // Record card_to_graveyard events for each tribute (don't use moveCard to avoid stale state issues)
      for (const tributeId of args.tributeCardIds) {
        const tributeCard = await ctx.db.get(tributeId);
        await recordEventHelper(ctx, {
          lobbyId: args.lobbyId,
          gameId: lobby.gameId,
          turnNumber: gameState.turnNumber,
          eventType: "card_to_graveyard",
          playerId: user.userId,
          playerUsername: user.username,
          description: `${user.username}'s ${tributeCard?.name || "card"} was sent to the graveyard`,
          metadata: { cardId: tributeId, fromZone: "board", toZone: "graveyard" },
        });
      }

      // Remove tributes from board and add to graveyard in one batch operation
      const tributeSet = new Set(args.tributeCardIds);
      const boardAfterTributes = board.filter((bc) => !tributeSet.has(bc.cardId));
      const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
      const graveyardAfterTributes = [...graveyard, ...args.tributeCardIds];

      await ctx.db.patch(gameState._id, {
        [isHost ? "hostBoard" : "opponentBoard"]: boardAfterTributes,
        [isHost ? "hostGraveyard" : "opponentGraveyard"]: graveyardAfterTributes,
      });
    }

    // 8. Re-fetch game state to get current board after tribute removals
    const refreshedGameState = await ctx.db.get(gameState._id);
    if (!refreshedGameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }
    const currentBoard = isHost ? refreshedGameState.hostBoard : refreshedGameState.opponentBoard;
    const currentHand = isHost ? refreshedGameState.hostHand : refreshedGameState.opponentHand;

    // 9. Remove card from hand
    const newHand = currentHand.filter((c) => c !== args.cardId);

    // 10. Add card to board (face-up normal summon)
    const positionValue = args.position === "attack" ? 1 : -1; // 1 = ATK, -1 = DEF

    // Parse ability for protection flags
    let protectionFlags = {};
    const parsedAbility = getCardAbility(card);
    const firstEffect = parsedAbility?.effects[0];
    if (firstEffect?.protection) {
      protectionFlags = {
        cannotBeDestroyedByBattle: firstEffect.protection.cannotBeDestroyedByBattle,
        cannotBeDestroyedByEffects: firstEffect.protection.cannotBeDestroyedByEffects,
        cannotBeTargeted: firstEffect.protection.cannotBeTargeted,
      };
    }

    const newBoardCard = {
      cardId: args.cardId,
      position: positionValue,
      attack: card.attack || 0,
      defense: card.defense || 0,
      hasAttacked: false,
      isFaceDown: false, // Normal summon is face-up
      hasChangedPosition: false,
      turnSummoned: gameState.turnNumber,
      ...protectionFlags,
    };

    const newBoard = [...currentBoard, newBoardCard];

    // 11. Mark player as having normal summoned this turn
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostHand" : "opponentHand"]: newHand,
      [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
      [isHost ? "hostNormalSummonedThisTurn" : "opponentNormalSummonedThisTurn"]: true,
    });

    // 11. Record summon event
    const eventType = tributeCount > 0 ? "tribute_summon" : "normal_summon";
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId,
      turnNumber: gameState.turnNumber,
      eventType,
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username} ${tributeCount > 0 ? "Tribute" : "Normal"} Summoned ${card.name} in ${args.position} position`,
      metadata: {
        cardId: args.cardId,
        cardName: card.name,
        position: args.position,
        tributeCount,
        attack: card.attack,
        defense: card.defense,
      },
    });

    // 12. Check for "When summoned" trigger effects (scan ALL effects, not just first)
    let triggerEffectResult = { success: true, message: "No trigger" };

    const summonAbility = getCardAbility(card);
    if (summonAbility) {
      for (const summonEffect of summonAbility.effects) {
        if (summonEffect.trigger !== "on_summon") continue;

        const refreshedState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
          .first();

        if (refreshedState) {
          triggerEffectResult = await executeEffect(
            ctx,
            refreshedState,
            args.lobbyId,
            summonEffect,
            user.userId,
            args.cardId,
            [] // No targets for auto-trigger effects for now
          );

          if (triggerEffectResult.success) {
            // Record trigger activation
            await recordEventHelper(ctx, {
              lobbyId: args.lobbyId,
              gameId: lobby.gameId,
              turnNumber: gameState.turnNumber,
              eventType: "effect_activated",
              playerId: user.userId,
              playerUsername: user.username,
              description: `${card.name} effect: ${triggerEffectResult.message}`,
              metadata: { cardId: args.cardId, trigger: "on_summon" },
            });
          }
        }
      }
    }

    // 13. Check opponent's continuous traps for "on_opponent_summon" triggers
    const opponentId = isHost ? gameState.opponentId : gameState.hostId;
    const opponentSpellTrapZone = isHost
      ? gameState.opponentSpellTrapZone
      : gameState.hostSpellTrapZone;

    for (const zoneCard of opponentSpellTrapZone) {
      // Only check active (face-up) continuous traps
      if (!zoneCard.isFaceDown && zoneCard.isActivated) {
        const trapCard = await ctx.db.get(zoneCard.cardId);
        if (trapCard?.cardType === "trap") {
          const trapAbility = getCardAbility(trapCard);
          const trapEffect = trapAbility?.effects.find(
            (e) => e.trigger === "on_opponent_summon" && e.continuous
          );

          // Check if this trap triggers on opponent summon
          if (trapEffect) {
            const refreshedState = await ctx.db
              .query("gameStates")
              .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
              .first();

            if (refreshedState) {
              const opponentTriggerResult = await executeEffect(
                ctx,
                refreshedState,
                args.lobbyId,
                trapEffect,
                opponentId,
                zoneCard.cardId,
                [] // No targets needed for automatic triggers
              );

              if (opponentTriggerResult.success) {
                const opponent = await ctx.db.get(opponentId);
                // Record opponent's trap activation
                await recordEventHelper(ctx, {
                  lobbyId: args.lobbyId,
                  gameId: lobby.gameId,
                  turnNumber: gameState.turnNumber,
                  eventType: "effect_activated",
                  playerId: opponentId,
                  playerUsername: opponent?.username || "Opponent",
                  description: `${trapCard.name} effect: ${opponentTriggerResult.message}`,
                  metadata: { cardId: zoneCard.cardId, trigger: "on_opponent_summon" },
                });
              }
            }
          }
        }
      }
    }

    // 14. Return success
    return {
      success: true,
      cardSummoned: card.name,
      position: args.position,
      tributesUsed: tributeCount,
      triggerEffect: triggerEffectResult.message,
    };
  },
});

/**
 * Set a monster face-down in Defense Position
 *
 * Places a monster from hand face-down in Defense Position.
 * Same tribute requirements as Normal Summon apply.
 * This action counts as your 1 Normal Summon per turn.
 *
 * Game rules:
 * - Only one Normal Summon/Set per turn
 * - Must have required number of tributes on field
 * - Monster zone must have available space (max 5 monsters)
 * - Can only set during your Main Phase
 * - Face-down monsters do not trigger "on_summon" effects
 * - Opponent cannot see which card was set
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Monster card to set from hand
 * @param tributeCardIds - Optional array of monster card IDs to tribute
 * @returns Success status with tributes used
 */
export const setMonster = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    tributeCardIds: v.optional(v.array(v.id("cardDefinitions"))),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby (for gameId/status only - turn state is in gameStates)
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
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found",
      });
    }

    // 3.5. Validate game is active
    if (!lobby.gameId || gameState.turnNumber === undefined) {
      throw createError(ErrorCode.GAME_NOT_STARTED);
    }

    // 4. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 4.5. Check if set is prevented by lingering effects
    const preventionCheck = isActionPrevented(gameState, "summon_monster", user.userId);
    if (preventionCheck.prevented) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: preventionCheck.reason || "Cannot set monsters",
      });
    }

    // 5. Validate set (uses same validation as normal summon)
    const validation = await validateSetMonster(
      ctx,
      gameState,
      user.userId,
      args.cardId,
      args.tributeCardIds
    );

    if (!validation.valid) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: validation.error,
      });
    }

    const isHost = user.userId === gameState.hostId;
    const hand = isHost ? gameState.hostHand : gameState.opponentHand;
    const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

    // 5.5. Validate monster zone has space (max 5 monsters)
    validateMonsterZone(board, 5);

    // 6. Get card details
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Card not found",
        cardId: args.cardId,
      });
    }

    // 7. Process tributes (if any)
    const tributeCount = args.tributeCardIds?.length || 0;
    if (tributeCount > 0 && args.tributeCardIds) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: gameState.turnNumber,
        eventType: "tribute_paid",
        playerId: user.userId,
        playerUsername: user.username,
        description: `${user.username} tributed ${tributeCount} monster(s)`,
        metadata: {
          tributeCards: args.tributeCardIds,
          forCard: args.cardId,
        },
      });

      for (const tributeId of args.tributeCardIds) {
        await moveCard(
          ctx,
          gameState,
          tributeId,
          "board",
          "graveyard",
          user.userId,
          gameState.turnNumber
        );

        const updatedBoard = board.filter((bc) => bc.cardId !== tributeId);
        await ctx.db.patch(gameState._id, {
          [isHost ? "hostBoard" : "opponentBoard"]: updatedBoard,
        });
      }
    }

    // 8. Remove card from hand
    const newHand = hand.filter((c) => c !== args.cardId);

    // 9. Add card to board (face-down defense position)
    const newBoardCard = {
      cardId: args.cardId,
      position: -1, // -1 = Defense
      attack: card.attack || 0,
      defense: card.defense || 0,
      hasAttacked: false,
      isFaceDown: true, // Set monsters are face-down
      hasChangedPosition: false,
      turnSummoned: gameState.turnNumber,
    };

    const newBoard = [...board, newBoardCard];

    // 10. Mark player as having normal summoned/set this turn
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostHand" : "opponentHand"]: newHand,
      [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
      [isHost ? "hostNormalSummonedThisTurn" : "opponentNormalSummonedThisTurn"]: true,
    });

    // 11. Record monster_set event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId,
      turnNumber: gameState.turnNumber,
      eventType: "monster_set",
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username} Set a monster face-down`,
      metadata: {
        cardId: args.cardId,
        // Don't reveal card name for face-down cards
        tributeCount,
      },
    });

    // 12. Return success
    return {
      success: true,
      cardSet: "face-down",
      tributesUsed: tributeCount,
    };
  },
});

/**
 * Flip Summon a face-down monster to face-up position
 *
 * Flips a face-down monster to face-up Attack or Defense Position.
 * This does NOT count as your Normal Summon for the turn.
 *
 * Game rules:
 * - Can only Flip Summon face-down monsters that have been on field for at least 1 turn
 * - Can only Flip Summon during your Main Phase
 * - Cannot Flip Summon a monster that was just set this turn
 * - Triggers "on_flip" effects when flipped
 * - Does not consume your Normal Summon for the turn
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Face-down monster card to flip
 * @param newPosition - "attack" for Attack Position or "defense" for Defense Position
 * @returns Success status with card name, position, and flip effect message
 */
export const flipSummon = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    newPosition: v.union(v.literal("attack"), v.literal("defense")),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby (for gameId/status only - turn state is in gameStates)
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
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found",
      });
    }

    // 3.5. Validate game is active
    if (!lobby.gameId || gameState.turnNumber === undefined) {
      throw createError(ErrorCode.GAME_NOT_STARTED);
    }

    // 4. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 5. Validate flip summon
    const validation = await validateFlipSummon(ctx, gameState, user.userId, args.cardId);

    if (!validation.valid) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: validation.error,
      });
    }

    const isHost = user.userId === gameState.hostId;
    const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

    // 6. Find card on board and flip it
    const cardIndex = board.findIndex((bc) => bc.cardId === args.cardId);
    if (cardIndex === -1) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Card not found on board",
        cardId: args.cardId,
      });
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Card not found",
        cardId: args.cardId,
      });
    }

    // 7. Update card to face-up
    const positionValue = args.newPosition === "attack" ? 1 : -1; // 1 = ATK, -1 = DEF
    const newBoard = [...board];
    const currentCard = newBoard[cardIndex];
    if (!currentCard) {
      throw createError(ErrorCode.GAME_CARD_NOT_FOUND);
    }
    newBoard[cardIndex] = {
      ...currentCard,
      position: positionValue,
      isFaceDown: false, // Flip to face-up
    };

    await ctx.db.patch(gameState._id, {
      [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
    });

    // 8. Record flip_summon event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId,
      turnNumber: gameState.turnNumber,
      eventType: "flip_summon",
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username} Flip Summoned ${card.name} in ${args.newPosition} position`,
      metadata: {
        cardId: args.cardId,
        cardName: card.name,
        position: args.newPosition,
        attack: card.attack,
        defense: card.defense,
      },
    });

    // 9. Trigger FLIP effect if exists (scan ALL effects, not just first)
    let flipEffectResult = { success: true, message: "No FLIP effect" };

    const flipAbility = getCardAbility(card);
    if (flipAbility) {
      for (const flipEffect of flipAbility.effects) {
        if (flipEffect.trigger !== "on_flip") continue;

        const refreshedState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
          .first();

        if (refreshedState) {
          flipEffectResult = await executeEffect(
            ctx,
            refreshedState,
            args.lobbyId,
            flipEffect,
            user.userId,
            args.cardId,
            [] // No targets for auto-trigger effects for now
          );

          if (flipEffectResult.success) {
            // Record FLIP effect activation
            await recordEventHelper(ctx, {
              lobbyId: args.lobbyId,
              gameId: lobby.gameId,
              turnNumber: gameState.turnNumber,
              eventType: "effect_activated",
              playerId: user.userId,
              playerUsername: user.username,
              description: `FLIP: ${card.name} effect: ${flipEffectResult.message}`,
              metadata: { cardId: args.cardId, trigger: "on_flip" },
            });
          }
        }
      }
    }

    // 10. Return success
    return {
      success: true,
      cardFlipped: card.name,
      position: args.newPosition,
      flipEffect: flipEffectResult.message,
    };
  },
});

/**
 * Normal Summon (Internal)
 *
 * Internal mutation for API-based summon.
 * Accepts gameId string and userId for story mode support.
 */
export const normalSummonInternal = internalMutation({
  args: {
    gameId: v.string(),
    userId: v.id("users"),
    cardId: v.string(),
    position: v.union(v.literal("attack"), v.literal("defense")),
    tributeCardIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // 1. Find game state by gameId
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game not found",
        gameId: args.gameId,
      });
    }

    // 2. Get lobby (for gameId/status only - turn state is in gameStates)
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Validate it's the current player's turn (using gameState as source of truth)
    if (gameState.currentTurnPlayerId !== args.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 4. Get user info
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }
    const username = user.username ?? user.name ?? "Unknown";

    const isHost = args.userId === gameState.hostId;
    const hand = isHost ? gameState.hostHand : gameState.opponentHand;
    const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

    // 5. Check if already summoned
    const alreadySummoned = isHost
      ? gameState.hostNormalSummonedThisTurn
      : gameState.opponentNormalSummonedThisTurn;

    if (alreadySummoned) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "You have already Normal Summoned this turn",
      });
    }

    // 6. Find the card in hand
    const cardIdAsId = args.cardId as any;
    if (!hand.includes(cardIdAsId)) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Card not in hand",
        cardId: args.cardId,
      });
    }

    // 7. Get card details from cardDefinitions table
    const card = await ctx.db
      .query("cardDefinitions")
      .filter((q) => q.eq(q.field("_id"), cardIdAsId))
      .first();

    if (!card) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Card not found",
        cardId: args.cardId,
      });
    }

    // 8. Validate monster zone has space
    validateMonsterZone(board, 5);

    // 9. Remove card from hand
    const newHand = hand.filter((c: any) => c !== cardIdAsId);

    // 10. Add card to board
    const positionValue = args.position === "attack" ? 1 : -1;

    // Parse ability for protection flags
    let protectionFlags: any = {};
    const parsedAbility = getCardAbility(card);
    const firstEffect = parsedAbility?.effects[0];
    if (firstEffect?.protection) {
      protectionFlags = {
        cannotBeDestroyedByBattle: firstEffect.protection.cannotBeDestroyedByBattle,
        cannotBeDestroyedByEffects: firstEffect.protection.cannotBeDestroyedByEffects,
        cannotBeTargeted: firstEffect.protection.cannotBeTargeted,
      };
    }

    const newBoardCard = {
      cardId: cardIdAsId,
      position: positionValue,
      attack: card.attack || 0,
      defense: card.defense || 0,
      hasAttacked: false,
      isFaceDown: false,
      hasChangedPosition: false,
      turnSummoned: gameState.turnNumber ?? 0,
      ...protectionFlags,
    };

    const newBoard = [...board, newBoardCard];

    // 11. Update game state
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostHand" : "opponentHand"]: newHand,
      [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
      [isHost ? "hostNormalSummonedThisTurn" : "opponentNormalSummonedThisTurn"]: true,
    });

    // 12. Record summon event
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "normal_summon",
      playerId: args.userId,
      playerUsername: username,
      description: `${username} Normal Summoned ${card.name} in ${args.position} position`,
      metadata: {
        cardId: args.cardId,
        cardName: card.name,
        position: args.position,
        attack: card.attack,
        defense: card.defense,
      },
    });

    return {
      success: true,
      cardSummoned: card.name,
      position: args.position,
      tributesUsed: 0,
    };
  },
});
