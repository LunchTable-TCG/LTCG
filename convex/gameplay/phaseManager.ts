/**
 * Phase Manager
 *
 * Manages Yu-Gi-Oh turn structure and phase transitions.
 * Turn Structure: Draw → Standby → Main 1 → Battle (Start/Battle/End) → Main 2 → End
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { createError, ErrorCode } from "../lib/errorCodes";
import { requireAuthMutation } from "../lib/convexAuth";
import { drawCards } from "../lib/gameHelpers";
import { executeEffect, parseAbility } from "./effectSystem/index";
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
    let currentPhase: GamePhase = (gameState.currentPhase as GamePhase) || "draw";
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

      // Record phase change
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId!,
        turnNumber: lobby.turnNumber!,
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
        lobby.turnNumber!
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

    // 8. Record final phase change if not already recorded
    if (!shouldAutoAdvancePhase(nextPhase)) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId!,
        turnNumber: lobby.turnNumber!,
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

    // 9. Execute final phase logic
    await executePhaseLogic(
      ctx,
      args.lobbyId,
      gameState._id,
      nextPhase,
      user.userId,
      lobby.turnNumber!
    );

    // 10. Return new phase and available actions
    return {
      newPhase: nextPhase,
      phasesVisited,
      availableActions: await getAvailableActionsForPhase(nextPhase, gameState),
    };
  },
});

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
  ctx: any,
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
    case "draw":
      // Auto-draw 1 card (skip on turn 1 for first player)
      const shouldSkipDraw = turnNumber === 1 && playerId === lobby.hostId;
      if (!shouldSkipDraw) {
        await drawCards(ctx, gameState, playerId, 1);
      }
      // Draw phase auto-advances to Standby
      break;

    case "standby":
      // Trigger standby effects (future implementation)
      // Auto-advances to Main Phase 1
      break;

    case "battle_start":
      // Record battle_phase_entered event
      const user = await ctx.db.get(playerId);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId: lobby.gameId!,
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
  ctx: any,
  lobbyId: Id<"gameLobbies">,
  gameState: any,
  playerId: Id<"users">,
  phase: "battle_start" | "end"
): Promise<void> {
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby) return;

  const isHost = playerId === gameState.hostId;
  const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
  const opponentId = isHost ? gameState.opponentId : gameState.hostId;

  // Combine all boards to check all cards
  const allBoards = [
    ...playerBoard.map((bc: any) => ({ ...bc, ownerId: playerId, isOwner: true })),
    ...opponentBoard.map((bc: any) => ({ ...bc, ownerId: opponentId, isOwner: false })),
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
  };

  const triggerCondition = triggerMap[phase];

  // Scan all cards for matching trigger
  for (const boardCard of allBoards) {
    const card = boardCardMap.get(boardCard.cardId);
    if (!card?.ability) continue;

    const parsedEffect = parseAbility(card.ability);
    if (!parsedEffect) continue;

    // Check if this effect triggers during this phase
    if (parsedEffect.trigger === triggerCondition) {
      // Get refreshed game state
      const refreshedState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q: any) => q.eq("lobbyId", lobbyId))
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
          gameId: lobby.gameId!,
          turnNumber: lobby.turnNumber!,
          eventType: "effect_activated",
          playerId: boardCard.ownerId,
          playerUsername: user?.username || "Unknown",
          description: `${card.name} phase effect: ${effectResult.message}`,
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
        canEnterBattle: false,
        canEndPhase: true,
      };
    }

    const currentPhase: GamePhase = (gameState.currentPhase as GamePhase) || "draw";

    return getAvailableActionsForPhase(currentPhase, gameState);
  },
});

/**
 * Helper: Get available actions for a specific phase
 */
function getAvailableActionsForPhase(
  phase: GamePhase,
  _gameState: any
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

    // Record phase_changed event
    const user = await ctx.db.get(args.playerId);
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId!,
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
