import * as generatedApi from "../_generated/api";
import { internalMutation } from "../functions";
import { DC_TIMEOUT_MS, HEARTBEAT_STALE_THRESHOLD_MS } from "../lib/wagerTiers";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

// ============================================================================
// DISCONNECT MONITOR
// ============================================================================

/**
 * Check for disconnected players in active crypto wager games.
 * Runs as a cron every 10 seconds.
 *
 * Logic:
 * 1. Find all active lobbies with crypto wager fields set
 * 2. For each game, check both players' heartbeat timestamps
 * 3. If a player is stale (no heartbeat for 15s) and no DC timer is running, start one
 * 4. If a DC timer has exceeded 30s, forfeit that player
 * 5. If BOTH players are stale, last-to-disconnect loses (most recent heartbeat = winner)
 *
 * There are NO draws — there must always be a winner.
 */
export const checkDisconnects = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let gamesChecked = 0;
    let forfeitsTriggered = 0;

    // Find all active game lobbies with crypto wager currency set
    const activeLobbies = await ctx.db
      .query("gameLobbies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.neq(q.field("cryptoWagerCurrency"), undefined))
      .take(50);

    for (const lobby of activeLobbies) {
      // Get the game state
      const gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
        .first();

      if (!gameState) continue;

      gamesChecked++;

      const hostHeartbeat = gameState.hostLastHeartbeat;
      const opponentHeartbeat = gameState.opponentLastHeartbeat;

      // Determine staleness
      const hostIsStale = !hostHeartbeat || now - hostHeartbeat > HEARTBEAT_STALE_THRESHOLD_MS;
      const opponentIsStale =
        !opponentHeartbeat || now - opponentHeartbeat > HEARTBEAT_STALE_THRESHOLD_MS;

      // ----------------------------------------------------------------
      // Case 1: BOTH players are stale
      // ----------------------------------------------------------------
      if (hostIsStale && opponentIsStale) {
        // If a DC timer is already running, check if it has expired
        if (gameState.dcTimerStartedAt) {
          if (now - gameState.dcTimerStartedAt >= DC_TIMEOUT_MS) {
            // Timer expired — forfeit the disconnected player
            forfeitsTriggered++;
            await ctx.scheduler.runAfter(0, internalAny.gameplay.games.lifecycle.forfeitGame, {
              lobbyId: lobby._id,
              forfeitingPlayerId: gameState.dcPlayerId,
            });
          }
          // Timer still running — wait for it to expire
          continue;
        }

        // No DC timer running yet — determine who disconnected first.
        // The player with the MORE RECENT heartbeat stayed longer and "wins".
        // The player who disconnected FIRST (older/undefined heartbeat) forfeits.
        let forfeitingPlayerId: typeof gameState.hostId;

        if (!hostHeartbeat && !opponentHeartbeat) {
          // Both undefined — tiebreaker: host wins, opponent forfeits
          forfeitingPlayerId = gameState.opponentId;
        } else if (!hostHeartbeat) {
          // Host never sent heartbeat — host forfeits
          forfeitingPlayerId = gameState.hostId;
        } else if (!opponentHeartbeat) {
          // Opponent never sent heartbeat — opponent forfeits
          forfeitingPlayerId = gameState.opponentId;
        } else if (hostHeartbeat === opponentHeartbeat) {
          // Exact same timestamp — tiebreaker: host wins, opponent forfeits
          forfeitingPlayerId = gameState.opponentId;
        } else if (hostHeartbeat > opponentHeartbeat) {
          // Host stayed longer — opponent disconnected first, opponent forfeits
          forfeitingPlayerId = gameState.opponentId;
        } else {
          // Opponent stayed longer — host disconnected first, host forfeits
          forfeitingPlayerId = gameState.hostId;
        }

        // Start DC timer for the determined player
        await ctx.db.patch(gameState._id, {
          dcTimerStartedAt: now,
          dcPlayerId: forfeitingPlayerId,
        });

        continue;
      }

      // ----------------------------------------------------------------
      // Case 2: Only ONE player is stale
      // ----------------------------------------------------------------
      if (hostIsStale || opponentIsStale) {
        const stalePlayerId = hostIsStale ? gameState.hostId : gameState.opponentId;

        // If a DC timer is already running for this player
        if (gameState.dcTimerStartedAt && gameState.dcPlayerId === stalePlayerId) {
          if (now - gameState.dcTimerStartedAt >= DC_TIMEOUT_MS) {
            // Timer expired — forfeit the disconnected player
            forfeitsTriggered++;
            await ctx.scheduler.runAfter(0, internalAny.gameplay.games.lifecycle.forfeitGame, {
              lobbyId: lobby._id,
              forfeitingPlayerId: stalePlayerId,
            });
          }
          // Timer still running — wait for it to expire
          continue;
        }

        // If a DC timer is running for the OTHER player (who is now alive),
        // the heartbeat mutation should have already cleared it. But just in case,
        // clear it here and start a new one for the stale player.
        if (gameState.dcTimerStartedAt && gameState.dcPlayerId !== stalePlayerId) {
          // The previously-tracked player reconnected; switch to the stale player
          await ctx.db.patch(gameState._id, {
            dcTimerStartedAt: now,
            dcPlayerId: stalePlayerId,
          });
          continue;
        }

        // No DC timer running — start one for the stale player
        await ctx.db.patch(gameState._id, {
          dcTimerStartedAt: now,
          dcPlayerId: stalePlayerId,
        });

        continue;
      }

      // ----------------------------------------------------------------
      // Case 3: Neither player is stale — all good
      // ----------------------------------------------------------------
      // If there's an orphaned DC timer (shouldn't happen, but defensive), clear it.
      // The heartbeat mutation handles this, but belt-and-suspenders.
      if (gameState.dcTimerStartedAt) {
        await ctx.db.patch(gameState._id, {
          dcTimerStartedAt: undefined,
          dcPlayerId: undefined,
        });
      }
    }

    return { gamesChecked, forfeitsTriggered };
  },
});
