/**
 * Phase Manager
 *
 * Manages LunchTable TCG turn structure and phase transitions.
 * Turn Structure: Draw → Main → Combat → Breakdown Check → End
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { getCardAbility } from "../lib/abilityHelpers";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { drawCards } from "../lib/gameHelpers";
import { validateGameActive } from "../lib/gameValidation";
import { executeEffect } from "./effectSystem/index";
import { checkDeckOutCondition, checkStateBasedActions } from "./gameEngine/stateBasedActions";
import { recordEventHelper } from "./gameEvents";

/**
 * Game Phase Types
 *
 * LunchTable TCG has 5 phases
 */
export type GamePhase = "draw" | "main" | "combat" | "breakdown_check" | "end";

/**
 * Phase transition sequence
 */
const PHASE_SEQUENCE: GamePhase[] = ["draw", "main", "combat", "breakdown_check", "end"];

/**
 * Get next phase in sequence
 */
function getNextPhase(currentPhase: GamePhase): GamePhase | null {
  const currentIndex = PHASE_SEQUENCE.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === PHASE_SEQUENCE.length - 1) {
    return null; // No next phase (end of turn)
  }
  return PHASE_SEQUENCE[currentIndex + 1] ?? null;
}

/**
 * Advance to next phase
 *
 * Validates phase transitions and executes phase-specific logic.
 * Auto-advances through non-interactive phases (draw, breakdown_check).
 * Only stops at interactive phases (main, combat, end).
 */
export const advancePhase = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby (for gameId only - turn state is in gameStates)
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // 4. Get game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found",
        lobbyId: args.lobbyId,
      });
    }

    // 4. Validate it's the current player's turn (using gameState as source of truth)
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        userId: user.userId,
      });
    }

    // 5. Get current phase (default to draw if not set)
    let currentPhase: GamePhase = gameState.currentPhase || "draw";
    let nextPhase = getNextPhase(currentPhase);

    if (!nextPhase) {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Cannot advance from End Phase - use endTurn instead",
        currentPhase,
      });
    }

    // 6. Auto-advance through non-interactive phases
    // Keep advancing until we hit an interactive phase or end
    const phasesVisited: GamePhase[] = [nextPhase];

    while (nextPhase && shouldAutoAdvancePhase(nextPhase)) {
      // Update game state
      await ctx.db.patch(gameState._id, {
        currentPhase: nextPhase,
      });

      // Validate required fields (gameId from lobby, turnNumber from gameState)
      if (!lobby.gameId || gameState.turnNumber === undefined) {
        throw createError(ErrorCode.GAME_NOT_STARTED, {
          reason: "Game not started or missing game data",
        });
      }

      // Record phase change
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: gameState.turnNumber,
        eventType: "phase_changed",
        playerId: user.userId,
        playerUsername: user.username,
        description: `${user.username} entered ${getPhaseDisplayName(nextPhase)}`,
        metadata: {
          previousPhase: currentPhase,
          newPhase: nextPhase,
          autoAdvanced: true,
        },
      });

      // Execute phase logic
      await executePhaseLogic(
        ctx,
        args.lobbyId,
        gameState._id,
        nextPhase,
        user.userId,
        gameState.turnNumber
      );

      // Move to next phase
      currentPhase = nextPhase;
      const tempNext = getNextPhase(currentPhase);
      if (!tempNext) break;

      nextPhase = tempNext;
      phasesVisited.push(nextPhase);

      // Refresh game state after updates
      const updatedState = await ctx.db.get(gameState._id);
      if (updatedState) {
        Object.assign(gameState, updatedState);
      }

      // Safety: prevent infinite loops
      if (phasesVisited.length > 10) break;
    }

    // 7. Update to final phase
    await ctx.db.patch(gameState._id, {
      currentPhase: nextPhase,
    });

    // 8. Validate required fields for final phase (gameId from lobby, turnNumber from gameState)
    if (!lobby.gameId || gameState.turnNumber === undefined) {
      throw createError(ErrorCode.GAME_NOT_STARTED, {
        reason: "Game not started or missing game data",
      });
    }

    // 9. Record final phase change if not already recorded
    if (!shouldAutoAdvancePhase(nextPhase)) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: gameState.turnNumber,
        eventType: "phase_changed",
        playerId: user.userId,
        playerUsername: user.username,
        description: `${user.username} entered ${getPhaseDisplayName(nextPhase)}`,
        metadata: {
          previousPhase: currentPhase,
          newPhase: nextPhase,
          autoAdvanced: false,
        },
      });
    }

    // 10. Execute final phase logic
    await executePhaseLogic(
      ctx,
      args.lobbyId,
      gameState._id,
      nextPhase,
      user.userId,
      gameState.turnNumber
    );

    // 11. Run state-based action checks after phase transition
    // Only enforce hand limit at end phase
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: nextPhase !== "end",
      turnNumber: gameState.turnNumber,
    });

    // 12. Return new phase and available actions
    return {
      newPhase: nextPhase,
      phasesVisited,
      availableActions: await getAvailableActionsForPhase(nextPhase, gameState),
      gameEnded: sbaResult.gameEnded,
      winnerId: sbaResult.winnerId,
    };
  },
});

