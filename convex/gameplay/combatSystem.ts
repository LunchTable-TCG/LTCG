/**
 * Combat System
 *
 * Handles Yu-Gi-Oh battle mechanics:
 * - Attack declarations
 * - Battle damage calculation
 * - Card destruction
 * - LP modifications
 * - Battle replay (when opponent's monster count changes after attack declaration)
 *
 * Battle Replay Rules:
 * - Replay occurs when the number of monsters on opponent's field changes
 *   after attack declaration but before damage calculation
 * - The attacker can: choose a new target, attack directly, or cancel
 * - Replay does NOT occur if the attacking monster is removed
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { getCardAbility, getCardFirstEffect } from "../lib/abilityHelpers";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import {
  applyContinuousEffects,
  applyDamage,
  getModifiedStats,
  moveCard,
} from "../lib/gameHelpers";
import { validateGameActive } from "../lib/gameValidation";
import { executeEffect } from "./effectSystem/index";
import { isActionPrevented } from "./effectSystem/lingeringEffects";
import { checkStateBasedActions } from "./gameEngine/stateBasedActions";
import { recordEventHelper } from "./gameEvents";
import { clearPendingReplay, getOpponentMonsterCount } from "./replaySystem";
import { openResponseWindow, passResponsePriority } from "./responseWindow";

interface BattleResult {
  destroyed: Id<"cardDefinitions">[];
  damageTo: {
    playerId: Id<"users">;
    amount: number;
  }[];
  gameEnded: boolean;
}

/**
 * Declare an attack with one of your monsters
 *
 * Declares an attack with a face-up Attack Position monster on your field.
 * Attack can target an opponent's monster or attack directly if allowed.
 * Battle is immediately resolved and damage/destruction is calculated.
 *
 * Game rules:
 * - Can only attack during your Battle Phase
 * - Monster must be in Attack Position (face-up)
 * - Monster cannot have attacked already this turn
 * - Direct attacks only allowed if opponent has no monsters (unless card effect allows)
 * - Attacking face-down monsters flips them face-up
 * - Battle damage is calculated based on ATK vs ATK or ATK vs DEF
 * - Destroyed monsters are sent to the graveyard
 * - Triggers "on_battle" effects
 *
 * @param lobbyId - Game lobby ID
 * @param attackerCardId - Monster card declaring the attack
 * @param targetCardId - Optional target monster card (undefined for direct attack)
 * @returns Success status with battle result including destroyed cards and damage dealt
 */
export const declareAttack = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    attackerCardId: v.id("cardDefinitions"),
    targetCardId: v.optional(v.id("cardDefinitions")), // undefined = direct attack
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

    // 4. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 5. Validate in Battle Phase
    const currentPhase = gameState.currentPhase;
    if (currentPhase !== "battle" && currentPhase !== "battle_start") {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Can only attack during Battle Phase",
        currentPhase,
      });
    }

    // 5.5. First turn restriction — first player cannot attack on turn 1
    if (gameState.turnNumber === 1) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Cannot attack on the first turn of the game",
      });
    }

    // 5.6. Check if attack is prevented by lingering effects
    const preventionCheck = isActionPrevented(gameState, "declare_attack", user.userId);
    if (preventionCheck.prevented) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: preventionCheck.reason || "Cannot declare attacks",
      });
    }

    const isHost = user.userId === gameState.hostId;
    const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const opponentId = isHost ? gameState.opponentId : gameState.hostId;
    const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;

    // Edge case: Validate boards are arrays
    if (!Array.isArray(playerBoard) || !Array.isArray(opponentBoard)) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Invalid board state",
      });
    }

    // 6. Validate attacker
    const attacker = playerBoard.find((bc) => bc.cardId === args.attackerCardId);
    if (!attacker) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Attacker not found on your field",
        attackerCardId: args.attackerCardId,
      });
    }

    if (attacker.hasAttacked) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "This monster has already attacked this turn",
        attackerCardId: args.attackerCardId,
      });
    }

    if (attacker.position !== 1) {
      // position 1 = Attack Position, other values = Defense/Face-down
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Monster must be in Attack Position to attack",
        attackerCardId: args.attackerCardId,
      });
    }

    // 6b. Check summoning sickness — cannot attack the turn a monster was summoned
    if (attacker.turnSummoned === gameState.turnNumber) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Monster cannot attack the turn it was summoned",
        attackerCardId: args.attackerCardId,
      });
    }

    // 6c. Cannot attack after changing position this turn
    if (attacker.hasChangedPosition) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Monster cannot attack after changing position this turn",
        attackerCardId: args.attackerCardId,
      });
    }

    // 7. Get attacker card details
    const attackerCard = await ctx.db.get(args.attackerCardId);
    if (!attackerCard) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Attacker card not found",
        attackerCardId: args.attackerCardId,
      });
    }

    // 8. Validate target (if attacking a monster)
    let defender: (typeof opponentBoard)[number] | undefined;
    let defenderCard: Doc<"cardDefinitions"> | undefined;

    if (args.targetCardId) {
      // Edge case: Check opponent board length before find
      if (opponentBoard.length === 0) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Cannot target a card when opponent has no monsters",
          targetCardId: args.targetCardId,
        });
      }

      defender = opponentBoard.find((bc) => bc.cardId === args.targetCardId);
      if (!defender) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Target not found on opponent's field",
          targetCardId: args.targetCardId,
        });
      }

      const card = await ctx.db.get(args.targetCardId);
      if (!card) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Defender card not found",
          targetCardId: args.targetCardId,
        });
      }
      defenderCard = card;
    } else {
      // Direct attack - check if allowed
      let canDirectAttack = opponentBoard.length === 0; // Default: only if no monsters

      // Check if attacker has a directAttack ability that allows attacking directly
      if (!canDirectAttack) {
        const parsedAbility = getCardFirstEffect(attackerCard);
        if (parsedAbility?.type === "directAttack") {
          // Check the condition for direct attack
          if (parsedAbility.condition === "no_opponent_attack_monsters") {
            // Can attack directly if opponent has no monsters in Attack Position
            const opponentAttackMonsters = opponentBoard.filter(
              (bc) => bc.position === 1 // position 1 = Attack Position
            );
            canDirectAttack = opponentAttackMonsters.length === 0;
          }
        }
      }

      if (!canDirectAttack) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Cannot attack directly while opponent has monsters in Attack Position",
        });
      }
    }

    // 9. Calculate effective stats (temporary modifiers + continuous effects)
    // Attacker stats
    const attackerTempStats = getModifiedStats(
      gameState,
      attacker.cardId,
      attackerCard.attack || 0,
      attackerCard.defense || 0
    );
    const attackerContinuousBonus = await applyContinuousEffects(
      ctx,
      gameState,
      attacker.cardId,
      attackerCard,
      isHost
    );

    // Edge case: Validate stat calculations didn't produce NaN
    if (Number.isNaN(attackerTempStats.attack) || Number.isNaN(attackerContinuousBonus.atkBonus)) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Invalid attack calculation",
      });
    }

    const effectiveAttackerATK = attackerTempStats.attack + attackerContinuousBonus.atkBonus;

    // Edge case: Ensure final ATK is not negative
    if (effectiveAttackerATK < 0) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Attacker has 0 or negative ATK and cannot attack",
      });
    }

    // Update attacker with effective stats
    const effectiveAttacker = {
      ...attacker,
      attack: effectiveAttackerATK,
    };

    // Defender stats (if applicable)
    let effectiveDefender = defender;
    if (defender && defenderCard) {
      const defenderTempStats = getModifiedStats(
        gameState,
        defender.cardId,
        defenderCard.attack || 0,
        defenderCard.defense || 0
      );
      const defenderContinuousBonus = await applyContinuousEffects(
        ctx,
        gameState,
        defender.cardId,
        defenderCard,
        !isHost
      );

      // Edge case: Validate defender stat calculations
      if (
        Number.isNaN(defenderTempStats.attack) ||
        Number.isNaN(defenderTempStats.defense) ||
        Number.isNaN(defenderContinuousBonus.atkBonus) ||
        Number.isNaN(defenderContinuousBonus.defBonus)
      ) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Invalid defender stat calculation",
        });
      }

      const effectiveDefenderATK = Math.max(
        0,
        defenderTempStats.attack + defenderContinuousBonus.atkBonus
      );
      const effectiveDefenderDEF = Math.max(
        0,
        defenderTempStats.defense + defenderContinuousBonus.defBonus
      );

      effectiveDefender = {
        ...defender,
        attack: effectiveDefenderATK,
        defense: effectiveDefenderDEF,
      };
    }

    // 10. Check for "on_battle_start" trigger effects on attacker
    {
      const attackerAbility = getCardAbility(attackerCard);
      if (attackerAbility) {
        for (const parsedEffect of attackerAbility.effects) {
          if (parsedEffect.trigger !== "on_battle_start") continue;

          const refreshedState = await ctx.db
            .query("gameStates")
            .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
            .first();

          if (refreshedState) {
            const effectResult = await executeEffect(
              ctx,
              refreshedState,
              args.lobbyId,
              parsedEffect,
              user.userId,
              args.attackerCardId,
              [] // No targets for auto-trigger effects
            );

            if (effectResult.success) {
              // Validate game state for event recording
              if (!gameState.gameId || gameState.turnNumber === undefined) {
                throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
                  reason: "Game ID or turn number not found",
                });
              }

              await recordEventHelper(ctx, {
                lobbyId: args.lobbyId,
                gameId: gameState.gameId,
                turnNumber: gameState.turnNumber,
                eventType: "effect_activated",
                playerId: user.userId,
                playerUsername: user.username,
                description: `${attackerCard.name} attack effect: ${effectResult.message}`,
                metadata: { cardId: args.attackerCardId, trigger: "on_battle_start" },
              });
            }
          }
        }
      }
    }

    // 11. Record attack_declared event
    const opponent = await ctx.db.get(opponentId);

    // Edge case: Validate opponent exists
    if (!opponent) {
      throw createError(ErrorCode.NOT_FOUND_USER, {
        reason: "Opponent not found",
      });
    }

    // Validate game state for event recording
    if (!gameState.gameId || gameState.turnNumber === undefined) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game ID or turn number not found",
      });
    }

    // Store original opponent monster count for potential replay detection
    const originalOpponentMonsterCount = getOpponentMonsterCount(gameState, user.userId);

    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: gameState.gameId,
      turnNumber: gameState.turnNumber,
      eventType: "attack_declared",
      playerId: user.userId,
      playerUsername: user.username,
      description: args.targetCardId
        ? `${user.username}'s ${attackerCard.name} attacks ${defenderCard?.name || "unknown"}`
        : `${user.username}'s ${attackerCard.name} attacks directly`,
      metadata: {
        attackerId: args.attackerCardId,
        attackerName: attackerCard.name,
        attackerATK: effectiveAttackerATK,
        defenderId: args.targetCardId,
        defenderName: defenderCard?.name,
        isDirect: !args.targetCardId,
        originalOpponentMonsterCount, // For replay tracking
      },
    });

    // 12. Resolve battle
    const battleResult = await resolveBattle(
      ctx,
      args.lobbyId,
      gameState,
      gameState.turnNumber,
      user.userId,
      opponentId,
      effectiveAttacker,
      attackerCard,
      effectiveDefender,
      defenderCard
    );

    // 13. Mark attacker as having attacked (if still on board)
    // IMPORTANT: Re-fetch game state to get current board after destruction
    const updatedGameState = await ctx.db.get(gameState._id);
    if (!updatedGameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    const currentBoard = isHost ? updatedGameState.hostBoard : updatedGameState.opponentBoard;
    const attackerStillExists = currentBoard.some((bc) => bc.cardId === args.attackerCardId);

    if (attackerStillExists) {
      // Only update hasAttacked if attacker survived the battle
      const updatedPlayerBoard = currentBoard.map((bc) =>
        bc.cardId === args.attackerCardId ? { ...bc, hasAttacked: true } : bc
      );

      await ctx.db.patch(gameState._id, {
        [isHost ? "hostBoard" : "opponentBoard"]: updatedPlayerBoard,
      });
    }
    // If attacker was destroyed, board was already updated by resolveBattle - don't overwrite

    // 14. Run state-based action checks after combat
    // This catches any monsters that should be destroyed due to stat changes
    // and checks win conditions after damage
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: true,
      turnNumber: gameState.turnNumber,
    });

    // If SBA ended the game, update battle result
    if (sbaResult.gameEnded) {
      battleResult.gameEnded = true;
    }

    // 15. Return battle result
    return {
      success: true,
      battleResult,
      sbaResult: {
        gameEnded: sbaResult.gameEnded,
        winnerId: sbaResult.winnerId,
        destroyedCards: sbaResult.allDestroyedCards,
      },
    };
  },
});

