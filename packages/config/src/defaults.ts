import { DEFAULT_CONFIG } from "@lunchtable-tcg/engine";
import type { LTCGConfig } from "./schema.js";

export const DEFAULT_LTCG_CONFIG: LTCGConfig = {
  game: {
    name: "LunchTable TCG",
    engine: DEFAULT_CONFIG,
  },
  economy: {
    startingGold: 500,
    startingGems: 100,
    rarityWeights: { common: 550, uncommon: 280, rare: 120, epic: 40, legendary: 10 },
    wagerWinnerPct: 0.9,
    variantBaseRates: { standard: 8800, foil: 1000, altArt: 200, fullArt: 50 },
    pityThresholds: { epic: 150, legendary: 500, fullArt: 1000 },
  },
  marketplace: {
    platformFeePercent: 0.05,
    minBidIncrementPercent: 0.05,
    minListingPrice: 10,
    minAuctionDurationHours: 1,
    maxAuctionDurationHours: 168,
  },
  progression: {
    xp: {
      basePerLevel: 100,
      multiplier: 1.2,
      rankedWin: 30,
      rankedLoss: 10,
      casualWin: 20,
      casualLoss: 5,
      storyWin: 50,
      storyLoss: 0,
      dailyLogin: [25, 30, 30, 35, 35, 40, 50],
    },
    levelCurve: "exponential",
  },
  competitive: {
    elo: { defaultRating: 1000, kFactor: 32, ratingFloor: 0 },
    rankThresholds: {
      Bronze: 0, Silver: 1200, Gold: 1400,
      Platinum: 1600, Diamond: 1800, Master: 2000, Legend: 2200,
    },
  },
  social: {
    chat: { rateLimitMaxMessages: 10, rateLimitWindowMs: 60000, presenceTimeoutMs: 300000 },
    spectator: { maxPerGame: 100, defaultAllowSpectators: true },
  },
  cards: "./cards/",
  theme: {
    brand: "LunchTable",
    palette: { primary: "#6366f1", secondary: "#1e1b4b" },
  },
  blockchain: { enabled: false },
};
