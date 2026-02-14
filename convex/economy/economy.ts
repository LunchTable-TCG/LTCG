/**
 * Economy helpers (stub)
 *
 * Full implementation moved to @lunchtable-tcg/economy component.
 * This stub provides exports for gameplay/ files still referencing it.
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Adjust player currency balance.
 * Stub — will be re-wired to economy component client.
 */
export async function adjustPlayerCurrencyHelper(
  _ctx: MutationCtx,
  _userId: Id<"users">,
  _currencyType: string,
  _amount: number,
  _reason: string,
  _metadata?: Record<string, unknown>
) {
  // TODO: Re-wire to economy component client
  console.warn("adjustPlayerCurrencyHelper: stub — wire to economy component");
}