/**
 * Declare attack with response window support
 *
 * This mutation declares an attack and stores it as a pending action,
 * allowing for trap/effect responses before damage calculation.
 * Use this when the game needs to support response windows during battle.
 *
 * Flow:
 * 1. Validate attack is legal
 * 2. Store pending attack with original monster count
 * 3. Record attack declaration event
 * 4. Return success - caller should open response window
 *
 * After response window closes:
 * - If replay triggered: client calls respondToReplay
 * - After replay resolved: client calls continueAttackAfterReplay
 * - If no replay: client calls continueAttackAfterReplay directly
 */
export const declareAttackWithResponse = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    attackerCardId: v.id("cardDefinitions"),
    targetCardId: v.optional(v.id("cardDefinitions")),
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

    // 4. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 5. Validate in Battle Phase
    const currentPhase = gameState.currentPhase;
    if (currentPhase !== "battle" && currentPhase !== "battle_start") {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Can only attack during Battle Phase",
        currentPhase,
      });
    }

    // 5.5. First turn restriction — first player cannot attack on turn 1
    if (gameState.turnNumber === 1) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Cannot attack on the first turn of the game",
      });
    }

    // 5.6. Check if attack is prevented by lingering effects
    const preventionCheck = isActionPrevented(gameState, "declare_attack", user.userId);
    if (preventionCheck.prevented) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: preventionCheck.reason || "Cannot declare attacks",
      });
    }

    const isHost = user.userId === gameState.hostId;
    const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;

    // 6. Validate attacker
    const attacker = playerBoard.find((bc) => bc.cardId === args.attackerCardId);
    if (!attacker) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Attacker not found on your field",
      });
    }

    if (attacker.hasAttacked) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "This monster has already attacked this turn",
      });
    }

    if (attacker.position !== 1) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Monster must be in Attack Position to attack",
      });
    }

    // 6c. Check summoning sickness — cannot attack the turn a monster was summoned
    if (attacker.turnSummoned === gameState.turnNumber) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Monster cannot attack the turn it was summoned",
        attackerCardId: args.attackerCardId,
      });
    }

    // 6d. Cannot attack after changing position this turn
    if (attacker.hasChangedPosition) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Monster cannot attack after changing position this turn",
        attackerCardId: args.attackerCardId,
      });
    }

    // 7. Get attacker card
    const attackerCard = await ctx.db.get(args.attackerCardId);
    if (!attackerCard) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Attacker card not found",
      });
    }

    // 8. Validate target
    let defenderCard: Doc<"cardDefinitions"> | undefined;
    if (args.targetCardId) {
      const defender = opponentBoard.find((bc) => bc.cardId === args.targetCardId);
      if (!defender) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Target not found on opponent's field",
        });
      }
      defenderCard = (await ctx.db.get(args.targetCardId)) ?? undefined;
    } else {
      // Direct attack validation
      let canDirectAttack = opponentBoard.length === 0;
      if (!canDirectAttack) {
        const parsedAbility = getCardFirstEffect(attackerCard);
        if (parsedAbility?.type === "directAttack") {
          if (parsedAbility.condition === "no_opponent_attack_monsters") {
            const opponentAttackMonsters = opponentBoard.filter((bc) => bc.position === 1);
            canDirectAttack = opponentAttackMonsters.length === 0;
          }
        }
      }
      if (!canDirectAttack) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Cannot attack directly while opponent has monsters in Attack Position",
        });
      }
    }

    // 9. Store original monster count and pending action
    const originalMonsterCount = getOpponentMonsterCount(gameState, user.userId);

    await ctx.db.patch(gameState._id, {
      pendingAction: {
        type: "attack",
        attackerId: args.attackerCardId,
        targetId: args.targetCardId,
        originalMonsterCount,
      },
    });

    // 10. Open attack_declaration response window — opponent can respond with traps
    // Re-read gameState after pendingAction patch for consistency
    const updatedGameState = await ctx.db.get(gameState._id);
    if (updatedGameState) {
      await openResponseWindow(ctx, updatedGameState, "attack_declaration", user.userId);
    }

    // 11. Record attack declaration event
    if (gameState.gameId && gameState.turnNumber !== undefined) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: gameState.gameId,
        turnNumber: gameState.turnNumber,
        eventType: "attack_declared",
        playerId: user.userId,
        playerUsername: user.username,
        description: args.targetCardId
          ? `${user.username}'s ${attackerCard.name} attacks ${defenderCard?.name || "unknown"}`
          : `${user.username}'s ${attackerCard.name} attacks directly`,
        metadata: {
          attackerId: args.attackerCardId,
          attackerName: attackerCard.name,
          defenderId: args.targetCardId,
          defenderName: defenderCard?.name,
          isDirect: !args.targetCardId,
          originalMonsterCount,
          withResponseWindow: true,
        },
      });
    }

    return {
      success: true,
      attackerId: args.attackerCardId,
      targetId: args.targetCardId,
      originalMonsterCount,
      message: "Attack declared - awaiting response window resolution",
    };
  },
});

