/**
 * @module @ltcg/core/types/convex
 *
 * Type-safe wrappers for Convex function references.
 *
 * This module provides TypeScript types that wrap Convex's FunctionReference
 * to enable full type safety when calling queries, mutations, and actions,
 * eliminating the need for `apiAny` and `as any` type escapes.
 *
 * @example
 * ```typescript
 * import type { TypedQuery, TypedMutation } from "@ltcg/core/types";
 * import { api } from "@convex/_generated/api";
 *
 * // Define type-safe query reference
 * const getUser: TypedQuery<{ id: string }, User | null> = api.users.get;
 *
 * // Use with Convex React hooks
 * const user = useQuery(getUser, { id: "123" });
 * // user is properly typed as User | null
 * ```
 *
 * @see {@link https://docs.convex.dev/client/react Documentation}
 */

import type { DefaultFunctionArgs, FunctionReference } from "convex/server";

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Expand utility type from convex-helpers.
 *
 * Forces TypeScript to expand complex intersection types (A & B) into flattened
 * objects. This helps avoid "Type instantiation is excessively deep" errors
 * when working with deeply nested Convex types.
 *
 * @template T - Object type to expand
 *
 * @example
 * ```typescript
 * import type { Expand } from "@ltcg/core";
 *
 * // Before: Type shows as ComplexTypeA & ComplexTypeB
 * // After: Type shows as { prop1: string; prop2: number; ... }
 * type Flattened = Expand<ComplexTypeA & ComplexTypeB>;
 * ```
 *
 * @see https://github.com/get-convex/convex-helpers
 */
export type Expand<T extends Record<string, unknown>> = T extends Record<string, unknown>
  ? { [K in keyof T]: T[K] }
  : never;

// =============================================================================
// Public Function References
// =============================================================================

/**
 * Type-safe query reference for public Convex queries.
 *
 * Wraps Convex's FunctionReference to provide full type safety for query
 * function signatures. Queries are read-only operations that can be called
 * from the client or other Convex functions.
 *
 * @template Args - Query argument type, must extend DefaultFunctionArgs
 * @template Return - Query return type
 *
 * @example Basic usage
 * ```typescript
 * import type { TypedQuery } from "@ltcg/core/types";
 *
 * // Define query type
 * const currentUser: TypedQuery<{}, User | null> = api.core.users.currentUser;
 *
 * // Use with React hooks
 * const user = useQuery(currentUser, {});
 * // user has type: User | null
 * ```
 *
 * @example With parameters
 * ```typescript
 * interface GetUserArgs {
 *   userId: Id<"users">;
 * }
 *
 * const getUser: TypedQuery<GetUserArgs, User> = api.users.getById;
 * const user = useQuery(getUser, { userId: "..." });
 * // user has type: User
 * ```
 *
 * @see {@link TypedMutation} for mutations
 * @see {@link TypedAction} for actions
 */
export type TypedQuery<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = void,
> = FunctionReference<"query", "public", Args, Return>;

/**
 * Type-safe mutation reference for public Convex mutations.
 *
 * Wraps Convex's FunctionReference to provide full type safety for mutation
 * function signatures. Mutations are write operations that can modify the database.
 *
 * @template Args - Mutation argument type, must extend DefaultFunctionArgs
 * @template Return - Mutation return type
 *
 * @example Basic usage
 * ```typescript
 * import type { TypedMutation } from "@ltcg/core/types";
 *
 * interface CreateUserArgs {
 *   name: string;
 *   email: string;
 * }
 *
 * const createUser: TypedMutation<CreateUserArgs, Id<"users">> = api.users.create;
 *
 * // Use with React hooks
 * const create = useMutation(createUser);
 * const userId = await create({ name: "Alice", email: "alice@example.com" });
 * // userId has type: Id<"users">
 * ```
 *
 * @example With complex return type
 * ```typescript
 * interface UpdateProfileReturn {
 *   success: boolean;
 *   user: User;
 * }
 *
 * const updateProfile: TypedMutation<{ bio: string }, UpdateProfileReturn> =
 *   api.users.updateProfile;
 * ```
 *
 * @see {@link TypedQuery} for queries
 * @see {@link TypedAction} for actions
 */
export type TypedMutation<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = void,
> = FunctionReference<"mutation", "public", Args, Return>;

