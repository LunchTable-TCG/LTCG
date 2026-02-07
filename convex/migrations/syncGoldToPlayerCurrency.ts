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
 * Run with: npx convex run migrations/syncGoldToPlayerCurrency
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    console.log("Starting users.gold → playerCurrency migration...");

    // Get all users
    const users = await ctx.db.query("users").collect();

    console.log(`Found ${users.length} users to process`);

    let created = 0;
    let synced = 0;
    let skipped = 0;

    for (const user of users) {
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
        created++;
      } else if (userGold !== undefined && userGold > existing.gold) {
        // Sync if users.gold is higher (edge case from legacy code)
        // This handles cases where old code wrote to users.gold but not playerCurrency
        await ctx.db.patch(existing._id, {
          gold: userGold,
          lifetimeGoldEarned: Math.max(existing.lifetimeGoldEarned, userGold),
          lastUpdatedAt: Date.now(),
        });
        synced++;
      } else {
        // playerCurrency exists and is up-to-date
        skipped++;
      }
    }

    console.log(
      `Migration complete: ${created} created, ${synced} synced, ${skipped} skipped (already up-to-date)`
    );

    return {
      success: true,
      totalUsers: users.length,
      created,
      synced,
      skipped,
      message: `Migrated ${created + synced} user currency records`,
    };
  },
});