/**
 * Resolve battle
 *
 * Handles all battle scenarios and records appropriate events.
 */
async function resolveBattle(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  turnNumber: number,
  attackerId: Id<"users">,
  defenderId: Id<"users">,
  attacker: { cardId: Id<"cardDefinitions">; attack: number; position: number },
  attackerCard: Doc<"cardDefinitions">,
  defender?: { cardId: Id<"cardDefinitions">; attack: number; defense: number; position: number },
  defenderCard?: Doc<"cardDefinitions">
): Promise<BattleResult> {
  const result: BattleResult = {
    destroyed: [],
    damageTo: [],
    gameEnded: false,
  };

  const isHostAttacking = attackerId === gameState.hostId;
  const attackerBoard = isHostAttacking ? gameState.hostBoard : gameState.opponentBoard;
  const defenderBoard = isHostAttacking ? gameState.opponentBoard : gameState.hostBoard;

  const attackerUser = await ctx.db.get(attackerId);
  const defenderUser = await ctx.db.get(defenderId);

  // Scenario 1: Direct Attack (no defender)
  if (!defender || !defenderCard) {
    // Edge case: Validate damage is not negative
    const damage = Math.max(0, attacker.attack);

    // Record damage_calculated event
    await recordEventHelper(ctx, {
      lobbyId,
      gameId: gameState.gameId,
      turnNumber,
      eventType: "damage_calculated",
      playerId: attackerId,
      playerUsername: attackerUser?.username || "Unknown",
      description: `Direct attack deals ${damage} damage`,
      metadata: {
        attackerId: attacker.cardId,
        attackerName: attackerCard.name,
        damage,
        isDirect: true,
      },
    });

    // Apply damage
    const gameEnded = await applyDamage(
      ctx,
      lobbyId,
      gameState,
      defenderId,
      damage,
      "battle",
      turnNumber
    );

    result.damageTo.push({ playerId: defenderId, amount: damage });
    result.gameEnded = gameEnded;

    // Check for "When inflicts battle damage" trigger on attacker
    {
      const cardAbility = getCardAbility(attackerCard);
      if (cardAbility) {
        for (const parsedEffect of cardAbility.effects) {
          if (parsedEffect.trigger !== "on_battle_damage") continue;

          const refreshedState = await ctx.db
            .query("gameStates")
            .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
            .first();

          if (refreshedState) {
            const effectResult = await executeEffect(
              ctx,
              refreshedState,
              lobbyId,
              parsedEffect,
              attackerId,
              attacker.cardId,
              []
            );

            if (effectResult.success) {
              await recordEventHelper(ctx, {
                lobbyId,
                gameId: gameState.gameId,
                turnNumber,
                eventType: "effect_activated",
                playerId: attackerId,
                playerUsername: attackerUser?.username || "Unknown",
                description: `${attackerCard.name} battle damage effect: ${effectResult.message}`,
                metadata: { cardId: attacker.cardId, trigger: "on_battle_damage" },
              });
            }
          }
        }
      }
    }

    return result;
  }

  // Flip face-down defender face-up before damage calculation
  // Yu-Gi-Oh rule: Attacking a face-down monster flips it face-up (without triggering Flip Summon)
  // but does trigger "on_flip" effects
  const defenderBoardKey = isHostAttacking ? "opponentBoard" : "hostBoard";
  const currentDefenderBoard = isHostAttacking ? gameState.opponentBoard : gameState.hostBoard;
  const defenderBoardCard = currentDefenderBoard.find((bc) => bc.cardId === defender.cardId);

  if (defenderBoardCard?.isFaceDown) {
    const updatedDefBoard = currentDefenderBoard.map((bc) =>
      bc.cardId === defender.cardId ? { ...bc, isFaceDown: false } : bc
    );
    await ctx.db.patch(gameState._id, { [defenderBoardKey]: updatedDefBoard });

    await recordEventHelper(ctx, {
      lobbyId,
      gameId: gameState.gameId,
      turnNumber,
      eventType: "position_changed",
      playerId: defenderId,
      playerUsername: defenderUser?.username || "Unknown",
      description: `${defenderCard?.name || "Monster"} was flipped face-up by battle`,
      metadata: { cardId: defender.cardId, flippedByBattle: true },
    });

    // Trigger on_flip effects on the defender
    if (defenderCard) {
      const flipAbility = getCardAbility(defenderCard);
      if (flipAbility) {
        for (const flipEffect of flipAbility.effects) {
          if (flipEffect.trigger !== "on_flip") continue;

          const refreshedForFlip = await ctx.db
            .query("gameStates")
            .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
            .first();

          if (refreshedForFlip) {
            const flipResult = await executeEffect(
              ctx,
              refreshedForFlip,
              lobbyId,
              flipEffect,
              defenderId,
              defender.cardId,
              []
            );

            if (flipResult.success) {
              await recordEventHelper(ctx, {
                lobbyId,
                gameId: gameState.gameId,
                turnNumber,
                eventType: "effect_activated",
                playerId: defenderId,
                playerUsername: defenderUser?.username || "Unknown",
                description: `FLIP: ${defenderCard.name} effect: ${flipResult.message}`,
                metadata: { cardId: defender.cardId, trigger: "on_flip" },
              });
            }
          }
        }
      }
    }
  }

  // Safety: Re-verify both combatants still exist on the board after flip effects
  // A flip effect (e.g., "destroy 1 monster") could have removed the attacker
  {
    const postFlipState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .first();
    if (postFlipState) {
      const attackerBoard = isHostAttacking ? postFlipState.hostBoard : postFlipState.opponentBoard;
      const defenderBoard = isHostAttacking ? postFlipState.opponentBoard : postFlipState.hostBoard;
      const attackerStillExists = attackerBoard.some((bc) => bc.cardId === attacker.cardId);
      const defenderStillExists = defenderBoard.some((bc) => bc.cardId === defender.cardId);
      if (!attackerStillExists || !defenderStillExists) {
        // Battle cannot continue — one or both combatants were removed by flip effect
        return { sbaResult: await checkStateBasedActions(ctx, lobbyId), battleResult: result };
      }
    }
  }

  // Get defender position first (needed for damage calculation triggers)
  const defenderIsAttack = defender.position === 1;

  // Check for "on_damage_calculation" triggers on both attacker and defender BEFORE calculating damage
  // This allows effects to modify ATK/DEF before battle
  let effectiveAttackerATK = attacker.attack;
  let effectiveDefenderValue = defenderIsAttack ? defender.attack : defender.defense;

  {
    // Check attacker's on_damage_calculation effects
    const attackerAbility = getCardAbility(attackerCard);
    if (attackerAbility) {
      for (const parsedEffect of attackerAbility.effects) {
        if (parsedEffect.trigger !== "on_damage_calculation") continue;

        const refreshedState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
          .first();

        if (refreshedState) {
          const effectResult = await executeEffect(
            ctx,
            refreshedState,
            lobbyId,
            parsedEffect,
            attackerId,
            attacker.cardId,
            []
          );

          if (effectResult.success) {
            await recordEventHelper(ctx, {
              lobbyId,
              gameId: gameState.gameId,
              turnNumber,
              eventType: "effect_activated",
              playerId: attackerId,
              playerUsername: attackerUser?.username || "Unknown",
              description: `${attackerCard.name} damage calculation effect: ${effectResult.message}`,
              metadata: { cardId: attacker.cardId, trigger: "on_damage_calculation" },
            });

            // Re-fetch attacker stats after effect (may have been modified)
            const updatedState = await ctx.db
              .query("gameStates")
              .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
              .first();
            if (updatedState) {
              const updatedBoard = isHostAttacking
                ? updatedState.hostBoard
                : updatedState.opponentBoard;
              const updatedAttacker = updatedBoard.find((bc) => bc.cardId === attacker.cardId);
              if (updatedAttacker) {
                effectiveAttackerATK = updatedAttacker.attack;
              }
            }
          }
        }
      }
    }

    // Check defender's on_damage_calculation effects
    const defenderAbility = getCardAbility(defenderCard);
    if (defenderAbility) {
      for (const parsedEffect of defenderAbility.effects) {
        if (parsedEffect.trigger !== "on_damage_calculation") continue;

        const refreshedState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
          .first();

        if (refreshedState) {
          const effectResult = await executeEffect(
            ctx,
            refreshedState,
            lobbyId,
            parsedEffect,
            defenderId,
            defender.cardId,
            []
          );

          if (effectResult.success) {
            await recordEventHelper(ctx, {
              lobbyId,
              gameId: gameState.gameId,
              turnNumber,
              eventType: "effect_activated",
              playerId: defenderId,
              playerUsername: defenderUser?.username || "Unknown",
              description: `${defenderCard.name} damage calculation effect: ${effectResult.message}`,
              metadata: { cardId: defender.cardId, trigger: "on_damage_calculation" },
            });

            // Re-fetch defender stats after effect (may have been modified)
            const updatedState = await ctx.db
              .query("gameStates")
              .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
              .first();
            if (updatedState) {
              const updatedBoard = isHostAttacking
                ? updatedState.opponentBoard
                : updatedState.hostBoard;
              const updatedDefender = updatedBoard.find((bc) => bc.cardId === defender.cardId);
              if (updatedDefender) {
                effectiveDefenderValue = defenderIsAttack
                  ? updatedDefender.attack
                  : updatedDefender.defense;
              }
            }
          }
        }
      }
    }
  }

  // Use the effective defender value after on_damage_calculation triggers
  const defenderValue = effectiveDefenderValue;

  // Edge case: Validate defender value is not NaN or negative
  if (Number.isNaN(defenderValue) || defenderValue < 0) {
    console.error(`Invalid defender value: ${defenderValue} for card ${defender.cardId}`);
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Invalid defender stats",
    });
  }

  // Check for "When attacked" trigger on defender BEFORE damage calculation
  {
    const cardAbility = getCardAbility(defenderCard);
    if (cardAbility) {
      for (const parsedEffect of cardAbility.effects) {
        if (parsedEffect.trigger !== "on_battle_attacked") continue;

        const refreshedState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
          .first();

        if (refreshedState) {
          const effectResult = await executeEffect(
            ctx,
            refreshedState,
            lobbyId,
            parsedEffect,
            defenderId,
            defender.cardId,
            []
          );

          if (effectResult.success) {
            await recordEventHelper(ctx, {
              lobbyId,
              gameId: gameState.gameId,
              turnNumber,
              eventType: "effect_activated",
              playerId: defenderId,
              playerUsername: defenderUser?.username || "Unknown",
              description: `${defenderCard.name} attacked effect: ${effectResult.message}`,
              metadata: { cardId: defender.cardId, trigger: "on_battle_attacked" },
            });
          }
        }
      }
    }
  }

  // Scenario 2: Attack Position vs Attack Position
  if (defenderIsAttack) {
    const damage = Math.abs(effectiveAttackerATK - defenderValue);

    // Record damage_calculated event
    await recordEventHelper(ctx, {
      lobbyId,
      gameId: gameState.gameId,
      turnNumber,
      eventType: "damage_calculated",
      playerId: attackerId,
      playerUsername: attackerUser?.username || "Unknown",
      description: `${attackerCard.name} (${effectiveAttackerATK} ATK) vs ${defenderCard.name} (${defenderValue} ATK)`,
      metadata: {
        attackerId: attacker.cardId,
        attackerName: attackerCard.name,
        attackerATK: effectiveAttackerATK,
        defenderId: defender.cardId,
        defenderName: defenderCard.name,
        defenderATK: defenderValue,
        damage,
      },
    });

    if (effectiveAttackerATK > defenderValue) {
      // Attacker wins - destroy defender, deal damage
      result.destroyed.push(defender.cardId);
      await destroyCard(
        ctx,
        lobbyId,
        gameState,
        turnNumber,
        defender.cardId,
        defenderBoard,
        defenderId,
        false
      );

      const gameEnded = await applyDamage(
        ctx,
        lobbyId,
        gameState,
        defenderId,
        damage,
        "battle",
        turnNumber
      );
      result.damageTo.push({ playerId: defenderId, amount: damage });
      result.gameEnded = gameEnded;

      // Check for "When destroys monster by battle" trigger on attacker
      {
        const cardAbility = getCardAbility(attackerCard);
        if (cardAbility) {
          for (const parsedEffect of cardAbility.effects) {
            if (parsedEffect.trigger !== "on_battle_destroy") continue;

            const refreshedState = await ctx.db
              .query("gameStates")
              .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
              .first();

            if (refreshedState) {
              const effectResult = await executeEffect(
                ctx,
                refreshedState,
                lobbyId,
                parsedEffect,
                attackerId,
                attacker.cardId,
                []
              );

              if (effectResult.success) {
                await recordEventHelper(ctx, {
                  lobbyId,
                  gameId: gameState.gameId,
                  turnNumber,
                  eventType: "effect_activated",
                  playerId: attackerId,
                  playerUsername: attackerUser?.username || "Unknown",
                  description: `${attackerCard.name} destroy effect: ${effectResult.message}`,
                  metadata: { cardId: attacker.cardId, trigger: "on_battle_destroy" },
                });
              }
            }
          }
        }
      }

      // Check for "When inflicts battle damage" trigger on attacker
      {
        const cardAbility = getCardAbility(attackerCard);
        if (cardAbility) {
          for (const parsedEffect of cardAbility.effects) {
            if (parsedEffect.trigger !== "on_battle_damage") continue;

            const refreshedState = await ctx.db
              .query("gameStates")
              .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
              .first();

            if (refreshedState) {
              const effectResult = await executeEffect(
                ctx,
                refreshedState,
                lobbyId,
                parsedEffect,
                attackerId,
                attacker.cardId,
                []
              );

              if (effectResult.success) {
                await recordEventHelper(ctx, {
                  lobbyId,
                  gameId: gameState.gameId,
                  turnNumber,
                  eventType: "effect_activated",
                  playerId: attackerId,
                  playerUsername: attackerUser?.username || "Unknown",
                  description: `${attackerCard.name} battle damage effect: ${effectResult.message}`,
                  metadata: { cardId: attacker.cardId, trigger: "on_battle_damage" },
                });
              }
            }
          }
        }
      }
    } else if (effectiveAttackerATK < defenderValue) {
      // Defender wins - destroy attacker, deal damage to attacker's controller
      result.destroyed.push(attacker.cardId);
      await destroyCard(
        ctx,
        lobbyId,
        gameState,
        turnNumber,
        attacker.cardId,
        attackerBoard,
        attackerId,
        true
      );

      const gameEnded = await applyDamage(
        ctx,
        lobbyId,
        gameState,
        attackerId,
        damage,
        "battle",
        turnNumber
      );
      result.damageTo.push({ playerId: attackerId, amount: damage });
      result.gameEnded = gameEnded;
    } else {
      // Equal ATK - both destroyed, no damage
      result.destroyed.push(attacker.cardId, defender.cardId);
      await destroyCard(
        ctx,
        lobbyId,
        gameState,
        turnNumber,
        attacker.cardId,
        attackerBoard,
        attackerId,
        true
      );
      await destroyCard(
        ctx,
        lobbyId,
        gameState,
        turnNumber,
        defender.cardId,
        defenderBoard,
        defenderId,
        false
      );
    }
  }
  // Scenario 3: Attack Position vs Defense Position
  else {
    // Record damage_calculated event
    await recordEventHelper(ctx, {
      lobbyId,
      gameId: gameState.gameId,
      turnNumber,
      eventType: "damage_calculated",
      playerId: attackerId,
      playerUsername: attackerUser?.username || "Unknown",
      description: `${attackerCard.name} (${effectiveAttackerATK} ATK) vs ${defenderCard.name} (${defenderValue} DEF)`,
      metadata: {
        attackerId: attacker.cardId,
        attackerName: attackerCard.name,
        attackerATK: effectiveAttackerATK,
        defenderId: defender.cardId,
        defenderName: defenderCard.name,
        defenderDEF: defenderValue,
      },
    });

    if (effectiveAttackerATK > defenderValue) {
      // Attacker wins - destroy defender
      result.destroyed.push(defender.cardId);
      await destroyCard(
        ctx,
        lobbyId,
        gameState,
        turnNumber,
        defender.cardId,
        defenderBoard,
        defenderId,
        false
      );

      // Check for piercing damage via structured ability type
      const attackerParsedAbility = getCardAbility(attackerCard);
      const hasPiercing =
        attackerParsedAbility?.effects.some((e) => e.type === "piercing") ||
        attackerCard.ability?.effects?.some((e: { type?: string }) => e.type === "piercing");
      if (hasPiercing) {
        const piercingDamage = effectiveAttackerATK - defenderValue;
        const gameEnded = await applyDamage(
          ctx,
          lobbyId,
          gameState,
          defenderId,
          piercingDamage,
          "battle",
          turnNumber
        );
        result.damageTo.push({ playerId: defenderId, amount: piercingDamage });
        result.gameEnded = gameEnded;

        // Check for "When inflicts battle damage" trigger on attacker (piercing)
        {
          const cardAbility = getCardAbility(attackerCard);
          if (cardAbility) {
            for (const parsedEffect of cardAbility.effects) {
              if (parsedEffect.trigger !== "on_battle_damage") continue;

              const refreshedState = await ctx.db
                .query("gameStates")
                .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
                .first();

              if (refreshedState) {
                const effectResult = await executeEffect(
                  ctx,
                  refreshedState,
                  lobbyId,
                  parsedEffect,
                  attackerId,
                  attacker.cardId,
                  []
                );

                if (effectResult.success) {
                  await recordEventHelper(ctx, {
                    lobbyId,
                    gameId: gameState.gameId,
                    turnNumber,
                    eventType: "effect_activated",
                    playerId: attackerId,
                    playerUsername: attackerUser?.username || "Unknown",
                    description: `${attackerCard.name} battle damage effect: ${effectResult.message}`,
                    metadata: { cardId: attacker.cardId, trigger: "on_battle_damage" },
                  });
                }
              }
            }
          }
        }
      }

      // Check for "When destroys monster by battle" trigger on attacker
      {
        const cardAbility = getCardAbility(attackerCard);
        if (cardAbility) {
          for (const parsedEffect of cardAbility.effects) {
            if (parsedEffect.trigger !== "on_battle_destroy") continue;

            const refreshedState = await ctx.db
              .query("gameStates")
              .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
              .first();

            if (refreshedState) {
              const effectResult = await executeEffect(
                ctx,
                refreshedState,
                lobbyId,
                parsedEffect,
                attackerId,
                attacker.cardId,
                []
              );

              if (effectResult.success) {
                await recordEventHelper(ctx, {
                  lobbyId,
                  gameId: gameState.gameId,
                  turnNumber,
                  eventType: "effect_activated",
                  playerId: attackerId,
                  playerUsername: attackerUser?.username || "Unknown",
                  description: `${attackerCard.name} destroy effect: ${effectResult.message}`,
                  metadata: { cardId: attacker.cardId, trigger: "on_battle_destroy" },
                });
              }
            }
          }
        }
      }
    } else if (effectiveAttackerATK < defenderValue) {
      // Defender wins - no destruction, damage to attacker's controller
      const damage = defenderValue - effectiveAttackerATK;
      const gameEnded = await applyDamage(
        ctx,
        lobbyId,
        gameState,
        attackerId,
        damage,
        "battle",
        turnNumber
      );
      result.damageTo.push({ playerId: attackerId, amount: damage });
      result.gameEnded = gameEnded;
    }
    // If equal: no destruction, no damage
  }

  return result;
}