/**
 * Type-safe action reference for public Convex actions.
 *
 * Wraps Convex's FunctionReference to provide full type safety for action
 * function signatures. Actions can perform side effects like HTTP requests,
 * and can call queries and mutations.
 *
 * @template Args - Action argument type, must extend DefaultFunctionArgs
 * @template Return - Action return type
 *
 * @example Basic usage
 * ```typescript
 * import type { TypedAction } from "@ltcg/core/types";
 *
 * interface SendEmailArgs {
 *   to: string;
 *   subject: string;
 *   body: string;
 * }
 *
 * const sendEmail: TypedAction<SendEmailArgs, { messageId: string }> =
 *   api.email.send;
 *
 * // Use with React hooks
 * const send = useAction(sendEmail);
 * const result = await send({
 *   to: "user@example.com",
 *   subject: "Welcome",
 *   body: "Hello!"
 * });
 * // result has type: { messageId: string }
 * ```
 *
 * @example With external API
 * ```typescript
 * const fetchWeather: TypedAction<{ city: string }, WeatherData> =
 *   api.weather.fetch;
 * ```
 *
 * @see {@link TypedQuery} for queries
 * @see {@link TypedMutation} for mutations
 */
export type TypedAction<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = void,
> = FunctionReference<"action", "public", Args, Return>;

/**
 * Type-safe internal query reference for system/admin functions.
 *
 * Internal queries can only be called from other Convex functions,
 * not from the client. Use for privileged operations that should
 * not be directly accessible to end users.
 *
 * @template Args - Query argument type, must extend DefaultFunctionArgs
 * @template Return - Query return type
 *
 * @example
 * ```typescript
 * import type { TypedInternalQuery } from "@ltcg/core/types";
 *
 * const getAdminStats: TypedInternalQuery<{}, AdminStats> =
 *   api.admin.getStats;
 *
 * // Can only be called from Convex functions
 * const stats = await ctx.runQuery(getAdminStats, {});
 * ```
 *
 * @see {@link TypedInternalMutation} for internal mutations
 * @see {@link TypedInternalAction} for internal actions
 */
export type TypedInternalQuery<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = void,
> = FunctionReference<"query", "internal", Args, Return>;

/**
 * Type-safe internal mutation reference for system/admin functions.
 *
 * Internal mutations can only be called from other Convex functions,
 * not from the client. Use for privileged write operations that should
 * not be directly accessible to end users.
 *
 * @template Args - Mutation argument type, must extend DefaultFunctionArgs
 * @template Return - Mutation return type
 *
 * @example
 * ```typescript
 * import type { TypedInternalMutation } from "@ltcg/core/types";
 *
 * const resetUserData: TypedInternalMutation<{ userId: Id<"users"> }, void> =
 *   api.admin.resetUserData;
 *
 * // Can only be called from Convex functions
 * await ctx.runMutation(resetUserData, { userId: "..." });
 * ```
 *
 * @see {@link TypedInternalQuery} for internal queries
 * @see {@link TypedInternalAction} for internal actions
 */
export type TypedInternalMutation<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = void,
> = FunctionReference<"mutation", "internal", Args, Return>;

/**
 * Type-safe internal action reference for system/admin functions.
 *
 * Internal actions can only be called from other Convex functions,
 * not from the client. Use for privileged operations with side effects
 * that should not be directly accessible to end users.
 *
 * @template Args - Action argument type, must extend DefaultFunctionArgs
 * @template Return - Action return type
 *
 * @example
 * ```typescript
 * import type { TypedInternalAction } from "@ltcg/core/types";
 *
 * interface ProcessPaymentArgs {
 *   orderId: Id<"orders">;
 *   amount: number;
 * }
 *
 * const processPayment: TypedInternalAction<ProcessPaymentArgs, PaymentResult> =
 *   api.admin.processPayment;
 *
 * // Can only be called from Convex functions
 * const result = await ctx.runAction(processPayment, {
 *   orderId: "...",
 *   amount: 99.99
 * });
 * ```
 *
 * @see {@link TypedInternalQuery} for internal queries
 * @see {@link TypedInternalMutation} for internal mutations
 */
export type TypedInternalAction<
  Args extends DefaultFunctionArgs = DefaultFunctionArgs,
  Return = void,
> = FunctionReference<"action", "internal", Args, Return>;

// =============================================================================
// Escape Hatch for Deep Type Instantiation Issues
// =============================================================================

/**
 * Brand type that makes API paths compatible with Convex hooks.
 * This is a structural type that matches FunctionReference shape.
 */
type ConvexFunctionBrand = FunctionReference<
  "query" | "mutation" | "action",
  "public" | "internal",
  Record<string, unknown>,
  unknown
>;

/**
 * Base recursive API module type for nested Convex API access.
 * Uses a mapped type pattern that avoids index signature conflicts.
 */
interface ApiModuleBase {
  readonly [K: string]: ApiModuleBase & ConvexFunctionBrand;
}

/**
 * Recursive API module type for nested Convex API access.
 * Allows arbitrary nested property access and is compatible with FunctionReference.
 *
 * @remarks
 * This type uses intersection to combine recursive access with FunctionReference
 * compatibility, avoiding TS2411 errors from conflicting index signatures.
 */
export type ApiModule = ApiModuleBase & ConvexFunctionBrand;

