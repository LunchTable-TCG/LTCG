/**
 * XP Helpers — inline implementation
 *
 * No component API exists for XP yet. This patches the `users` table
 * directly (the `xp` field). Can be extracted to a component later.
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Add XP to a user.
 *
 * Updates the `xp` field on the `users` table. Caller (`stats.ts`)
 * passes `{ source }` as the 4th arg — we accept that shape.
 */
export async function addXP(
  ctx: MutationCtx,
  userId: Id<"users">,
  amount: number,
  _metadata?: Record<string, unknown>
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    console.warn(`addXP: user ${userId} not found, skipping`);
    return;
  }

  const currentXP = user.xp ?? 0;
  await ctx.db.patch(userId, {
    xp: currentXP + amount,
  });
}
