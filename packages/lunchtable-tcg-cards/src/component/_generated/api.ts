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
import type * as cards from "../cards.js";
import type * as decks from "../decks.js";
import type * as seeds from "../seeds.js";

const fullApi: ApiFromModules<{
  cards: typeof cards;
  decks: typeof decks;
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
