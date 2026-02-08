import * as generatedApi from "../_generated/api";
import { internalMutation } from "../functions";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

// ============================================================================
// SETTLEMENT RETRY
// ============================================================================

/**
 * Retry failed crypto wager settlements.
 *
 * Runs every 60 seconds via cron. Finds completed games where:
 * - cryptoWagerCurrency is set (is a crypto wager match)
 * - cryptoSettled is false (settlement hasn't completed)
 * - status is "completed" (game has finished)
 * - cryptoSettlementWinnerId/LoserId are present (params were stored)
 *
 * For each, schedules another settleEscrow attempt. The settleEscrow action
 * is idempotent — it checks `cryptoSettled` and no-ops if already settled.
 *
 * Processes max 10 lobbies per tick to avoid timeout.
 */
export const retryFailedSettlements = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find lobbies needing settlement retry
    const unsettledLobbies = await ctx.db
      .query("gameLobbies")
      .filter((q) =>
        q.and(
          q.neq(q.field("cryptoWagerCurrency"), undefined),
          q.eq(q.field("cryptoSettled"), false),
          q.eq(q.field("status"), "completed")
        )
      )
      .take(10);

    let retried = 0;

    for (const lobby of unsettledLobbies) {
      // Skip lobbies without stored settlement params
      // (shouldn't happen, but defensive — legacy lobbies before this feature)
      if (!lobby.cryptoSettlementWinnerId || !lobby.cryptoSettlementLoserId) {
        continue;
      }

      // Schedule another settleEscrow attempt (idempotent — checks cryptoSettled)
      await ctx.scheduler.runAfter(0, internalAny.wager.escrow.settleEscrow, {
        lobbyId: lobby._id,
        winnerId: lobby.cryptoSettlementWinnerId,
        loserId: lobby.cryptoSettlementLoserId,
      });

      retried++;
    }

    if (retried > 0) {
      console.log(`Settlement retry: scheduled ${retried} re-settlement(s)`);
    }

    return { retried };
  },
});