/**
 * Skip Combat Phase - go from Main directly to Breakdown Check
 *
 * Allows the turn player to skip the Combat Phase entirely,
 * moving directly from Main Phase to Breakdown Check.
 */
export const skipBattlePhase = mutation({
  args: { lobbyId: v.id("gameLobbies") },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby (for gameId only - turn state is in gameStates)
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // 4. Get game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found",
        lobbyId: args.lobbyId,
      });
    }

    // 4. Verify it's the player's turn (using gameState as source of truth)
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        userId: user.userId,
      });
    }

    // 5. Validate current phase
    const currentPhase: GamePhase = gameState.currentPhase || "main";

    // Can only skip combat from main phase or during combat phase
    if (!["main", "combat"].includes(currentPhase)) {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Can only skip Combat Phase from Main Phase or during Combat Phase",
        currentPhase,
      });
    }

    // 6. Calculate skipped phases
    const skippedPhases = getSkippedPhases(currentPhase, "breakdown_check");

    // 7. Update phase to breakdown_check
    await ctx.db.patch(gameState._id, {
      currentPhase: "breakdown_check",
    });

    // 8. Record event (gameId from lobby, turnNumber from gameState)
    if (lobby.gameId && gameState.turnNumber !== undefined) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: gameState.turnNumber,
        eventType: "phase_changed",
        playerId: user.userId,
        playerUsername: user.username || "Unknown",
        description: `${user.username} skipped Combat Phase`,
        metadata: {
          skipped: true,
          fromPhase: currentPhase,
          toPhase: "breakdown_check",
          skippedPhases,
        },
      });
    }

    return {
      success: true,
      newPhase: "breakdown_check" as GamePhase,
      skippedPhases,
    };
  },
});

/**
 * Skip to End Phase - from any phase, jump to End Phase
 *
 * Allows the turn player to skip all remaining phases and
 * proceed directly to the End Phase.
 */
export const skipToEndPhase = mutation({
  args: { lobbyId: v.id("gameLobbies") },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby (for gameId only - turn state is in gameStates)
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // 4. Get game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found",
        lobbyId: args.lobbyId,
      });
    }

    // 4. Verify it's the player's turn (using gameState as source of truth)
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        userId: user.userId,
      });
    }

    // 5. Validate current phase
    const currentPhase: GamePhase = gameState.currentPhase || "draw";

    // Cannot skip from end phase (already there)
    if (currentPhase === "end") {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Already in End Phase",
        currentPhase,
      });
    }

    // Cannot skip from draw (mandatory phase)
    if (currentPhase === "draw") {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Cannot skip Draw Phase",
        currentPhase,
      });
    }

    // 6. Calculate skipped phases
    const skippedPhases = getSkippedPhases(currentPhase, "end");

    // 7. Update phase to end
    await ctx.db.patch(gameState._id, {
      currentPhase: "end",
    });

    // 8. Validate required fields (gameId from lobby, turnNumber from gameState)
    if (!lobby.gameId || gameState.turnNumber === undefined) {
      throw createError(ErrorCode.GAME_NOT_STARTED, {
        reason: "Game not started or missing game data",
      });
    }

    // 9. Record event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId,
      turnNumber: gameState.turnNumber,
      eventType: "phase_changed",
      playerId: user.userId,
      playerUsername: user.username || "Unknown",
      description: `${user.username} skipped to End Phase`,
      metadata: {
        skipped: true,
        fromPhase: currentPhase,
        toPhase: "end",
        skippedPhases,
      },
    });

    // 10. Execute End Phase logic
    await executePhaseLogic(
      ctx,
      args.lobbyId,
      gameState._id,
      "end",
      user.userId,
      gameState.turnNumber
    );

    // 11. Run state-based action checks (enforce hand limit at end phase)
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: false,
      turnNumber: gameState.turnNumber,
    });

    return {
      success: true,
      newPhase: "end" as GamePhase,
      skippedPhases,
      gameEnded: sbaResult.gameEnded,
      winnerId: sbaResult.winnerId,
    };
  },
});

