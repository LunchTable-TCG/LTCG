/**
 * State-Based Actions (SBA)
 *
 * Implements Yu-Gi-Oh state-based action checking that runs continuously
 * until no more state changes occur. These actions happen automatically
 * and do NOT trigger response windows.
 *
 * State-Based Actions checked (in order):
 * 1. Monster destruction: Monsters with DEF <= 0 are destroyed
 * 2. Win condition - LP: If any player's LP <= 0, end the game
 * 3. Win condition - Deck out: If a player needs to draw with empty deck
 * 4. Monsters sent to graveyard: Move destroyed monsters and trigger on_destroy
 * 5. Field spell replacement: Only one field spell per player
 * 6. Hand size limit: At end of turn, discard down to 6 cards
 */

import type { Doc, Id } from "../../_generated/dataModel";
// Workaround for TS2589 (excessively deep type instantiation)
// biome-ignore lint/style/noNamespaceImport: Required for Convex internal API type workaround
import * as generatedApi from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import { getCardAbility } from "../../lib/abilityHelpers";
import { logger } from "../../lib/debug";
import { moveCard } from "../../lib/gameHelpers";
import { executeEffect } from "../effectSystem/index";
import { recordEventHelper, recordGameEndHelper } from "../gameEvents";

// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const internalAny = (generatedApi as any).internal;

/** Result from a single SBA check cycle */
export interface SBACheckResult {
  /** Whether any state-based action was taken */
  changed: boolean;
  /** Whether the game has ended */
  gameEnded: boolean;
  /** Winner ID if game ended */
  winnerId?: Id<"users">;
  /** Reason for game end */
  endReason?: "lp_zero" | "deck_out";
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
  endReason?: "lp_zero" | "deck_out";
  /** Total cycles run */
  cycleCount: number;
  /** All destroyed cards across all cycles */
  allDestroyedCards: Id<"cardDefinitions">[];
  /** All actions taken */
  allActionsTaken: string[];
}

