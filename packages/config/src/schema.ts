import type { EngineConfig } from "@lunchtable-tcg/engine";

export interface LTCGConfig {
  game: {
    name: string;
    engine: EngineConfig;
  };
  economy: {
    startingGold: number;
    startingGems: number;
    rarityWeights: Record<string, number>;
    wagerWinnerPct: number;
    variantBaseRates: {
      standard: number;
      foil: number;
      altArt: number;
      fullArt: number;
    };
    pityThresholds: {
      epic: number;
      legendary: number;
      fullArt: number;
    };
  };
  marketplace: {
    platformFeePercent: number;
    minBidIncrementPercent: number;
    minListingPrice: number;
    minAuctionDurationHours: number;
    maxAuctionDurationHours: number;
  };
  progression: {
    xp: {
      basePerLevel: number;
      multiplier: number;
      rankedWin: number;
      rankedLoss: number;
      casualWin: number;
      casualLoss: number;
      storyWin: number;
      storyLoss: number;
      dailyLogin: number[];
    };
    levelCurve: "linear" | "exponential";
  };
  competitive: {
    elo: {
      defaultRating: number;
      kFactor: number;
      ratingFloor: number;
    };
    rankThresholds: Record<string, number>;
  };
  social: {
    chat: {
      rateLimitMaxMessages: number;
      rateLimitWindowMs: number;
      presenceTimeoutMs: number;
    };
    spectator: {
      maxPerGame: number;
      defaultAllowSpectators: boolean;
    };
  };
  cards: string;
  theme: {
    brand: string;
    palette: { primary: string; secondary: string };
  };
  blockchain: {
    enabled: boolean;
    chain?: "solana" | "ethereum" | "base";
    network?: string;
    tokenMint?: string;
    treasuryWallet?: string;
  };
}
