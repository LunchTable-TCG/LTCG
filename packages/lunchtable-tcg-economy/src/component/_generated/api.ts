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
import type * as currency from "../currency.js";
import type * as shop from "../shop.js";
import type * as rewards from "../rewards.js";
import type * as sales from "../sales.js";
import type * as promoCodes from "../promoCodes.js";
import type * as seeds from "../seeds.js";

const fullApi: ApiFromModules<{
  currency: typeof currency;
  shop: typeof shop;
  rewards: typeof rewards;
  sales: typeof sales;
  promoCodes: typeof promoCodes;
  seeds: typeof seeds;
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