/**
 * Skip Breakdown Check - go directly to End Phase
 *
 * Allows the turn player to skip Breakdown Check and proceed
 * directly to the End Phase. Only valid when in Breakdown Check phase.
 */
export const skipMainPhase2 = mutation({
  args: { lobbyId: v.id("gameLobbies") },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby (for gameId only - turn state is in gameStates)
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // 4. Get game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found",
        lobbyId: args.lobbyId,
      });
    }

    // 4. Verify it's the player's turn (using gameState as source of truth)
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        userId: user.userId,
      });
    }

    // 5. Validate current phase is breakdown_check
    const currentPhase: GamePhase = gameState.currentPhase || "draw";

    if (currentPhase !== "breakdown_check") {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Can only skip Breakdown Check when in Breakdown Check phase",
        currentPhase,
      });
    }

    // 6. Update phase to end
    await ctx.db.patch(gameState._id, {
      currentPhase: "end",
    });

    // 7. Validate required fields (gameId from lobby, turnNumber from gameState)
    if (!lobby.gameId || gameState.turnNumber === undefined) {
      throw createError(ErrorCode.GAME_NOT_STARTED, {
        reason: "Game not started or missing game data",
      });
    }

    // 8. Record event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId,
      turnNumber: gameState.turnNumber,
      eventType: "phase_changed",
      playerId: user.userId,
      playerUsername: user.username || "Unknown",
      description: `${user.username} skipped Breakdown Check`,
      metadata: {
        skipped: true,
        fromPhase: "breakdown_check",
        toPhase: "end",
        skippedPhases: ["breakdown_check"],
      },
    });

    // 9. Execute End Phase logic
    await executePhaseLogic(
      ctx,
      args.lobbyId,
      gameState._id,
      "end",
      user.userId,
      gameState.turnNumber
    );

    // 10. Run state-based action checks (enforce hand limit at end phase)
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: false,
      turnNumber: gameState.turnNumber,
    });

    return {
      success: true,
      newPhase: "end" as GamePhase,
      skippedPhases: ["breakdown_check"] as GamePhase[],
      gameEnded: sbaResult.gameEnded,
      winnerId: sbaResult.winnerId,
    };
  },
});

/**
 * Helper: Get phases that will be skipped between two phases
 */
function getSkippedPhases(fromPhase: GamePhase, toPhase: GamePhase): GamePhase[] {
  const fromIndex = PHASE_SEQUENCE.indexOf(fromPhase);
  const toIndex = PHASE_SEQUENCE.indexOf(toPhase);

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return [];
  }

  // Return all phases between (exclusive of fromPhase, inclusive up to but not including toPhase)
  return PHASE_SEQUENCE.slice(fromIndex + 1, toIndex);
}

/**
 * Check if a phase should auto-advance
 * Players only stop at: Main, Combat, End
 * All other phases auto-advance after executing their logic
 */
function shouldAutoAdvancePhase(phase: GamePhase): boolean {
  // Interactive phases where player makes decisions
  const interactivePhases: GamePhase[] = ["main", "combat", "end"];
  return !interactivePhases.includes(phase);
}

/**
 * Execute phase-specific logic
 */
