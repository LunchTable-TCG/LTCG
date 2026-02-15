/**
 * Story Stages — Public API
 *
 * Wraps stage-related operations for frontend consumption.
 *
 * Frontend hooks reference these as: typedApi.progression.storyStages.*
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../functions";
import { requireAuthMutation } from "../lib/convexAuth";
import { LTCGStory } from "@lunchtable-tcg/story";

const story = new LTCGStory(components.lunchtable_tcg_story as any);

/**
 * Initialize stage progress for a chapter
 * Called when a player first opens a chapter to ensure all stages have progress records
 */
export const initializeChapterStageProgress = mutation({
  args: {
    chapterId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);

    // Get all stages for this chapter
    const stages = await story.stages.getStages(ctx, args.chapterId);
    if (!stages || stages.length === 0) return;

    // Get existing stage progress
    const existingProgress = await story.progress.getStageProgress(ctx, auth.userId);
    const existingIds = new Set((existingProgress ?? []).map((p: any) => p.stageId));

    // Initialize missing stage progress
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]!;
      if (existingIds.has(stage._id)) continue;

      await story.progress.upsertStageProgress(ctx, {
        userId: auth.userId,
        stageId: stage._id,
        chapterId: args.chapterId,
        stageNumber: (stage as any).stageNumber ?? i + 1,
        status: i === 0 ? "available" : "locked",
        starsEarned: 0,
        timesCompleted: 0,
        firstClearClaimed: false,
      });
    }
  },
});

/**
 * Complete a story stage and calculate rewards
 */
export const completeStage = mutation({
  args: {
    stageId: v.string(),
    won: v.boolean(),
    finalLP: v.number(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);

    // Get stage info
    const stage = await story.stages.getStage(ctx, args.stageId);
    if (!stage) {
      return {
        won: args.won,
        rewards: { gold: 0, xp: 0 },
        starsEarned: 0,
        levelUp: null,
        newBadges: [],
      };
    }

    // Calculate stars based on LP remaining
    let starsEarned = 0;
    if (args.won) {
      if (args.finalLP >= 6000) starsEarned = 3;
      else if (args.finalLP >= 3000) starsEarned = 2;
      else starsEarned = 1;
    }

    // Calculate rewards
    const baseGold = (stage as any).rewardGold ?? 50;
    const baseXp = (stage as any).rewardXp ?? 25;
    const rewards = {
      gold: args.won ? baseGold * starsEarned : Math.floor(baseGold * 0.1),
      xp: args.won ? baseXp * starsEarned : Math.floor(baseXp * 0.1),
    };

    // Get existing progress to check for first clear
    // getStageProgress with stageId returns a single object (or null), not an array
    const existing = (await story.progress.getStageProgress(ctx, auth.userId, args.stageId)) as any;

    // Update stage progress
    await story.progress.upsertStageProgress(ctx, {
      userId: auth.userId,
      stageId: args.stageId,
      chapterId: (stage as any).chapterId ?? "",
      stageNumber: (stage as any).stageNumber ?? 1,
      status: args.won ? "completed" : (existing?.status ?? "available"),
      starsEarned: Math.max(starsEarned, existing?.starsEarned ?? 0),
      timesCompleted: (existing?.timesCompleted ?? 0) + (args.won ? 1 : 0),
      firstClearClaimed: existing?.firstClearClaimed ?? false,
      lastCompletedAt: args.won ? Date.now() : undefined,
    });

    // If won, unlock next stage
    let unlockedNextStage = false;
    if (args.won && (stage as any).chapterId) {
      const allStages = await story.stages.getStages(ctx, (stage as any).chapterId);
      const nextStage = allStages?.find(
        (s: any) => s.stageNumber === ((stage as any).stageNumber ?? 0) + 1
      );
      if (nextStage) {
        // getStageProgress with stageId returns a single object (or null)
        const nextExisting = (await story.progress.getStageProgress(ctx, auth.userId, nextStage._id)) as any;
        if (!nextExisting || nextExisting.status === "locked") {
          await story.progress.upsertStageProgress(ctx, {
            userId: auth.userId,
            stageId: nextStage._id,
            chapterId: (stage as any).chapterId,
            stageNumber: (nextStage as any).stageNumber ?? ((stage as any).stageNumber ?? 0) + 1,
            status: "available",
            starsEarned: 0,
            timesCompleted: 0,
            firstClearClaimed: false,
          });
          unlockedNextStage = true;
        }
      }
    }

    return {
      won: args.won,
      rewards,
      starsEarned,
      newBestScore: starsEarned > (existing?.starsEarned ?? 0),
      unlockedNextStage,
      levelUp: null as { newLevel: number; rewards: Record<string, number> } | null,
      newBadges: [] as string[],
    };
  },
});
