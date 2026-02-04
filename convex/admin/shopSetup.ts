import { mutation } from "../functions";
import { GEM_PACKAGES, GOLD_BUNDLES, SHOP_PACKS } from "../lib/constants";

/**
 * Clear all shop products
 * Run with: bunx convex run admin/shopSetup:clearShop
 */
export const clearShop = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("shopProducts").collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    return {
      success: true,
      deleted: products.length,
      message: `Deleted ${products.length} shop products`,
    };
  },
});

/**
 * One-time setup mutation to populate the shop with initial products.
 * Run with: bunx convex run admin/shopSetup:populateShop
 */
export const populateShop = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if shop already has products
    const existing = await ctx.db.query("shopProducts").first();
    if (existing) {
      return { success: false, message: "Shop already populated" };
    }

    const now = Date.now();
    const products = [];

    // PACKS - Individual card packs
    // Starter Pack - Cheap, guaranteed rare
    products.push({
      productId: "starter-pack",
      name: "Starter Pack",
      description: "5 cards with a guaranteed Rare or better card",
      productType: "pack" as const,
      goldPrice: 100,
      gemPrice: undefined,
      packConfig: {
        cardCount: 5,
        guaranteedRarity: "rare" as const,
      },
      boxConfig: undefined,
      currencyConfig: undefined,
      isActive: true,
      sortOrder: 1,
      createdAt: now,
    });

    // Booster Pack - Standard pack
    products.push({
      productId: "booster-pack",
      name: "Booster Pack",
      description: "5 random cards with increased chances for rare cards",
      productType: "pack" as const,
      goldPrice: 250,
      gemPrice: 25,
      packConfig: {
        cardCount: 5,
      },
      boxConfig: undefined,
      currencyConfig: undefined,
      isActive: true,
      sortOrder: 2,
      createdAt: now,
    });

    // Premium Pack - Guaranteed epic
    products.push({
      productId: "premium-pack",
      name: "Premium Pack",
      description: "5 cards with a guaranteed Epic or better card",
      productType: "pack" as const,
      goldPrice: undefined,
      gemPrice: 50,
      packConfig: {
        cardCount: 5,
        guaranteedRarity: "epic" as const,
      },
      boxConfig: undefined,
      currencyConfig: undefined,
      isActive: true,
      sortOrder: 3,
      createdAt: now,
    });

    // Archetype Packs - Fire, Water, Earth, Wind
    const archetypes = [
      { id: "fire", name: "Fire" },
      { id: "water", name: "Water" },
      { id: "earth", name: "Earth" },
      { id: "wind", name: "Wind" },
    ] as const;

    archetypes.forEach((archetype, idx) => {
      products.push({
        productId: `${archetype.id}-pack`,
        name: `${archetype.name} Pack`,
        description: `5 ${archetype.name} archetype cards`,
        productType: "pack" as const,
        goldPrice: 300,
        gemPrice: 30,
        packConfig: {
          cardCount: 5,
          archetype: archetype.id,
        },
        boxConfig: undefined,
        currencyConfig: undefined,
        isActive: true,
        sortOrder: 10 + idx,
        createdAt: now,
      });
    });

    // BOXES - Bulk purchases
    // Starter Box - 10 starter packs
    products.push({
      productId: "starter-box",
      name: "Starter Box",
      description: "10 Starter Packs (50 cards total) + 5 bonus cards",
      productType: "box" as const,
      goldPrice: 900, // 10% discount
      gemPrice: undefined,
      packConfig: undefined,
      boxConfig: {
        packProductId: "starter-pack",
        packCount: 10,
        bonusCards: 5,
      },
      currencyConfig: undefined,
      isActive: true,
      sortOrder: 20,
      createdAt: now,
    });

    // Booster Box - 10 booster packs
    products.push({
      productId: "booster-box",
      name: "Booster Box",
      description: "10 Booster Packs (50 cards total) + 10 bonus cards",
      productType: "box" as const,
      goldPrice: 2250, // 10% discount
      gemPrice: 225,
      packConfig: undefined,
      boxConfig: {
        packProductId: "booster-pack",
        packCount: 10,
        bonusCards: 10,
      },
      currencyConfig: undefined,
      isActive: true,
      sortOrder: 21,
      createdAt: now,
    });

    // Premium Box - 10 premium packs
    products.push({
      productId: "premium-box",
      name: "Premium Box",
      description: "10 Premium Packs (50 cards total) + 15 bonus cards",
      productType: "box" as const,
      goldPrice: undefined,
      gemPrice: 450, // 10% discount
      packConfig: undefined,
      boxConfig: {
        packProductId: "premium-pack",
        packCount: 10,
        bonusCards: 15,
      },
      currencyConfig: undefined,
      isActive: true,
      sortOrder: 22,
      createdAt: now,
    });

    // CURRENCY BUNDLES - Gem to Gold conversion (from constants)
    GOLD_BUNDLES.forEach((bundle, idx) => {
      products.push({
        productId: bundle.id,
        name: bundle.name,
        description: `Convert ${bundle.gems} Gems to ${bundle.gold.toLocaleString()} Gold`,
        productType: "currency" as const,
        goldPrice: undefined,
        gemPrice: bundle.gems,
        packConfig: undefined,
        boxConfig: undefined,
        currencyConfig: {
          currencyType: "gold" as const,
          amount: bundle.gold,
        },
        isActive: true,
        sortOrder: 30 + idx,
        createdAt: now,
      });
    });

    // PREMIUM PACKS - Gems only, higher variant rates (from constants)
    // Legendary Pack
    products.push({
      productId: SHOP_PACKS.legendary.id,
      name: SHOP_PACKS.legendary.name,
      description: "5 cards with a guaranteed Legendary! 3x Foil, 2x Alt Art rates.",
      productType: "pack" as const,
      goldPrice: undefined,
      gemPrice: SHOP_PACKS.legendary.gemPrice,
      packConfig: {
        cardCount: SHOP_PACKS.legendary.cards,
        guaranteedRarity: SHOP_PACKS.legendary.guaranteedRarity,
        variantMultipliers: { foil: 3.0, altArt: 2.0, fullArt: 1.0 },
      },
      boxConfig: undefined,
      currencyConfig: undefined,
      isActive: true,
      sortOrder: 4,
      createdAt: now,
    });

    // Collector Pack
    products.push({
      productId: SHOP_PACKS.collector.id,
      name: SHOP_PACKS.collector.name,
      description: "3 cards, all Rare or better! 5x all variant rates.",
      productType: "pack" as const,
      goldPrice: undefined,
      gemPrice: SHOP_PACKS.collector.gemPrice,
      packConfig: {
        cardCount: SHOP_PACKS.collector.cards,
        guaranteedRarity: "rare" as const,
        allRareOrBetter: true,
        variantMultipliers: { foil: 5.0, altArt: 5.0, fullArt: 5.0 },
      },
      boxConfig: undefined,
      currencyConfig: undefined,
      isActive: true,
      sortOrder: 5,
      createdAt: now,
    });

    // Ultimate Pack
    products.push({
      productId: SHOP_PACKS.ultimate.id,
      name: SHOP_PACKS.ultimate.name,
      description:
        "10 cards with 2 guaranteed Epics and 1 guaranteed Legendary! 10x Foil, 5x Alt Art, 2x Full Art rates.",
      productType: "pack" as const,
      goldPrice: undefined,
      gemPrice: SHOP_PACKS.ultimate.gemPrice,
      packConfig: {
        cardCount: SHOP_PACKS.ultimate.cards,
        guaranteedRarity: "legendary" as const,
        guaranteedCount: 3, // 2 epic + 1 legendary
        variantMultipliers: { foil: 10.0, altArt: 5.0, fullArt: 2.0 },
      },
      boxConfig: undefined,
      currencyConfig: undefined,
      isActive: true,
      sortOrder: 6,
      createdAt: now,
    });

    // Insert all products
    for (const product of products) {
      await ctx.db.insert("shopProducts", product);
    }

    return {
      success: true,
      message: `Created ${products.length} shop products`,
      count: products.length,
    };
  },
});

