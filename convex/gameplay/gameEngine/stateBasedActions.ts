/**
 * State-Based Actions (SBA)
 *
 * Implements LunchTable TCG state-based action checking that runs continuously
 * until no more state changes occur. These actions happen automatically
 * and do NOT trigger response windows.
 *
 * State-Based Actions checked (in order):
 * 1. Win condition - LP: If any player's LP <= 0, end the game
 * 1b. Win condition - Breakdown: If any player caused 3+ Breakdowns, they win
 * 2. Monster destruction: Monsters with stats reduced below 0 are destroyed
 * 2b. Breakdown triggers: Stereotypes with Stability <= 0 or Vice >= 3 trigger Breakdown
 * 3. Field spell replacement: Only one class card per player
 * 4. Orphaned equip spells: Equip targets gone
 * 5. Token zone violations: Tokens in non-field zones removed
 * 6. Hand size limit: At end of turn, discard down to max hand size
 */

// Workaround for TS2589 (excessively deep type instantiation)
import * as generatedApi from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { GAME_CONFIG } from "@ltcg/core";
import { getCardAbility } from "../../lib/abilityHelpers";
import { logger } from "../../lib/debug";

import { executeEffect } from "../effectSystem/index";
import { recordEventHelper, recordGameEndHelper } from "../gameEvents";
import { emitEvent } from "../../events/emitter";

// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const internalAny = (generatedApi as any).internal;

// LunchTable Breakdown constants
const BREAKDOWN_THRESHOLD = GAME_CONFIG.VICE.BREAKDOWN_THRESHOLD;
const MAX_BREAKDOWNS_WIN = GAME_CONFIG.VICE.MAX_BREAKDOWNS_WIN;

/** Result from a single SBA check cycle */
export interface SBACheckResult {
  /** Whether any state-based action was taken */
  changed: boolean;
  /** Whether the game has ended */
  gameEnded: boolean;
  /** Winner ID if game ended */
  winnerId?: Id<"users">;
  /** Reason for game end */
  endReason?: "lp_zero" | "deck_out" | "breakdown";
  /** Cards that were destroyed by SBA */
  destroyedCards: Id<"cardDefinitions">[];
  /** Debug log of actions taken */
  actionsTaken: string[];
}

/** Combined result from full SBA checking loop */
export interface SBALoopResult {
  /** Whether any actions were taken across all cycles */
  anyChanged: boolean;
  /** Whether the game has ended */
  gameEnded: boolean;
  /** Winner ID if game ended */
  winnerId?: Id<"users">;
  /** Reason for game end */
  endReason?: "lp_zero" | "deck_out" | "breakdown";
  /** Total cycles run */
  cycleCount: number;
  /** All destroyed cards across all cycles */
  allDestroyedCards: Id<"cardDefinitions">[];
  /** All actions taken */
  allActionsTaken: string[];
}

/**
 * Main SBA check loop
 *
 * Runs continuously until no more state changes occur.
 * Should be called after each effect resolves, after chain resolution,
 * after combat damage, and at the end of each phase transition.
 *
 * @param ctx - Mutation context
 * @param lobbyId - Game lobby ID
 * @param options - Optional configuration
 * @returns SBA loop result with all changes made
 */
export async function checkStateBasedActions(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  options?: {
    /** Skip hand limit check (not at end of turn) */
    skipHandLimit?: boolean;
    /** Current turn number for events */
    turnNumber?: number;
  }
): Promise<SBALoopResult> {
  const result: SBALoopResult = {
    anyChanged: false,
    gameEnded: false,
    cycleCount: 0,
    allDestroyedCards: [],
    allActionsTaken: [],
  };

  // Track cards that have already triggered on_destroy to prevent infinite loops
  // Local to this invocation — no cross-mutation contamination
  const destroyTriggeredCards = new Set<string>();

  const maxCycles = 100; // Safety limit to prevent infinite loops
  let changed = true;

  logger.debug("Starting SBA check loop", { lobbyId });

  while (changed && result.cycleCount < maxCycles) {
    result.cycleCount++;

    // Refresh game state for each cycle
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .first();

    if (!gameState) {
      logger.warn("Game state not found during SBA check", { lobbyId });
      break;
    }

    const lobby = await ctx.db.get(lobbyId);
    if (!lobby) {
      logger.warn("Lobby not found during SBA check", { lobbyId });
      break;
    }

    const turnNumber = options?.turnNumber ?? gameState.turnNumber ?? 0;

    // Run single SBA check cycle
    const cycleResult = await runSBACycle(
      ctx,
      gameState,
      lobbyId,
      turnNumber,
      options?.skipHandLimit ?? true,
      destroyTriggeredCards
    );

    changed = cycleResult.changed;

    if (changed) {
      result.anyChanged = true;
      result.allDestroyedCards.push(...cycleResult.destroyedCards);
      result.allActionsTaken.push(...cycleResult.actionsTaken);
    }

    if (cycleResult.gameEnded) {
      result.gameEnded = true;
      result.winnerId = cycleResult.winnerId;
      result.endReason = cycleResult.endReason;
      break; // Stop checking once game ends
    }
  }

  if (result.cycleCount >= maxCycles) {
    logger.error("SBA check loop hit max cycles - possible infinite loop", undefined, {
      lobbyId,
      cycleCount: result.cycleCount,
    });
  }

  logger.debug("SBA check loop complete", {
    lobbyId,
    cycleCount: result.cycleCount,
    anyChanged: result.anyChanged,
    gameEnded: result.gameEnded,
  });

  return result;
}

/**
 * Run a single SBA check cycle
 *
 * Checks all state-based conditions in order and returns whether any changed.
 */
