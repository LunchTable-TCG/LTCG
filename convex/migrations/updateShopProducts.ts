/**
 * Migration: Update Shop Products Archetypes
 *
 * Maps old archetypes in shop product packConfig to new ones:
 * - fire → infernal_dragons
 * - water → abyssal_horrors
 * - earth → nature_spirits
 * - wind → storm_elementals
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { migrationsPool } from "../infrastructure/workpools";

const ARCHETYPE_MAP: Record<string, string> = {
  fire: "infernal_dragons",
  water: "abyssal_horrors",
  earth: "nature_spirits",
  wind: "storm_elementals",
};

export default internalMutation({
  handler: async (ctx) => {
    console.log("Starting migration: updateShopProducts");

    // Get all shop products
    const allProducts = await ctx.db.query("shopProducts").collect();
    console.log(`Found ${allProducts.length} shop products to check`);

    let enqueuedCount = 0;
    let skippedCount = 0;

    // Enqueue update jobs for products that need archetype migration
    for (const product of allProducts) {
      if (product.packConfig?.archetype) {
        const newArchetype = ARCHETYPE_MAP[product.packConfig.archetype];

        if (newArchetype && newArchetype !== product.packConfig.archetype) {
          await migrationsPool.enqueueMutation(
            ctx,
            internal.migrations.updateShopProducts.updateProductArchetype,
            {
              productId: product._id,
              productName: product.name,
              oldArchetype: product.packConfig.archetype,
              newArchetype,
              packConfig: product.packConfig,
            }
          );
          enqueuedCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log(
      `Migration jobs enqueued: ${enqueuedCount} products to update, ${skippedCount} products skipped`
    );

    return {
      success: true,
      totalProducts: allProducts.length,
      enqueued: enqueuedCount,
      skipped: skippedCount,
      mapping: ARCHETYPE_MAP,
      message: `Enqueued ${enqueuedCount} product archetype update jobs. Check workpool status for progress.`,
    };
  },
});

/**
 * Worker mutation: Update a single shop product's archetype in packConfig
 */
export const updateProductArchetype = internalMutation({
  args: {
    productId: v.id("shopProducts"),
    productName: v.string(),
    oldArchetype: v.string(),
    newArchetype: v.string(),
    packConfig: v.any(),
  },
  handler: async (ctx, { productId, productName, oldArchetype, newArchetype, packConfig }) => {
    try {
      const product = await ctx.db.get(productId);

      if (!product) {
        console.error(`[Migration Worker] Product not found: ${productId}`);
        return { success: false, error: "Product not found" };
      }

      // Double-check idempotency
      if (product.packConfig?.archetype === newArchetype) {
        console.log(
          `[Migration Worker] Product ${productName} already has new archetype, skipping`
        );
        return { success: true, skipped: true };
      }

      await ctx.db.patch(productId, {
        packConfig: {
          ...packConfig,
          // biome-ignore lint/suspicious/noExplicitAny: Dynamic archetype type
          archetype: newArchetype as any,
        },
      });

      console.log(
        `[Migration Worker] Updated product ${productName}: ${oldArchetype} → ${newArchetype}`
      );
      return { success: true, updated: true };
    } catch (error) {
      console.error(`[Migration Worker] Failed to update product ${productName}:`, error);
      return { success: false, error: String(error) };
    }
  },
});