/**
 * Destroy a card in battle
 *
 * Records card_destroyed_battle and card_to_graveyard events.
 */
async function destroyCard(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  turnNumber: number,
  cardId: Id<"cardDefinitions">,
  board: Array<{
    cardId: Id<"cardDefinitions">;
    position: number;
    attack: number;
    defense: number;
    hasAttacked: boolean;
    isFaceDown: boolean;
    cannotBeDestroyedByBattle?: boolean;
    cannotBeDestroyedByEffects?: boolean;
    cannotBeTargeted?: boolean;
  }>,
  ownerId: Id<"users">,
  isAttacker: boolean
): Promise<void> {
  // Edge case: Validate board is array
  if (!Array.isArray(board)) {
    console.error("destroyCard called with invalid board");
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Invalid board state",
    });
  }

  const card = await ctx.db.get(cardId);
  const owner = await ctx.db.get(ownerId);

  // Edge case: Validate card exists
  if (!card) {
    console.error(`Card ${cardId} not found in database during destruction`);
    return; // Skip destruction for non-existent card
  }

  // Edge case: Validate owner exists
  if (!owner) {
    console.error(`Owner ${ownerId} not found for card ${cardId}`);
    throw createError(ErrorCode.NOT_FOUND_USER, {
      reason: "Card owner not found",
    });
  }

  // Check protection: Cannot be destroyed by battle
  const boardCard = board.find((bc) => bc.cardId === cardId);

  // Edge case: Validate card is on board
  if (!boardCard) {
    console.warn(`Card ${cardId} not found on board during destruction`);
    return; // Skip destruction if card not on board
  }

  if (boardCard.cannotBeDestroyedByBattle) {
    console.log(`${card.name} is protected from battle destruction`);
    return; // Skip destruction
  }

  // Record card_destroyed_battle event
  await recordEventHelper(ctx, {
    lobbyId,
    gameId: gameState.gameId,
    turnNumber,
    eventType: "card_destroyed_battle",
    playerId: ownerId,
    playerUsername: owner?.username || "Unknown",
    description: `${card?.name || "Unknown"} was destroyed in battle`,
    metadata: {
      cardId,
      cardName: card?.name,
      destroyedAsAttacker: isAttacker,
    },
  });

  // Check for "When destroyed" trigger effects BEFORE moving to graveyard
  {
    const cardAbility = getCardAbility(card);
    if (cardAbility) {
      for (const parsedEffect of cardAbility.effects) {
        if (
          parsedEffect.trigger !== "on_destroy" &&
          parsedEffect.trigger !== "on_destroy_by_battle"
        )
          continue;

        const refreshedState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
          .first();

        if (refreshedState) {
          const effectResult = await executeEffect(
            ctx,
            refreshedState,
            lobbyId,
            parsedEffect,
            ownerId,
            cardId,
            [] // No targets for auto-trigger effects
          );

          if (effectResult.success) {
            await recordEventHelper(ctx, {
              lobbyId,
              gameId: gameState.gameId,
              turnNumber,
              eventType: "effect_activated",
              playerId: ownerId,
              playerUsername: owner?.username || "Unknown",
              description: `${card.name} on-destroy effect: ${effectResult.message}`,
              metadata: { cardId, trigger: "on_destroy" },
            });
          }
        }
      }
    }
  }

  // Refresh state after triggers may have modified the board
  const refreshedStateAfterTriggers = await ctx.db
    .query("gameStates")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .first();
  if (!refreshedStateAfterTriggers) return;

  // Re-check card is still on board (trigger may have already removed it)
  const isHost = ownerId === refreshedStateAfterTriggers.hostId;
  const currentBoard = isHost
    ? refreshedStateAfterTriggers.hostBoard
    : refreshedStateAfterTriggers.opponentBoard;
  const stillOnBoard = currentBoard.some((bc) => bc.cardId === cardId);
  if (!stillOnBoard) return; // Already removed by trigger

  // Move to graveyard
  await moveCard(
    ctx,
    refreshedStateAfterTriggers,
    cardId,
    "board",
    "graveyard",
    ownerId,
    turnNumber
  );

  // Build update: remove from board + destroy equipped spells
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic game state updates with flexible field types
  const updates: Record<string, any> = {
    [isHost ? "hostBoard" : "opponentBoard"]: currentBoard.filter((bc) => bc.cardId !== cardId),
  };

  // Destroy equipped spells when monster is destroyed (mirror logic from destroy.ts)
  const destroyedBoardCard = currentBoard.find((bc) => bc.cardId === cardId);
  if (destroyedBoardCard?.equippedCards && destroyedBoardCard.equippedCards.length > 0) {
    const equippedIds = destroyedBoardCard.equippedCards;

    // Remove from host spell/trap zone
    const hostEquips = refreshedStateAfterTriggers.hostSpellTrapZone.filter((st) =>
      equippedIds.includes(st.cardId)
    );
    if (hostEquips.length > 0) {
      updates["hostSpellTrapZone"] = refreshedStateAfterTriggers.hostSpellTrapZone.filter(
        (st) => !equippedIds.includes(st.cardId)
      );
      updates["hostGraveyard"] = [
        ...refreshedStateAfterTriggers.hostGraveyard,
        ...hostEquips.map((st) => st.cardId),
      ];
    }

    // Remove from opponent spell/trap zone
    const opponentEquips = refreshedStateAfterTriggers.opponentSpellTrapZone.filter((st) =>
      equippedIds.includes(st.cardId)
    );
    if (opponentEquips.length > 0) {
      updates["opponentSpellTrapZone"] = refreshedStateAfterTriggers.opponentSpellTrapZone.filter(
        (st) => !equippedIds.includes(st.cardId)
      );
      updates["opponentGraveyard"] = [
        ...refreshedStateAfterTriggers.opponentGraveyard,
        ...opponentEquips.map((st) => st.cardId),
      ];
    }
  }

  await ctx.db.patch(refreshedStateAfterTriggers._id, updates);
}

