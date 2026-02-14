/**
 * XP Helpers — wired to @lunchtable-tcg/progression component.
 *
 * Provides a convenience wrapper so callers don't need to import
 * the component client directly.
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { progression } from "./componentClients";

/**
 * Add XP to a user.
 *
 * Delegates to the progression component's XP system which tracks
 * lifetime XP and computes levels automatically. Caller (`stats.ts`)
 * passes `{ source }` as the 4th arg — accepted for API compatibility.
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

  await progression.xp.addXP(ctx, {
    userId: userId as string,
    amount,
  });
}