async function runSBACycle(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  turnNumber: number,
  skipHandLimit: boolean,
  destroyTriggeredCards: Set<string>
): Promise<SBACheckResult> {
  const result: SBACheckResult = {
    changed: false,
    gameEnded: false,
    destroyedCards: [],
    actionsTaken: [],
  };

  // Get lobby for game info
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby?.gameId) {
    return result;
  }

  // 1. Check LP win conditions first (highest priority)
  const lpCheck = await checkLPWinCondition(ctx, gameState, lobbyId, lobby.gameId, turnNumber);
  if (lpCheck.gameEnded) {
    result.gameEnded = true;
    result.winnerId = lpCheck.winnerId;
    result.endReason = "lp_zero";
    result.changed = true;
    result.actionsTaken.push(lpCheck.action);
    return result;
  }

  // 1b. Check Breakdown win condition (3 breakdowns caused = win)
  const breakdownWinCheck = await checkBreakdownWinCondition(ctx, gameState, lobbyId, lobby.gameId, turnNumber);
  if (breakdownWinCheck.gameEnded) {
    result.gameEnded = true;
    result.winnerId = breakdownWinCheck.winnerId;
    result.endReason = "breakdown";
    result.changed = true;
    result.actionsTaken.push(breakdownWinCheck.action);
    return result;
  }

  // 2. Check for monsters with DEF <= 0 (destroyed by stat reduction)
  const monsterCheck = await checkMonsterDestruction(
    ctx,
    gameState,
    lobbyId,
    lobby.gameId,
    turnNumber,
    destroyTriggeredCards
  );
  if (monsterCheck.changed) {
    result.changed = true;
    result.destroyedCards.push(...monsterCheck.destroyedCards);
    result.actionsTaken.push(...monsterCheck.actions);
  }

  // 2b. Check for Breakdown triggers (Stability=0 or Vice counters >= threshold)
  const breakdownCheck = await checkBreakdownTriggers(
    ctx,
    gameState,
    lobbyId,
    lobby.gameId,
    turnNumber,
    destroyTriggeredCards
  );
  if (breakdownCheck.changed) {
    result.changed = true;
    result.destroyedCards.push(...breakdownCheck.destroyedCards);
    result.actionsTaken.push(...breakdownCheck.actions);
  }

  // 3. Check field spell replacement (only one per player)
  // Note: This is typically handled when playing a new field spell,
  // but we check here for consistency
  const fieldSpellCheck = await checkFieldSpellReplacement(
    ctx,
    gameState,
    lobbyId,
    lobby.gameId,
    turnNumber
  );
  if (fieldSpellCheck.changed) {
    result.changed = true;
    result.actionsTaken.push(...fieldSpellCheck.actions);
  }

  // 3b. Check for orphaned equip spells (target monster is gone)
  const equipSpellCheck = await checkOrphanedEquipSpells(
    ctx,
    gameState,
    lobbyId,
    lobby.gameId,
    turnNumber
  );
  if (equipSpellCheck.changed) {
    result.changed = true;
    result.destroyedCards.push(...equipSpellCheck.destroyedCards);
    result.actionsTaken.push(...equipSpellCheck.actions);
  }

  // 3c. Check for tokens sent to non-field zones (tokens must be removed)
  const tokenCheck = await checkTokenZoneViolations(
    ctx,
    gameState,
    lobbyId,
    lobby.gameId,
    turnNumber
  );
  if (tokenCheck.changed) {
    result.changed = true;
    result.actionsTaken.push(...tokenCheck.actions);
  }

  // 4. Check hand size limit (only at end of turn)
  if (!skipHandLimit) {
    const handLimitCheck = await checkHandSizeLimit(
      ctx,
      gameState,
      lobbyId,
      lobby.gameId,
      turnNumber
    );
    if (handLimitCheck.changed) {
      result.changed = true;
      result.actionsTaken.push(...handLimitCheck.actions);
    }
  }

  return result;
}

/**
 * Check if any player's LP has reached 0
 */
async function checkLPWinCondition(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number
): Promise<{ gameEnded: boolean; winnerId?: Id<"users">; action: string }> {
  // Get lobby to check game mode
  const lobby = await ctx.db.get(lobbyId);

  // Check host LP
  if (gameState.hostLifePoints <= 0) {
    const winner = await ctx.db.get(gameState.opponentId as Id<"users">);
    const loser = await ctx.db.get(gameState.hostId as Id<"users">);

    await recordGameEndHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      winnerId: gameState.opponentId as Id<"users">,
      winnerUsername: winner?.username || "Unknown",
      loserId: gameState.hostId as Id<"users">,
      loserUsername: loser?.username || "Unknown",
    });

    // Update lobby status
    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId: gameState.opponentId,
    });

    // Emit game ended event (replaces direct stats/progression calls)
    await emitEvent(ctx, {
      type: "game:ended",
      gameId,
      lobbyId,
      winnerId: gameState.opponentId as Id<"users">,
      loserId: gameState.hostId as Id<"users">,
      endReason: "completed",
      gameMode: (lobby?.mode || "casual") as "ranked" | "casual" | "story",
      turnCount: turnNumber,
      wagerAmount: lobby?.wagerAmount ?? 0,
      wagerPaid: lobby?.wagerPaid ?? false,
      stageId: lobby?.stageId,
      hostFinalLP: 0,
      hostIsWinner: false,
      hostId: gameState.hostId as Id<"users">,
      timestamp: Date.now(),
    });

    // Emit story stage completion if story mode (host lost)
    if (lobby?.mode === "story" && lobby.stageId) {
      await emitEvent(ctx, {
        type: "story:stage_completed",
        userId: gameState.hostId as Id<"users">,
        stageId: lobby.stageId,
        won: false,
        finalLP: 0,
        timestamp: Date.now(),
      });
      logger.info("Story stage completed (loss)", {
        lobbyId,
        stageId: lobby.stageId,
        userId: gameState.hostId,
      });
    }

    logger.info("Game ended by SBA: Host LP reached 0", {
      lobbyId,
      winnerId: gameState.opponentId,
    });

    return {
      gameEnded: true,
      winnerId: gameState.opponentId as Id<"users">,
      action: `${loser?.username}'s LP reached 0 - ${winner?.username} wins!`,
    };
  }

  // Check opponent LP
  if (gameState.opponentLifePoints <= 0) {
    const winner = await ctx.db.get(gameState.hostId as Id<"users">);
    const loser = await ctx.db.get(gameState.opponentId as Id<"users">);

    await recordGameEndHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      winnerId: gameState.hostId as Id<"users">,
      winnerUsername: winner?.username || "Unknown",
      loserId: gameState.opponentId as Id<"users">,
      loserUsername: loser?.username || "Unknown",
    });

    // Update lobby status
    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId: gameState.hostId,
    });

    // Emit game ended event (replaces direct stats/progression calls)
    await emitEvent(ctx, {
      type: "game:ended",
      gameId,
      lobbyId,
      winnerId: gameState.hostId as Id<"users">,
      loserId: gameState.opponentId as Id<"users">,
      endReason: "completed",
      gameMode: (lobby?.mode || "casual") as "ranked" | "casual" | "story",
      turnCount: turnNumber,
      wagerAmount: lobby?.wagerAmount ?? 0,
      wagerPaid: lobby?.wagerPaid ?? false,
      stageId: lobby?.stageId,
      hostFinalLP: gameState.hostLifePoints,
      hostIsWinner: true,
      hostId: gameState.hostId as Id<"users">,
      timestamp: Date.now(),
    });

    // Emit story stage completion if story mode (host won)
    if (lobby?.mode === "story" && lobby.stageId) {
      await emitEvent(ctx, {
        type: "story:stage_completed",
        userId: gameState.hostId as Id<"users">,
        stageId: lobby.stageId,
        won: true,
        finalLP: gameState.hostLifePoints,
        timestamp: Date.now(),
      });
      logger.info("Story stage completed (win)", {
        lobbyId,
        stageId: lobby.stageId,
        userId: gameState.hostId,
        finalLP: gameState.hostLifePoints,
      });
    }

    logger.info("Game ended by SBA: Opponent LP reached 0", {
      lobbyId,
      winnerId: gameState.hostId,
    });

    return {
      gameEnded: true,
      winnerId: gameState.hostId as Id<"users">,
      action: `${loser?.username}'s LP reached 0 - ${winner?.username} wins!`,
    };
  }

  return { gameEnded: false, action: "" };
}

