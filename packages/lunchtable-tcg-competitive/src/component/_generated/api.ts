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
import type * as rankings from "../rankings.js";
import type * as snapshots from "../snapshots.js";
import type * as matches from "../matches.js";
import type * as tournaments from "../tournaments.js";
import type * as participants from "../participants.js";
import type * as brackets from "../brackets.js";
import type * as history from "../history.js";

const fullApi: ApiFromModules<{
  rankings: typeof rankings;
  snapshots: typeof snapshots;
  matches: typeof matches;
  tournaments: typeof tournaments;
  participants: typeof participants;
  brackets: typeof brackets;
  history: typeof history;
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
