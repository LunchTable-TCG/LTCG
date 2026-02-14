/**
 * Economy Event Handler
 *
 * Handles domain events related to the economy system:
 * - Wager payouts (gold currency)
 * - Crypto escrow settlement
 * - Currency rewards for game completion
 *
 * Cross-domain calls this replaces (from gameEndHandlers.ts):
 * - adjustPlayerCurrencyHelper(ctx, { userId: winnerId, goldDelta: winnerPayout, ... })
 * - ctx.scheduler.runAfter(0, internalAny.wager.escrow.settleEscrow, ...)
 */

import * as generatedApi from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import { adjustPlayerCurrencyHelper } from "../../economy/economy";
import type { DomainEvent } from "../types";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

const WAGER_WINNER_PERCENTAGE = 0.9; // 90% to winner, 10% to treasury

export async function handleEconomyEvent(ctx: MutationCtx, event: DomainEvent) {
  switch (event.type) {
    case "wager:payout": {
      if (event.wagerAmount <= 0) break;

      const totalPot = event.wagerAmount * 2; // Both players wagered the same amount
      const winnerPayout = Math.floor(totalPot * WAGER_WINNER_PERCENTAGE);
      const treasuryFee = totalPot - winnerPayout;

      await adjustPlayerCurrencyHelper(ctx, {
        userId: event.winnerId,
        goldDelta: winnerPayout,
        transactionType: "wager_payout",
        description: `Won ${winnerPayout.toLocaleString()} gold from wager match`,
        metadata: {
          lobbyId: event.lobbyId,
          totalPot,
          treasuryFee,
          opponentId: event.loserId,
        },
      });

      // Mark wager as paid on the lobby
      await ctx.db.patch(event.lobbyId, {
        wagerPaid: true,
      });

      break;
    }

    case "crypto:escrow_settle": {
      await ctx.db.patch(event.lobbyId, {
        cryptoSettlementWinnerId: event.winnerId,
        cryptoSettlementLoserId: event.loserId,
      });

      await ctx.scheduler.runAfter(0, internalAny.wager.escrow.settleEscrow, {
        lobbyId: event.lobbyId,
        winnerId: event.winnerId,
        loserId: event.loserId,
      });

      break;
    }

    case "game:ended": {
      // Process wager payout if applicable
      if (event.wagerAmount > 0 && !event.wagerPaid) {
        const totalPot = event.wagerAmount * 2;
        const winnerPayout = Math.floor(totalPot * WAGER_WINNER_PERCENTAGE);
        const treasuryFee = totalPot - winnerPayout;

        await adjustPlayerCurrencyHelper(ctx, {
          userId: event.winnerId,
          goldDelta: winnerPayout,
          transactionType: "wager_payout",
          description: `Won ${winnerPayout.toLocaleString()} gold from wager match`,
          metadata: {
            lobbyId: event.lobbyId,
            totalPot,
            treasuryFee,
            opponentId: event.loserId,
          },
        });
      }

      break;
    }

    // Other event types are ignored by economy handler
    default:
      break;
  }
}