async function executePhaseLogic(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameStateId: Id<"gameStates">,
  phase: GamePhase,
  playerId: Id<"users">,
  turnNumber: number
): Promise<void> {
  const gameState = await ctx.db.get(gameStateId);
  if (!gameState) return;

  const lobby = await ctx.db.get(lobbyId);
  if (!lobby) return;

  switch (phase) {
    case "draw": {
      // Auto-draw 1 card (skip on turn 1 for first player)
      const shouldSkipDraw = turnNumber === 1 && playerId === lobby.hostId;
      if (!shouldSkipDraw) {
        const drawnCards = await drawCards(ctx, gameState, playerId, 1);

        // Check for deck-out condition (player needs to draw but deck is empty)
        if (drawnCards.length === 0) {
          const deckOutResult = await checkDeckOutCondition(ctx, lobbyId, playerId, turnNumber);
          if (deckOutResult.gameEnded) {
            // Game ended due to deck out - will be handled by the caller
            return;
          }
        }

        // After drawing, check for "on_draw" triggered effects
        // Refresh game state after draw operation
        const refreshedGameState = await ctx.db.get(gameStateId);
        if (refreshedGameState) {
          await executePhaseTriggeredEffects(ctx, lobbyId, refreshedGameState, playerId, "draw");
        }
      }
      // Draw phase auto-advances to Main
      break;
    }

    case "breakdown_check":
      // Breakdown Check phase - check for card breakdowns
      // Auto-advances to End Phase
      break;

    case "end":
      // Trigger "During each End Phase" effects
      await executePhaseTriggeredEffects(ctx, lobbyId, gameState, playerId, "end");
      // End Phase logic (hand limit enforcement, etc.) is handled by endTurn mutation
      // End phase does NOT auto-advance (player must click "End Turn")
      break;

    default:
      // No special logic for main, combat
      break;
  }
}

/**
 * Execute phase-triggered effects
 *
 * Scans all cards on the field for effects that trigger during specific phases
 * and executes them automatically.
 */
async function executePhaseTriggeredEffects(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  phase: "draw" | "end"
): Promise<void> {
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby) return;

  // Validate required fields (gameId from lobby, turnNumber from gameState)
  if (!lobby.gameId || gameState.turnNumber === undefined) {
    return; // Cannot proceed without game data
  }

  const isHost = playerId === gameState.hostId;
  const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
  const opponentId = isHost ? gameState.opponentId : gameState.hostId;

  interface BoardCardWithOwner {
    cardId: Id<"cardDefinitions">;
    position: number;
    attack: number;
    defense: number;
    hasAttacked: boolean;
    isFaceDown: boolean;
    cannotBeDestroyedByBattle?: boolean;
    cannotBeDestroyedByEffects?: boolean;
    cannotBeTargeted?: boolean;
    ownerId: Id<"users">;
    isOwner: boolean;
  }

  // Combine all boards to check all cards
  const allBoards: BoardCardWithOwner[] = [
    ...playerBoard.map((bc) => ({ ...bc, ownerId: playerId, isOwner: true })),
    ...opponentBoard.map((bc) => ({ ...bc, ownerId: opponentId, isOwner: false })),
  ];

  // Batch fetch all board card definitions to avoid N+1 queries
  const boardCardIds = allBoards.map((bc) => bc.cardId);
  const boardCards = await Promise.all(boardCardIds.map((id) => ctx.db.get(id)));
  const boardCardMap = new Map(
    boardCards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
  );

  // Map phase to trigger condition
  const triggerMap: Record<string, string> = {
    draw: "on_draw",
    end: "on_end",
  };

  const triggerCondition = triggerMap[phase];

  // Scan all cards for matching trigger
  for (const boardCard of allBoards) {
    const card = boardCardMap.get(boardCard.cardId);
    const parsedAbility = getCardAbility(card);
    if (!parsedAbility) continue;

    // Check each effect in the ability for matching trigger
    for (const parsedEffect of parsedAbility.effects) {
      // Check if this effect triggers during this phase
      const matchesTrigger = parsedEffect.trigger === triggerCondition;
      if (!matchesTrigger) continue;
      // Get refreshed game state
      const refreshedState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
        .first();

      if (!refreshedState) continue;

      // Execute effect
      const effectResult = await executeEffect(
        ctx,
        refreshedState,
        lobbyId,
        parsedEffect,
        boardCard.ownerId,
        boardCard.cardId,
        [] // No targets for auto-trigger effects
      );

      if (effectResult.success) {
        // Record effect activation
        const user = await ctx.db.get(boardCard.ownerId);
        await recordEventHelper(ctx, {
          lobbyId,
          gameId: lobby.gameId,
          turnNumber: gameState.turnNumber,
          eventType: "effect_activated",
          playerId: boardCard.ownerId,
          playerUsername: user?.username || "Unknown",
          description: `${card?.name ?? "Unknown card"} phase effect: ${effectResult.message}`,
          metadata: {
            cardId: boardCard.cardId,
            trigger: phase,
            phase: phase,
          },
        });
      }
    }
  }
}

