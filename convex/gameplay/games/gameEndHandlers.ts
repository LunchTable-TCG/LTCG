/**
 * Game End Handlers
 *
 * Orchestrates all side effects when a game ends.
 * Eliminates duplication across completeGame, surrenderGame, and forfeitGame.
 */

import * as generatedApi from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { emitEvent } from "../../events/emitter";
import { completedGamesCounter } from "../../infrastructure/shardedCounters";
import { recordGameEndHelper } from "../gameEvents";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

// ============================================================================
// TYPES
// ============================================================================

export type GameEndReason = "completed" | "surrender" | "forfeit" | "timeout";

export interface GameEndParams {
  lobbyId: Id<"gameLobbies">;
  winnerId: Id<"users">;
  loserId: Id<"users">;
  endReason: GameEndReason;
  /** Required for "completed" end reason */
  finalTurnNumber?: number;
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

/**
 * Handle all game-end side effects in a single call.
 *
 * Replaces duplicated logic across completeGame, surrenderGame, and forfeitGame.
 * All steps run within the same Convex mutation transaction.
 */
export async function handleGameEnd(
  ctx: MutationCtx,
  params: GameEndParams
): Promise<void> {
  const { lobbyId, winnerId, loserId, endReason, finalTurnNumber } = params;

  // biome-ignore lint/suspicious/noExplicitAny: Component tables not in main DataModel
  const db = ctx.db;

  const lobby = await db.get(lobbyId);
  if (!lobby) {
    throw new Error(`Lobby ${lobbyId} not found during game end`);
  }

  // 1. Update lobby status
  const lobbyStatus = endReason === "completed" ? "completed" : "forfeited";
  await db.patch(lobbyId, {
    status: lobbyStatus,
    winnerId,
    ...(finalTurnNumber !== undefined ? { turnNumber: finalTurnNumber } : {}),
  });

  // 2. Increment completed games counter
  if (endReason === "completed") {
    await completedGamesCounter.add(ctx, "global", 1);
  }

  // 3. Update player presence → online
  await updatePresence(ctx, lobby.hostId as Id<"users">, lobby.hostUsername, lobby.mode);
  if (lobby.opponentId && lobby.opponentUsername && lobby.mode !== "story") {
    await updatePresence(ctx, lobby.opponentId as Id<"users">, lobby.opponentUsername, lobby.mode);
  }

  // 4. Get game state for final LP (needed for events)
  const gameState = await db
    .query("gameStates")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
    .first();

  const hostFinalLP = gameState
    ? winnerId === lobby.hostId
      ? gameState.hostLifePoints
      : gameState.opponentLifePoints || 0
    : 0;

  // 5. Emit game:ended event (replaces stats, agent stats, and some wager logic)
  if (lobby.opponentId) {
    await emitEvent(ctx, {
      type: "game:ended",
      gameId: lobby.gameId!,
      lobbyId,
      winnerId,
      loserId,
      endReason,
      gameMode: lobby.mode as "ranked" | "casual" | "story",
      turnCount: finalTurnNumber ?? lobby.turnNumber ?? 0,
      wagerAmount: lobby.wagerAmount ?? 0,
      wagerPaid: lobby.wagerPaid ?? false,
      stageId: lobby.stageId,
      hostFinalLP,
      hostIsWinner: winnerId === lobby.hostId,
      hostId: lobby.hostId,
      timestamp: Date.now(),
    });
  }

  // 6. Emit wager:payout event
  if (lobby.opponentId && lobby.wagerAmount && lobby.wagerAmount > 0 && !lobby.wagerPaid) {
    await emitEvent(ctx, {
      type: "wager:payout",
      lobbyId,
      winnerId,
      loserId,
      wagerAmount: lobby.wagerAmount,
      timestamp: Date.now(),
    });
  }

  // 7. Emit crypto:escrow_settle event
  if (lobby.cryptoWagerCurrency && lobby.cryptoWagerTier && !lobby.cryptoSettled) {
    await db.patch(lobbyId, {
      cryptoSettlementWinnerId: winnerId,
      cryptoSettlementLoserId: loserId,
    });
    await emitEvent(ctx, {
      type: "crypto:escrow_settle",
      lobbyId,
      winnerId,
      loserId,
      timestamp: Date.now(),
    });
  }

  // 8. Record game_end event (only for completed games with gameId)
  if (endReason === "completed" && lobby.gameId && lobby.opponentId) {
    const winner = await ctx.db.get(winnerId);
    const loser = await ctx.db.get(loserId);
    if (winner && loser) {
      await recordGameEndHelper(ctx, {
        lobbyId,
        gameId: lobby.gameId,
        turnNumber: finalTurnNumber ?? 0,
        winnerId,
        winnerUsername: winner.username || winner.name || "Unknown",
        loserId,
        loserUsername: loser.username || loser.name || "Unknown",
      });
    }
  }

  // 9. Stop agent streams
  await stopAgentStreams(ctx, lobbyId, lobby.hostId as Id<"users">, lobby.opponentId as Id<"users"> | undefined);

  // 10. Handle story mode completion
  if (lobby.mode === "story" && lobby.stageId) {
    await emitEvent(ctx, {
      type: "story:stage_completed",
      userId: lobby.hostId,
      stageId: lobby.stageId,
      won: winnerId === lobby.hostId,
      finalLP: hostFinalLP,
      timestamp: Date.now(),
    });

    if (gameState) {
      await db.delete(gameState._id);
    }
  } else {
    // 11. Delete game state (non-story)
    if (gameState) {
      await db.delete(gameState._id);
    }
  }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Update user presence status to online
 */
async function updatePresence(
  ctx: MutationCtx,
  userId: Id<"users">,
  _username: string,
  _mode: string
): Promise<void> {
  // biome-ignore lint/suspicious/noExplicitAny: Component tables not in main DataModel
  const db = ctx.db;
  const user = await db.get(userId);
  if (!user) return;

  const presenceRecord = await db
    .query("userPresence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (presenceRecord) {
    await db.patch(presenceRecord._id, {
      status: "online",
      lastSeen: Date.now(),
    });
  }
}

/**
 * Stop agent streams for players in the game
 * Called when game ends to clean up streaming sessions
 */
async function stopAgentStreams(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  hostId: Id<"users">,
  opponentId: Id<"users"> | undefined
): Promise<void> {
  // Check both players for active agents
  const playerIds = [hostId, opponentId].filter((id): id is Id<"users"> => id !== undefined);

  for (const playerId of playerIds) {
    // Find agent for this player
    // biome-ignore lint/suspicious/noExplicitAny: Component tables not in main DataModel
    const db = ctx.db;
    const agent = await db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", playerId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (agent?.streamingEnabled) {
      // Schedule stop for agent stream (async, non-blocking)
      await ctx.scheduler.runAfter(0, internalAny.agents.streaming.autoStopAgentStream, {
        agentId: agent._id,
        lobbyId,
      });
    }
  }
}