// ============================================================================
// CONTINUE ATTACK AFTER REPLAY
// ============================================================================

/**
 * Continue an attack after replay resolution
 *
 * Called after the attacker has responded to a replay prompt.
 * The pendingAction should contain the new target (or undefined for direct attack).
 *
 * This mutation executes the damage step of the battle.
 */
export const continueAttackAfterReplay = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
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

    // 4. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 5. Validate pending action exists
    const pendingAction = gameState.pendingAction;
    if (!pendingAction || pendingAction.type !== "attack" || !pendingAction.attackerId) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "No pending attack to continue",
      });
    }

    // 6. Clear any pending replay (should already be cleared but safety check)
    if (gameState.pendingReplay) {
      await clearPendingReplay(ctx, gameState);
    }

    const isHost = user.userId === gameState.hostId;
    const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const opponentId = isHost ? gameState.opponentId : gameState.hostId;
    const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;

    // 7. Validate attacker still exists
    const attacker = playerBoard.find((bc) => bc.cardId === pendingAction.attackerId);
    if (!attacker) {
      // Attacker was removed, clear pending action
      await ctx.db.patch(gameState._id, {
        pendingAction: undefined,
      });
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Attacking monster no longer on field",
      });
    }

    // 8. Get attacker card
    const attackerCard = await ctx.db.get(pendingAction.attackerId);
    if (!attackerCard) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Attacker card not found",
      });
    }

    // 9. Validate target (if not direct attack)
    let defender: (typeof opponentBoard)[number] | undefined;
    let defenderCard: Doc<"cardDefinitions"> | undefined;

    if (pendingAction.targetId) {
      defender = opponentBoard.find((bc) => bc.cardId === pendingAction.targetId);
      if (!defender) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Target monster not on opponent's field",
        });
      }
      // Validate target isn't protected
      if (defender.cannotBeTargeted) {
        await ctx.db.patch(gameState._id, { pendingAction: undefined });
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Target monster cannot be targeted",
        });
      }
      const card = await ctx.db.get(pendingAction.targetId);
      if (!card) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Defender card not found",
        });
      }
      defenderCard = card;
    } else {
      // Direct attack - validate allowed
      if (opponentBoard.length > 0) {
        // Check for direct attack ability
        const parsedAbility = getCardFirstEffect(attackerCard);
        let canDirectAttack = false;
        if (parsedAbility?.type === "directAttack") {
          if (parsedAbility.condition === "no_opponent_attack_monsters") {
            const opponentAttackMonsters = opponentBoard.filter((bc) => bc.position === 1);
            canDirectAttack = opponentAttackMonsters.length === 0;
          }
        }
        if (!canDirectAttack) {
          throw createError(ErrorCode.GAME_INVALID_MOVE, {
            reason: "Cannot attack directly while opponent has monsters",
          });
        }
      }
    }

    // 10. Calculate effective stats
    const attackerTempStats = getModifiedStats(
      gameState,
      attacker.cardId,
      attackerCard.attack || 0,
      attackerCard.defense || 0
    );
    const attackerContinuousBonus = await applyContinuousEffects(
      ctx,
      gameState,
      attacker.cardId,
      attackerCard,
      isHost
    );
    const effectiveAttackerATK = attackerTempStats.attack + attackerContinuousBonus.atkBonus;

    const effectiveAttacker = {
      ...attacker,
      attack: effectiveAttackerATK,
    };

    let effectiveDefender = defender;
    if (defender && defenderCard) {
      const defenderTempStats = getModifiedStats(
        gameState,
        defender.cardId,
        defenderCard.attack || 0,
        defenderCard.defense || 0
      );
      const defenderContinuousBonus = await applyContinuousEffects(
        ctx,
        gameState,
        defender.cardId,
        defenderCard,
        !isHost
      );
      effectiveDefender = {
        ...defender,
        attack: Math.max(0, defenderTempStats.attack + defenderContinuousBonus.atkBonus),
        defense: Math.max(0, defenderTempStats.defense + defenderContinuousBonus.defBonus),
      };
    }

    // Validate turn number
    if (gameState.turnNumber === undefined) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Turn number not found",
      });
    }

    // 11. Resolve battle
    const battleResult = await resolveBattle(
      ctx,
      args.lobbyId,
      gameState,
      gameState.turnNumber,
      user.userId,
      opponentId,
      effectiveAttacker,
      attackerCard,
      effectiveDefender,
      defenderCard
    );

    // 13. Mark attacker as having attacked
    const refreshedState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (refreshedState) {
      const refreshedPlayerBoard = isHost ? refreshedState.hostBoard : refreshedState.opponentBoard;
      const updatedPlayerBoard = refreshedPlayerBoard.map((bc) =>
        bc.cardId === pendingAction.attackerId ? { ...bc, hasAttacked: true } : bc
      );

      await ctx.db.patch(refreshedState._id, {
        [isHost ? "hostBoard" : "opponentBoard"]: updatedPlayerBoard,
        pendingAction: undefined,
      });
    }

    // 12. Run state-based action checks
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: true,
      turnNumber: gameState.turnNumber,
    });

    if (sbaResult.gameEnded) {
      battleResult.gameEnded = true;
    }

    return {
      success: true,
      battleResult,
      sbaResult: {
        gameEnded: sbaResult.gameEnded,
        winnerId: sbaResult.winnerId,
        destroyedCards: sbaResult.allDestroyedCards,
      },
    };
  },
});

