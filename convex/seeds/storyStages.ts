/**
 * Story Stage Definitions
 *
 * Each chapter has 10 stages with progressive difficulty:
 * - Stages 1-3: Easy (tutorial/warmup)
 * - Stages 4-6: Medium (standard challenge)
 * - Stages 7-9: Hard (tough encounters)
 * - Stage 10: Boss (chapter finale)
 */

import { ARCHETYPES } from "../lib/storyConstants";

export interface StoryStageDefinition {
  stageNumber: number;
  name: string;
  description: string;
  aiDifficulty: "easy" | "medium" | "hard" | "boss";
  rewardGold: number;
  rewardXp: number;
  firstClearBonus: number;
}

/**
 * Generate 10 stages for a chapter
 * @param chapterNumber - The chapter number (1-10)
 * @param chapterTitle - The chapter's title
 * @param archetype - The archetype theme
 */
export function generateStagesForChapter(
  chapterNumber: number,
  chapterTitle: string,
  archetype: string
): StoryStageDefinition[] {
  // Base rewards scale with chapter number
  const baseGold = 50 + (chapterNumber - 1) * 25;
  const baseXp = 100 + (chapterNumber - 1) * 50;

  const stages: StoryStageDefinition[] = [];

  // Stages 1-3: Easy
  for (let i = 1; i <= 3; i++) {
    stages.push({
      stageNumber: i,
      name: `Stage ${i}: Initiation`,
      description: `Face a basic ${archetype.replace(/_/g, " ")} opponent. Learn the fundamentals.`,
      aiDifficulty: "easy",
      rewardGold: Math.floor(baseGold * 0.8),
      rewardXp: Math.floor(baseXp * 0.8),
      firstClearBonus: baseGold * 2,
    });
  }

  // Stages 4-6: Medium
  for (let i = 4; i <= 6; i++) {
    stages.push({
      stageNumber: i,
      name: `Stage ${i}: Challenge`,
      description: `An experienced ${archetype.replace(/_/g, " ")} duelist awaits. Use strategy.`,
      aiDifficulty: "medium",
      rewardGold: baseGold,
      rewardXp: baseXp,
      firstClearBonus: baseGold * 3,
    });
  }

  // Stages 7-9: Hard
  for (let i = 7; i <= 9; i++) {
    stages.push({
      stageNumber: i,
      name: `Stage ${i}: Trial`,
      description: `A master of ${archetype.replace(/_/g, " ")} techniques. Victory requires skill.`,
      aiDifficulty: "hard",
      rewardGold: Math.floor(baseGold * 1.5),
      rewardXp: Math.floor(baseXp * 1.5),
      firstClearBonus: baseGold * 4,
    });
  }

  // Stage 10: Boss
  stages.push({
    stageNumber: 10,
    name: `Stage 10: ${chapterTitle} Champion`,
    description: `Face the legendary champion of ${chapterTitle}. The ultimate test.`,
    aiDifficulty: "boss",
    rewardGold: baseGold * 3,
    rewardXp: baseXp * 3,
    firstClearBonus: baseGold * 10,
  });

  return stages;
}

/**
 * All stage definitions for all 10 chapters
 */
export const ALL_STORY_STAGES = {
  // Chapter 1: Infernal Dragons
  chapter1: generateStagesForChapter(1, "The First Flame", ARCHETYPES.INFERNAL_DRAGONS),

  // Chapter 2: Abyssal Horrors
  chapter2: generateStagesForChapter(2, "Tides of the Deep", ARCHETYPES.ABYSSAL_HORRORS),

  // Chapter 3: Nature Spirits
  chapter3: generateStagesForChapter(3, "Whispers of the Forest", ARCHETYPES.NATURE_SPIRITS),

  // Chapter 4: Storm Elementals
  chapter4: generateStagesForChapter(4, "Eye of the Tempest", ARCHETYPES.STORM_ELEMENTALS),

  // Chapter 5: Shadow Assassins
  chapter5: generateStagesForChapter(5, "Blades in the Dark", ARCHETYPES.SHADOW_ASSASSINS),

  // Chapter 6: Celestial Guardians
  chapter6: generateStagesForChapter(6, "Starlight Sentinels", ARCHETYPES.CELESTIAL_GUARDIANS),

  // Chapter 7: Undead Legion
  chapter7: generateStagesForChapter(7, "March of the Damned", ARCHETYPES.UNDEAD_LEGION),

  // Chapter 8: Divine Knights
  chapter8: generateStagesForChapter(8, "Oath of the Righteous", ARCHETYPES.DIVINE_KNIGHTS),

  // Chapter 9: Arcane Mages
  chapter9: generateStagesForChapter(9, "Arcane Convergence", ARCHETYPES.ARCANE_MAGES),

  // Chapter 10: Mechanical Constructs
  chapter10: generateStagesForChapter(10, "Age of Automation", ARCHETYPES.MECHANICAL_CONSTRUCTS),
};

/**
 * Get stages for a specific chapter
 */
export function getStagesForChapter(chapterNumber: number): StoryStageDefinition[] {
  const key = `chapter${chapterNumber}` as keyof typeof ALL_STORY_STAGES;
  return ALL_STORY_STAGES[key] || [];
}
