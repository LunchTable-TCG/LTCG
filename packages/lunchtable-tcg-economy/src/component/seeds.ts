import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Seed shop products, skipping duplicates by productId.
 */
export const seedShopProducts = mutation({
  args: {
    products: v.array(
      v.object({
        productId: v.string(),
        name: v.string(),
        description: v.string(),
        productType: v.union(v.literal("pack"), v.literal("box"), v.literal("currency")),
        goldPrice: v.optional(v.number()),
        gemPrice: v.optional(v.number()),
        packConfig: v.optional(
          v.object({
            cardCount: v.number(),
            guaranteedRarity: v.optional(v.string()),
            guaranteedCount: v.optional(v.number()),
            allRareOrBetter: v.optional(v.boolean()),
            archetype: v.optional(v.string()),
            variantMultipliers: v.optional(
              v.object({
                foil: v.number(),
                altArt: v.number(),
                fullArt: v.number(),
              })
            ),
          })
        ),
        boxConfig: v.optional(
          v.object({
            packProductId: v.string(),
            packCount: v.number(),
            bonusCards: v.optional(v.number()),
          })
        ),
        currencyConfig: v.optional(
          v.object({
            currencyType: v.union(v.literal("gold"), v.literal("gems")),
            amount: v.number(),
          })
        ),
        isActive: v.boolean(),
        sortOrder: v.number(),
      })
    ),
  },
  returns: v.object({
    inserted: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const product of args.products) {
      const existing = await ctx.db
        .query("shopProducts")
        .withIndex("by_product_id", (q) => q.eq("productId", product.productId))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("shopProducts", {
        ...product,
        createdAt: Date.now(),
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});
