/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";
import type * as balances from "../balances.js";
import type * as config from "../config.js";
import type * as holders from "../holders.js";
import type * as metrics from "../metrics.js";
import type * as rollup from "../rollup.js";
import type * as trades from "../trades.js";
import type * as transactions from "../transactions.js";

const fullApi: ApiFromModules<{
  balances: typeof balances;
  config: typeof config;
  holders: typeof holders;
  metrics: typeof metrics;
  rollup: typeof rollup;
  trades: typeof trades;
  transactions: typeof transactions;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
