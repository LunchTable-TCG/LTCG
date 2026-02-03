import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ELO_SYSTEM, XP_SYSTEM } from "../../lib/constants";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { calculateEloChange } from "../../lib/helpers";
import { addXP } from "../../lib/xpHelpers";

// Type boundary to prevent TS2589 with deeply nested Convex types
// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const internalAny = internal as any;

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
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Winner or loser not found",
    });
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
  // Also grants battle pass XP automatically
  const xpSource = isRanked ? "game_win_ranked" : isCasual ? "game_win_casual" : "game_win_story";
  await addXP(ctx, winnerId, xpReward, { source: xpSource });

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

  // Update quest progress for both players
  // Winner: win_game event
  const winGameEvent = {
    type: "win_game" as const,
    value: 1,
    gameMode,
  };
  await ctx.scheduler.runAfter(0, internalAny.progression.quests.updateQuestProgress, {
    userId: winnerId,
    event: winGameEvent,
  });

  // Both players: play_game event
  const playGameEvent = {
    type: "play_game" as const,
    value: 1,
    gameMode,
  };
  await ctx.scheduler.runAfter(0, internalAny.progression.quests.updateQuestProgress, {
    userId: winnerId,
    event: playGameEvent,
  });

  await ctx.scheduler.runAfter(0, internalAny.progression.quests.updateQuestProgress, {
    userId: loserId,
    event: playGameEvent,
  });

  // Update achievement progress for both players
  // Winner: win_game event
  await ctx.scheduler.runAfter(0, internalAny.progression.achievements.updateAchievementProgress, {
    userId: winnerId,
    event: winGameEvent,
  });

  // Winner: ranked-specific achievement if applicable
  if (isRanked) {
    const winRankedEvent = {
      type: "win_ranked" as const,
      value: 1,
    };
    await ctx.scheduler.runAfter(
      0,
      internalAny.progression.achievements.updateAchievementProgress,
      {
        userId: winnerId,
        event: winRankedEvent,
      }
    );
  }

  // Both players: play_game achievement
  await ctx.scheduler.runAfter(0, internalAny.progression.achievements.updateAchievementProgress, {
    userId: winnerId,
    event: playGameEvent,
  });

  await ctx.scheduler.runAfter(0, internalAny.progression.achievements.updateAchievementProgress, {
    userId: loserId,
    event: playGameEvent,
  });
}

/**
 * Update agent stats after game completion
 * Called when winner or loser is an agent (AI bot)
 */
export async function updateAgentStatsAfterGame(
  ctx: MutationCtx,
  winnerAgent: Doc<"agents"> | null,
  loserAgent: Doc<"agents"> | null
) {
  // Update winner agent stats
  if (winnerAgent) {
    await ctx.db.patch(winnerAgent._id, {
      stats: {
        gamesPlayed: winnerAgent.stats.gamesPlayed + 1,
        gamesWon: winnerAgent.stats.gamesWon + 1,
        totalScore: winnerAgent.stats.totalScore + 1, // +1 for win
      },
    });
  }

  // Update loser agent stats
  if (loserAgent) {
    await ctx.db.patch(loserAgent._id, {
      stats: {
        gamesPlayed: loserAgent.stats.gamesPlayed + 1,
        gamesWon: loserAgent.stats.gamesWon,
        totalScore: loserAgent.stats.totalScore, // no change for loss
      },
    });
  }
}
