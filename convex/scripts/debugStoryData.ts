// Debug script to check story data
import { query } from "../_generated/server";

export const checkStoryData = query({
  args: {},
  handler: async (ctx) => {
    // Get first chapter
    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) => q.eq("actNumber", 1).eq("chapterNumber", 1))
      .first();

    if (!chapter) {
      return { error: "Chapter 1-1 not found" };
    }

    // Get stages for this chapter
    const stages = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
      .collect();

    // Check archetype cards
    const archetype = (chapter.archetype ?? "neutral") as
      | "fire"
      | "water"
      | "earth"
      | "wind"
      | "neutral"
      | "infernal_dragons"
      | "abyssal_horrors"
      | "nature_spirits"
      | "storm_elementals";
    const cards = await ctx.db
      .query("cardDefinitions")
      .withIndex("by_archetype", (q) => q.eq("archetype", archetype))
      .collect();

    const activeCards = cards.filter((c) => c.isActive);

    return {
      chapter: {
        id: chapter._id,
        title: chapter.title,
        archetype: chapter.archetype,
        actNumber: chapter.actNumber,
        chapterNumber: chapter.chapterNumber,
      },
      stages: {
        count: stages.length,
        firstStage: stages.find((s) => s.stageNumber === 1)
          ? {
              id: stages.find((s) => s.stageNumber === 1)?._id,
              name: stages.find((s) => s.stageNumber === 1)?.name,
              difficulty: stages.find((s) => s.stageNumber === 1)?.difficulty,
              aiDifficulty: stages.find((s) => s.stageNumber === 1)?.aiDifficulty,
            }
          : null,
      },
      cards: {
        archetype: chapter.archetype,
        totalCards: cards.length,
        activeCards: activeCards.length,
        cardTypes: {
          creature: activeCards.filter((c) => c.cardType === "creature").length,
          spell: activeCards.filter((c) => c.cardType === "spell").length,
          trap: activeCards.filter((c) => c.cardType === "trap").length,
        },
      },
    };
  },
});
