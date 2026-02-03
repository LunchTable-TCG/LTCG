/**
 * Story Mode Helper Queries
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get stage by chapter and stage number
 */
export const getStageByChapterAndNumber = query({
  args: {
    chapterId: v.string(), // e.g., "1-1"
    stageNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const parts = args.chapterId.split("-").map(Number);
    const actNum = parts[0];
    const chapNum = parts[1];

    if (actNum === undefined || chapNum === undefined) {
      return null;
    }

    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) => q.eq("actNumber", actNum).eq("chapterNumber", chapNum))
      .first();

    if (!chapter) return null;

    const stage = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) =>
        q.eq("chapterId", chapter._id).eq("stageNumber", args.stageNumber)
      )
      .first();

    return stage;
  },
});