/**
 * Check for deck-out win condition
 *
 * Called when a player needs to draw but has no cards in deck.
 * This is typically checked in the draw phase handler, but can also
 * be triggered by card effects that force draws.
 */
export async function checkDeckOutCondition(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  playerId: Id<"users">,
  turnNumber: number
): Promise<{ gameEnded: boolean; winnerId?: Id<"users"> }> {
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .first();

  if (!gameState) {
    return { gameEnded: false };
  }

  const lobby = await ctx.db.get(lobbyId);
  if (!lobby?.gameId) {
    return { gameEnded: false };
  }

  const isHost = playerId === gameState.hostId;
  const deck = isHost ? gameState.hostDeck : gameState.opponentDeck;

  if (deck.length === 0) {
    // Player loses due to deck out
    const winnerId = (isHost ? gameState.opponentId : gameState.hostId) as Id<"users">;
    const winner = await ctx.db.get(winnerId);
    const loser = await ctx.db.get(playerId);

    await recordGameEndHelper(ctx, {
      lobbyId,
      gameId: lobby.gameId,
      turnNumber,
      winnerId: winnerId as Id<"users">,
      winnerUsername: winner?.username || "Unknown",
      loserId: playerId,
      loserUsername: loser?.username || "Unknown",
    });

    // Update lobby status
    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId,
    });

    // Emit game ended event (replaces direct stats/progression calls)
    const hostWon = winnerId === gameState.hostId;
    await emitEvent(ctx, {
      type: "game:ended",
      gameId: lobby.gameId,
      lobbyId,
      winnerId: winnerId as Id<"users">,
      loserId: playerId,
      endReason: "completed",
      gameMode: (lobby.mode || "casual") as "ranked" | "casual" | "story",
      turnCount: turnNumber,
      wagerAmount: lobby.wagerAmount ?? 0,
      wagerPaid: lobby.wagerPaid ?? false,
      stageId: lobby.stageId,
      hostFinalLP: hostWon ? gameState.hostLifePoints : 0,
      hostIsWinner: hostWon,
      hostId: gameState.hostId as Id<"users">,
      timestamp: Date.now(),
    });

    // Emit story stage completion if story mode (deck out)
    if (lobby.mode === "story" && lobby.stageId) {
      await emitEvent(ctx, {
        type: "story:stage_completed",
        userId: gameState.hostId as Id<"users">,
        stageId: lobby.stageId,
        won: hostWon,
        finalLP: hostWon ? gameState.hostLifePoints : 0,
        timestamp: Date.now(),
      });
      logger.info("Story stage completed (deck out)", {
        lobbyId,
        stageId: lobby.stageId,
        userId: gameState.hostId,
        won: hostWon,
      });
    }

    logger.info("Game ended by SBA: Deck out", {
      lobbyId,
      loserId: playerId,
      winnerId,
    });

    return { gameEnded: true, winnerId };
  }

  return { gameEnded: false };
}

/**
 * Check for monsters with DEF <= 0 that should be destroyed
 *
 * In this game, monsters in Defense Position with DEF reduced to 0 or below
 * are destroyed by state-based action (similar to ATK-based destruction in some games).
 */
async function checkMonsterDestruction(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number,
  destroyTriggeredCards: Set<string>
): Promise<{ changed: boolean; destroyedCards: Id<"cardDefinitions">[]; actions: string[] }> {
  const result = {
    changed: false,
    destroyedCards: [] as Id<"cardDefinitions">[],
    actions: [] as string[],
  };

  // Check host board
  // Note: 0 ATK/DEF is valid (e.g. Kuriboh has 200 DEF, some tokens have 0).
  // Only negative stats from effects trigger SBA destruction.
  const hostMonstersToDestroy = gameState.hostBoard.filter((bc) => {
    if (bc.position === -1 && bc.defense < 0) {
      return true;
    }
    if (bc.position === 1 && bc.attack < 0) {
      return true;
    }
    return false;
  });

  // Check opponent board
  const opponentMonstersToDestroy = gameState.opponentBoard.filter((bc) => {
    if (bc.position === -1 && bc.defense < 0) {
      return true;
    }
    if (bc.position === 1 && bc.attack < 0) {
      return true;
    }
    return false;
  });

  // Destroy host monsters
  for (const monster of hostMonstersToDestroy) {
    const destroyed = await destroyMonsterBySBA(
      ctx,
      gameState,
      lobbyId,
      gameId,
      turnNumber,

      monster.cardId as Id<"cardDefinitions">,
      gameState.hostId as Id<"users">,
      true,
      destroyTriggeredCards
    );
    if (destroyed) {
      result.changed = true;
      result.destroyedCards.push(monster.cardId as Id<"cardDefinitions">);
      result.actions.push("Host monster destroyed by SBA (stats reduced to 0)");
    }
  }

  // Destroy opponent monsters
  for (const monster of opponentMonstersToDestroy) {
    const destroyed = await destroyMonsterBySBA(
      ctx,
      gameState,
      lobbyId,
      gameId,
      turnNumber,

      monster.cardId as Id<"cardDefinitions">,
      gameState.opponentId as Id<"users">,
      false,
      destroyTriggeredCards
    );
    if (destroyed) {
      result.changed = true;
      result.destroyedCards.push(monster.cardId as Id<"cardDefinitions">);
      result.actions.push("Opponent monster destroyed by SBA (stats reduced to 0)");
    }
  }

  return result;
}