/**
 * Deeply removes undefined from all properties in an object type.
 * Used to create a version of AnyApi that works with noUncheckedIndexedAccess.
 *
 * @template T - The type to make deeply non-nullable
 */
export type DeepDefinite<T> = T extends ConvexFunctionBrand
  ? T & {
      readonly [K in string]: DeepDefinite<ApiModule>;
    }
  : T extends object
    ? { readonly [K in keyof T]-?: DeepDefinite<NonNullable<T[K]>> }
    : NonNullable<T>;

/**
 * API type with guaranteed non-undefined property access.
 * Use this when noUncheckedIndexedAccess is enabled and you need
 * to access deeply nested API paths without undefined checks.
 *
 * @example
 * ```typescript
 * import type { DefiniteApi } from "@ltcg/core";
 *
 * // Create definite API accessor
 * export const api: DefiniteApi = apiModule.api as DefiniteApi;
 *
 * // Now nested access won't return undefined
 * useQuery(api.admin.roles.getRoles, {});
 * ```
 */
export type DefiniteApi = DeepDefinite<AnyApi>;

/**
 * Generic API type that bypasses deep type instantiation errors.
 *
 * Use this when accessing Convex api paths causes TS2589 errors.
 * This type allows arbitrary nested property access without type checking,
 * at the cost of losing type safety at the access site.
 *
 * All known top-level modules are explicitly defined to work correctly
 * with noUncheckedIndexedAccess TypeScript option.
 *
 * @example
 * ```typescript
 * import type { AnyApi } from "@ltcg/core";
 * import { api } from "@convex/_generated/api";
 *
 * // Escape hatch for deep types
 * const apiAny = api as AnyApi;
 *
 * // Now property access won't trigger TS2589
 * useQuery(apiAny.core.cards.getAllCardDefinitions, {});
 * ```
 *
 * @remarks
 * Prefer using TypedQuery/TypedMutation/TypedAction with explicit type
 * annotations when possible. Only use AnyApi as a last resort for paths
 * that consistently cause type instantiation errors.
 */
export type AnyApi = ApiModuleBase &
  ConvexFunctionBrand & {
    // =========================================================================
    // Explicitly defined top-level modules (noUncheckedIndexedAccess compatible)
    // =========================================================================
    readonly admin: AdminApiModule;
    readonly agents: ApiModule;
    readonly ai: ApiModule;
    readonly alerts: AlertsApiModule;
    readonly auth: ApiModule;
    readonly cards: ApiModule;
    readonly chainResolver: ApiModule;
    readonly core: CoreApiModule;
    readonly decks: ApiModule;
    readonly economy: EconomyApiModule;
    readonly effectSystem: ApiModule;
    readonly feedback: ApiModule;
    readonly friends: ApiModule;
    readonly functions: ApiModule;
    readonly gameEngine: ApiModule;
    readonly gameEvents: ApiModule;
    readonly gameplay: GameplayApiModule;
    readonly games: ApiModule;
    readonly globalChat: ApiModule;
    readonly http: ApiModule;
    readonly infrastructure: InfrastructureApiModule;
    readonly internal: ApiModule;
    readonly leaderboards: ApiModule;
    readonly lib: ApiModule;
    readonly marketplace: ApiModule;
    readonly matchmaking: ApiModule;
    readonly migrations: ApiModule;
    readonly presence: ApiModule;
    readonly progression: ProgressionApiModule;
    readonly router: ApiModule;
    readonly scripts: ApiModule;
    readonly seedStarterCards: ApiModule;
    readonly seeds: ApiModule;
    readonly setup: ApiModule;
    readonly setupSystem: ApiModule;
    readonly shop: ApiModule;
    readonly social: SocialApiModule;
    readonly storage: ApiModule;
    readonly story: ApiModule;
    readonly stripe: ApiModule;
    readonly testing: ApiModule;
    readonly tokenAnalytics: ApiModule;

    readonly treasury: TreasuryApiModule;
    readonly tutorial: ApiModule;
    readonly wallet: ApiModule;
    readonly webhooks: ApiModule;
  };

// =============================================================================
// Second-level API modules for commonly accessed paths
// =============================================================================

/**
 * Admin API module with explicit submodule definitions.
 */
