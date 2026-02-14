import { describe, it, expect } from "vitest";
import { defineConfig, DEFAULT_LTCG_CONFIG } from "../index.js";

describe("defineConfig", () => {
  it("returns defaults with no overrides", () => {
    const config = defineConfig({});
    expect(config.game.name).toBe("LunchTable TCG");
    expect(config.economy.startingGold).toBe(500);
  });

  it("overrides top-level fields", () => {
    const config = defineConfig({ cards: "./custom-cards/" });
    expect(config.cards).toBe("./custom-cards/");
    expect(config.game.name).toBe("LunchTable TCG"); // unchanged
  });

  it("deep merges nested objects", () => {
    const config = defineConfig({
      game: { name: "My TCG", engine: DEFAULT_LTCG_CONFIG.game.engine },
    });
    expect(config.game.name).toBe("My TCG");
    expect(config.game.engine.startingLP).toBe(8000); // preserved
  });

  it("overrides economy values", () => {
    const config = defineConfig({
      economy: { ...DEFAULT_LTCG_CONFIG.economy, startingGold: 1000 },
    });
    expect(config.economy.startingGold).toBe(1000);
    expect(config.economy.startingGems).toBe(100); // preserved
  });

  it("merges progression XP settings", () => {
    const config = defineConfig({
      progression: {
        ...DEFAULT_LTCG_CONFIG.progression,
        xp: {
          ...DEFAULT_LTCG_CONFIG.progression.xp,
          rankedWin: 50,
        },
      },
    });
    expect(config.progression.xp.rankedWin).toBe(50);
    expect(config.progression.xp.casualWin).toBe(20); // preserved
  });

  it("enables blockchain configuration", () => {
    const config = defineConfig({
      blockchain: {
        enabled: true,
        chain: "solana",
        network: "mainnet-beta",
        tokenMint: "test123",
        treasuryWallet: "wallet123",
      },
    });
    expect(config.blockchain.enabled).toBe(true);
    expect(config.blockchain.chain).toBe("solana");
    expect(config.blockchain.tokenMint).toBe("test123");
  });

  it("preserves theme settings", () => {
    const config = defineConfig({
      theme: {
        brand: "CustomTCG",
        palette: { primary: "#ff0000", secondary: "#00ff00" },
      },
    });
    expect(config.theme.brand).toBe("CustomTCG");
    expect(config.theme.palette.primary).toBe("#ff0000");
  });

  it("covers all config sections", () => {
    const config = defineConfig({});
    expect(config.competitive.elo.defaultRating).toBe(1000);
    expect(config.marketplace.platformFeePercent).toBe(0.05);
    expect(config.social.spectator.maxPerGame).toBe(100);
    expect(config.economy.variantBaseRates.foil).toBe(1000);
    expect(config.economy.pityThresholds.legendary).toBe(500);
    expect(config.progression.xp.basePerLevel).toBe(100);
  });

  it("deep merges competitive overrides", () => {
    const config = defineConfig({
      competitive: {
        elo: { defaultRating: 1500, kFactor: 32, ratingFloor: 0 },
        rankThresholds: { Bronze: 0, Silver: 1500, Gold: 1700, Platinum: 1900, Diamond: 2100, Master: 2300, Legend: 2500 },
      },
    });
    expect(config.competitive.elo.defaultRating).toBe(1500);
    expect(config.competitive.rankThresholds.Silver).toBe(1500);
    // Other sections unchanged
    expect(config.economy.startingGold).toBe(500);
  });
});
