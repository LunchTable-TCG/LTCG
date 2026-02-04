import { mutation } from "../functions";

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

    // CURRENCY BUNDLES - Gem to Gold conversion
    const currencyBundles = [
      { id: "small", name: "Small Gold Bundle", gems: 50, gold: 500 },
      { id: "medium", name: "Medium Gold Bundle", gems: 100, gold: 1100 }, // 10% bonus
      { id: "large", name: "Large Gold Bundle", gems: 250, gold: 3000 }, // 20% bonus
      { id: "mega", name: "Mega Gold Bundle", gems: 500, gold: 6500 }, // 30% bonus
    ];

    currencyBundles.forEach((bundle, idx) => {
      products.push({
        productId: `gold-bundle-${bundle.id}`,
        name: bundle.name,
        description: `Convert ${bundle.gems} Gems to ${bundle.gold} Gold`,
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