/** Track cards that have already triggered on_destroy to prevent infinite loops */
const destroyTriggeredCards = new Set<string>();

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
      options?.skipHandLimit ?? true
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

  // Clear the destroy trigger tracking after full loop completes
  destroyTriggeredCards.clear();

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
  skipHandLimit: boolean
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

  // 2. Check for monsters with DEF <= 0 (destroyed by stat reduction)
  const monsterCheck = await checkMonsterDestruction(
    ctx,
    gameState,
    lobbyId,
    lobby.gameId,
    turnNumber
  );
  if (monsterCheck.changed) {
    result.changed = true;
    result.destroyedCards.push(...monsterCheck.destroyedCards);
    result.actionsTaken.push(...monsterCheck.actions);
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
    const winner = await ctx.db.get(gameState.opponentId);
    const loser = await ctx.db.get(gameState.hostId);

    await recordGameEndHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      winnerId: gameState.opponentId,
      winnerUsername: winner?.username || "Unknown",
      loserId: gameState.hostId,
      loserUsername: loser?.username || "Unknown",
    });

    // Update lobby status
    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId: gameState.opponentId,
    });

    // Handle story mode completion (host lost)
    if (lobby?.mode === "story" && lobby.stageId) {
      await ctx.runMutation(internalAny.progression.storyStages.completeStageInternal, {
        userId: gameState.hostId,
        stageId: lobby.stageId,
        won: false,
        finalLP: 0,
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
      winnerId: gameState.opponentId,
      action: `${loser?.username}'s LP reached 0 - ${winner?.username} wins!`,
    };
  }

  // Check opponent LP
  if (gameState.opponentLifePoints <= 0) {
    const winner = await ctx.db.get(gameState.hostId);
    const loser = await ctx.db.get(gameState.opponentId);

    await recordGameEndHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      winnerId: gameState.hostId,
      winnerUsername: winner?.username || "Unknown",
      loserId: gameState.opponentId,
      loserUsername: loser?.username || "Unknown",
    });

    // Update lobby status
    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId: gameState.hostId,
    });

    // Handle story mode completion (host won)
    if (lobby?.mode === "story" && lobby.stageId) {
      await ctx.runMutation(internalAny.progression.storyStages.completeStageInternal, {
        userId: gameState.hostId,
        stageId: lobby.stageId,
        won: true,
        finalLP: gameState.hostLifePoints,
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
      winnerId: gameState.hostId,
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
    const winnerId = isHost ? gameState.opponentId : gameState.hostId;
    const winner = await ctx.db.get(winnerId);
    const loser = await ctx.db.get(playerId);

    await recordGameEndHelper(ctx, {
      lobbyId,
      gameId: lobby.gameId,
      turnNumber,
      winnerId,
      winnerUsername: winner?.username || "Unknown",
      loserId: playerId,
      loserUsername: loser?.username || "Unknown",
    });

    // Update lobby status
    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId,
    });

    // Handle story mode completion (deck out)
    if (lobby.mode === "story" && lobby.stageId) {
      const hostWon = winnerId === gameState.hostId;
      await ctx.runMutation(internalAny.progression.storyStages.completeStageInternal, {
        userId: gameState.hostId,
        stageId: lobby.stageId,
        won: hostWon,
        finalLP: hostWon ? gameState.hostLifePoints : 0,
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
  turnNumber: number
): Promise<{ changed: boolean; destroyedCards: Id<"cardDefinitions">[]; actions: string[] }> {
  const result = {
    changed: false,
    destroyedCards: [] as Id<"cardDefinitions">[],
    actions: [] as string[],
  };

  // Check host board
  const hostMonstersToDestroy = gameState.hostBoard.filter((bc) => {
    // Check defense position monsters with DEF <= 0
    if (bc.position === -1 && bc.defense <= 0) {
      return true;
    }
    // Also check attack position monsters with negative stats (edge case from effects)
    if (bc.position === 1 && bc.attack < 0) {
      return true;
    }
    return false;
  });

  // Check opponent board
  const opponentMonstersToDestroy = gameState.opponentBoard.filter((bc) => {
    if (bc.position === -1 && bc.defense <= 0) {
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
      monster.cardId,
      gameState.hostId,
      true
    );
    if (destroyed) {
      result.changed = true;
      result.destroyedCards.push(monster.cardId);
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
      monster.cardId,
      gameState.opponentId,
      false
    );
    if (destroyed) {
      result.changed = true;
      result.destroyedCards.push(monster.cardId);
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
  isHost: boolean
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

  // Remove from board
  const newBoard = board.filter((bc) => bc.cardId !== cardId);
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
  });

  // Add to graveyard
  const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostGraveyard" : "opponentGraveyard"]: [...graveyard, cardId],
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
 * Only one field spell per player. If a player somehow has multiple,
 * destroy all but the most recently placed one.
 */
async function checkFieldSpellReplacement(
  _ctx: MutationCtx,
  _gameState: Doc<"gameStates">,
  _lobbyId: Id<"gameLobbies">,
  _gameId: string,
  _turnNumber: number
): Promise<{ changed: boolean; actions: string[] }> {
  // Note: Field spell replacement is handled in the spell activation logic
  // when a new field spell is played. The schema only allows one field spell
  // per player (hostFieldSpell/opponentFieldSpell are single objects, not arrays).
  //
  // This check is here for completeness but typically won't find issues.
  // The actual replacement logic is in spellsTraps.ts

  return { changed: false, actions: [] };
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

    const owner = await ctx.db.get(gameState.hostId);

    // Move excess cards to graveyard
    for (const cardId of cardsToDiscard) {
      await moveCard(ctx, gameState, cardId, "hand", "graveyard", gameState.hostId, turnNumber);
    }

    // Update hand
    await ctx.db.patch(gameState._id, {
      hostHand: newHand,
      hostGraveyard: [...gameState.hostGraveyard, ...cardsToDiscard],
    });

    await recordEventHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      eventType: "hand_limit_enforced",
      playerId: gameState.hostId,
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
        const card = await ctx.db.get(cardId);
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

    const owner = await ctx.db.get(gameState.opponentId);

    // Move excess cards to graveyard
    for (const cardId of cardsToDiscard) {
      await moveCard(ctx, gameState, cardId, "hand", "graveyard", gameState.opponentId, turnNumber);
    }

    // Update hand
    await ctx.db.patch(gameState._id, {
      opponentHand: newHand,
      opponentGraveyard: [...gameState.opponentGraveyard, ...cardsToDiscard],
    });

    await recordEventHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      eventType: "hand_limit_enforced",
      playerId: gameState.opponentId,
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
