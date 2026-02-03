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
  Return = any,
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
  Return = any,
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
  Return = any,
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
  Return = any,
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
  Return = any,
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
  Return = any,
> = FunctionReference<"action", "internal", Args, Return>;