/**
 * Seed gem packages to database
 * Run with: bunx convex run admin/shopSetup:seedGemPackages
 */
export const seedGemPackages = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("gemPackages").first();
    if (existing) {
      return { success: false, message: "Gem packages already seeded" };
    }

    let count = 0;
    const now = Date.now();
    for (const pkg of GEM_PACKAGES) {
      await ctx.db.insert("gemPackages", {
        packageId: pkg.id,
        name: pkg.name,
        description: `${pkg.gems.toLocaleString()} gems${pkg.bonus > 0 ? ` (+${pkg.bonus}% bonus)` : ""}`,
        gems: pkg.gems,
        usdPrice: pkg.usdCents,
        bonusPercent: pkg.bonus,
        isActive: true,
        sortOrder: count,
        createdAt: now,
      });
      count++;
    }

    return { success: true, message: `Seeded ${count} gem packages` };
  },
});

/**
 * Clear gem packages
 * Run with: bunx convex run admin/shopSetup:clearGemPackages
 */
export const clearGemPackages = mutation({
  args: {},
  handler: async (ctx) => {
    const packages = await ctx.db.query("gemPackages").collect();

    for (const pkg of packages) {
      await ctx.db.delete(pkg._id);
    }

    return {
      success: true,
      deleted: packages.length,
      message: `Deleted ${packages.length} gem packages`,
    };
  },
});

/**
 * Full shop setup - clears and repopulates everything
 * Run with: bunx convex run admin/shopSetup:fullSetup
 */
export const fullSetup = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing
    const products = await ctx.db.query("shopProducts").collect();
    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    const packages = await ctx.db.query("gemPackages").collect();
    for (const pkg of packages) {
      await ctx.db.delete(pkg._id);
    }

    // Re-run populate and seed
    // Note: This is a simplified version - in production you'd call the actual functions
    return {
      success: true,
      message: `Cleared ${products.length} products and ${packages.length} gem packages. Run populateShop and seedGemPackages to repopulate.`,
    };
  },
});
