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
import { XP_SYSTEM } from "../../lib/constants";
import { addXP } from "../../lib/xpHelpers";
import type { DomainEvent } from "../types";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

export async function handleProgressionEvent(ctx: MutationCtx, event: DomainEvent) {
  switch (event.type) {
    case "game:ended": {
      // --- XP Awards ---
      const xpReward =
        event.gameMode === "ranked"
          ? XP_SYSTEM.RANKED_WIN_XP
          : event.gameMode === "casual"
            ? XP_SYSTEM.CASUAL_WIN_XP
            : XP_SYSTEM.STORY_WIN_XP;

      const xpSource =
        event.gameMode === "ranked"
          ? "game_win_ranked"
          : event.gameMode === "casual"
            ? "game_win_casual"
            : "game_win_story";

      await addXP(ctx, event.winnerId, xpReward, { source: xpSource });

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
