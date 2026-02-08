/**
 * Action Cache Instances
 *
 * Caches expensive external API calls (Solana RPC) with TTL.
 * Uses @convex-dev/action-cache component.
 */

import { ActionCache } from "@convex-dev/action-cache";
import * as generatedApi from "../_generated/api";
import { components } from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

/**
 * Type assertion required: components.actionCache may not be in generated types yet
 * The actionCache component is properly configured in convex.config.ts
 */
// biome-ignore lint/suspicious/noExplicitAny: Convex component type workaround
const actionCacheComponent = (components as any).actionCache;

/**
 * Cache for SPL token balance lookups
 * TTL: 5 minutes — balances change infrequently for most users
 */
export const tokenBalanceCache = new ActionCache(actionCacheComponent, {
  action: internalAny.lib.solana.cachedActions.fetchTokenBalance,
  name: "tokenBalance-v1",
  ttl: 5 * 60 * 1000, // 5 minutes
});

/**
 * Cache for ElizaOS token balance checks
 * TTL: 1 hour — only need to detect holding, not exact balance
 */
export const elizaOSBalanceCache = new ActionCache(actionCacheComponent, {
  action: internalAny.lib.solana.cachedActions.fetchElizaOSBalance,
  name: "elizaOSBalance-v1",
  ttl: 60 * 60 * 1000, // 1 hour
});