type AdminApiModule = ApiModuleBase &
  ConvexFunctionBrand & {
    readonly achievements: ApiModule;
    readonly admin: ApiModule;
    readonly aiConfig: ApiModule;
    readonly aiProviders: ApiModule;
    readonly aiUsage: ApiModule;
    readonly analytics: ApiModule;
    readonly apiKeys: ApiModule;
    readonly assets: ApiModule;
    readonly batchAdmin: ApiModule;
    readonly battlePass: ApiModule;
    readonly branding: ApiModule;
    readonly cards: ApiModule;
    readonly chat: ApiModule;
    readonly cleanupAuth: ApiModule;
    readonly config: ApiModule;
    readonly crudGenerated: ApiModule;
    readonly features: ApiModule;
    readonly marketplace: ApiModule;
    readonly moderation: ApiModule;
    readonly mutations: ApiModule;
    readonly news: ApiModule;
    readonly promoCodes: ApiModule;
    readonly quests: ApiModule;
    readonly reports: ApiModule;
    readonly revenue: ApiModule;
    readonly rngConfig: ApiModule;
    readonly roles: ApiModule;
    readonly sales: ApiModule;
    readonly seasons: ApiModule;
    readonly shop: ApiModule;
    readonly shopSetup: ApiModule;
    readonly story: ApiModule;
    readonly stripe: ApiModule;
    readonly templates: ApiModule;
    readonly tournaments: ApiModule;
  };

/**
 * Alerts API module with explicit submodule definitions.
 */
type AlertsApiModule = ApiModuleBase &
  ConvexFunctionBrand & {
    readonly channels: ApiModule;
    readonly history: ApiModule;
    readonly notifications: ApiModule;
    readonly rules: ApiModule;
    readonly webhooks: ApiModule;
  };

/**
 * Core API module with explicit submodule definitions.
 */
type CoreApiModule = ApiModuleBase &
  ConvexFunctionBrand & {
    readonly cards: ApiModule;
    readonly decks: ApiModule;
    readonly index: ApiModule;
    readonly tutorial: ApiModule;
    readonly userPreferences: ApiModule;
    readonly users: ApiModule;
  };

/**
 * Economy API module with explicit submodule definitions.
 */
type EconomyApiModule = ApiModuleBase &
  ConvexFunctionBrand & {
    readonly dailyRewards: ApiModule;
    readonly economy: ApiModule;
    readonly gemPurchases: ApiModule;
    readonly index: ApiModule;
    readonly marketplace: ApiModule;
    readonly priceHistory: ApiModule;
    readonly rngConfig: ApiModule;
    readonly sales: ApiModule;
    readonly shop: ApiModule;
    readonly tokenBalance: ApiModule;
    readonly tokenMaintenance: ApiModule;
    readonly tokenMarketplace: ApiModule;
  };

/**
 * Gameplay API module with explicit submodule definitions.
 */
type GameplayApiModule = ApiModuleBase &
  ConvexFunctionBrand & {
    readonly ai: ApiModule;
    readonly chainResolver: ApiModule;
    readonly combatSystem: ApiModule;
    readonly effectSystem: ApiModule;
    readonly gameEngine: ApiModule;
    readonly gameEvents: ApiModule;
    readonly games: ApiModule;
    readonly phaseManager: ApiModule;
    readonly replaySystem: ApiModule;
    readonly responseWindow: ApiModule;
    readonly summonValidator: ApiModule;
    readonly timeoutSystem: ApiModule;
    readonly triggerSystem: ApiModule;
  };

/**
 * Infrastructure API module with explicit submodule definitions.
 */
type InfrastructureApiModule = ApiModuleBase &
  ConvexFunctionBrand & {
    readonly actionRetrier: ApiModule;
    readonly aggregates: ApiModule;
    readonly auditLog: ApiModule;
    readonly crons: ApiModule;
    readonly emailActions: ApiModule;
    readonly shardedCounters: ApiModule;
    readonly triggers: ApiModule;
    readonly welcomeEmails: ApiModule;
    readonly workpools: ApiModule;
  };

/**
 * Progression API module with explicit submodule definitions.
 */
type ProgressionApiModule = ApiModuleBase &
  ConvexFunctionBrand & {
    readonly achievements: ApiModule;
    readonly battlePass: ApiModule;
    readonly index: ApiModule;
    readonly matchHistory: ApiModule;
    readonly notifications: ApiModule;
    readonly quests: ApiModule;
    readonly story: ApiModule;
    readonly storyBattle: ApiModule;
    readonly storyQueries: ApiModule;
    readonly storyStages: ApiModule;
  };

/**
 * Social API module with explicit submodule definitions.
 */
type SocialApiModule = ApiModuleBase &
  ConvexFunctionBrand & {
    readonly aiChat: ApiModule;
    readonly challenges: ApiModule;
    readonly friends: ApiModule;
    readonly globalChat: ApiModule;
    readonly inbox: ApiModule;
    readonly index: ApiModule;
    readonly leaderboards: ApiModule;
    readonly matchmaking: ApiModule;
    readonly reports: ApiModule;
    readonly tournamentCron: ApiModule;
    readonly tournaments: ApiModule;
  };

/**
 * Treasury API module with explicit submodule definitions.
 */
type TreasuryApiModule = ApiModuleBase &
  ConvexFunctionBrand & {
    readonly policies: ApiModule;
    readonly transactions: ApiModule;
    readonly wallets: ApiModule;
  };
