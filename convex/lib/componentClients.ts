/**
 * Centralized Component Client Instances
 *
 * Single source of truth for all LTCG component client instantiation.
 * Import from here instead of creating new instances everywhere.
 *
 * NOTE: The `components` type in `_generated/api.d.ts` may be stale
 * (missing LTCG component keys). The keys exist at runtime after
 * `npx convex dev` regenerates types. We use `any` cast here to
 * unblock development. Once types are regenerated, remove the casts.
 *
 * Usage:
 *   import { economy, admin } from "../lib/componentClients";
 *   await economy.currency.adjustPlayerCurrency(ctx, { ... });
 */

import { components } from "../_generated/api";
import { LTCGAdmin } from "@lunchtable-tcg/admin";
import { LTCGEconomy } from "@lunchtable-tcg/economy";

// biome-ignore lint/suspicious/noExplicitAny: generated types are stale — will resolve after `npx convex dev`
const c = components as any;

/**
 * Economy component client — currency, shop, rewards, wagers.
 */
export const economy = new LTCGEconomy(c.ltcgEconomy);

/**
 * Admin component client — roles, audit, moderation.
 */
export const admin = new LTCGAdmin(c.ltcgAdmin);
