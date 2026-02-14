/**
 * Progression Event Handler
 *
 * Handles domain events related to player progression:
 * - XP awards (winner and participation)
 * - Quest progress updates
 * - Achievement progress updates
 * - Story stage completion
 * - Battle pass progress (delegated via addXP)
 *
 * Cross-domain calls this replaces (from stats.ts / stateBasedActions.ts):
 * - addXP(ctx, winnerId, xpReward, { source })
 * - ctx.scheduler.runAfter(0, internalAny.progression.quests.updateQuestProgress, ...)
 * - ctx.scheduler.runAfter(0, internalAny.progression.achievements.updateAchievementProgress, ...)
 * - ctx.runMutation(internalAny.progression.storyStages.completeStageInternal, ...)
 */

import * as generatedApi from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import { getGameConfig } from "../../lib/gameConfig";
import { addXP } from "../../lib/xpHelpers";
import type { DomainEvent } from "../types";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

export async function handleProgressionEvent(ctx: MutationCtx, event: DomainEvent) {
  switch (event.type) {
    case "game:ended": {
      const config = await getGameConfig(ctx);
      const xpConfig = config.progression.xp;

      // --- XP Awards ---
      const xpReward =
        event.gameMode === "ranked"
          ? xpConfig.rankedWin
          : event.gameMode === "casual"
            ? xpConfig.casualWin
            : xpConfig.storyWin;

      const xpSource =
        event.gameMode === "ranked"
          ? "game_win_ranked"
          : event.gameMode === "casual"
            ? "game_win_casual"
            : "game_win_story";

      await addXP(ctx, event.winnerId, xpReward, { source: xpSource });

      // --- Participation XP for Loser ---
      const loserXp =
        event.gameMode === "ranked"
          ? xpConfig.rankedLoss
          : event.gameMode === "casual"
            ? xpConfig.casualLoss
            : xpConfig.storyLoss;

      if (loserXp > 0) {
        await addXP(ctx, event.loserId, loserXp, { source: `game_loss_${event.gameMode}` });
      }

      // --- Quest Progress ---
      const winGameEvent = {
        type: "win_game" as const,
        value: 1,
        gameMode: event.gameMode,
      };

      const playGameEvent = {
        type: "play_game" as const,
        value: 1,
        gameMode: event.gameMode,
      };

      // Winner: win_game quest event
      await ctx.scheduler.runAfter(0, internalAny.progression.quests.updateQuestProgress, {
        userId: event.winnerId,
        event: winGameEvent,
      });

      // Both players: play_game quest event
      await ctx.scheduler.runAfter(0, internalAny.progression.quests.updateQuestProgress, {
        userId: event.winnerId,
        event: playGameEvent,
      });

      await ctx.scheduler.runAfter(0, internalAny.progression.quests.updateQuestProgress, {
        userId: event.loserId,
        event: playGameEvent,
      });

      // --- Achievement Progress ---
      await ctx.scheduler.runAfter(
        0,
        internalAny.progression.achievements.updateAchievementProgress,
        {
          userId: event.winnerId,
          event: winGameEvent,
        }
      );

      if (event.gameMode === "ranked") {
        const winRankedEvent = {
          type: "win_ranked" as const,
          value: 1,
        };
        await ctx.scheduler.runAfter(
          0,
          internalAny.progression.achievements.updateAchievementProgress,
          {
            userId: event.winnerId,
            event: winRankedEvent,
          }
        );
      }

      // Both players: play_game achievement
      await ctx.scheduler.runAfter(
        0,
        internalAny.progression.achievements.updateAchievementProgress,
        {
          userId: event.winnerId,
          event: playGameEvent,
        }
      );

      await ctx.scheduler.runAfter(
        0,
        internalAny.progression.achievements.updateAchievementProgress,
        {
          userId: event.loserId,
          event: playGameEvent,
        }
      );

      break;
    }

    case "story:stage_completed": {
      await ctx.runMutation(internalAny.progression.storyStages.completeStageInternal, {
        userId: event.userId,
        stageId: event.stageId,
        won: event.won,
        finalLP: event.finalLP,
      });
      break;
    }

    // Other event types are ignored by progression handler
    default:
      break;
  }
}