/**
 * Destroy a monster by state-based action
 *
 * Moves to graveyard and triggers on_destroy effects.
 * Does NOT open response windows (SBAs are automatic).
 */
async function destroyMonsterBySBA(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number,
  cardId: Id<"cardDefinitions">,
  ownerId: Id<"users">,
  isHost: boolean,
  destroyTriggeredCards: Set<string>
): Promise<boolean> {
  // Check if card is still on board (may have been destroyed already)
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const cardOnBoard = board.find((bc) => bc.cardId === cardId);

  if (!cardOnBoard) {
    return false; // Already removed
  }

  // Check protection
  if (cardOnBoard.cannotBeDestroyedByEffects) {
    logger.debug("Monster protected from SBA destruction", { cardId });
    return false;
  }

  const card = await ctx.db.get(cardId);
  const owner = await ctx.db.get(ownerId);

  // Record the destruction event
  await recordEventHelper(ctx, {
    lobbyId,
    gameId,
    turnNumber,
    eventType: "card_to_graveyard",
    playerId: ownerId,
    playerUsername: owner?.username || "Unknown",
    description: `${card?.name || "Monster"} destroyed by state-based action`,
    metadata: {
      cardId,
      cardName: card?.name,
      reason: "sba_stats_zero",
    },
  });

  // Destroy equipped spells first (before removing monster from board)
  if (cardOnBoard.equippedCards && cardOnBoard.equippedCards.length > 0) {
    const equippedIds = cardOnBoard.equippedCards;

    // Remove equip spells from spell/trap zones and send to graveyard
    for (const playerId of [gameState.hostId, gameState.opponentId]) {
      const isHostZone = playerId === gameState.hostId;
      const spellTrapZone = isHostZone
        ? gameState.hostSpellTrapZone
        : gameState.opponentSpellTrapZone;
      const zoneGraveyard = isHostZone ? gameState.hostGraveyard : gameState.opponentGraveyard;

      const equipsInZone = spellTrapZone.filter((st) => equippedIds.includes(st.cardId));
      if (equipsInZone.length > 0) {
        const newSpellTrapZone = spellTrapZone.filter((st) => !equippedIds.includes(st.cardId));
        const equipCardIds = equipsInZone.map((st) => st.cardId);
        const newGraveyard = [...zoneGraveyard, ...equipCardIds];

        await ctx.db.patch(gameState._id, {
          [isHostZone ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
          [isHostZone ? "hostGraveyard" : "opponentGraveyard"]: newGraveyard,
        });

        // Record destruction events for equip spells
        const equipOwner = await ctx.db.get(playerId as Id<"users">);
        for (const equipId of equipCardIds) {
          const equipCard = await ctx.db.get(equipId as Id<"cardDefinitions">);
          await recordEventHelper(ctx, {
            lobbyId,
            gameId,
            turnNumber,
            eventType: "card_destroyed",
            playerId: playerId as Id<"users">,
            playerUsername: equipOwner?.username || "Unknown",
            description: `${equipCard?.name || "Equip Spell"} destroyed (equipped monster destroyed)`,
            metadata: {
              cardId: equipId,
              cardName: equipCard?.name,
              reason: "equipped_monster_destroyed",
            },
          });
        }
      }
    }
  }

  // Remove from board and add to graveyard in a single patch
  // IMPORTANT: Re-read graveyard from DB to include any equip spell additions above
  const freshState = await ctx.db.get(gameState._id);
  const currentGraveyard = freshState
    ? isHost
      ? freshState.hostGraveyard
      : freshState.opponentGraveyard
    : isHost
      ? gameState.hostGraveyard
      : gameState.opponentGraveyard;
  const currentBoard = freshState
    ? isHost
      ? freshState.hostBoard
      : freshState.opponentBoard
    : board;
  const newBoard = currentBoard.filter((bc) => bc.cardId !== cardId);

  await ctx.db.patch(gameState._id, {
    [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
    [isHost ? "hostGraveyard" : "opponentGraveyard"]: [...currentGraveyard, cardId],
  });

  // Trigger on_destroy effect if present (and not already triggered)
  const cardKey = `${cardId}-${gameState._id}`;
  if (card && !destroyTriggeredCards.has(cardKey)) {
    destroyTriggeredCards.add(cardKey);

    const parsedAbility = getCardAbility(card);
    const destroyEffect = parsedAbility?.effects.find((e) => e.trigger === "on_destroy");
    if (destroyEffect) {
      // Refresh game state before executing effect
      const refreshedState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
        .first();

      if (refreshedState) {
        const effectResult = await executeEffect(
          ctx,
          refreshedState,
          lobbyId,
          destroyEffect,
          ownerId,
          cardId,
          []
        );

        if (effectResult.success) {
          await recordEventHelper(ctx, {
            lobbyId,
            gameId,
            turnNumber,
            eventType: "effect_activated",
            playerId: ownerId,
            playerUsername: owner?.username || "Unknown",
            description: `${card.name} on-destroy effect: ${effectResult.message}`,
            metadata: { cardId, trigger: "on_destroy", source: "sba" },
          });

          logger.debug("SBA triggered on_destroy effect", {
            cardId,
            cardName: card.name,
          });
        }
      }
    }
  }

  logger.info("Monster destroyed by SBA", {
    cardId,
    cardName: card?.name,
    ownerId,
  });

  return true;
}

/**
 * Check field spell replacement rule
 *
 * Only one field spell per player. While the schema enforces this
 * (hostFieldSpell/opponentFieldSpell are single objects), we validate
 * to detect any inconsistencies from manual database operations.
 */
async function checkFieldSpellReplacement(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number
): Promise<{ changed: boolean; actions: string[] }> {
  const result = { changed: false, actions: [] as string[] };

  // Validate host field spell
  if (gameState.hostFieldSpell) {
    const fieldCard = await ctx.db.get(gameState.hostFieldSpell.cardId as Id<"cardDefinitions">);
    // If field spell card no longer exists or is not a spell, remove it
    if (!fieldCard || fieldCard.cardType !== "spell" || fieldCard.spellType !== "field") {
      // Send invalid field spell to graveyard before removing
      await ctx.db.patch(gameState._id, {
        hostFieldSpell: undefined,
        hostGraveyard: [...gameState.hostGraveyard, gameState.hostFieldSpell.cardId],
      });

      const host = await ctx.db.get(gameState.hostId as Id<"users">);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId,
        turnNumber,
        eventType: "card_destroyed",
        playerId: gameState.hostId as Id<"users">,
        playerUsername: host?.username || "Unknown",
        description: "Invalid field spell removed by SBA",
        metadata: {
          cardId: gameState.hostFieldSpell.cardId,
          reason: "invalid_field_spell",
        },
      });

      result.changed = true;
      result.actions.push("Host invalid field spell removed");
    }
  }

  // Validate opponent field spell
  if (gameState.opponentFieldSpell) {
    const fieldCard = await ctx.db.get(gameState.opponentFieldSpell.cardId as Id<"cardDefinitions">);
    // If field spell card no longer exists or is not a spell, remove it
    if (!fieldCard || fieldCard.cardType !== "spell" || fieldCard.spellType !== "field") {
      // Send invalid field spell to graveyard before removing
      await ctx.db.patch(gameState._id, {
        opponentFieldSpell: undefined,
        opponentGraveyard: [...gameState.opponentGraveyard, gameState.opponentFieldSpell.cardId],
      });

      const opponent = await ctx.db.get(gameState.opponentId as Id<"users">);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId,
        turnNumber,
        eventType: "card_destroyed",
        playerId: gameState.opponentId as Id<"users">,
        playerUsername: opponent?.username || "Unknown",
        description: "Invalid field spell removed by SBA",
        metadata: {
          cardId: gameState.opponentFieldSpell.cardId,
          reason: "invalid_field_spell",
        },
      });

      result.changed = true;
      result.actions.push("Opponent invalid field spell removed");
    }
  }

  return result;
}

