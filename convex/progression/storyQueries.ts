/**
 * Story Queries — Public API
 *
 * Additional story queries used by the battle page.
 *
 * Frontend hooks reference these as: typedApi.progression.storyQueries.*
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";
import { LTCGStory } from "@lunchtable-tcg/story";

const story = new LTCGStory(components.lunchtable_tcg_story as any);

/**
 * Get a stage by chapter ID string and stage number
 */
export const getStageByChapterAndNumber = query({
  args: {
    chapterId: v.string(),
    stageNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Parse chapterId format: "1-1" → actNumber=1, chapterNumber=1
    const parts = args.chapterId.split("-");
    if (parts.length !== 2) return null;

    const actNumber = Number.parseInt(parts[0]!, 10);
    const chapterNumber = Number.parseInt(parts[1]!, 10);

    if (Number.isNaN(actNumber) || Number.isNaN(chapterNumber)) return null;

    const chapter = await story.chapters.getChapterByNumber(ctx, actNumber, chapterNumber);
    if (!chapter) return null;

    const stages = await story.stages.getStages(ctx, chapter._id);
    const stage = stages?.find((s: any) => s.stageNumber === args.stageNumber);
    if (!stage) return null;

    return {
      _id: stage._id,
      title: (stage as any).name ?? (stage as any).title ?? `Stage ${args.stageNumber}`,
      opponentName: (stage as any).opponentName,
      preMatchDialogue: (stage as any).preMatchDialogue ?? [],
      postMatchWinDialogue: (stage as any).postMatchWinDialogue ?? [],
      postMatchLoseDialogue: (stage as any).postMatchLoseDialogue ?? [],
    };
  },
});
