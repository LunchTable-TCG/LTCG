import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { calculateEloChange } from "../lib/helpers";
import { XP_SYSTEM, ELO_SYSTEM } from "../lib/constants";

/**
 * Update player stats and ratings after game completion
 */
export async function updatePlayerStatsAfterGame(
  ctx: MutationCtx,
  winnerId: Id<"users">,
  loserId: Id<"users">,
  gameMode: "ranked" | "casual" | "story"
): Promise<void> {
  const winner = await ctx.db.get(winnerId);
  const loser = await ctx.db.get(loserId);

  if (!winner || !loser) {
    throw new Error("Winner or loser not found");
  }

  // Determine which rating field to use and XP amount
  const isRanked = gameMode === "ranked";
  const isCasual = gameMode === "casual";
  const isStory = gameMode === "story";

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

  // Calculate new ratings (only for ranked/casual)
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

  // Determine XP reward
  const xpReward = isRanked
    ? XP_SYSTEM.RANKED_WIN_XP
    : isCasual
      ? XP_SYSTEM.CASUAL_WIN_XP
      : XP_SYSTEM.STORY_WIN_XP;

  // Update winner XP via playerXP system (maintains single source of truth)
  const { addXP } = await import("../lib/xpHelpers");
  await addXP(ctx, winnerId, xpReward);

  // Update winner stats
  await ctx.db.patch(winnerId, {
    // Update ratings
    ...(isRanked && { rankedElo: winnerRatingAfter }),
    ...(isCasual && { casualRating: winnerRatingAfter }),

    // Update win stats
    totalWins: (winner.totalWins || 0) + 1,
    ...(isRanked && { rankedWins: (winner.rankedWins || 0) + 1 }),
    ...(isCasual && { casualWins: (winner.casualWins || 0) + 1 }),
    ...(isStory && { storyWins: (winner.storyWins || 0) + 1 }),

    lastStatsUpdate: Date.now(),
  });

  // Update loser stats
  await ctx.db.patch(loserId, {
    // Update ratings
    ...(isRanked && { rankedElo: loserRatingAfter }),
    ...(isCasual && { casualRating: loserRatingAfter }),

    // Update loss stats (no XP for losses)
    totalLosses: (loser.totalLosses || 0) + 1,
    ...(isRanked && { rankedLosses: (loser.rankedLosses || 0) + 1 }),
    ...(isCasual && { casualLosses: (loser.casualLosses || 0) + 1 }),

    lastStatsUpdate: Date.now(),
  });

  // Record match history
  await ctx.db.insert("matchHistory", {
    winnerId,
    loserId,
    gameType: gameMode,
    winnerRatingBefore,
    winnerRatingAfter,
    loserRatingBefore,
    loserRatingAfter,
    xpAwarded: xpReward,
    completedAt: Date.now(),
  });
}
