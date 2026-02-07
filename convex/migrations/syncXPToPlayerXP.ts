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
 * Run with: npx convex run migrations/index:run '{fn: "migrations/syncXPToPlayerXP"}'
 */

import { migrations } from "./index";

export default migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
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
      console.log(`[Migration] Created playerXP for user ${user._id}`);
    } else if (userXP > existing.currentXP || userLevel > existing.currentLevel) {
      // Sync if users.xp or users.level is higher (edge case from legacy code)
      await ctx.db.patch(existing._id, {
        currentXP: Math.max(existing.currentXP, userXP),
        currentLevel: Math.max(existing.currentLevel, userLevel),
        lifetimeXP: Math.max(existing.lifetimeXP, userXP),
        lastUpdatedAt: Date.now(),
      });
      console.log(`[Migration] Synced XP for user ${user._id}`);
    }
    // Don't return patch for the users table itself
  },
});
