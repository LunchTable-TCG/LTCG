// Story Chapter Definitions
// 10 chapters (one per archetype), each with 10 stages

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
  // Chapter 1: Infernal Dragons (10 stages)
  // ============================================================================
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

  // ============================================================================
  // Chapter 2: Abyssal Horrors (10 stages)
  // ============================================================================
  {
    actNumber: 1,
    chapterNumber: 2,
    title: "Tides of the Deep",
    description:
      "Descend into the crushing depths where the Abyssal Horrors dwell. Conquer 10 stages of aquatic terror.",
    archetype: ARCHETYPES.ABYSSAL_HORRORS,
    archetypeImageUrl: "/assets/story/abyssal_horrors.png",
    storyText:
      "The ocean's depths hide terrors beyond imagination. Darkness and pressure create monsters of legend. Survive 10 battles in the frozen abyss to emerge victorious.",
    loreText:
      "Abyssal Horrors evolved in crushing depths where light never reaches, masters of freeze and manipulation. They control the currents and command the cold.",
    aiOpponentDeckCode: "ABYSSAL_HORRORS",
    aiDifficulty: { normal: 5, hard: 7, legendary: 9 },
    battleCount: 10,
    baseRewards: { gold: 500, xp: 1000 },
    unlockRequirements: { previousChapter: true },
  },

  // ============================================================================
  // Chapter 3: Nature Spirits (10 stages)
  // ============================================================================
  {
    actNumber: 1,
    chapterNumber: 3,
    title: "Whispers of the Forest",
    description:
      "Enter the ancient groves where Nature Spirits guard the balance. Complete 10 stages to earn their blessing.",
    archetype: ARCHETYPES.NATURE_SPIRITS,
    archetypeImageUrl: "/assets/story/nature_spirits.png",
    storyText:
      "The forest breathes with ancient life. Vines twist and trees walk as the spirits awaken. Face 10 trials to prove your harmony with nature's power.",
    loreText:
      "Nature Spirits are the living essence of primordial forests, older than civilization itself. They command growth, decay, and the endless cycle of life.",
    aiOpponentDeckCode: "NATURE_SPIRITS",
    aiDifficulty: { normal: 5, hard: 7, legendary: 9 },
    battleCount: 10,
    baseRewards: { gold: 500, xp: 1000 },
    unlockRequirements: { previousChapter: true },
  },

  // ============================================================================
  // Chapter 4: Storm Elementals (10 stages)
  // ============================================================================
  {
    actNumber: 1,
    chapterNumber: 4,
    title: "Eye of the Tempest",
    description:
      "Brave the raging storms where lightning splits the sky. Endure 10 stages of elemental fury.",
    archetype: ARCHETYPES.STORM_ELEMENTALS,
    archetypeImageUrl: "/assets/story/storm_elementals.png",
    storyText:
      "Thunder roars across endless skies. Lightning dances between clouds as storm elementals gather their might. Withstand 10 battles to master the tempest.",
    loreText:
      "Storm Elementals are born from the fury of hurricanes and the rage of thunderstorms. They embody chaos, speed, and the raw power of weather itself.",
    aiOpponentDeckCode: "STORM_ELEMENTALS",
    aiDifficulty: { normal: 5, hard: 7, legendary: 9 },
    battleCount: 10,
    baseRewards: { gold: 500, xp: 1000 },
    unlockRequirements: { previousChapter: true },
  },

  // ============================================================================
  // Chapter 5: Shadow Assassins (10 stages)
  // ============================================================================
  {
    actNumber: 1,
    chapterNumber: 5,
    title: "Blades in the Dark",
    description:
      "Navigate the realm of shadows where assassins strike from darkness. Survive 10 stages of lethal precision.",
    archetype: ARCHETYPES.SHADOW_ASSASSINS,
    archetypeImageUrl: "/assets/story/shadow_assassins.png",
    storyText:
      "In the void between light and dark, shadows take form and strike without warning. Face 10 trials where death lurks in every corner.",
    loreText:
      "Shadow Assassins are masters of stealth, deception, and swift execution. They move unseen, strike with precision, and vanish before retaliation.",
    aiOpponentDeckCode: "INFERNAL_DRAGONS",
    aiDifficulty: { normal: 5, hard: 7, legendary: 9 },
    battleCount: 10,
    baseRewards: { gold: 500, xp: 1000 },
    unlockRequirements: { previousChapter: true },
  },

  // ============================================================================
  // Chapter 6: Celestial Guardians (10 stages)
  // ============================================================================
  {
    actNumber: 2,
    chapterNumber: 6,
    title: "Starlight Sentinels",
    description:
      "Ascend to the celestial realm where divine guardians protect cosmic order. Prove yourself across 10 stages.",
    archetype: ARCHETYPES.CELESTIAL_GUARDIANS,
    archetypeImageUrl: "/assets/story/celestial_guardians.png",
    storyText:
      "Beyond the mortal realm, stars themselves take form as guardians of the heavens. Their light pierces all darkness. Face 10 celestial trials to earn their blessing.",
    loreText:
      "Celestial Guardians are beings of pure starlight, protectors of cosmic balance and enforcers of divine law. They wield holy power and healing light.",
    aiOpponentDeckCode: "NATURE_SPIRITS",
    aiDifficulty: { normal: 6, hard: 8, legendary: 10 },
    battleCount: 10,
    baseRewards: { gold: 600, xp: 1200 },
    unlockRequirements: { previousChapter: true, minimumLevel: 5 },
  },

  // ============================================================================
  // Chapter 7: Undead Legion (10 stages)
  // ============================================================================
  {
    actNumber: 2,
    chapterNumber: 7,
    title: "March of the Damned",
    description:
      "Enter the cursed lands where the dead refuse to rest. Conquer 10 stages of relentless undead forces.",
    archetype: ARCHETYPES.UNDEAD_LEGION,
    archetypeImageUrl: "/assets/story/undead_legion.png",
    storyText:
      "Death is not the end—it is merely a transformation. The Undead Legion rises, endless and unstoppable. Survive 10 waves of the eternal army.",
    loreText:
      "The Undead Legion consists of fallen warriors, necromantic constructs, and cursed souls bound to eternal service. They know no fear, feel no pain.",
    aiOpponentDeckCode: "ABYSSAL_HORRORS",
    aiDifficulty: { normal: 6, hard: 8, legendary: 10 },
    battleCount: 10,
    baseRewards: { gold: 600, xp: 1200 },
    unlockRequirements: { previousChapter: true, minimumLevel: 5 },
  },

  // ============================================================================
  // Chapter 8: Divine Knights (10 stages)
  // ============================================================================
  {
    actNumber: 2,
    chapterNumber: 8,
    title: "Oath of the Righteous",
    description:
      "Face the holy crusaders sworn to divine justice. Overcome 10 stages of unwavering conviction.",
    archetype: ARCHETYPES.DIVINE_KNIGHTS,
    archetypeImageUrl: "/assets/story/divine_knights.png",
    storyText:
      "Clad in blessed armor and wielding sacred steel, the Divine Knights stand as paragons of righteousness. Their faith is unbreakable. Challenge 10 champions to test your resolve.",
    loreText:
      "Divine Knights are mortal warriors elevated by divine purpose. They combine martial prowess with holy magic, defending the innocent and smiting evil.",
    aiOpponentDeckCode: "STORM_ELEMENTALS",
    aiDifficulty: { normal: 6, hard: 8, legendary: 10 },
    battleCount: 10,
    baseRewards: { gold: 600, xp: 1200 },
    unlockRequirements: { previousChapter: true, minimumLevel: 8 },
  },

  // ============================================================================
  // Chapter 9: Arcane Mages (10 stages)
  // ============================================================================
  {
    actNumber: 2,
    chapterNumber: 9,
    title: "Arcane Convergence",
    description:
      "Enter the towers of ancient sorcery where reality bends to will. Master 10 stages of pure magic.",
    archetype: ARCHETYPES.ARCANE_MAGES,
    archetypeImageUrl: "/assets/story/arcane_mages.png",
    storyText:
      "Magic flows through everything, waiting to be shaped by those with knowledge and will. The Arcane Mages have studied for centuries. Face 10 archmages to prove your magical mastery.",
    loreText:
      "Arcane Mages dedicate their lives to understanding the fundamental forces of reality. They manipulate energy, bend space, and rewrite the rules of existence itself.",
    aiOpponentDeckCode: "NATURE_SPIRITS",
    aiDifficulty: { normal: 7, hard: 9, legendary: 11 },
    battleCount: 10,
    baseRewards: { gold: 700, xp: 1400 },
    unlockRequirements: { previousChapter: true, minimumLevel: 10 },
  },

  // ============================================================================
  // Chapter 10: Mechanical Constructs (10 stages)
  // ============================================================================
  {
    actNumber: 2,
    chapterNumber: 10,
    title: "Age of Automation",
    description:
      "Confront the perfect fusion of magic and machine. Defeat 10 stages of relentless mechanical precision.",
    archetype: ARCHETYPES.MECHANICAL_CONSTRUCTS,
    archetypeImageUrl: "/assets/story/mechanical_constructs.png",
    storyText:
      "Gears turn, pistons pump, and arcane cores glow with power. The Mechanical Constructs represent the pinnacle of magical engineering. Overcome 10 battles against tireless machines.",
    loreText:
      "Mechanical Constructs blend arcane magic with precise engineering, creating beings that never tire, never falter, and execute their programming with absolute efficiency.",
    aiOpponentDeckCode: "STORM_ELEMENTALS",
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