/**
 * Get available actions for current phase
 *
 * Returns what actions the player can take in the current phase.
 */
export const getPhaseActions = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return {
        canSummon: false,
        canSetCard: false,
        canActivateSpell: false,
        canActivateTrap: false,
        canDeclareAttack: false,
        canChangePosition: false,
        canEndPhase: true,
      };
    }

    const currentPhase: GamePhase = gameState.currentPhase || "draw";

    return getAvailableActionsForPhase(currentPhase, gameState);
  },
});

/**
 * Helper: Get available actions for a specific phase
 */
function getAvailableActionsForPhase(
  phase: GamePhase,
  _gameState: Doc<"gameStates">
): {
  canSummon: boolean;
  canSetCard: boolean;
  canActivateSpell: boolean;
  canActivateTrap: boolean;
  canDeclareAttack: boolean;
  canChangePosition: boolean;
  canEndPhase: boolean;
} {
  switch (phase) {
    case "draw":
      return {
        canSummon: false,
        canSetCard: false,
        canActivateSpell: false,
        canActivateTrap: true, // Can activate traps in response
        canDeclareAttack: false,
        canChangePosition: false,
        canEndPhase: true,
      };

    case "main":
      return {
        canSummon: true,
        canSetCard: true,
        canActivateSpell: true,
        canActivateTrap: true,
        canDeclareAttack: false,
        canChangePosition: true,
        canEndPhase: true,
      };

    case "combat":
      return {
        canSummon: false,
        canSetCard: false,
        canActivateSpell: true, // Quick-Play spells only (enforced in legalMoves)
        canActivateTrap: true,
        canDeclareAttack: true,
        canChangePosition: false, // Cannot change position during Combat Phase
        canEndPhase: true,
      };

    case "breakdown_check":
      return {
        canSummon: false,
        canSetCard: false,
        canActivateSpell: false,
        canActivateTrap: true,
        canDeclareAttack: false,
        canChangePosition: false,
        canEndPhase: true, // Auto-advances to End
      };

    case "end":
      return {
        canSummon: false,
        canSetCard: false,
        canActivateSpell: false,
        canActivateTrap: true,
        canDeclareAttack: false,
        canChangePosition: false,
        canEndPhase: true, // Ends turn
      };

    default:
      return {
        canSummon: false,
        canSetCard: false,
        canActivateSpell: false,
        canActivateTrap: false,
        canDeclareAttack: false,
        canChangePosition: false,
        canEndPhase: true,
      };
  }
}

/**
 * Get display name for phase
 */
function getPhaseDisplayName(phase: GamePhase): string {
  switch (phase) {
    case "draw":
      return "Draw Phase";
    case "main":
      return "Main Phase";
    case "combat":
      return "Combat Phase";
    case "breakdown_check":
      return "Breakdown Check";
    case "end":
      return "End Phase";
    default:
      return "Unknown Phase";
  }
}

/**
 * Initialize phase for new turn
 *
 * Called when a new turn starts.
 * Sets phase to "draw" and records phase_changed event.
 */