/**
 * Check for orphaned equip spells
 *
 * Equip spells must have a valid target monster on the field.
 * If the equipped monster is destroyed, removed from field, or flipped face-down,
 * the equip spell is destroyed.
 */
async function checkOrphanedEquipSpells(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number
): Promise<{ changed: boolean; actions: string[]; destroyedCards: Id<"cardDefinitions">[] }> {
  const result = {
    changed: false,
    actions: [] as string[],
    destroyedCards: [] as Id<"cardDefinitions">[],
  };

  // Check all equip spells in both players' spell/trap zones
  const checkZone = async (
    zone: typeof gameState.hostSpellTrapZone,
    playerId: string,
    zoneKey: "hostSpellTrapZone" | "opponentSpellTrapZone"
  ) => {
    const orphanedEquips: Id<"cardDefinitions">[] = [];

    for (const spellTrap of zone) {
      if (!spellTrap.equippedTo) continue; // Not an equip spell

      const card = await ctx.db.get(spellTrap.cardId as Id<"cardDefinitions">);
      if (!card || card.cardType !== "spell" || card.spellType !== "equip") continue;

      // Check if target monster still exists on field and is face-up
      const hostBoard = gameState.hostBoard;
      const opponentBoard = gameState.opponentBoard;
      const allMonsters = [...hostBoard, ...opponentBoard];
      const targetMonster = allMonsters.find((m) => m.cardId === spellTrap.equippedTo);

      if (!targetMonster || targetMonster.isFaceDown) {
        // Target is invalid - mark equip spell for destruction
        orphanedEquips.push(spellTrap.cardId as Id<"cardDefinitions">);
      }
    }

    // Destroy orphaned equip spells
    if (orphanedEquips.length > 0) {
      const newZone = zone.filter((st) => !orphanedEquips.includes(st.cardId as Id<"cardDefinitions">));
      const graveyard =
        playerId === gameState.hostId ? gameState.hostGraveyard : gameState.opponentGraveyard;
      const newGraveyard = [...graveyard, ...orphanedEquips];

      await ctx.db.patch(gameState._id, {
        [zoneKey]: newZone,
        [playerId === gameState.hostId ? "hostGraveyard" : "opponentGraveyard"]: newGraveyard,
      });

      // Remove equip spells from monsters' equippedCards arrays
      for (const equipId of orphanedEquips) {
        const equipSpell = zone.find((st) => st.cardId === equipId);
        if (!equipSpell?.equippedTo) continue;

        // Refresh game state to get current boards
        const currentState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
          .first();

        if (!currentState) continue;

        const currentHostBoard = currentState.hostBoard;
        const currentOpponentBoard = currentState.opponentBoard;

        // Find monster and remove equip from its equippedCards
        const hostMonsterIdx = currentHostBoard.findIndex(
          (m) => m.cardId === equipSpell.equippedTo
        );
        const opponentMonsterIdx = currentOpponentBoard.findIndex(
          (m) => m.cardId === equipSpell.equippedTo
        );

        if (hostMonsterIdx !== -1) {
          const monster = currentHostBoard[hostMonsterIdx];
          if (!monster) continue;
          const updatedMonster = {
            ...monster,
            equippedCards: (monster.equippedCards || []).filter((id) => id !== equipId),
          };
          const updatedBoard = [...currentHostBoard];
          updatedBoard[hostMonsterIdx] = updatedMonster;
          await ctx.db.patch(currentState._id, {
            hostBoard: updatedBoard,
          });
        } else if (opponentMonsterIdx !== -1) {
          const monster = currentOpponentBoard[opponentMonsterIdx];
          if (!monster) continue;
          const updatedMonster = {
            ...monster,
            equippedCards: (monster.equippedCards || []).filter((id) => id !== equipId),
          };
          const updatedBoard = [...currentOpponentBoard];
          updatedBoard[opponentMonsterIdx] = updatedMonster;
          await ctx.db.patch(currentState._id, {
            opponentBoard: updatedBoard,
          });
        }
      }

      // Record events for destroyed equip spells
      const player = await ctx.db.get(playerId as Id<"users">);
      for (const equipId of orphanedEquips) {
        const equipCard = await ctx.db.get(equipId);
        await recordEventHelper(ctx, {
          lobbyId,
          gameId,
          turnNumber,
          eventType: "card_destroyed",
          playerId: playerId as Id<"users">,
          playerUsername: player?.username || "Unknown",
          description: `${equipCard?.name || "Equip Spell"} destroyed by SBA (target invalid)`,
          metadata: {
            cardId: equipId,
            cardName: equipCard?.name,
            reason: "orphaned_equip_spell",
          },
        });
      }

      result.changed = true;
      result.destroyedCards.push(...orphanedEquips);
      result.actions.push(`${orphanedEquips.length} orphaned equip spell(s) destroyed`);
    }
  };

  await checkZone(gameState.hostSpellTrapZone, gameState.hostId, "hostSpellTrapZone");
  await checkZone(gameState.opponentSpellTrapZone, gameState.opponentId, "opponentSpellTrapZone");

  return result;
}

