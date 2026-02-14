/**
 * Stats Event Handler
 *
 * Handles domain events related to player statistics:
 * - Win/loss counter updates
 * - ELO rating changes
 * - Win streak tracking
 * - Match history recording
 * - Agent stats updates
 *
 * Cross-domain calls this replaces (from stats.ts / stateBasedActions.ts):
 * - ctx.db.patch(winnerId, { totalWins, rankedWins, ... })
 * - ctx.db.patch(loserId, { totalLosses, rankedLosses, ... })
 * - ctx.db.insert("matchHistory", { ... })
 * - updateAgentStatsAfterGame(ctx, winnerAgent, loserAgent)
 */

import type { MutationCtx } from "../../_generated/server";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { getGameConfig } from "../../lib/gameConfig";
import { calculateEloChange } from "../../lib/helpers";
import type { DomainEvent } from "../types";

export async function handleStatsEvent(ctx: MutationCtx, event: DomainEvent) {
  switch (event.type) {
    case "game:ended": {
      const config = await getGameConfig(ctx);
      const eloConfig = config.competitive.elo;
      const xpConfig = config.progression.xp;

      const { winnerId, loserId, gameMode } = event;

      const winner = await ctx.db.get(winnerId);
      const loser = await ctx.db.get(loserId);

      if (!winner || !loser) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Winner or loser not found for stats update",
        });
      }

      const isRanked = gameMode === "ranked";
      const isCasual = gameMode === "casual";
      const isStory = gameMode === "story";

      // --- ELO Calculation ---
      const winnerRatingBefore = isRanked
        ? winner.rankedElo || eloConfig.defaultRating
        : isCasual
          ? winner.casualRating || eloConfig.defaultRating
          : 0;

      const loserRatingBefore = isRanked
        ? loser.rankedElo || eloConfig.defaultRating
        : isCasual
          ? loser.casualRating || eloConfig.defaultRating
          : 0;

      let winnerRatingAfter = winnerRatingBefore;
      let loserRatingAfter = loserRatingBefore;

      if (isRanked || isCasual) {
        const { winnerNewRating, loserNewRating } = calculateEloChange(
          winnerRatingBefore,
          loserRatingBefore
        );
        winnerRatingAfter = winnerNewRating;
        loserRatingAfter = loserNewRating;
      }

      // --- Update Winner Stats ---
      const newWinStreak = (winner.currentWinStreak || 0) + 1;
      await ctx.db.patch(winnerId, {
        ...(isRanked && { rankedElo: winnerRatingAfter }),
        ...(isCasual && { casualRating: winnerRatingAfter }),

        totalWins: (winner.totalWins || 0) + 1,
        ...(isRanked && { rankedWins: (winner.rankedWins || 0) + 1 }),
        ...(isCasual && { casualWins: (winner.casualWins || 0) + 1 }),
        ...(isStory && { storyWins: (winner.storyWins || 0) + 1 }),

        currentWinStreak: newWinStreak,
        longestWinStreak: Math.max(newWinStreak, winner.longestWinStreak || 0),

        lastStatsUpdate: Date.now(),
      });

      // --- Update Loser Stats ---
      await ctx.db.patch(loserId, {
        ...(isRanked && { rankedElo: loserRatingAfter }),
        ...(isCasual && { casualRating: loserRatingAfter }),

        totalLosses: (loser.totalLosses || 0) + 1,
        ...(isRanked && { rankedLosses: (loser.rankedLosses || 0) + 1 }),
        ...(isCasual && { casualLosses: (loser.casualLosses || 0) + 1 }),
        ...(isStory && { storyLosses: (loser.storyLosses || 0) + 1 }),

        currentWinStreak: 0,

        lastStatsUpdate: Date.now(),
      });

      // --- Record Match History ---
      const xpAwarded = isRanked
        ? xpConfig.rankedWin
        : isCasual
          ? xpConfig.casualWin
          : xpConfig.storyWin;

      await ctx.db.insert("matchHistory", {
        winnerId,
        loserId,
        gameType: gameMode,
        winnerRatingBefore,
        winnerRatingAfter,
        loserRatingBefore,
        loserRatingAfter,
        xpAwarded,
        completedAt: Date.now(),
      });

      // --- Update Agent Stats ---
      const winnerAgent = await ctx.db
        .query("agents")
        .withIndex("by_user", (q) => q.eq("userId", winnerId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const loserAgent = await ctx.db
        .query("agents")
        .withIndex("by_user", (q) => q.eq("userId", loserId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (winnerAgent) {
        const ws = winnerAgent.stats ?? { gamesPlayed: 0, gamesWon: 0, totalScore: 0 };
        await ctx.db.patch(winnerAgent._id, {
          stats: {
            gamesPlayed: (ws.gamesPlayed ?? 0) + 1,
            gamesWon: (ws.gamesWon ?? 0) + 1,
            totalScore: (ws.totalScore ?? 0) + 1,
          },
        });
      }

      if (loserAgent) {
        const ls = loserAgent.stats ?? { gamesPlayed: 0, gamesWon: 0, totalScore: 0 };
        await ctx.db.patch(loserAgent._id, {
          stats: {
            gamesPlayed: (ls.gamesPlayed ?? 0) + 1,
            gamesWon: ls.gamesWon ?? 0,
            totalScore: ls.totalScore ?? 0,
          },
        });
      }

      break;
    }

    // Other event types are ignored by stats handler
    default:
      break;
  }
}
