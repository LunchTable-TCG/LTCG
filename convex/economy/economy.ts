/**
 * Economy helpers — wired to @lunchtable-tcg/economy component.
 *
 * Provides a convenience wrapper so callers don't need to import
 * the component client directly.
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { economy } from "../lib/componentClients";

/**
 * Adjust player currency balance.
 * Delegates to economy component's currency.adjustPlayerCurrency.
 */
export async function adjustPlayerCurrencyHelper(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    goldDelta: number;
    transactionType: string;
    description: string;
    metadata?: Record<string, unknown>;
  }
) {
  await economy.currency.adjustPlayerCurrency(ctx, {
    userId: args.userId as string,
    currencyType: "gold",
    amount: args.goldDelta,
    transactionType: args.transactionType,
    description: args.description,
    metadata: args.metadata,
  });
}
