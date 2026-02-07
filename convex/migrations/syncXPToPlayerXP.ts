/**
 * Migration: Sync users.xp and users.level to playerXP
 *
 * Context:
 * The `users.xp` and `users.level` fields are legacy denormalized fields
 * that duplicate data from the `playerXP` table. The playerXP table is the
 * source of truth with better progression tracking and lifetime XP stats.
 *
 * This migration:
 * 1. Creates playerXP records for users who don't have one
 * 2. Syncs users.xp and users.level values if higher (edge case handling)
 * 3. Is idempotent - can be run multiple times safely
 *
 * After this migration:
 * - All code should read from playerXP, not users.xp/users.level
 * - users.xp and users.level fields should be marked as deprecated
 * - Eventually remove users.xp and users.level field definitions
 *
 * Run with: bun convex run migrations/syncXPToPlayerXP
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    console.log("Starting users.xp/users.level → playerXP migration...");

    // Get all users
    const users = await ctx.db.query("users").collect();

    console.log(`Found ${users.length} users to process`);

    let created = 0;
    let synced = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if playerXP record exists
      const existing = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      // Access deprecated fields with type assertion
      // biome-ignore lint/suspicious/noExplicitAny: Accessing removed fields for migration
      const userXP = (user as any).xp ?? 0;
      // biome-ignore lint/suspicious/noExplicitAny: Accessing removed fields for migration
      const userLevel = (user as any).level ?? 1;

      if (!existing) {
        // Create new playerXP record from users.xp and users.level
        await ctx.db.insert("playerXP", {
          userId: user._id,
          currentXP: userXP,
          currentLevel: userLevel,
          lifetimeXP: userXP, // Assume current XP is lifetime XP (best estimate)
          lastUpdatedAt: Date.now(),
        });
        created++;
      } else if (userXP > existing.currentXP || userLevel > existing.currentLevel) {
        // Sync if users.xp or users.level is higher (edge case from legacy code)
        // This handles cases where old code wrote to users.xp/level but not playerXP
        await ctx.db.patch(existing._id, {
          currentXP: Math.max(existing.currentXP, userXP),
          currentLevel: Math.max(existing.currentLevel, userLevel),
          lifetimeXP: Math.max(existing.lifetimeXP, userXP),
          lastUpdatedAt: Date.now(),
        });
        synced++;
      } else {
        // playerXP exists and is up-to-date
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
      message: `Migrated ${created + synced} user XP records`,
    };
  },
});
