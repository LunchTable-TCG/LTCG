/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as scheduledContent from "../scheduledContent.js";
import type * as news from "../news.js";
import type * as feedback from "../feedback.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  ApiFromModules<{
    scheduledContent: typeof scheduledContent;
    news: typeof news;
    feedback: typeof feedback;
  }>,
  FunctionReference<any, "public">
> = null as any;