/**
 * Declare Attack (Internal)
 *
 * Internal mutation for API-based attack.
 * Accepts gameId string for story mode support.
 */
export const declareAttackInternal = internalMutation({
  args: {
    gameId: v.string(),
    userId: v.id("users"),
    attackerCardId: v.string(),
    targetCardId: v.optional(v.string()), // undefined = direct attack
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
    const username = user?.username ?? user?.name ?? "Unknown";

    // 5. Validate in Battle Phase
    const currentPhase = gameState.currentPhase;
    if (currentPhase !== "battle" && currentPhase !== "battle_start") {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Can only attack during Battle Phase",
        currentPhase,
      });
    }

    // 5.5. First turn restriction — first player cannot attack on turn 1
    if (gameState.turnNumber === 1) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Cannot attack on the first turn of the game",
      });
    }

    const isHost = args.userId === gameState.hostId;
    const myBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;

    // 6. Find attacker on board
    const attackerCardIdAsId = args.attackerCardId as Id<"cardDefinitions">;
    const attackerIndex = myBoard.findIndex((bc) => bc.cardId === attackerCardIdAsId);
    if (attackerIndex === -1) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Attacker not found on your field",
        cardId: args.attackerCardId,
      });
    }

    const attackerBoardCard = myBoard[attackerIndex];
    if (!attackerBoardCard) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Attacker board card not found",
        cardId: args.attackerCardId,
      });
    }

    // 7. Validate attacker can attack
    if (attackerBoardCard.hasAttacked) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "This monster has already attacked this turn",
      });
    }

    if (attackerBoardCard.position !== 1) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Monster must be in Attack Position to attack",
      });
    }

    if (attackerBoardCard.isFaceDown) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Face-down monsters cannot attack",
      });
    }

    // 8. Get attacker card data
    const attackerCard = await ctx.db.get(attackerCardIdAsId);
    if (!attackerCard) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Attacker card not found",
      });
    }

    const attackerAtk = attackerBoardCard.attack;
    let attackType: "direct" | "monster" = "direct";
    // biome-ignore lint/suspicious/noExplicitAny: Board card structure varies during combat
    let targetBoardCard: any = null;
    let targetCard: Doc<"cardDefinitions"> | null = null;
    let damage = 0;
    const destroyed: string[] = [];

    // 9. Handle target
    if (args.targetCardId) {
      // Attack specific monster
      attackType = "monster";
      const targetCardIdAsId = args.targetCardId as Id<"cardDefinitions">;
      const targetIndex = opponentBoard.findIndex((bc) => bc.cardId === targetCardIdAsId);

      if (targetIndex === -1) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Target not found on opponent's field",
        });
      }

      targetBoardCard = opponentBoard[targetIndex];
      targetCard = await ctx.db.get(targetCardIdAsId);

      // Calculate battle result
      const targetValue =
        targetBoardCard.position === 1
          ? targetBoardCard.attack // ATK position - use ATK
          : targetBoardCard.defense; // DEF position - use DEF

      if (targetBoardCard.position === 1) {
        // Attack vs Attack
        if (attackerAtk > targetValue) {
          damage = attackerAtk - targetValue;
          destroyed.push(targetCard?.name || "Monster");
          // Remove target from board
          // biome-ignore lint/suspicious/noExplicitAny: Filter callback with unused element parameter
          const newOpponentBoard = opponentBoard.filter((_: any, i: number) => i !== targetIndex);
          await ctx.db.patch(gameState._id, {
            [isHost ? "opponentBoard" : "hostBoard"]: newOpponentBoard,
            [isHost ? "opponentLifePoints" : "hostLifePoints"]: Math.max(
              0,
              (isHost ? gameState.opponentLifePoints : gameState.hostLifePoints) - damage
            ),
          });
        } else if (attackerAtk < targetValue) {
          damage = targetValue - attackerAtk;
          destroyed.push(attackerCard.name);
          // Remove attacker from board
          // biome-ignore lint/suspicious/noExplicitAny: Filter callback with unused element parameter
          const newMyBoard = myBoard.filter((_: any, i: number) => i !== attackerIndex);
          await ctx.db.patch(gameState._id, {
            [isHost ? "hostBoard" : "opponentBoard"]: newMyBoard,
            [isHost ? "hostLifePoints" : "opponentLifePoints"]: Math.max(
              0,
              (isHost ? gameState.hostLifePoints : gameState.opponentLifePoints) - damage
            ),
          });
        } else {
          // Tie - both destroyed
          destroyed.push(attackerCard.name, targetCard?.name || "Monster");
          // biome-ignore lint/suspicious/noExplicitAny: Filter callback with unused element parameter
          const newMyBoard = myBoard.filter((_: any, i: number) => i !== attackerIndex);
          // biome-ignore lint/suspicious/noExplicitAny: Filter callback with unused element parameter
          const newOpponentBoard = opponentBoard.filter((_: any, i: number) => i !== targetIndex);
          await ctx.db.patch(gameState._id, {
            [isHost ? "hostBoard" : "opponentBoard"]: newMyBoard,
            [isHost ? "opponentBoard" : "hostBoard"]: newOpponentBoard,
          });
        }
      } else {
        // Attack vs Defense
        if (attackerAtk > targetValue) {
          destroyed.push(targetCard?.name || "Monster");
          // biome-ignore lint/suspicious/noExplicitAny: Filter callback with unused element parameter
          const newOpponentBoard = opponentBoard.filter((_: any, i: number) => i !== targetIndex);
          await ctx.db.patch(gameState._id, {
            [isHost ? "opponentBoard" : "hostBoard"]: newOpponentBoard,
          });
        } else if (attackerAtk < targetValue) {
          damage = targetValue - attackerAtk;
          await ctx.db.patch(gameState._id, {
            [isHost ? "hostLifePoints" : "opponentLifePoints"]: Math.max(
              0,
              (isHost ? gameState.hostLifePoints : gameState.opponentLifePoints) - damage
            ),
          });
        }
        // Tie in defense = nothing happens
      }
    } else {
      // Direct attack
      if (opponentBoard.length > 0) {
        throw createError(ErrorCode.GAME_INVALID_MOVE, {
          reason: "Cannot direct attack when opponent has monsters",
        });
      }
      damage = attackerAtk;
      await ctx.db.patch(gameState._id, {
        [isHost ? "opponentLifePoints" : "hostLifePoints"]: Math.max(
          0,
          (isHost ? gameState.opponentLifePoints : gameState.hostLifePoints) - damage
        ),
      });
    }

    // 10. Mark attacker as having attacked
    const updatedMyBoard = [...myBoard];
    if (updatedMyBoard[attackerIndex]) {
      updatedMyBoard[attackerIndex] = { ...updatedMyBoard[attackerIndex], hasAttacked: true };
      await ctx.db.patch(gameState._id, {
        [isHost ? "hostBoard" : "opponentBoard"]: updatedMyBoard,
      });
    }

    // 11. Record attack event
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "attack_declared",
      playerId: args.userId,
      playerUsername: username,
      description:
        attackType === "direct"
          ? `${attackerCard.name} attacked directly for ${damage} damage!`
          : `${attackerCard.name} attacked ${targetCard?.name || "Monster"}`,
      metadata: {
        attackerCardId: args.attackerCardId,
        attackerName: attackerCard.name,
        targetCardId: args.targetCardId,
        targetName: targetCard?.name,
        attackType,
        damage,
        destroyed,
      },
    });

    // 12. Check for game end
    const refreshedState = await ctx.db.get(gameState._id);
    const opponentLp = isHost ? refreshedState?.opponentLifePoints : refreshedState?.hostLifePoints;
    const myLp = isHost ? refreshedState?.hostLifePoints : refreshedState?.opponentLifePoints;

    let gameEnded = false;
    let winnerId = null;

    if (opponentLp !== undefined && opponentLp <= 0) {
      gameEnded = true;
      winnerId = args.userId;
    } else if (myLp !== undefined && myLp <= 0) {
      gameEnded = true;
      winnerId = isHost ? gameState.opponentId : gameState.hostId;
    }

    return {
      success: true,
      attackType,
      attackerName: attackerCard.name,
      targetName: targetCard?.name,
      damage,
      destroyed,
      gameEnded,
      winnerId,
      newLifePoints: {
        my: myLp,
        opponent: opponentLp,
      },
    };
  },
});

