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
import { mutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { getCardAbility, getCardFirstEffect } from "../lib/abilityHelpers";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import {
  applyContinuousEffects,
  applyDamage,
  getModifiedStats,
  moveCard,
} from "../lib/gameHelpers";
import { executeEffect } from "./effectSystem/index";
import { checkStateBasedActions } from "./gameEngine/stateBasedActions";
import { recordEventHelper } from "./gameEvents";
import { getOpponentMonsterCount, clearPendingReplay } from "./replaySystem";

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
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found",
      });
    }

    // 5. Validate in Battle Phase
    const currentPhase = gameState.currentPhase;
    if (currentPhase !== "battle" && currentPhase !== "battle_start") {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Can only attack during Battle Phase",
        currentPhase,
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

    // 10. Record attack_declared event
    const opponent = await ctx.db.get(opponentId);

    // Edge case: Validate opponent exists
    if (!opponent) {
      throw createError(ErrorCode.NOT_FOUND_USER, {
        reason: "Opponent not found",
      });
    }

    // Validate game state for event recording
    if (!lobby.gameId || lobby.turnNumber === undefined) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game ID or turn number not found",
      });
    }

    // Store original opponent monster count for potential replay detection
    const originalOpponentMonsterCount = getOpponentMonsterCount(gameState, user.userId);

    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId,
      turnNumber: lobby.turnNumber,
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

    // 11. Resolve battle
    const battleResult = await resolveBattle(
      ctx,
      args.lobbyId,
      gameState,
      lobby.turnNumber,
      user.userId,
      opponentId,
      effectiveAttacker,
      attackerCard,
      effectiveDefender,
      defenderCard
    );

    // 12. Mark attacker as having attacked
    const updatedPlayerBoard = playerBoard.map((bc) =>
      bc.cardId === args.attackerCardId ? { ...bc, hasAttacked: true } : bc
    );

    // Edge case: Verify attacker is still on board after battle
    const attackerStillExists = updatedPlayerBoard.some((bc) => bc.cardId === args.attackerCardId);
    if (!attackerStillExists) {
      console.warn(`Attacker ${args.attackerCardId} was destroyed during battle resolution`);
    }

    await ctx.db.patch(gameState._id, {
      [isHost ? "hostBoard" : "opponentBoard"]: updatedPlayerBoard,
    });

    // 13. Run state-based action checks after combat
    // This catches any monsters that should be destroyed due to stat changes
    // and checks win conditions after damage
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: true,
      turnNumber: lobby.turnNumber,
    });

    // If SBA ended the game, update battle result
    if (sbaResult.gameEnded) {
      battleResult.gameEnded = true;
    }

    // 14. Return battle result
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
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found",
      });
    }

    // 5. Validate in Battle Phase
    const currentPhase = gameState.currentPhase;
    if (currentPhase !== "battle" && currentPhase !== "battle_start") {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Can only attack during Battle Phase",
        currentPhase,
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
      defenderCard = await ctx.db.get(args.targetCardId) ?? undefined;
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

    // 10. Record attack declaration event
    if (lobby.gameId && lobby.turnNumber !== undefined) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: lobby.turnNumber,
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

  // Get defender stats based on position
  const defenderIsAttack = defender.position === 1;
  const defenderValue = defenderIsAttack ? defender.attack : defender.defense;

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
    const damage = Math.abs(attacker.attack - defenderValue);

    // Record damage_calculated event
    await recordEventHelper(ctx, {
      lobbyId,
      gameId: gameState.gameId,
      turnNumber,
      eventType: "damage_calculated",
      playerId: attackerId,
      playerUsername: attackerUser?.username || "Unknown",
      description: `${attackerCard.name} (${attacker.attack} ATK) vs ${defenderCard.name} (${defenderValue} ATK)`,
      metadata: {
        attackerId: attacker.cardId,
        attackerName: attackerCard.name,
        attackerATK: attacker.attack,
        defenderId: defender.cardId,
        defenderName: defenderCard.name,
        defenderATK: defenderValue,
        damage,
      },
    });

    if (attacker.attack > defenderValue) {
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
    } else if (attacker.attack < defenderValue) {
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
      description: `${attackerCard.name} (${attacker.attack} ATK) vs ${defenderCard.name} (${defenderValue} DEF)`,
      metadata: {
        attackerId: attacker.cardId,
        attackerName: attackerCard.name,
        attackerATK: attacker.attack,
        defenderId: defender.cardId,
        defenderName: defenderCard.name,
        defenderDEF: defenderValue,
      },
    });

    if (attacker.attack > defenderValue) {
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

      // Check for piercing damage (check if ability name contains "piercing" or has a piercing effect)
      const hasPiercing =
        attackerCard.ability?.name?.toLowerCase().includes("piercing") ||
        attackerCard.ability?.effects?.some((e: { type?: string }) => e.type === "piercing");
      if (hasPiercing) {
        const piercingDamage = attacker.attack - defenderValue;
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
    } else if (attacker.attack < defenderValue) {
      // Defender wins - no destruction, damage to attacker's controller
      const damage = defenderValue - attacker.attack;
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
        if (parsedEffect.trigger !== "on_destroy") continue;

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

  // Move to graveyard
  await moveCard(ctx, gameState, cardId, "board", "graveyard", ownerId, turnNumber);

  // Remove from board
  const isHost = ownerId === gameState.hostId;
  const newBoard = board.filter((bc) => bc.cardId !== cardId);
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
  });
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
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found",
      });
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
    if (lobby.turnNumber === undefined) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Turn number not found",
      });
    }

    // 11. Clear pending action before battle resolution
    await ctx.db.patch(gameState._id, {
      pendingAction: undefined,
    });

    // 12. Resolve battle
    const battleResult = await resolveBattle(
      ctx,
      args.lobbyId,
      gameState,
      lobby.turnNumber,
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
      });
    }

    // 14. Run state-based action checks
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: true,
      turnNumber: lobby.turnNumber,
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
