/**
 * Story Seed Data
 *
 * Seeds Chapter 1 with 5 stages for story mode.
 * Run via: bun convex run progression/seedStory:seedStoryData
 */

import { components } from "../_generated/api";
import { internalMutation } from "../functions";
import { LTCGStory } from "@lunchtable-tcg/story";

const story = new LTCGStory(components.lunchtable_tcg_story as any);

export const seedStoryData = internalMutation({
  handler: async (ctx) => {
    // Seed Chapter 1
    const chaptersInserted = await story.seeds.seedChapters(ctx, [
      {
        actNumber: 1,
        chapterNumber: 1,
        title: "Welcome to the Table",
        description:
          "Your first day at Lunchtable Academy. Learn the basics and prove you belong.",
        archetype: "mixed",
        battleCount: 5,
        status: "published",
        isActive: true,
        unlockRequirements: {
          minimumLevel: 1,
        },
        baseRewards: { gold: 50, xp: 25 },
      },
      {
        actNumber: 1,
        chapterNumber: 2,
        title: "The Dropout Challenge",
        description:
          "The Dropouts are running the yard. Show them your cards speak louder than their attitude.",
        archetype: "dropout",
        battleCount: 5,
        status: "published",
        isActive: true,
        unlockRequirements: {
          minimumLevel: 3,
          previousChapter: true,
        },
        baseRewards: { gold: 75, xp: 40 },
      },
      {
        actNumber: 1,
        chapterNumber: 3,
        title: "Rise of the Geeks",
        description:
          "The Geek Squad has built decks using pure strategy. Can you out-think the thinkers?",
        archetype: "geek",
        battleCount: 5,
        status: "published",
        isActive: true,
        unlockRequirements: {
          minimumLevel: 6,
          previousChapter: true,
        },
        baseRewards: { gold: 100, xp: 50 },
      },
    ]);

    // Get the chapter IDs we just created
    const chapters = await story.chapters.getChapters(ctx, { status: "published" });
    const chapter1 = chapters?.find(
      (c: any) => c.actNumber === 1 && c.chapterNumber === 1
    );
    const chapter2 = chapters?.find(
      (c: any) => c.actNumber === 1 && c.chapterNumber === 2
    );
    const chapter3 = chapters?.find(
      (c: any) => c.actNumber === 1 && c.chapterNumber === 3
    );

    let stagesInserted = 0;

    // Seed Chapter 1 Stages
    if (chapter1) {
      stagesInserted += await story.seeds.seedStages(ctx, [
        {
          chapterId: chapter1._id,
          stageNumber: 1,
          name: "First Steps",
          description: "A friendly practice match to learn the basics.",
          opponentName: "Training Dummy",
          aiDifficulty: "easy",
          rewardGold: 30,
          rewardXp: 15,
          firstClearBonus: 50,
          status: "published",
          preMatchDialogue: [
            { speaker: "Professor", text: "Welcome to your first match! Let's see what you've got." },
            { speaker: "You", text: "I'm ready to play!" },
          ],
          postMatchWinDialogue: [
            { speaker: "Professor", text: "Well done! You've got potential." },
          ],
        },
        {
          chapterId: chapter1._id,
          stageNumber: 2,
          name: "Lunch Rush",
          description: "The cafeteria is buzzing. Can you keep your cool?",
          opponentName: "Cafeteria Kid",
          aiDifficulty: "easy",
          rewardGold: 40,
          rewardXp: 20,
          firstClearBonus: 75,
          status: "published",
        },
        {
          chapterId: chapter1._id,
          stageNumber: 3,
          name: "After School Showdown",
          description: "A challenger approaches behind the bleachers.",
          opponentName: "Playground Rival",
          aiDifficulty: "medium",
          rewardGold: 50,
          rewardXp: 25,
          firstClearBonus: 100,
          status: "published",
        },
        {
          chapterId: chapter1._id,
          stageNumber: 4,
          name: "The Substitute",
          description: "The substitute teacher wants to test your skills.",
          opponentName: "Mr. Henderson",
          aiDifficulty: "medium",
          rewardGold: 60,
          rewardXp: 30,
          firstClearBonus: 125,
          status: "published",
        },
        {
          chapterId: chapter1._id,
          stageNumber: 5,
          name: "Hall Monitor Showdown",
          description: "The hall monitor rules this hallway. Time to dethrone them.",
          opponentName: "Hall Monitor Max",
          aiDifficulty: "hard",
          rewardGold: 80,
          rewardXp: 40,
          firstClearBonus: 200,
          status: "published",
          postMatchWinDialogue: [
            { speaker: "Max", text: "Impossible... nobody beats me in these halls!" },
            { speaker: "You", text: "There's a new player in town." },
          ],
        },
      ]);
    }

    // Seed Chapter 2 Stages
    if (chapter2) {
      stagesInserted += await story.seeds.seedStages(ctx, [
        {
          chapterId: chapter2._id,
          stageNumber: 1,
          name: "Dropout's Dare",
          description: "A dropout challenges you to a quick game.",
          opponentName: "Skater Jake",
          aiDifficulty: "medium",
          rewardGold: 50,
          rewardXp: 30,
          firstClearBonus: 100,
          status: "published",
        },
        {
          chapterId: chapter2._id,
          stageNumber: 2,
          name: "Rebel Without a Cause",
          description: "They play fast and loose. Can you keep up?",
          opponentName: "Rebel Rosa",
          aiDifficulty: "medium",
          rewardGold: 60,
          rewardXp: 35,
          firstClearBonus: 125,
          status: "published",
        },
        {
          chapterId: chapter2._id,
          stageNumber: 3,
          name: "The Detention Room",
          description: "In detention, the strongest player rules.",
          opponentName: "Detention King",
          aiDifficulty: "hard",
          rewardGold: 75,
          rewardXp: 40,
          firstClearBonus: 150,
          status: "published",
        },
        {
          chapterId: chapter2._id,
          stageNumber: 4,
          name: "Backyard Brawl",
          description: "An underground match behind the school.",
          opponentName: "The Enforcer",
          aiDifficulty: "hard",
          rewardGold: 85,
          rewardXp: 45,
          firstClearBonus: 175,
          status: "published",
        },
        {
          chapterId: chapter2._id,
          stageNumber: 5,
          name: "The Dropout King",
          description: "The self-proclaimed king of the dropouts. This is the real deal.",
          opponentName: "King Kurtis",
          aiDifficulty: "boss",
          rewardGold: 120,
          rewardXp: 60,
          firstClearBonus: 300,
          status: "published",
        },
      ]);
    }

    // Seed Chapter 3 Stages
    if (chapter3) {
      stagesInserted += await story.seeds.seedStages(ctx, [
        {
          chapterId: chapter3._id,
          stageNumber: 1,
          name: "Lab Partner",
          description: "Your lab partner wants to test a new strategy.",
          opponentName: "Nerdy Ned",
          aiDifficulty: "medium",
          rewardGold: 60,
          rewardXp: 35,
          firstClearBonus: 125,
          status: "published",
        },
        {
          chapterId: chapter3._id,
          stageNumber: 2,
          name: "Chess Club Captain",
          description: "They think 5 moves ahead. Can you adapt?",
          opponentName: "Captain Checkmate",
          aiDifficulty: "hard",
          rewardGold: 75,
          rewardXp: 40,
          firstClearBonus: 150,
          status: "published",
        },
        {
          chapterId: chapter3._id,
          stageNumber: 3,
          name: "Science Fair Sabotage",
          description: "Someone tampered with your deck. Play with what you've got.",
          opponentName: "Dr. Devious",
          aiDifficulty: "hard",
          rewardGold: 85,
          rewardXp: 45,
          firstClearBonus: 175,
          status: "published",
        },
        {
          chapterId: chapter3._id,
          stageNumber: 4,
          name: "The Algorithm",
          description: "They claim to have calculated the perfect deck. Prove them wrong.",
          opponentName: "The Algorithm",
          aiDifficulty: "hard",
          rewardGold: 100,
          rewardXp: 50,
          firstClearBonus: 200,
          status: "published",
        },
        {
          chapterId: chapter3._id,
          stageNumber: 5,
          name: "Geek Supreme",
          description: "The ultimate nerd. Master of all archetypes.",
          opponentName: "Professor Gigabyte",
          aiDifficulty: "boss",
          rewardGold: 150,
          rewardXp: 75,
          firstClearBonus: 400,
          status: "published",
        },
      ]);
    }

    return {
      chaptersInserted,
      stagesInserted,
      message: `Seeded ${chaptersInserted} chapters and ${stagesInserted} stages.`,
    };
  },
});
