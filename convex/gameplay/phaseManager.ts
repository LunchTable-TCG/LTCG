/**
 * Phase Manager
 *
 * Manages Yu-Gi-Oh turn structure and phase transitions.
 * Turn Structure: Draw → Standby → Main 1 → Battle (Start/Battle/End) → Main 2 → End
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { getCardAbility } from "../lib/abilityHelpers";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { drawCards } from "../lib/gameHelpers";
import { executeEffect } from "./effectSystem/index";
import { checkDeckOutCondition, checkStateBasedActions } from "./gameEngine/stateBasedActions";
import { recordEventHelper } from "./gameEvents";

/**
 * Game Phase Types
 *
 * Yu-Gi-Oh has 6 main phases, with Battle Phase subdivided into 3 steps
 */
export type GamePhase =
  | "draw"
  | "standby"
  | "main1"
  | "battle_start"
  | "battle"
  | "battle_end"
  | "main2"
  | "end";

/**
 * Phase transition sequence
 */
const PHASE_SEQUENCE: GamePhase[] = [
  "draw",
  "standby",
  "main1",
  "battle_start",
  "battle",
  "battle_end",
  "main2",
  "end",
];

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
 * Auto-advances through non-interactive phases (draw, standby, battle_start, battle_end).
 * Only stops at interactive phases (main1, battle, main2, end).
 */
export const advancePhase = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // 3. Validate it's the current player's turn
    if (lobby.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: lobby.currentTurnPlayerId,
        userId: user.userId,
      });
    }

    // 4. Get game state
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

      // Validate required lobby fields
      if (!lobby.gameId || lobby.turnNumber === undefined) {
        throw createError(ErrorCode.GAME_NOT_STARTED, {
          reason: "Game not started or missing game data",
        });
      }

      // Record phase change
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: lobby.turnNumber,
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
        lobby.turnNumber
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

    // 8. Validate required lobby fields for final phase
    if (!lobby.gameId || lobby.turnNumber === undefined) {
      throw createError(ErrorCode.GAME_NOT_STARTED, {
        reason: "Game not started or missing game data",
      });
    }

    // 9. Record final phase change if not already recorded
    if (!shouldAutoAdvancePhase(nextPhase)) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: lobby.turnNumber,
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
      lobby.turnNumber
    );

    // 11. Run state-based action checks after phase transition
    // Only enforce hand limit at end phase
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: nextPhase !== "end",
      turnNumber: lobby.turnNumber,
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
 * Skip Battle Phase - go from Main 1 directly to Main 2
 *
 * Allows the turn player to skip the Battle Phase entirely,
 * moving directly from Main Phase 1 to Main Phase 2.
 */
export const skipBattlePhase = mutation({
  args: { lobbyId: v.id("gameLobbies") },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // 3. Verify it's the player's turn
    if (lobby.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: lobby.currentTurnPlayerId,
        userId: user.userId,
      });
    }

    // 4. Get game state
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

    // 5. Validate current phase
    const currentPhase: GamePhase = gameState.currentPhase || "main1";

    // Can only skip battle from main1 or during battle phases
    if (!["main1", "battle_start", "battle", "battle_end"].includes(currentPhase)) {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Can only skip Battle Phase from Main Phase 1 or during Battle Phase",
        currentPhase,
      });
    }

    // 6. Calculate skipped phases
    const skippedPhases = getSkippedPhases(currentPhase, "main2");

    // 7. Update phase to main2
    await ctx.db.patch(gameState._id, {
      currentPhase: "main2",
    });

    // 8. Record event
    if (lobby.gameId && lobby.turnNumber !== undefined) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: lobby.turnNumber,
        eventType: "phase_changed",
        playerId: user.userId,
        playerUsername: user.username || "Unknown",
        description: `${user.username} skipped Battle Phase`,
        metadata: {
          skipped: true,
          fromPhase: currentPhase,
          toPhase: "main2",
          skippedPhases,
        },
      });
    }

    return {
      success: true,
      newPhase: "main2" as GamePhase,
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

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // 3. Verify it's the player's turn
    if (lobby.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: lobby.currentTurnPlayerId,
        userId: user.userId,
      });
    }

    // 4. Get game state
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

    // 5. Validate current phase
    const currentPhase: GamePhase = gameState.currentPhase || "draw";

    // Cannot skip from end phase (already there)
    if (currentPhase === "end") {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Already in End Phase",
        currentPhase,
      });
    }

    // Cannot skip from draw or standby (mandatory phases)
    if (currentPhase === "draw" || currentPhase === "standby") {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Cannot skip Draw Phase or Standby Phase",
        currentPhase,
      });
    }

    // 6. Calculate skipped phases
    const skippedPhases = getSkippedPhases(currentPhase, "end");

    // 7. Update phase to end
    await ctx.db.patch(gameState._id, {
      currentPhase: "end",
    });

    // 8. Validate required lobby fields
    if (!lobby.gameId || lobby.turnNumber === undefined) {
      throw createError(ErrorCode.GAME_NOT_STARTED, {
        reason: "Game not started or missing game data",
      });
    }

    // 9. Record event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId,
      turnNumber: lobby.turnNumber,
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
    await executePhaseLogic(ctx, args.lobbyId, gameState._id, "end", user.userId, lobby.turnNumber);

    // 11. Run state-based action checks (enforce hand limit at end phase)
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: false,
      turnNumber: lobby.turnNumber,
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
 * Skip Main Phase 2 - go directly to End Phase
 *
 * Allows the turn player to skip Main Phase 2 and proceed
 * directly to the End Phase. Only valid when in Main Phase 2.
 */