/**
 * Check and enforce hand size limit
 *
 * At the end of turn, if a player has more than 6 cards, they must discard
 * down to 6. This SBA check auto-discards excess cards.
 *
 * Note: In a full implementation, the player would choose which cards to discard.
 * This simplified version discards from the end of the hand array.
 */
async function checkHandSizeLimit(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number
): Promise<{ changed: boolean; actions: string[] }> {
  const result = { changed: false, actions: [] as string[] };
  const HAND_LIMIT = 6;

  // Check host hand
  if (gameState.hostHand.length > HAND_LIMIT) {
    const excessCount = gameState.hostHand.length - HAND_LIMIT;
    const cardsToDiscard = gameState.hostHand.slice(HAND_LIMIT);
    const newHand = gameState.hostHand.slice(0, HAND_LIMIT);

    const owner = await ctx.db.get(gameState.hostId as Id<"users">);

    // Re-read graveyard from DB to avoid overwriting changes from earlier SBA checks
    const freshState = await ctx.db.get(gameState._id);
    const currentHostGraveyard = freshState?.hostGraveyard ?? gameState.hostGraveyard;

    // Record events for each discarded card
    for (const cardId of cardsToDiscard) {
      const card = await ctx.db.get(cardId as Id<"cardDefinitions">);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId,
        turnNumber,
        eventType: "card_to_graveyard",
        playerId: gameState.hostId as Id<"users">,
        playerUsername: owner?.username || "Unknown",
        description: `${owner?.username}'s ${card?.name || "card"} was discarded (hand limit)`,
        metadata: { cardId, fromZone: "hand", toZone: "graveyard" },
      });
    }

    // Update hand and graveyard in a single batch
    await ctx.db.patch(gameState._id, {
      hostHand: newHand,
      hostGraveyard: [...currentHostGraveyard, ...cardsToDiscard],
    });

    await recordEventHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      eventType: "hand_limit_enforced",
      playerId: gameState.hostId as Id<"users">,
      playerUsername: owner?.username || "Unknown",
      description: `${owner?.username} discarded ${excessCount} card(s) due to hand limit`,
      metadata: {
        cardsDiscarded: cardsToDiscard,
        previousHandSize: gameState.hostHand.length,
        newHandSize: HAND_LIMIT,
      },
    });

    result.changed = true;
    result.actions.push(`Host discarded ${excessCount} cards (hand limit)`);
  }

  // Check opponent hand
  if (gameState.opponentHand.length > HAND_LIMIT) {
    const excessCount = gameState.opponentHand.length - HAND_LIMIT;

    // Smart AI discard: Discard weakest cards by total power (ATK + DEF)
    // Load card data to calculate power
    const handCards = await Promise.all(
      gameState.opponentHand.map(async (cardId) => {
        const card = await ctx.db.get(cardId as Id<"cardDefinitions">);
        return {
          cardId,
          power: card ? (card.attack || 0) + (card.defense || 0) : 0,
        };
      })
    );

    // Sort by power (weakest first)
    handCards.sort((a, b) => a.power - b.power);

    // Discard weakest cards
    const cardsToDiscard = handCards.slice(0, excessCount).map((c) => c.cardId);
    const newHand = handCards.slice(excessCount).map((c) => c.cardId);

    const owner = await ctx.db.get(gameState.opponentId as Id<"users">);

    // Re-read graveyard from DB to avoid overwriting changes from earlier SBA checks
    const freshState = await ctx.db.get(gameState._id);
    const currentOpponentGraveyard = freshState?.opponentGraveyard ?? gameState.opponentGraveyard;

    // Record events for each discarded card
    for (const cardId of cardsToDiscard) {
      const card = await ctx.db.get(cardId as Id<"cardDefinitions">);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId,
        turnNumber,
        eventType: "card_to_graveyard",
        playerId: gameState.opponentId as Id<"users">,
        playerUsername: owner?.username || "Unknown",
        description: `${owner?.username}'s ${card?.name || "card"} was discarded (hand limit)`,
        metadata: { cardId, fromZone: "hand", toZone: "graveyard" },
      });
    }

    // Update hand and graveyard in a single batch
    await ctx.db.patch(gameState._id, {
      opponentHand: newHand,
      opponentGraveyard: [...currentOpponentGraveyard, ...cardsToDiscard],
    });

    await recordEventHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      eventType: "hand_limit_enforced",
      playerId: gameState.opponentId as Id<"users">,
      playerUsername: owner?.username || "Unknown",
      description: `${owner?.username} discarded ${excessCount} card(s) due to hand limit`,
      metadata: {
        cardsDiscarded: cardsToDiscard,
        previousHandSize: gameState.opponentHand.length,
        newHandSize: HAND_LIMIT,
      },
    });

    result.changed = true;
    result.actions.push(`Opponent discarded ${excessCount} cards (hand limit)`);
  }

  return result;
}

/**
 * Check for tokens in non-field zones
 *
 * Tokens can only exist on the field. If a token would be sent to any other
 * zone (hand, deck, graveyard, banished), it is removed from the game instead.
 */
async function checkTokenZoneViolations(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number
): Promise<{ changed: boolean; actions: string[] }> {
  const result = { changed: false, actions: [] as string[] };

  // Check all zones for tokens (except board)
  const checkZone = async (
    zone: string[],
    zoneName: string,
    playerId: string,
    zoneKey: string
  ) => {
    // Tokens have fake IDs in the format: cardId_token_timestamp_index
    const tokensInZone = zone.filter((cardId) => {
      const idStr = cardId as string;
      return idStr.includes("_token_");
    });

    if (tokensInZone.length > 0) {
      // Remove tokens from this zone
      const newZone = zone.filter((cardId) => {
        const idStr = cardId as string;
        return !idStr.includes("_token_");
      });

      await ctx.db.patch(gameState._id, {
        [zoneKey]: newZone,
      });

      const player = await ctx.db.get(playerId as Id<"users">);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId,
        turnNumber,
        eventType: "card_destroyed",
        playerId: playerId as Id<"users">,
        playerUsername: player?.username || "Unknown",
        description: `${tokensInZone.length} token(s) removed from ${zoneName} (tokens cannot exist off field)`,
        metadata: {
          tokenIds: tokensInZone,
          reason: "token_zone_violation",
          zoneName,
        },
      });

      result.changed = true;
      result.actions.push(`${tokensInZone.length} token(s) removed from ${zoneName}`);

      logger.info("Tokens removed from non-field zone", {
        zoneName,
        playerId,
        tokenCount: tokensInZone.length,
      });
    }
  };

  // Check all zones for both players
  await checkZone(gameState.hostHand, "hand", gameState.hostId, "hostHand");
  await checkZone(gameState.opponentHand, "hand", gameState.opponentId, "opponentHand");
  await checkZone(gameState.hostDeck, "deck", gameState.hostId, "hostDeck");
  await checkZone(gameState.opponentDeck, "deck", gameState.opponentId, "opponentDeck");
  await checkZone(gameState.hostGraveyard, "graveyard", gameState.hostId, "hostGraveyard");
  await checkZone(
    gameState.opponentGraveyard,
    "graveyard",
    gameState.opponentId,
    "opponentGraveyard"
  );
  await checkZone(gameState.hostBanished, "banished", gameState.hostId, "hostBanished");
  await checkZone(gameState.opponentBanished, "banished", gameState.opponentId, "opponentBanished");

  return result;
}

