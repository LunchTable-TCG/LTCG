import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { LTCGCards } from "@lunchtable-tcg/cards";
import { LTCGStory } from "@lunchtable-tcg/story";

const cards = new LTCGCards(components.lunchtable_tcg_cards as any);
const story = new LTCGStory(components.lunchtable_tcg_story as any);

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Seed card definitions
    const cardResult = await cards.seeds.seedCardDefinitions(ctx, CARD_DEFINITIONS);

    // Seed starter decks
    const deckResult = await cards.seeds.seedStarterDecks(ctx, STARTER_DECKS);

    // Seed story chapters
    const chaptersCount = await story.seeds.seedChapters(ctx, CHAPTERS);

    // Get chapter 1 ID for stages
    const chapters = await story.chapters.getChapters(ctx, { status: "published" });
    const ch1 = chapters?.find((c: any) => c.chapterNumber === 1);

    let stagesCount = 0;
    if (ch1) {
      stagesCount = await story.seeds.seedStages(ctx, CHAPTER_1_STAGES(ch1._id));
    }

    return {
      cards: cardResult,
      decks: deckResult,
      chapters: chaptersCount,
      stages: stagesCount,
    };
  },
});

// ── Card Definitions ──────────────────────────────────────────────────
// 8 stereotypes, 4 spells, 3 traps = 15 unique cards

const CARD_DEFINITIONS = [
  // Stereotypes (monsters)
  { name: "Cafeteria Kid", rarity: "common", archetype: "mixed", cardType: "stereotype", attack: 1200, defense: 800, cost: 3, level: 3 },
  { name: "Hall Monitor", rarity: "common", archetype: "geek", cardType: "stereotype", attack: 1400, defense: 1000, cost: 4, level: 4 },
  { name: "Class Clown", rarity: "common", archetype: "dropout", cardType: "stereotype", attack: 1000, defense: 600, cost: 2, level: 2 },
  { name: "Teacher's Pet", rarity: "rare", archetype: "geek", cardType: "stereotype", attack: 1600, defense: 1200, cost: 5, level: 5 },
  { name: "Skater Punk", rarity: "common", archetype: "dropout", cardType: "stereotype", attack: 1300, defense: 700, cost: 3, level: 3 },
  { name: "Library Ghost", rarity: "rare", archetype: "geek", cardType: "stereotype", attack: 1800, defense: 1500, cost: 6, level: 6 },
  { name: "Lunch Lady", rarity: "uncommon", archetype: "mixed", cardType: "stereotype", attack: 1500, defense: 1800, cost: 5, level: 5 },
  { name: "Detention King", rarity: "rare", archetype: "dropout", cardType: "stereotype", attack: 2000, defense: 1000, cost: 6, level: 6 },

  // Spells
  { name: "Pop Quiz", rarity: "common", archetype: "mixed", cardType: "spell", cost: 1, spellType: "normal", ability: "Draw 1 card" },
  { name: "Homework Shield", rarity: "common", archetype: "geek", cardType: "spell", cost: 2, spellType: "equip", ability: "Target stereotype gains +500 DEF" },
  { name: "Recess Bell", rarity: "uncommon", archetype: "mixed", cardType: "spell", cost: 2, spellType: "normal", ability: "All your stereotypes gain +300 ATK this turn" },
  { name: "Cheat Sheet", rarity: "rare", archetype: "dropout", cardType: "spell", cost: 3, spellType: "normal", ability: "Draw 2 cards" },

  // Traps
  { name: "Tardy Slip", rarity: "common", archetype: "mixed", cardType: "trap", cost: 1, trapType: "normal", ability: "Negate an attack" },
  { name: "Detention Notice", rarity: "uncommon", archetype: "geek", cardType: "trap", cost: 2, trapType: "normal", ability: "Destroy 1 attacking stereotype" },
  { name: "Food Fight", rarity: "rare", archetype: "dropout", cardType: "trap", cost: 3, trapType: "counter", ability: "Deal 500 damage to opponent" },
];

const STARTER_DECKS = [
  { name: "Geek Squad", deckCode: "geek_starter", archetype: "geek", description: "Strategy and defense", playstyle: "Control", cardCount: 40 },
  { name: "Dropout Gang", deckCode: "dropout_starter", archetype: "dropout", description: "Fast and aggressive", playstyle: "Aggro", cardCount: 40 },
  { name: "Mixed Lunch", deckCode: "mixed_starter", archetype: "mixed", description: "Balanced all-rounder", playstyle: "Midrange", cardCount: 40 },
];

const CHAPTERS = [
  {
    actNumber: 1,
    chapterNumber: 1,
    title: "Welcome to the Table",
    description: "Your first day at Lunchtable Academy.",
    archetype: "mixed",
    battleCount: 3,
    status: "published" as const,
    isActive: true,
    unlockRequirements: { minimumLevel: 1 },
    baseRewards: { gold: 50, xp: 25 },
  },
];

const CHAPTER_1_STAGES = (chapterId: string) => [
  { chapterId, stageNumber: 1, name: "First Steps", description: "A practice match.", opponentName: "Training Dummy", aiDifficulty: "easy", rewardGold: 30, rewardXp: 15, firstClearBonus: 50, status: "published" as const },
  { chapterId, stageNumber: 2, name: "Lunch Rush", description: "The cafeteria is buzzing.", opponentName: "Cafeteria Kid", aiDifficulty: "easy", rewardGold: 40, rewardXp: 20, firstClearBonus: 75, status: "published" as const },
  { chapterId, stageNumber: 3, name: "Hall Monitor Showdown", description: "Time to dethrone them.", opponentName: "Hall Monitor Max", aiDifficulty: "medium", rewardGold: 60, rewardXp: 30, firstClearBonus: 100, status: "published" as const },
];
