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
import type * as gemPackages from "../gemPackages.js";
import type * as gemPurchases from "../gemPurchases.js";
import type * as stripe from "../stripe.js";
import type * as x402 from "../x402.js";

const fullApi: ApiFromModules<{
  gemPackages: typeof gemPackages;
  gemPurchases: typeof gemPurchases;
  stripe: typeof stripe;
  x402: typeof x402;
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
