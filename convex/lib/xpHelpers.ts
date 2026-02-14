/**
 * XP Helpers (stub)
 *
 * Full implementation moved to @lunchtable-tcg/competitive component.
 * This stub provides exports for gameplay/ files still referencing it.
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Add XP to a user.
 * Stub — will be re-wired to competitive component client.
 */
export async function addXP(
  _ctx: MutationCtx,
  _userId: Id<"users">,
  _amount: number,
  _source: string,
  _metadata?: Record<string, unknown>
) {
  // TODO: Re-wire to competitive component client
  console.warn("addXP: stub — wire to competitive component");
}