/**
 * Check if either player has caused enough Breakdowns to win
 *
 * Causing 3 Breakdowns is an alternate win condition.
 */
async function checkBreakdownWinCondition(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number
): Promise<{ gameEnded: boolean; winnerId?: Id<"users">; action: string }> {
  const lobby = await ctx.db.get(lobbyId);

  const hostBreakdowns = (gameState as any).hostBreakdownsCaused ?? 0;
  const opponentBreakdowns = (gameState as any).opponentBreakdownsCaused ?? 0;

  // Check if host caused enough breakdowns to win
  if (hostBreakdowns >= MAX_BREAKDOWNS_WIN) {
    const winner = await ctx.db.get(gameState.hostId as Id<"users">);
    const loser = await ctx.db.get(gameState.opponentId as Id<"users">);

    await recordGameEndHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      winnerId: gameState.hostId as Id<"users">,
      winnerUsername: winner?.username || "Unknown",
      loserId: gameState.opponentId as Id<"users">,
      loserUsername: loser?.username || "Unknown",
    });

    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId: gameState.hostId,
    });

    // Emit game ended event (replaces direct stats/progression calls)
    await emitEvent(ctx, {
      type: "game:ended",
      gameId,
      lobbyId,
      winnerId: gameState.hostId as Id<"users">,
      loserId: gameState.opponentId as Id<"users">,
      endReason: "completed",
      gameMode: (lobby?.mode || "casual") as "ranked" | "casual" | "story",
      turnCount: turnNumber,
      wagerAmount: lobby?.wagerAmount ?? 0,
      wagerPaid: lobby?.wagerPaid ?? false,
      stageId: lobby?.stageId,
      hostFinalLP: gameState.hostLifePoints,
      hostIsWinner: true,
      hostId: gameState.hostId as Id<"users">,
      timestamp: Date.now(),
    });

    // Emit story stage completion if story mode (host won)
    if (lobby?.mode === "story" && lobby.stageId) {
      await emitEvent(ctx, {
        type: "story:stage_completed",
        userId: gameState.hostId,
        stageId: lobby.stageId,
        won: true,
        finalLP: gameState.hostLifePoints,
        timestamp: Date.now(),
      });
    }

    logger.info("Game ended by SBA: Breakdown win condition", {
      lobbyId,
      winnerId: gameState.hostId,
      breakdownsCaused: hostBreakdowns,
    });

    return {
      gameEnded: true,
      winnerId: gameState.hostId as Id<"users">,
      action: `${winner?.username} wins by causing ${hostBreakdowns} Breakdowns!`,
    };
  }

  // Check if opponent caused enough breakdowns to win
  if (opponentBreakdowns >= MAX_BREAKDOWNS_WIN) {
    const winner = await ctx.db.get(gameState.opponentId as Id<"users">);
    const loser = await ctx.db.get(gameState.hostId as Id<"users">);

    await recordGameEndHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      winnerId: gameState.opponentId as Id<"users">,
      winnerUsername: winner?.username || "Unknown",
      loserId: gameState.hostId as Id<"users">,
      loserUsername: loser?.username || "Unknown",
    });

    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId: gameState.opponentId,
    });

    // Emit game ended event (replaces direct stats/progression calls)
    await emitEvent(ctx, {
      type: "game:ended",
      gameId,
      lobbyId,
      winnerId: gameState.opponentId as Id<"users">,
      loserId: gameState.hostId as Id<"users">,
      endReason: "completed",
      gameMode: (lobby?.mode || "casual") as "ranked" | "casual" | "story",
      turnCount: turnNumber,
      wagerAmount: lobby?.wagerAmount ?? 0,
      wagerPaid: lobby?.wagerPaid ?? false,
      stageId: lobby?.stageId,
      hostFinalLP: gameState.hostLifePoints,
      hostIsWinner: false,
      hostId: gameState.hostId as Id<"users">,
      timestamp: Date.now(),
    });

    // Emit story stage completion if story mode (opponent won)
    if (lobby?.mode === "story" && lobby.stageId) {
      await emitEvent(ctx, {
        type: "story:stage_completed",
        userId: gameState.hostId,
        stageId: lobby.stageId,
        won: false,
        finalLP: gameState.hostLifePoints,
        timestamp: Date.now(),
      });
    }

    logger.info("Game ended by SBA: Breakdown win condition", {
      lobbyId,
      winnerId: gameState.opponentId,
      breakdownsCaused: opponentBreakdowns,
    });

    return {
      gameEnded: true,
      winnerId: gameState.opponentId as Id<"users">,
      action: `${winner?.username} wins by causing ${opponentBreakdowns} Breakdowns!`,
    };
  }

  return { gameEnded: false, action: "" };
}

/**
 * Check for Breakdown triggers on Stereotypes
 *
 * Breakdown occurs when:
 * 1. A Stereotype's Stability (defense) reaches 0
 * 2. A Stereotype has accumulated 3+ Vice Counters
 *
 * On Breakdown: execute breakdown effect, send to Hallway (graveyard),
 * increment opponent's breakdownsCaused counter.
 */