/**
 * Pass priority in a response window (Battle Step / Damage Step flow)
 *
 * Called by players to pass their priority during a response window.
 * When both players pass consecutively, the window resolves and the
 * battle transitions to the next step (attack_declaration → damage_calculation → resolve).
 */
export const passResponseWindowPriority = mutation({
  args: { lobbyId: v.id("gameLobbies") },
  handler: async (ctx, args) => {
    const user = await requireAuthMutation(ctx);
    await validateGameActive(ctx.db, args.lobbyId);

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found",
      });
    }

    if (!gameState.responseWindow) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "No response window active",
      });
    }

    const result = await passResponsePriority(ctx, args.lobbyId, gameState, user.userId);

    // If damage_calculation window closed, execute the damage step
    if (result.battleTransition === "execute_damage") {
      const freshState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
        .first();
      if (freshState) {
        const damageResult = await executeDamageStep(ctx, args.lobbyId, freshState);
        return { ...result, battleResult: damageResult };
      }
    }

    return result;
  },
});

/**
 * Pass priority in a response window (Internal - for agent API)
 */
export const passResponseWindowPriorityInternal = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await validateGameActive(ctx.db, args.lobbyId);

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found",
      });
    }

    if (!gameState.responseWindow) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "No response window active",
      });
    }

    const result = await passResponsePriority(ctx, args.lobbyId, gameState, args.userId);

    // If damage_calculation window closed, execute the damage step
    if (result.battleTransition === "execute_damage") {
      const freshState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
        .first();
      if (freshState) {
        const damageResult = await executeDamageStep(ctx, args.lobbyId, freshState);
        return { ...result, battleResult: damageResult };
      }
    }

    return result;
  },
});

