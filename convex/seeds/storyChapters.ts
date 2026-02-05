// Story Chapter Definitions
// 10 chapters cycling through 4 archetypes with increasing difficulty

import { ARCHETYPES } from "../lib/storyConstants";

export interface StoryChapterSeed {
  actNumber: number;
  chapterNumber: number;
  title: string;
  description: string;
  archetype: string;
  archetypeImageUrl: string;
  storyText: string;
  loreText: string;
  aiOpponentDeckCode: string;
  aiDifficulty: {
    normal: number;
    hard: number;
    legendary: number;
  };
  battleCount: number;
  baseRewards: {
    gold: number;
    xp: number;
    guaranteedCards?: string[];
  };
  unlockRequirements?: {
    previousChapter?: boolean;
    minimumLevel?: number;
  };
}

export const STORY_CHAPTERS: readonly StoryChapterSeed[] = [
  // ============================================================================
  // ACT 1: The Four Factions (Chapters 1-4)
  // ============================================================================

  // Chapter 1: Infernal Dragons
  {
    actNumber: 1,
    chapterNumber: 1,
    title: "The First Flame",
    description:
      "Deep in the volcanic peaks, master the primal power of fire across 10 stages of increasing challenge.",
    archetype: ARCHETYPES.INFERNAL_DRAGONS,
    archetypeImageUrl: "/assets/story/infernal_dragons.png",
    storyText:
      "The mountains trembled as ancient fire stirred beneath the earth. Your journey begins where flame meets destiny. Face 10 trials to prove your mastery over the Infernal Dragons.",
    loreText:
      "The Infernal Dragons were born from the planet's molten core, guardians of primal fire and keepers of ancient volcanic secrets. Only those who can withstand the heat may command their power.",
    aiOpponentDeckCode: "INFERNAL_DRAGONS",
    aiDifficulty: { normal: 5, hard: 7, legendary: 9 },
    battleCount: 10,
    baseRewards: { gold: 500, xp: 1000 },
    unlockRequirements: {},
  },

  // Chapter 2: Abyssal Depths
  {
    actNumber: 1,
    chapterNumber: 2,
    title: "Tides of the Deep",
    description:
      "Descend into the crushing depths where the Abyssal creatures dwell. Conquer 10 stages of aquatic terror.",
    archetype: ARCHETYPES.ABYSSAL_DEPTHS,
    archetypeImageUrl: "/assets/story/abyssal_depths.png",
    storyText:
      "The ocean's depths hide terrors beyond imagination. Darkness and pressure create monsters of legend. Survive 10 battles in the frozen abyss to emerge victorious.",
    loreText:
      "The Abyssal Depths harbor creatures that evolved in crushing darkness where light never reaches. They control the currents and command the cold.",
    aiOpponentDeckCode: "ABYSSAL_DEPTHS",
    aiDifficulty: { normal: 5, hard: 7, legendary: 9 },
    battleCount: 10,
    baseRewards: { gold: 500, xp: 1000 },
    unlockRequirements: { previousChapter: true },
  },

  // Chapter 3: Iron Legion
  {
    actNumber: 1,
    chapterNumber: 3,
    title: "Steel and Honor",
    description:
      "March alongside the Iron Legion where discipline meets might. Complete 10 stages to earn their respect.",
    archetype: ARCHETYPES.IRON_LEGION,
    archetypeImageUrl: "/assets/story/iron_legion.png",
    storyText:
      "The clang of metal echoes across endless battlefields. The Iron Legion stands unbroken, their formations perfect, their resolve absolute. Face 10 trials of martial prowess.",
    loreText:
      "The Iron Legion represents the pinnacle of military discipline and engineering. Their constructs are tireless, their soldiers unwavering, their strategies time-tested.",
    aiOpponentDeckCode: "IRON_LEGION",
    aiDifficulty: { normal: 5, hard: 7, legendary: 9 },
    battleCount: 10,
    baseRewards: { gold: 500, xp: 1000 },
    unlockRequirements: { previousChapter: true },
  },

  // Chapter 4: Necro Empire
  {
    actNumber: 1,
    chapterNumber: 4,
    title: "Empire of the Damned",
    description:
      "Enter the cursed lands where the dead refuse to rest. Survive 10 stages against the Necro Empire.",
    archetype: ARCHETYPES.NECRO_EMPIRE,
    archetypeImageUrl: "/assets/story/necro_empire.png",
    storyText:
      "Death is not the end—it is merely a transformation. The Necro Empire rises, endless and unstoppable. Survive 10 waves of the eternal army.",
    loreText:
      "The Necro Empire consists of fallen warriors, necromantic constructs, and cursed souls bound to eternal service. They know no fear, feel no pain, and their numbers grow with every battle.",
    aiOpponentDeckCode: "NECRO_EMPIRE",
    aiDifficulty: { normal: 5, hard: 7, legendary: 9 },
    battleCount: 10,
    baseRewards: { gold: 500, xp: 1000 },
    unlockRequirements: { previousChapter: true },
  },

  // ============================================================================
  // ACT 2: Rising Challenges (Chapters 5-8)
  // ============================================================================

  // Chapter 5: Infernal Dragons - Advanced
  {
    actNumber: 2,
    chapterNumber: 5,
    title: "Inferno Unleashed",
    description:
      "The dragons have awakened fully. Face their true power across 10 stages of blazing fury.",
    archetype: ARCHETYPES.INFERNAL_DRAGONS,
    archetypeImageUrl: "/assets/story/infernal_dragons.png",
    storyText:
      "You thought you understood fire. But the true Infernal Dragons now reveal themselves—ancient wyrms of pure destruction. Prove you can match their fury.",
    loreText:
      "The elder dragons watched your progress. Now they test you themselves. Their flames burn hotter, their scales harder, their rage limitless.",
    aiOpponentDeckCode: "INFERNAL_DRAGONS",
    aiDifficulty: { normal: 6, hard: 8, legendary: 10 },
    battleCount: 10,
    baseRewards: { gold: 600, xp: 1200 },
    unlockRequirements: { previousChapter: true, minimumLevel: 5 },
  },

  // Chapter 6: Abyssal Depths - Advanced
  {
    actNumber: 2,
    chapterNumber: 6,
    title: "The Sunken Throne",
    description:
      "Descend to the deepest trenches where ancient leviathans rule. Survive 10 stages of ultimate pressure.",
    archetype: ARCHETYPES.ABYSSAL_DEPTHS,
    archetypeImageUrl: "/assets/story/abyssal_depths.png",
    storyText:
      "Beyond the known depths lies the Sunken Throne, where the true rulers of the abyss await. No light has ever reached this place. No challenger has ever returned.",
    loreText:
      "The Sunken Throne predates civilization itself. Here, the first sea monsters were born, and here they still reign, patient and eternal.",
    aiOpponentDeckCode: "ABYSSAL_DEPTHS",
    aiDifficulty: { normal: 6, hard: 8, legendary: 10 },
    battleCount: 10,
    baseRewards: { gold: 600, xp: 1200 },
    unlockRequirements: { previousChapter: true, minimumLevel: 5 },
  },

  // Chapter 7: Iron Legion - Advanced
  {
    actNumber: 2,
    chapterNumber: 7,
    title: "The Siege Eternal",
    description:
      "Face the Iron Legion's elite forces in their impregnable fortress. Overcome 10 stages of tactical genius.",
    archetype: ARCHETYPES.IRON_LEGION,
    archetypeImageUrl: "/assets/story/iron_legion.png",
    storyText:
      "The Iron Citadel has never fallen. Its walls are legend, its defenders tireless. You must breach the unbreakable, defeat the undefeatable.",
    loreText:
      "Built over millennia, the Iron Citadel houses the Legion's greatest warriors and most advanced war machines. To challenge it is to challenge perfection itself.",
    aiOpponentDeckCode: "IRON_LEGION",
    aiDifficulty: { normal: 6, hard: 8, legendary: 10 },
    battleCount: 10,
    baseRewards: { gold: 600, xp: 1200 },
    unlockRequirements: { previousChapter: true, minimumLevel: 8 },
  },

  // Chapter 8: Necro Empire - Advanced
  {
    actNumber: 2,
    chapterNumber: 8,
    title: "The Lich King's Domain",
    description:
      "Enter the heart of the Necro Empire where the Lich King commands. Survive 10 stages of undying horror.",
    archetype: ARCHETYPES.NECRO_EMPIRE,
    archetypeImageUrl: "/assets/story/necro_empire.png",
    storyText:
      "The Lich King has ruled death itself for eons. His power is absolute, his army infinite. Face the master of the Necro Empire in his own throne room.",
    loreText:
      "Once a mortal king who conquered death, the Lich King now commands all who fall in battle. His phylactery is hidden, his power seemingly limitless.",
    aiOpponentDeckCode: "NECRO_EMPIRE",
    aiDifficulty: { normal: 6, hard: 8, legendary: 10 },
    battleCount: 10,
    baseRewards: { gold: 600, xp: 1200 },
    unlockRequirements: { previousChapter: true, minimumLevel: 8 },
  },

  // ============================================================================
  // ACT 3: The Final Challenge (Chapters 9-10)
  // ============================================================================

  // Chapter 9: Combined Forces
  {
    actNumber: 3,
    chapterNumber: 9,
    title: "Alliance of Darkness",
    description:
      "The factions unite against you. Face combined forces across 10 stages of ultimate challenge.",
    archetype: ARCHETYPES.NECRO_EMPIRE, // Uses Necro as primary but represents alliance
    archetypeImageUrl: "/assets/story/alliance.png",
    storyText:
      "Seeing your power grow, the four factions have set aside their differences. Together, they will crush you. Or die trying.",
    loreText:
      "For the first time in history, the four great factions march as one. Fire, water, steel, and death combine their might against a common threat: you.",
    aiOpponentDeckCode: "NECRO_EMPIRE",
    aiDifficulty: { normal: 7, hard: 9, legendary: 11 },
    battleCount: 10,
    baseRewards: { gold: 700, xp: 1400 },
    unlockRequirements: { previousChapter: true, minimumLevel: 10 },
  },

  // Chapter 10: The Final Boss
  {
    actNumber: 3,
    chapterNumber: 10,
    title: "The Eternal Champion",
    description:
      "Face the legendary champion who mastered all four elements. Defeat 10 stages to claim your destiny.",
    archetype: ARCHETYPES.INFERNAL_DRAGONS, // Uses Infernal as primary but represents mastery
    archetypeImageUrl: "/assets/story/champion.png",
    storyText:
      "Before the factions divided, one warrior mastered them all. The Eternal Champion has watched from beyond time. Now, they challenge you for supremacy.",
    loreText:
      "The Eternal Champion was the first to unite all four powers. They transcended mortality, becoming a force of nature. To defeat them is to become legend.",
    aiOpponentDeckCode: "INFERNAL_DRAGONS",
    aiDifficulty: { normal: 7, hard: 9, legendary: 11 },
    battleCount: 10,
    baseRewards: { gold: 700, xp: 1400 },
    unlockRequirements: { previousChapter: true, minimumLevel: 12 },
  },
];

// Helper function to get chapters by act
export function getChaptersByAct(actNumber: number): readonly StoryChapterSeed[] {
  return STORY_CHAPTERS.filter((ch) => ch.actNumber === actNumber);
}

// Helper function to get specific chapter
export function getChapter(actNumber: number, chapterNumber: number): StoryChapterSeed | undefined {
  return STORY_CHAPTERS.find(
    (ch) => ch.actNumber === actNumber && ch.chapterNumber === chapterNumber
  );
}
