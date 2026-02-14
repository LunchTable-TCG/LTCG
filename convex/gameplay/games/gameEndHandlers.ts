/**
 * Game End Handlers
 *
 * Orchestrates all side effects when a game ends.
 * Eliminates duplication across completeGame, surrenderGame, and forfeitGame.
 */

import * as generatedApi from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { adjustPlayerCurrencyHelper } from "../../economy/economy";
import { completedGamesCounter } from "../../infrastructure/shardedCounters";
import { recordGameEndHelper } from "../gameEvents";
import { updateAgentStatsAfterGame, updatePlayerStatsAfterGame } from "./stats";

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
// CONSTANTS
// ============================================================================

const WAGER_WINNER_PERCENTAGE = 0.9; // 90% to winner, 10% to treasury

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

  // 4. Update player stats and ratings
  if (lobby.opponentId) {
    const gameMode = lobby.mode as "ranked" | "casual" | "story";
    await updatePlayerStatsAfterGame(ctx, winnerId, loserId, gameMode);
  }

  // 5. Process in-game wager payout
  if (lobby.opponentId && lobby.wagerAmount && lobby.wagerAmount > 0 && !lobby.wagerPaid) {
    await processWagerPayout(ctx, lobbyId, lobby.wagerAmount, winnerId, loserId);
  }

  // 6. Schedule crypto escrow settlement
  if (lobby.cryptoWagerCurrency && lobby.cryptoWagerTier && !lobby.cryptoSettled) {
    await db.patch(lobbyId, {
      cryptoSettlementWinnerId: winnerId,
      cryptoSettlementLoserId: loserId,
    });
    await ctx.scheduler.runAfter(0, internalAny.wager.escrow.settleEscrow, {
      lobbyId,
      winnerId,
      loserId,
    });
  }

  // 7. Update agent stats (if AI players)
  if (lobby.opponentId) {
    const winnerAgent = await db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", winnerId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    const loserAgent = await db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", loserId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (winnerAgent || loserAgent) {
      await updateAgentStatsAfterGame(ctx, winnerAgent, loserAgent);
    }
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
    const gameState = await db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .first();

    await ctx.runMutation(internalAny.progression.storyStages.completeStageInternal, {
      userId: lobby.hostId,
      stageId: lobby.stageId,
      won: winnerId === lobby.hostId,
      finalLP: gameState ? (winnerId === lobby.hostId ? gameState.hostLifePoints : 0) : 0,
    });

    if (gameState) {
      await db.delete(gameState._id);
    }
  } else {
    // 11. Delete game state (non-story)
    const gameState = await db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .first();

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
 * Process wager payout — winner gets 90%, 10% to treasury
 */
async function processWagerPayout(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  wagerAmount: number,
  winnerId: Id<"users">,
  loserId: Id<"users">
): Promise<void> {
  if (wagerAmount <= 0) return;
  // biome-ignore lint/suspicious/noExplicitAny: Component tables not in main DataModel
  const db = ctx.db;

  const totalPot = wagerAmount * 2; // Both players wagered the same amount
  const winnerPayout = Math.floor(totalPot * WAGER_WINNER_PERCENTAGE);
  const treasuryFee = totalPot - winnerPayout; // Remainder goes to treasury (10%)

  // Pay the winner their share (90%)
  await adjustPlayerCurrencyHelper(ctx, {
    userId: winnerId,
    goldDelta: winnerPayout,
    transactionType: "wager_payout",
    description: `Won ${winnerPayout.toLocaleString()} gold from wager match`,
    metadata: {
      lobbyId,
      totalPot,
      treasuryFee,
      opponentId: loserId,
    },
  });

  // Mark wager as paid on the lobby
  await db.patch(lobbyId, {
    wagerPaid: true,
  });
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
