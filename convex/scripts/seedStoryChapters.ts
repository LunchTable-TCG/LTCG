// Seed story chapters into the database
// Run this mutation from the Convex dashboard to populate story chapters

import { mutation } from "../_generated/server";
import { STORY_CHAPTERS } from "../seeds/storyChapters";
import { getStagesForChapter } from "../seeds/storyStages";

export const seedStoryChapters = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing story chapters and stages
    const existingChapters = await ctx.db.query("storyChapters").collect();
    for (const chapter of existingChapters) {
      await ctx.db.delete(chapter._id);
    }

    const existingStages = await ctx.db.query("storyStages").collect();
    for (const stage of existingStages) {
      await ctx.db.delete(stage._id);
    }

    // Insert all story chapters with stages
    let chaptersInserted = 0;
    let stagesInserted = 0;

    for (const chapter of STORY_CHAPTERS) {
      // Insert chapter - map fields to match schema
      const chapterId = await ctx.db.insert("storyChapters", {
        number: chapter.chapterNumber,
        actNumber: chapter.actNumber,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        description: chapter.description,
        archetype: chapter.archetype,
        archetypeImageUrl: chapter.archetypeImageUrl,
        storyText: chapter.storyText,
        aiOpponentDeckCode: chapter.aiOpponentDeckCode,
        aiDifficulty: "medium" as const, // Default difficulty
        battleCount: chapter.battleCount,
        baseRewards: chapter.baseRewards,
        status: "published" as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      chaptersInserted++;

      // Insert 10 stages for this chapter
      const stages = getStagesForChapter(chapter.chapterNumber);
      for (const stage of stages) {
        await ctx.db.insert("storyStages", {
          chapterId,
          stageNumber: stage.stageNumber,
          name: stage.name,
          title: stage.name, // Use name as title too
          description: stage.description,
          opponentName: `${chapter.archetype} Opponent`,
          difficulty: (stage.aiDifficulty === "boss" ? "boss" : stage.aiDifficulty === "hard" ? "hard" : stage.aiDifficulty === "medium" ? "medium" : "easy") as "easy" | "medium" | "hard" | "boss",
          aiDifficulty: (stage.aiDifficulty === "boss" ? "boss" : stage.aiDifficulty === "hard" ? "hard" : stage.aiDifficulty === "medium" ? "medium" : "easy") as "easy" | "medium" | "hard" | "boss",
          rewardGold: stage.rewardGold,
          rewardXp: stage.rewardXp,
          firstClearGold: stage.rewardGold,
          repeatGold: Math.floor(stage.rewardGold * 0.5),
          firstClearBonus: typeof stage.firstClearBonus === "number"
            ? { gold: stage.firstClearBonus, xp: 0 }
            : stage.firstClearBonus,
          status: "published" as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        stagesInserted++;
      }
    }

    return {
      success: true,
      message: `Successfully seeded ${chaptersInserted} chapters and ${stagesInserted} stages`,
      chaptersInserted,
      stagesInserted,
    };
  },
});

export const clearStoryProgress = mutation({
  args: {},
  handler: async (ctx) => {
    // WARNING: This deletes ALL story progress for ALL users
    // Only use this for development/testing

    const progress = await ctx.db.query("storyProgress").collect();
    const attempts = await ctx.db.query("storyBattleAttempts").collect();
    const xp = await ctx.db.query("playerXP").collect();
    const badges = await ctx.db.query("playerBadges").collect();

    for (const p of progress) await ctx.db.delete(p._id);
    for (const a of attempts) await ctx.db.delete(a._id);
    for (const x of xp) await ctx.db.delete(x._id);
    for (const b of badges) await ctx.db.delete(b._id);

    return {
      success: true,
      message: "All story progress cleared",
      deleted: {
        progress: progress.length,
        attempts: attempts.length,
        xp: xp.length,
        badges: badges.length,
      },
    };
  },
});