export const initializeTurnPhase = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    playerId: v.id("users"),
    turnNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found",
        lobbyId: args.lobbyId,
      });
    }

    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // Set to Draw Phase
    await ctx.db.patch(gameState._id, {
      currentPhase: "draw",
    });

    // Validate required lobby fields
    if (!lobby.gameId) {
      throw createError(ErrorCode.GAME_NOT_STARTED, {
        reason: "Game not started or missing game ID",
      });
    }

    // Record phase_changed event
    const user = await ctx.db.get(args.playerId);
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId,
      turnNumber: args.turnNumber,
      eventType: "phase_changed",
      playerId: args.playerId,
      playerUsername: user?.username || "Unknown",
      description: `${user?.username} entered Draw Phase`,
      metadata: {
        previousPhase: "end",
        newPhase: "draw",
      },
    });

    // Execute Draw Phase logic (auto-draw)
    await executePhaseLogic(
      ctx,
      args.lobbyId,
      gameState._id,
      "draw",
      args.playerId,
      args.turnNumber
    );
  },
});

/**
 * Advance Phase (Internal)
 *
 * Internal mutation for API-based phase advancement.
 * Accepts gameId string for story mode support.
 */
export const advancePhaseInternal = internalMutation({
  args: {
    gameId: v.string(),
    userId: v.id("users"),
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

    // 2. Get lobby
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== args.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        userId: args.userId,
      });
    }

    // 4. Get current phase (default to draw if not set)
    let currentPhase: GamePhase = gameState.currentPhase || "draw";
    let nextPhase = getNextPhase(currentPhase);

    if (!nextPhase) {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Cannot advance from End Phase - use endTurn instead",
        currentPhase,
      });
    }

    // 5. Auto-advance through non-interactive phases
    const phasesVisited: GamePhase[] = [nextPhase];

    while (nextPhase && shouldAutoAdvancePhase(nextPhase)) {
      // Update game state
      await ctx.db.patch(gameState._id, {
        currentPhase: nextPhase,
      });

      // Record phase change
      await recordEventHelper(ctx, {
        lobbyId: gameState.lobbyId,
        gameId: args.gameId,
        turnNumber: gameState.turnNumber || 0,
        eventType: "phase_changed",
        playerId: args.userId,
        playerUsername: (await ctx.db.get(args.userId))?.username || "Unknown",
        description: `${(await ctx.db.get(args.userId))?.username} entered ${getPhaseDisplayName(nextPhase)}`,
        metadata: {
          previousPhase: currentPhase,
          newPhase: nextPhase,
          autoAdvanced: true,
        },
      });

      // Execute phase logic
      await executePhaseLogic(
        ctx,
        gameState.lobbyId,
        gameState._id,
        nextPhase,
        args.userId,
        gameState.turnNumber || 0
      );

      // Move to next phase
      currentPhase = nextPhase;
      const tempNext = getNextPhase(currentPhase);
      if (!tempNext) break;

      nextPhase = tempNext;
      phasesVisited.push(nextPhase);

      // Refresh game state after updates
      const updatedState = await ctx.db.get(gameState._id);
      if (updatedState) {
        Object.assign(gameState, updatedState);
      }

      // Safety: prevent infinite loops
      if (phasesVisited.length > 10) break;
    }

    // 6. Update to final phase
    await ctx.db.patch(gameState._id, {
      currentPhase: nextPhase,
    });

    // 7. Record final phase change if not already recorded
    if (!shouldAutoAdvancePhase(nextPhase)) {
      await recordEventHelper(ctx, {
        lobbyId: gameState.lobbyId,
        gameId: args.gameId,
        turnNumber: gameState.turnNumber || 0,
        eventType: "phase_changed",
        playerId: args.userId,
        playerUsername: (await ctx.db.get(args.userId))?.username || "Unknown",
        description: `${(await ctx.db.get(args.userId))?.username} entered ${getPhaseDisplayName(nextPhase)}`,
        metadata: {
          previousPhase: currentPhase,
          newPhase: nextPhase,
          autoAdvanced: false,
        },
      });
    }

    // 8. Execute final phase logic
    await executePhaseLogic(
      ctx,
      gameState.lobbyId,
      gameState._id,
      nextPhase,
      args.userId,
      gameState.turnNumber || 0
    );

    // 9. Run state-based action checks after phase transition
    const sbaResult = await checkStateBasedActions(ctx, gameState.lobbyId, {
      skipHandLimit: nextPhase !== "end",
      turnNumber: gameState.turnNumber || 0,
    });

    return {
      newPhase: nextPhase,
      phasesVisited,
      availableActions: await getAvailableActionsForPhase(nextPhase, gameState),
      gameEnded: sbaResult.gameEnded,
      winnerId: sbaResult.winnerId,
    };
  },
});