export const skipMainPhase2 = mutation({
  args: { lobbyId: v.id("gameLobbies") },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // 3. Verify it's the player's turn
    if (lobby.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not your turn",
        currentTurnPlayerId: lobby.currentTurnPlayerId,
        userId: user.userId,
      });
    }

    // 4. Get game state
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

    // 5. Validate current phase is main2
    const currentPhase: GamePhase = gameState.currentPhase || "draw";

    if (currentPhase !== "main2") {
      throw createError(ErrorCode.GAME_CANNOT_ADVANCE_PHASE, {
        reason: "Can only skip Main Phase 2 when in Main Phase 2",
        currentPhase,
      });
    }

    // 6. Update phase to end
    await ctx.db.patch(gameState._id, {
      currentPhase: "end",
    });

    // 7. Validate required lobby fields
    if (!lobby.gameId || lobby.turnNumber === undefined) {
      throw createError(ErrorCode.GAME_NOT_STARTED, {
        reason: "Game not started or missing game data",
      });
    }

    // 8. Record event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId,
      turnNumber: lobby.turnNumber,
      eventType: "phase_changed",
      playerId: user.userId,
      playerUsername: user.username || "Unknown",
      description: `${user.username} skipped Main Phase 2`,
      metadata: {
        skipped: true,
        fromPhase: "main2",
        toPhase: "end",
        skippedPhases: ["main2"],
      },
    });

    // 9. Execute End Phase logic
    await executePhaseLogic(ctx, args.lobbyId, gameState._id, "end", user.userId, lobby.turnNumber);

    // 10. Run state-based action checks (enforce hand limit at end phase)
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: false,
      turnNumber: lobby.turnNumber,
    });

    return {
      success: true,
      newPhase: "end" as GamePhase,
      skippedPhases: ["main2"] as GamePhase[],
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
 * Players only stop at: Main1, Battle, Main2
 * All other phases auto-advance after executing their logic
 */
function shouldAutoAdvancePhase(phase: GamePhase): boolean {
  // Interactive phases where player makes decisions
  const interactivePhases: GamePhase[] = ["main1", "battle", "main2"];
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
      // Draw phase auto-advances to Standby
      break;
    }

    case "standby":
      // Trigger standby phase effects
      await executePhaseTriggeredEffects(ctx, lobbyId, gameState, playerId, "standby");
      // Auto-advances to Main Phase 1
      break;

    case "battle_start": {
      // Validate required lobby fields
      if (!lobby.gameId) {
        throw createError(ErrorCode.GAME_NOT_STARTED, {
          reason: "Game not started or missing game ID",
        });
      }

      // Record battle_phase_entered event
      const user = await ctx.db.get(playerId);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId: lobby.gameId,
        turnNumber,
        eventType: "battle_phase_entered",
        playerId,
        playerUsername: user?.username || "Unknown",
        description: `${user?.username} entered the Battle Phase`,
      });

      // Trigger "At the start of the Battle Phase" effects
      await executePhaseTriggeredEffects(ctx, lobbyId, gameState, playerId, "battle_start");
      // Auto-advances to Battle (main battle phase)
      break;
    }

    case "battle_end":
      // Battle Phase cleanup (future implementation)
      // Auto-advances to Main Phase 2
      break;

    case "end":
      // Trigger "During each End Phase" effects
      await executePhaseTriggeredEffects(ctx, lobbyId, gameState, playerId, "end");
      // End Phase logic (hand limit enforcement, etc.) is handled by endTurn mutation
      // End phase does NOT auto-advance (player must click "End Turn")
      break;

    default:
      // No special logic for main1, battle, main2
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
  phase: "battle_start" | "end" | "draw" | "standby"
): Promise<void> {
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby) return;

  // Validate required lobby fields
  if (!lobby.gameId || lobby.turnNumber === undefined) {
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
    battle_start: "on_battle_start",
    end: "on_end",
    draw: "on_draw",
    standby: "on_standby",
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
      if (parsedEffect.trigger !== triggerCondition) continue;
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
          turnNumber: lobby.turnNumber,
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
    case "standby":
      return {
        canSummon: false,
        canSetCard: false,
        canActivateSpell: false,
        canActivateTrap: true, // Can activate traps in response
        canDeclareAttack: false,
        canChangePosition: false,
        canEndPhase: true,
      };

    case "main1":
    case "main2":
      return {
        canSummon: true,
        canSetCard: true,
        canActivateSpell: true,
        canActivateTrap: true,
        canDeclareAttack: false,
        canChangePosition: true,
        canEndPhase: true,
      };

    case "battle_start":
    case "battle":
      return {
        canSummon: false,
        canSetCard: false,
        canActivateSpell: false, // Only Quick-Play spells
        canActivateTrap: true,
        canDeclareAttack: true,
        canChangePosition: false, // Cannot change position during Battle Phase
        canEndPhase: true,
      };

    case "battle_end":
      return {
        canSummon: false,
        canSetCard: false,
        canActivateSpell: false,
        canActivateTrap: true,
        canDeclareAttack: false,
        canChangePosition: false,
        canEndPhase: true, // Auto-advances to Main 2
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
    case "standby":
      return "Standby Phase";
    case "main1":
      return "Main Phase 1";
    case "battle_start":
      return "Battle Phase (Start Step)";
    case "battle":
      return "Battle Phase";
    case "battle_end":
      return "Battle Phase (End Step)";
    case "main2":
      return "Main Phase 2";
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
