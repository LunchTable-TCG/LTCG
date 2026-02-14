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
import type * as roles from "../roles.js";
import type * as audit from "../audit.js";
import type * as moderation from "../moderation.js";
import type * as config from "../config.js";
import type * as features from "../features.js";
import type * as alerts from "../alerts.js";
import type * as notifications from "../notifications.js";
import type * as analytics from "../analytics.js";

const fullApi: ApiFromModules<{
  roles: typeof roles;
  audit: typeof audit;
  moderation: typeof moderation;
  config: typeof config;
  features: typeof features;
  alerts: typeof alerts;
  notifications: typeof notifications;
  analytics: typeof analytics;
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
