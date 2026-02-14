import { DEFAULT_CONFIG } from "@lunchtable-tcg/engine";
import type { LTCGConfig } from "./schema.js";

export const DEFAULT_LTCG_CONFIG: LTCGConfig = {
  game: {
    name: "LunchTable TCG",
    engine: DEFAULT_CONFIG,
  },
  economy: {
    startingCurrency: 500, // ECONOMY.WELCOME_BONUS_GOLD
    packPrice: 100,
    rarityWeights: {
      common: 550,
      uncommon: 280,
      rare: 120,
      epic: 40,
      legendary: 10,
    },
    wagerWinnerPct: 0.9,
  },
  progression: {
    xp: {
      rankedWin: 30,   // XP_SYSTEM.RANKED_WIN_XP
      rankedLoss: 10,  // XP_SYSTEM.RANKED_LOSS_XP
      casualWin: 20,   // XP_SYSTEM.CASUAL_WIN_XP
      casualLoss: 5,   // XP_SYSTEM.CASUAL_LOSS_XP
      storyWin: 50,    // XP_SYSTEM.STORY_WIN_XP
      storyLoss: 0,    // XP_SYSTEM.STORY_LOSS_XP
    },
    levelCurve: "exponential",
  },
  cards: "./cards/",
  theme: {
    brand: "LunchTable",
    palette: { primary: "#6366f1", secondary: "#1e1b4b" },
  },
  blockchain: { enabled: false },
};
