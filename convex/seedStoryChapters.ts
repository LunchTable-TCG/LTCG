// Seed story chapters into the database
// Run this mutation from the Convex dashboard to populate story chapters

import { internalMutation } from "./_generated/server";
import { STORY_CHAPTERS } from "./seeds/storyChapters";

export const seedStoryChapters = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing story chapters
    const existing = await ctx.db.query("storyChapters").collect();
    for (const chapter of existing) {
      await ctx.db.delete(chapter._id);
    }

    // Insert all story chapters
    let inserted = 0;
    for (const chapter of STORY_CHAPTERS) {
      await ctx.db.insert("storyChapters", {
        ...chapter,
        isActive: true,
        createdAt: Date.now(),
      });
      inserted++;
    }

    return {
      success: true,
      message: `Successfully seeded ${inserted} story chapters`,
      chaptersInserted: inserted,
    };
  },
});

export const clearStoryProgress = internalMutation({
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
