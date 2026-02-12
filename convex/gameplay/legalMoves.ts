/**
 * Legal Moves Query
 *
 * Determines all legal actions available to the current player during their turn.
 * Used by:
 * - AI agents to determine valid moves
 * - UI to enable/disable action buttons
 * - Game logic validation
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getCardFirstEffect } from "../lib/abilityHelpers";
import { requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { isActionPrevented } from "./effectSystem/lingeringEffects";

/**
 * Get all legal moves for the current turn
 *
 * Returns comprehensive information about what actions the current player can take,
 * including which cards can be summoned (with tribute requirements), which monsters
 * can attack (with valid targets), which spells/traps can be activated, etc.
 *
 * @param gameId - The game ID (lobbyId string or gameId)
 * @returns Object containing all legal actions grouped by type
 */
export const getLegalMoves = query({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Find game state by gameId (supports both lobbyId strings and gameId)
    let gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .first();

    // If not found by gameId, try treating it as a lobbyId
    if (!gameState) {
      const lobbyIdAsId = args.gameId as Id<"gameLobbies">;
      gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyIdAsId))
        .first();
    }

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game not found",
        gameId: args.gameId,
      });
    }

    // Get lobby
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // Verify user is in this game
    if (gameState.hostId !== userId && gameState.opponentId !== userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You are not in this game",
      });
    }

    // Determine if user is host
    const isHost = gameState.hostId === userId;

    // Check if it's the user's turn
    const isMyTurn = gameState.currentTurnPlayerId === userId;
    const currentPhase = gameState.currentPhase || "draw";

    // Get player's zones
    const myHand = isHost ? gameState.hostHand : gameState.opponentHand;
    const myBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const mySpellTrapZone = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;
    const normalSummonedThisTurn = isHost
      ? gameState.hostNormalSummonedThisTurn || false
      : gameState.opponentNormalSummonedThisTurn || false;

    // Get opponent's zones
    const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;

    // Initialize result
    const legalMoves = {
      canSummon: [] as Array<{
        cardId: Id<"cardDefinitions">;
        cardName: string;
        level: number;
        attack: number;
        defense: number;
        requiresTributes: number;
        validTributes: Array<Id<"cardDefinitions">>;
      }>,
      canAttack: [] as Array<{
        cardId: Id<"cardDefinitions">;
        cardName: string;
        attack: number;
        validTargets: Array<{
          cardId: Id<"cardDefinitions">;
          cardName: string;
          position: number;
        }>;
        canDirectAttack: boolean;
      }>,
      canSetSpellTrap: [] as Array<{
        cardId: Id<"cardDefinitions">;
        cardName: string;
        cardType: string;
      }>,
      canActivateSpell: [] as Array<{
        cardId: Id<"cardDefinitions">;
        cardName: string;
        isQuickPlay: boolean;
      }>,
      canChangePosition: [] as Array<{
        cardId: Id<"cardDefinitions">;
        cardName: string;
        currentPosition: number;
      }>,
      canEndTurn: false,
      gameState: {
        isMyTurn,
        currentPhase,
        normalSummonedThisTurn,
        myHandCount: myHand.length,
        myBoardCount: myBoard.length,
        opponentBoardCount: opponentBoard.length,
        myLifePoints: isHost ? gameState.hostLifePoints : gameState.opponentLifePoints,
        opponentLifePoints: isHost ? gameState.opponentLifePoints : gameState.hostLifePoints,
      },
    };

    // If not my turn, only return opponent-turn actions (trap activation, quick effects)
    if (!isMyTurn) {
      // TODO: Add trap activation logic for opponent's turn
      return legalMoves;
    }

    // ============================================================================
    // SUMMON ACTIONS
    // ============================================================================

    // Can summon during Main Phase 1 or Main Phase 2
    if ((currentPhase === "main1" || currentPhase === "main2") && !normalSummonedThisTurn) {
      // Check if summoning is prevented
      const summonPreventionCheck = isActionPrevented(gameState, "summon_monster", userId);
      if (!summonPreventionCheck.prevented) {
        // Check monster zone space (max 5)
        if (myBoard.length < 5) {
          // Check each monster card in hand
          for (const cardId of myHand) {
            const card = await ctx.db.get(cardId);
            if (!card || card.cardType !== "creature") continue;

            const level = card.level || 0;
            let requiresTributes = 0;

            // Determine tribute requirements
            if (level >= 7) {
              requiresTributes = 2;
            } else if (level >= 5) {
              requiresTributes = 1;
            }

            // Get valid tributes (face-up monsters on field)
            const validTributes = myBoard.filter((bc) => !bc.isFaceDown).map((bc) => bc.cardId);

            // Can only summon if we have enough tributes
            if (validTributes.length >= requiresTributes) {
              legalMoves.canSummon.push({
                cardId,
                cardName: card.name,
                level,
                attack: card.attack || 0,
                defense: card.defense || 0,
                requiresTributes,
                validTributes: requiresTributes > 0 ? validTributes : [],
              });
            }
          }
        }
      }
    }

    // ============================================================================
    // ATTACK ACTIONS
    // ============================================================================

    // Can attack during Battle Phase
    if (currentPhase === "battle" || currentPhase === "battle_start") {
      // Check if attacks are prevented
      const attackPreventionCheck = isActionPrevented(gameState, "declare_attack", userId);
      if (!attackPreventionCheck.prevented) {
        // Check each monster on board
        for (const boardCard of myBoard) {
          // Can only attack with face-up Attack Position monsters that haven't attacked
          // and weren't summoned this turn (summoning sickness)
          if (
            boardCard.position !== 1 ||
            boardCard.hasAttacked ||
            boardCard.isFaceDown ||
            boardCard.turnSummoned === gameState.turnNumber
          ) {
            continue;
          }

          const card = await ctx.db.get(boardCard.cardId);
          if (!card) continue;

          // Get valid targets (opponent's monsters)
          const validTargets = [];
          for (const opponentCard of opponentBoard) {
            const targetCard = await ctx.db.get(opponentCard.cardId);
            if (targetCard) {
              validTargets.push({
                cardId: opponentCard.cardId,
                cardName: opponentCard.isFaceDown ? "Face-down monster" : targetCard.name,
                position: opponentCard.position,
              });
            }
          }

          // Check if can direct attack
          let canDirectAttack = opponentBoard.length === 0;

          // Check for special direct attack abilities
          if (!canDirectAttack) {
            const parsedAbility = getCardFirstEffect(card);
            if (parsedAbility?.type === "directAttack") {
              if (parsedAbility.condition === "no_opponent_attack_monsters") {
                const opponentAttackMonsters = opponentBoard.filter((bc) => bc.position === 1);
                canDirectAttack = opponentAttackMonsters.length === 0;
              }
            }
          }

          legalMoves.canAttack.push({
            cardId: boardCard.cardId,
            cardName: card.name,
            attack: boardCard.attack,
            validTargets,
            canDirectAttack,
          });
        }
      }
    }

    // ============================================================================
    // SET SPELL/TRAP ACTIONS
    // ============================================================================

    // Can set during Main Phase 1 or Main Phase 2
    if (currentPhase === "main1" || currentPhase === "main2") {
      // Check spell/trap zone space (max 5)
      if (mySpellTrapZone.length < 5) {
        // Check each spell/trap card in hand
        for (const cardId of myHand) {
          const card = await ctx.db.get(cardId);
          if (!card) continue;

          if (card.cardType === "spell" || card.cardType === "trap") {
            legalMoves.canSetSpellTrap.push({
              cardId,
              cardName: card.name,
              cardType: card.cardType,
            });
          }
        }
      }
    }

    // ============================================================================
    // ACTIVATE SPELL ACTIONS
    // ============================================================================

    // Normal spells: Main Phase 1 or Main Phase 2 only
    // Quick-Play spells: Main Phase 1, Main Phase 2, Battle Phase, or opponent's turn
    const isMainPhase = currentPhase === "main1" || currentPhase === "main2";
    const isBattlePhase =
      currentPhase === "battle" || currentPhase === "battle_start" || currentPhase === "battle_end";

    if (isMainPhase || isBattlePhase) {
      for (const cardId of myHand) {
        const card = await ctx.db.get(cardId);
        if (!card || card.cardType !== "spell") continue;

        const spellType = card.spellType || "normal";
        const isQuickPlay = spellType === "quick_play";

        // During battle phase, only Quick-Play spells can be activated
        if (isBattlePhase && !isQuickPlay) continue;

        if (spellType === "normal" || isQuickPlay) {
          legalMoves.canActivateSpell.push({
            cardId,
            cardName: card.name,
            isQuickPlay,
          });
        }
      }
    }

    // ============================================================================
    // CHANGE POSITION ACTIONS
    // ============================================================================

    // Can change position during Main Phase 1 or Main Phase 2
    if (currentPhase === "main1" || currentPhase === "main2") {
      // Check each monster on board
      for (const boardCard of myBoard) {
        // Can only change position if:
        // 1. Monster is face-up
        // 2. Monster hasn't changed position this turn
        // 3. Monster wasn't summoned this turn
        if (
          !boardCard.isFaceDown &&
          !boardCard.hasChangedPosition &&
          boardCard.turnSummoned !== gameState.turnNumber
        ) {
          const card = await ctx.db.get(boardCard.cardId);
          if (card) {
            legalMoves.canChangePosition.push({
              cardId: boardCard.cardId,
              cardName: card.name,
              currentPosition: boardCard.position,
            });
          }
        }
      }
    }

    // ============================================================================
    // END TURN ACTION
    // ============================================================================

    // Can end turn from Main Phase 2 or End Phase
    if (currentPhase === "main2" || currentPhase === "end") {
      legalMoves.canEndTurn = true;
    }

    return legalMoves;
  },
});