async function checkBreakdownTriggers(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number,
  destroyTriggeredCards: Set<string>
): Promise<{ changed: boolean; destroyedCards: Id<"cardDefinitions">[]; actions: string[] }> {
  const result = {
    changed: false,
    destroyedCards: [] as Id<"cardDefinitions">[],
    actions: [] as string[],
  };

  // Check host board for Breakdown triggers
  const hostBreakdowns = gameState.hostBoard.filter((bc) => {
    // Stability reached 0
    if (bc.defense <= 0) return true;
    // Vice counters exceeded threshold
    if ((bc.viceCounters ?? 0) >= BREAKDOWN_THRESHOLD) return true;
    return false;
  });

  // Check opponent board for Breakdown triggers
  const opponentBreakdowns = gameState.opponentBoard.filter((bc) => {
    if (bc.defense <= 0) return true;
    if ((bc.viceCounters ?? 0) >= BREAKDOWN_THRESHOLD) return true;
    return false;
  });

  // Process host Breakdowns (opponent caused them)
  for (const card of hostBreakdowns) {
    const destroyed = await processBreakdown(
      ctx,
      gameState,
      lobbyId,
      gameId,
      turnNumber,

      card.cardId as Id<"cardDefinitions">,
      gameState.hostId as Id<"users">,
      true,
      destroyTriggeredCards
    );
    if (destroyed) {
      result.changed = true;
      result.destroyedCards.push(card.cardId as Id<"cardDefinitions">);
      const reason = (card.viceCounters ?? 0) >= BREAKDOWN_THRESHOLD
        ? `Vice overload (${card.viceCounters} counters)`
        : "Stability reached 0";
      result.actions.push(`Host Stereotype Breakdown: ${reason}`);
    }
  }

  // Process opponent Breakdowns (host caused them)
  for (const card of opponentBreakdowns) {
    const destroyed = await processBreakdown(
      ctx,
      gameState,
      lobbyId,
      gameId,
      turnNumber,

      card.cardId as Id<"cardDefinitions">,
      gameState.opponentId as Id<"users">,
      false,
      destroyTriggeredCards
    );
    if (destroyed) {
      result.changed = true;
      result.destroyedCards.push(card.cardId as Id<"cardDefinitions">);
      const reason = (card.viceCounters ?? 0) >= BREAKDOWN_THRESHOLD
        ? `Vice overload (${card.viceCounters} counters)`
        : "Stability reached 0";
      result.actions.push(`Opponent Stereotype Breakdown: ${reason}`);
    }
  }

  return result;
}

/**
 * Process a Breakdown on a Stereotype
 *
 * Sends the card to Hallway (graveyard), triggers breakdown effect,
 * and increments the opponent's breakdownsCaused counter.
 */
async function processBreakdown(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number,
  cardId: Id<"cardDefinitions">,
  ownerId: Id<"users">,
  isHost: boolean,
  destroyTriggeredCards: Set<string>
): Promise<boolean> {
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const cardOnBoard = board.find((bc) => bc.cardId === cardId);

  if (!cardOnBoard) return false;

  // Check protection (cannotBeDestroyedByEffects protects from Breakdown too)
  if (cardOnBoard.cannotBeDestroyedByEffects) {
    logger.debug("Stereotype protected from Breakdown", { cardId });
    return false;
  }

  const card = await ctx.db.get(cardId as Id<"cardDefinitions">);
  const owner = await ctx.db.get(ownerId as Id<"users">);

  // Record the Breakdown event
  await recordEventHelper(ctx, {
    lobbyId,
    gameId,
    turnNumber,
    eventType: "card_to_graveyard",
    playerId: ownerId,
    playerUsername: owner?.username || "Unknown",
    description: `${card?.name || "Stereotype"} suffered a Breakdown!`,
    metadata: {
      cardId,
      cardName: card?.name,
      reason: "breakdown",
      viceCounters: cardOnBoard.viceCounters ?? 0,
      stability: cardOnBoard.defense,
    },
  });

  // Remove from board and add to graveyard (Hallway)
  const freshState = await ctx.db.get(gameState._id);
  const currentGraveyard = freshState
    ? isHost ? freshState.hostGraveyard : freshState.opponentGraveyard
    : isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
  const currentBoard = freshState
    ? isHost ? freshState.hostBoard : freshState.opponentBoard
    : board;
  const newBoard = currentBoard.filter((bc) => bc.cardId !== cardId);

  // Increment opponent's breakdownsCaused
  // If host's stereotype broke down, opponent caused it (and vice versa)
  const breakdownField = isHost ? "opponentBreakdownsCaused" : "hostBreakdownsCaused";
  const currentBreakdowns = freshState
    ? (freshState as any)[breakdownField] ?? 0
    : (gameState as any)[breakdownField] ?? 0;

  await ctx.db.patch(gameState._id, {
    [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
    [isHost ? "hostGraveyard" : "opponentGraveyard"]: [...currentGraveyard, cardId],
    [breakdownField]: currentBreakdowns + 1,
  });

  // Trigger breakdown effect if present
  const cardKey = `${cardId}-${gameState._id}`;
  if (card && !destroyTriggeredCards.has(cardKey)) {
    destroyTriggeredCards.add(cardKey);

    const parsedAbility = getCardAbility(card);

    // Check for on_destroy trigger (breakdown acts as destruction)
    const destroyEffect = parsedAbility?.effects.find((e) => e.trigger === "on_destroy");
    if (destroyEffect) {
      const refreshedState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
        .first();

      if (refreshedState) {
        const effectResult = await executeEffect(
          ctx,
          refreshedState,
          lobbyId,
          destroyEffect,
          ownerId,
          cardId,
          []
        );

        if (effectResult.success) {
          await recordEventHelper(ctx, {
            lobbyId,
            gameId,
            turnNumber,
            eventType: "effect_activated",
            playerId: ownerId,
            playerUsername: owner?.username || "Unknown",
            description: `${card.name} Breakdown effect: ${effectResult.message}`,
            metadata: { cardId, trigger: "breakdown", source: "sba" },
          });
        }
      }
    }
  }

  logger.info("Stereotype Breakdown", {
    cardId,
    cardName: card?.name,
    ownerId,
    viceCounters: cardOnBoard.viceCounters ?? 0,
    stability: cardOnBoard.defense,
  });

  return true;
}

/**
 * Helper to check SBA after a specific action without full loop
 *
 * Use this for quick checks after minor actions. For major game
 * state changes (effect resolution, combat), use the full checkStateBasedActions.
 */
export async function quickSBACheck(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">
): Promise<{ gameEnded: boolean; winnerId?: Id<"users"> }> {
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .first();

  if (!gameState) {
    return { gameEnded: false };
  }

  const lobby = await ctx.db.get(lobbyId);
  if (!lobby?.gameId) {
    return { gameEnded: false };
  }

  // Only check LP condition for quick check
  const lpCheck = await checkLPWinCondition(
    ctx,
    gameState,
    lobbyId,
    lobby.gameId,
    gameState.turnNumber ?? 0
  );

  return {
    gameEnded: lpCheck.gameEnded,
    winnerId: lpCheck.winnerId,
  };
}