/**
 * Skip Combat Phase (Internal)
 *
 * Internal mutation for API-based combat phase skip.
 * Allows the turn player to skip the Combat Phase entirely.
 */
export const skipBattlePhaseInternal = internalMutation({
  args: {
    gameId: v.string(),
    userId: v.id("users"),
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

    // 2. Get lobby
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Verify it's the player's turn
    if (gameState.currentTurnPlayerId !== args.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        userId: args.userId,
      });
    }

    // 4. Validate current phase
    const currentPhase: GamePhase = gameState.currentPhase || "main";

    // Can only skip combat from main phase or during combat phase
    if (!["main", "combat"].includes(currentPhase)) {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Can only skip Combat Phase from Main Phase or during Combat Phase",
        currentPhase,
      });
    }

    // 5. Calculate skipped phases
    const skippedPhases = getSkippedPhases(currentPhase, "breakdown_check");

    // 6. Update phase to breakdown_check
    await ctx.db.patch(gameState._id, {
      currentPhase: "breakdown_check",
    });

    // 7. Record event
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: gameState.turnNumber || 0,
      eventType: "phase_changed",
      playerId: args.userId,
      playerUsername: (await ctx.db.get(args.userId))?.username || "Unknown",
      description: `${(await ctx.db.get(args.userId))?.username} skipped Combat Phase`,
      metadata: {
        skipped: true,
        fromPhase: currentPhase,
        toPhase: "breakdown_check",
        skippedPhases,
      },
    });

    return {
      success: true,
      newPhase: "breakdown_check" as GamePhase,
      skippedPhases,
    };
  },
});

/**
 * Skip to End Phase (Internal)
 *
 * Internal mutation for API-based end phase skip.
 * Allows the turn player to skip all remaining phases and proceed to End Phase.
 */
export const skipToEndPhaseInternal = internalMutation({
  args: {
    gameId: v.string(),
    userId: v.id("users"),
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

    // 2. Get lobby
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Verify it's the player's turn
    if (gameState.currentTurnPlayerId !== args.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        userId: args.userId,
      });
    }

    // 4. Validate current phase
    const currentPhase: GamePhase = gameState.currentPhase || "draw";

    // Cannot skip from end phase (already there)
    if (currentPhase === "end") {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Already in End Phase",
        currentPhase,
      });
    }

    // Cannot skip from draw (mandatory phase)
    if (currentPhase === "draw") {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Cannot skip Draw Phase",
        currentPhase,
      });
    }

    // 5. Calculate skipped phases
    const skippedPhases = getSkippedPhases(currentPhase, "end");

    // 6. Update phase to end
    await ctx.db.patch(gameState._id, {
      currentPhase: "end",
    });

    // 7. Record event
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: gameState.turnNumber || 0,
      eventType: "phase_changed",
      playerId: args.userId,
      playerUsername: (await ctx.db.get(args.userId))?.username || "Unknown",
      description: `${(await ctx.db.get(args.userId))?.username} skipped to End Phase`,
      metadata: {
        skipped: true,
        fromPhase: currentPhase,
        toPhase: "end",
        skippedPhases,
      },
    });

    // 8. Execute End Phase logic
    await executePhaseLogic(
      ctx,
      gameState.lobbyId,
      gameState._id,
      "end",
      args.userId,
      gameState.turnNumber || 0
    );

    // 9. Run state-based action checks (enforce hand limit at end phase)
    const sbaResult = await checkStateBasedActions(ctx, gameState.lobbyId, {
      skipHandLimit: false,
      turnNumber: gameState.turnNumber || 0,
    });

    return {
      success: true,
      newPhase: "end" as GamePhase,
      skippedPhases,
      gameEnded: sbaResult.gameEnded,
      winnerId: sbaResult.winnerId,
    };
  },
});
