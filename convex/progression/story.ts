/**
 * Story Mode Progression — Public API
 *
 * Wraps the @lunchtable-tcg/story component functions to expose
 * them as public queries/mutations for frontend consumption.
 *
 * Frontend hooks reference these as: typedApi.progression.story.*
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { getCurrentUser, requireAuthMutation } from "../lib/convexAuth";
import { LTCGStory } from "@lunchtable-tcg/story";

const story = new LTCGStory(components.lunchtable_tcg_story as any);

/**
 * Get all available chapters with user progress
 */
export const getAvailableChapters = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getCurrentUser(ctx);
    if (!auth) return [];

    const chapters = await story.chapters.getChapters(ctx, { status: "published" });
    if (!chapters || chapters.length === 0) return [];

    // Get user progress for each chapter
    const progress = await story.progress.getProgress(ctx, auth.userId);
    const progressMap = new Map<string, any>();
    if (progress) {
      for (const p of progress) {
        const key = `${p.actNumber}-${p.chapterNumber}`;
        progressMap.set(key, p);
      }
    }

    return chapters.map((chapter: any) => {
      const actNumber = chapter.actNumber ?? 1;
      const chapterNumber = chapter.chapterNumber ?? chapter.number ?? 1;
      const key = `${actNumber}-${chapterNumber}`;
      const chapterProgress = progressMap.get(key);

      // Get stages count
      const totalStages = chapter.battleCount ?? 10;

      return {
        actNumber,
        chapterNumber,
        title: chapter.title,
        description: chapter.description ?? "",
        archetype: chapter.archetype ?? "mixed",
        status: chapterProgress?.status ?? "available",
        stagesCompleted: chapterProgress?.timesCompleted ?? 0,
        totalStages,
        starsEarned: chapterProgress?.starsEarned ?? 0,
        isUnlocked: !chapter.unlockRequirements?.minimumLevel || true,
        unlockRequirements: chapter.unlockRequirements,
      };
    });
  },
});

/**
 * Get player's overall story progress
 */
export const getPlayerProgress = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getCurrentUser(ctx);
    if (!auth) return null;

    const progress = await story.progress.getProgress(ctx, auth.userId);
    if (!progress || progress.length === 0) {
      return {
        progressByAct: null,
        totalChaptersCompleted: 0,
        totalStarsEarned: 0,
      };
    }

    // Group by act
    const progressByAct: Record<number, any[]> = {};
    let totalCompleted = 0;
    let totalStars = 0;

    for (const p of progress) {
      const act = p.actNumber ?? 1;
      if (!progressByAct[act]) progressByAct[act] = [];
      progressByAct[act].push(p);
      if (p.status === "completed") totalCompleted++;
      totalStars += p.starsEarned ?? 0;
    }

    return {
      progressByAct,
      totalChaptersCompleted: totalCompleted,
      totalStarsEarned: totalStars,
    };
  },
});

/**
 * Initialize story progress for a new player
 */
export const initializeStoryProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthMutation(ctx);

    // Check if progress already exists
    const existing = await story.progress.getProgress(ctx, auth.userId);
    if (existing && existing.length > 0) return;

    // Initialize first chapter as available
    await story.progress.upsertProgress(ctx, {
      userId: auth.userId,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
      status: "available",
      starsEarned: 0,
      timesAttempted: 0,
      timesCompleted: 0,
    });
  },
});

/**
 * Get chapter details with stages and progress
 */
export const getChapterDetails = query({
  args: {
    actNumber: v.number(),
    chapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const auth = await getCurrentUser(ctx);
    if (!auth) return null;

    const chapter = await story.chapters.getChapterByNumber(ctx, args.actNumber, args.chapterNumber);
    if (!chapter) return null;

    // Get stages for this chapter
    const stages = await story.stages.getStages(ctx, chapter._id);

    // Get stage progress
    const stageProgress = await story.progress.getStageProgress(ctx, auth.userId);
    const progressMap = new Map<string, any>();
    if (stageProgress) {
      for (const sp of stageProgress) {
        progressMap.set(sp.stageId, sp);
      }
    }

    const stagesWithProgress = (stages ?? []).map((stage: any, index: number) => {
      const progress = progressMap.get(stage._id);
      return {
        _id: stage._id,
        stageNumber: stage.stageNumber,
        name: stage.name ?? stage.title ?? `Stage ${stage.stageNumber}`,
        description: stage.description ?? "",
        rewardGold: stage.rewardGold ?? 50,
        rewardXp: stage.rewardXp ?? 25,
        firstClearBonus: typeof stage.firstClearBonus === "number" ? stage.firstClearBonus : (stage.firstClearBonus?.gold ?? 100),
        firstClearClaimed: progress?.firstClearClaimed ?? false,
        aiDifficulty: stage.aiDifficulty ?? stage.difficulty ?? "easy",
        status: progress?.status ?? (index === 0 ? "available" : "locked"),
        starsEarned: progress?.starsEarned ?? 0,
        timesCompleted: progress?.timesCompleted ?? 0,
        opponentName: stage.opponentName ?? "CPU Opponent",
      };
    });

    return {
      _id: chapter._id,
      title: chapter.title,
      description: chapter.description ?? "",
      archetype: chapter.archetype ?? "mixed",
      actNumber: chapter.actNumber ?? args.actNumber,
      chapterNumber: chapter.chapterNumber ?? chapter.number ?? args.chapterNumber,
      stages: stagesWithProgress,
    };
  },
});