/**
 * Execute the damage step from a pending attack action.
 *
 * Called when the damage_calculation response window closes (both players passed).
 * Reads pendingAction, calculates effective stats, resolves battle, marks hasAttacked,
 * runs state-based actions, and clears pendingAction.
 */
export async function executeDamageStep(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">
) {
  const pendingAction = gameState.pendingAction;
  if (!pendingAction || pendingAction.type !== "attack" || !pendingAction.attackerId) {
    return { success: false, message: "No pending attack" };
  }

  const isHost = gameState.currentTurnPlayerId === gameState.hostId;
  const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const opponentId = isHost ? gameState.opponentId : gameState.hostId;
  const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;

  // Validate attacker still exists
  const attacker = playerBoard.find((bc) => bc.cardId === pendingAction.attackerId);
  if (!attacker) {
    await ctx.db.patch(gameState._id, { pendingAction: undefined });
    return { success: false, message: "Attacking monster no longer on field" };
  }

  const attackerCard = await ctx.db.get(pendingAction.attackerId);
  if (!attackerCard) {
    await ctx.db.patch(gameState._id, { pendingAction: undefined });
    return { success: false, message: "Attacker card not found" };
  }

  // Validate target if not direct attack
  let defender: (typeof opponentBoard)[number] | undefined;
  let defenderCard: Doc<"cardDefinitions"> | undefined;

  if (pendingAction.targetId) {
    defender = opponentBoard.find((bc) => bc.cardId === pendingAction.targetId);
    if (!defender) {
      await ctx.db.patch(gameState._id, { pendingAction: undefined });
      return { success: false, message: "Target monster no longer on field" };
    }
    const card = await ctx.db.get(pendingAction.targetId);
    if (card) defenderCard = card;
  } else {
    // Direct attack — validate opponent still has no monsters (unless card effect)
    if (opponentBoard.length > 0) {
      const parsedAbility = getCardFirstEffect(attackerCard);
      let canDirectAttack = false;
      if (parsedAbility?.type === "directAttack") {
        if (parsedAbility.condition === "no_opponent_attack_monsters") {
          const opponentAttackMonsters = opponentBoard.filter((bc) => bc.position === 1);
          canDirectAttack = opponentAttackMonsters.length === 0;
        }
      }
      if (!canDirectAttack) {
        await ctx.db.patch(gameState._id, { pendingAction: undefined });
        return { success: false, message: "Cannot attack directly while opponent has monsters" };
      }
    }
  }

  // Calculate effective stats
  const attackerTempStats = getModifiedStats(
    gameState,
    attacker.cardId,
    attackerCard.attack || 0,
    attackerCard.defense || 0
  );
  const attackerContinuousBonus = await applyContinuousEffects(
    ctx,
    gameState,
    attacker.cardId,
    attackerCard,
    isHost
  );
  const effectiveAttackerATK = attackerTempStats.attack + attackerContinuousBonus.atkBonus;

  const effectiveAttacker = {
    ...attacker,
    attack: effectiveAttackerATK,
  };

  let effectiveDefender = defender;
  if (defender && defenderCard) {
    const defenderTempStats = getModifiedStats(
      gameState,
      defender.cardId,
      defenderCard.attack || 0,
      defenderCard.defense || 0
    );
    const defenderContinuousBonus = await applyContinuousEffects(
      ctx,
      gameState,
      defender.cardId,
      defenderCard,
      !isHost
    );
    effectiveDefender = {
      ...defender,
      attack: Math.max(0, defenderTempStats.attack + defenderContinuousBonus.atkBonus),
      defense: Math.max(0, defenderTempStats.defense + defenderContinuousBonus.defBonus),
    };
  }

  if (gameState.turnNumber === undefined) {
    return { success: false, message: "Turn number not found" };
  }

  // Resolve battle
  const battleResult = await resolveBattle(
    ctx,
    lobbyId,
    gameState,
    gameState.turnNumber,
    gameState.currentTurnPlayerId,
    opponentId,
    effectiveAttacker,
    attackerCard,
    effectiveDefender,
    defenderCard
  );

  // Mark attacker as having attacked
  const refreshedState = await ctx.db
    .query("gameStates")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .first();

  if (refreshedState) {
    const refreshedPlayerBoard = isHost ? refreshedState.hostBoard : refreshedState.opponentBoard;
    const updatedPlayerBoard = refreshedPlayerBoard.map((bc) =>
      bc.cardId === pendingAction.attackerId ? { ...bc, hasAttacked: true } : bc
    );

    await ctx.db.patch(refreshedState._id, {
      [isHost ? "hostBoard" : "opponentBoard"]: updatedPlayerBoard,
      pendingAction: undefined,
    });
  }

  // Run state-based action checks
  const sbaResult = await checkStateBasedActions(ctx, lobbyId, {
    skipHandLimit: true,
    turnNumber: gameState.turnNumber,
  });

  if (sbaResult.gameEnded) {
    battleResult.gameEnded = true;
  }

  return {
    success: true,
    battleResult,
    sbaResult: {
      gameEnded: sbaResult.gameEnded,
      winnerId: sbaResult.winnerId,
      destroyedCards: sbaResult.allDestroyedCards,
    },
  };
}
