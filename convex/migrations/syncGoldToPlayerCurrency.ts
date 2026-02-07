/**
 * Migration: Sync users.gold to playerCurrency
 *
 * Context:
 * The `users.gold` field is a legacy denormalized field that duplicates
 * data from the `playerCurrency` table. The playerCurrency table is the
 * source of truth with better transaction tracking and lifetime stats.
 *
 * This migration:
 * 1. Creates playerCurrency records for users who don't have one
 * 2. Syncs users.gold value to playerCurrency.gold if higher
 * 3. Is idempotent - can be run multiple times safely
 *
 * After this migration:
 * - All code should read from playerCurrency, not users.gold
 * - users.gold field should be marked as deprecated
 * - Eventually remove users.gold field definition
 *
 * Run with: npx convex run migrations/index:run '{fn: "migrations/syncGoldToPlayerCurrency"}'
 */

import { migrations } from "./index";

export default migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
    // Check if playerCurrency record exists
    const existing = await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Access deprecated field with type assertion
    // biome-ignore lint/suspicious/noExplicitAny: Accessing removed field for migration
    const userGold = (user as any).gold;

    if (!existing) {
      // Create new playerCurrency record from users.gold
      const gold = userGold ?? 500; // Default starting gold
      await ctx.db.insert("playerCurrency", {
        userId: user._id,
        gold,
        gems: 0,
        lifetimeGoldEarned: gold,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 0,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });
      console.log(`[Migration] Created playerCurrency for user ${user._id}`);
    } else if (userGold !== undefined && userGold > existing.gold) {
      // Sync if users.gold is higher (edge case from legacy code)
      await ctx.db.patch(existing._id, {
        gold: userGold,
        lifetimeGoldEarned: Math.max(existing.lifetimeGoldEarned, userGold),
        lastUpdatedAt: Date.now(),
      });
      console.log(`[Migration] Synced gold for user ${user._id}: ${existing.gold} -> ${userGold}`);
    }
    // Don't return patch for the users table itself
  },
});
