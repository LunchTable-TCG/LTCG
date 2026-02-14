import type { EngineConfig } from "@lunchtable-tcg/engine";

export interface LTCGConfig {
  game: {
    name: string;
    engine: EngineConfig;
  };
  economy: {
    startingCurrency: number;
    packPrice: number;
    rarityWeights: Record<string, number>;
    wagerWinnerPct: number;
  };
  progression: {
    xp: {
      rankedWin: number;
      rankedLoss: number;
      casualWin: number;
      casualLoss: number;
      storyWin: number;
      storyLoss: number;
    };
    levelCurve: "linear" | "exponential";
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
