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
import { ELO_SYSTEM, XP_SYSTEM } from "../../lib/constants";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { calculateEloChange } from "../../lib/helpers";
import type { DomainEvent } from "../types";

export async function handleStatsEvent(ctx: MutationCtx, event: DomainEvent) {
  switch (event.type) {
    case "game:ended": {
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
        ? winner.rankedElo || ELO_SYSTEM.DEFAULT_RATING
        : isCasual
          ? winner.casualRating || ELO_SYSTEM.DEFAULT_RATING
          : 0;

      const loserRatingBefore = isRanked
        ? loser.rankedElo || ELO_SYSTEM.DEFAULT_RATING
        : isCasual
          ? loser.casualRating || ELO_SYSTEM.DEFAULT_RATING
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
        ? XP_SYSTEM.RANKED_WIN_XP
        : isCasual
          ? XP_SYSTEM.CASUAL_WIN_XP
          : XP_SYSTEM.STORY_WIN_XP;

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
        await ctx.db.patch(winnerAgent._id, {
          stats: {
            gamesPlayed: winnerAgent.stats.gamesPlayed + 1,
            gamesWon: winnerAgent.stats.gamesWon + 1,
            totalScore: winnerAgent.stats.totalScore + 1,
          },
        });
      }

      if (loserAgent) {
        await ctx.db.patch(loserAgent._id, {
          stats: {
            gamesPlayed: loserAgent.stats.gamesPlayed + 1,
            gamesWon: loserAgent.stats.gamesWon,
            totalScore: loserAgent.stats.totalScore,
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
