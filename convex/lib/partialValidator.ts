/**
 * Partial Validator Helpers for Convex Patch Operations
 *
 * Provides a `partial()` function that wraps every field in `v.optional()`,
 * making them suitable for `ctx.db.patch()` argument validators.
 *
 * Also provides `stripUndefined()` to clean patch objects before writing.
 *
 * Note: Convex v1.31+ has a `.partial()` method on `VObject` instances
 * (`v.object({...}).partial()`), but that returns a `VObject`. This module's
 * `partial()` operates on raw `PropertyValidators` so you can spread the
 * result into `args` alongside required fields like `userId: v.id("users")`.
 */

import { v } from "convex/values";
import type { GenericValidator, PropertyValidators, Validator } from "convex/values";
import { literals } from "convex-helpers/validators";

// ============================================================================
// PARTIAL HELPER
// ============================================================================

/**
 * Creates a partial version of a field set by wrapping every field in `v.optional()`.
 * Already-optional fields are left as-is to avoid double-wrapping.
 *
 * Use with `ctx.db.patch()` mutations to accept any subset of updatable fields.
 *
 * @example
 * ```ts
 * import { partial, stripUndefined, patchableUserFields } from "../lib/partialValidator";
 *
 * export const updateProfile = mutation({
 *   args: {
 *     userId: v.id("users"),
 *     ...partial(patchableUserFields),
 *   },
 *   handler: async (ctx, args) => {
 *     const { userId, ...updates } = args;
 *     const patch = stripUndefined(updates);
 *     if (Object.keys(patch).length > 0) {
 *       await ctx.db.patch(userId, patch);
 *     }
 *   },
 * });
 * ```
 */
export function partial<Fields extends PropertyValidators>(fields: Fields) {
  const result: Record<string, GenericValidator> = {};
  for (const [key, validator] of Object.entries(fields)) {
    // Skip double-wrapping fields that are already optional
    if ((validator as Validator<unknown, "optional", string>).isOptional === "optional") {
      result[key] = validator as GenericValidator;
    } else {
      result[key] = v.optional(validator as GenericValidator);
    }
  }
  return result as {
    [K in keyof Fields]: Fields[K] extends Validator<infer _T, "optional", infer _F>
      ? Fields[K]
      : Fields[K] extends Validator<infer T, any, infer F>
        ? Validator<T | undefined, "optional", F>
        : never;
  };
}

// ============================================================================
// STRIP UNDEFINED HELPER
// ============================================================================

/**
 * Strips `undefined` values from an object, producing a clean patch.
 * Use before calling `ctx.db.patch()` so Convex doesn't receive explicit `undefined`.
 *
 * @example
 * ```ts
 * const { userId, ...updates } = args;
 * const patch = stripUndefined(updates);
 * if (Object.keys(patch).length > 0) {
 *   await ctx.db.patch(userId, patch);
 * }
 * ```
 */
export function stripUndefined<T extends Record<string, unknown>>(obj: T) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

// ============================================================================
// PATCHABLE FIELD SETS
// ============================================================================
//
// Common field groups extracted from the schema for tables that are frequently
// patched. Use with `partial()` for type-safe patch argument validators.
//
// These must match the field names and types in convex/schema.ts exactly.
// ============================================================================

/**
 * User profile fields that are commonly updated.
 * Source: `users` table in schema.ts (lines 92-201)
 *
 * @example
 * ```ts
 * export const updateProfile = mutation({
 *   args: {
 *     ...partial(patchableUserProfileFields),
 *   },
 *   handler: async (ctx, args) => { ... },
 * });
 * ```
 */
export const patchableUserProfileFields = {
  username: v.string(),
  name: v.string(),
  bio: v.string(),
  image: v.string(),
  activeDeckId: v.id("userDecks"),
};

/**
 * User stats fields updated after games.
 * Source: `users` table in schema.ts (lines 113-128)
 */
export const patchableUserStatsFields = {
  rankedElo: v.number(),
  casualRating: v.number(),
  totalWins: v.number(),
  totalLosses: v.number(),
  rankedWins: v.number(),
  rankedLosses: v.number(),
  casualWins: v.number(),
  casualLosses: v.number(),
  storyWins: v.number(),
  currentWinStreak: v.number(),
  longestWinStreak: v.number(),
  lastStatsUpdate: v.number(),
};

/**
 * User moderation fields patched by admin actions.
 * Source: `users` table in schema.ts (lines 142-153)
 */
export const patchableUserModerationFields = {
  isBanned: v.boolean(),
  banReason: v.optional(v.string()),
  bannedAt: v.optional(v.number()),
  bannedBy: v.optional(v.id("users")),
  isSuspended: v.boolean(),
  suspendedUntil: v.optional(v.number()),
  suspensionReason: v.optional(v.string()),
  suspendedBy: v.optional(v.id("users")),
  warningCount: v.number(),
  accountStatus: literals("active", "suspended", "banned"),
  mutedUntil: v.optional(v.number()),
};

/**
 * User wallet fields patched when connecting/disconnecting wallets.
 * Source: `users` table in schema.ts (lines 161-163)
 */
export const patchableUserWalletFields = {
  walletAddress: v.optional(v.string()),
  walletType: v.optional(literals("privy_embedded", "external")),
  walletConnectedAt: v.optional(v.number()),
};

/**
 * Player currency fields patched during economy operations.
 * Source: `playerCurrency` table in schema.ts (lines 1398-1407)
 */
export const patchablePlayerCurrencyFields = {
  gold: v.number(),
  gems: v.number(),
  lifetimeGoldEarned: v.number(),
  lifetimeGoldSpent: v.number(),
  lifetimeGemsEarned: v.number(),
  lifetimeGemsSpent: v.number(),
  lastUpdatedAt: v.number(),
};

/**
 * Marketplace listing fields patched when a listing is sold, cancelled, or expires.
 * Source: `marketplaceListings` table in schema.ts (lines 1568-1592)
 */
export const patchableMarketplaceListingFields = {
  status: literals("active", "sold", "cancelled", "expired", "suspended"),
  soldTo: v.optional(v.id("users")),
  soldFor: v.optional(v.number()),
  soldAt: v.optional(v.number()),
  platformFee: v.optional(v.number()),
  currentBid: v.optional(v.number()),
  highestBidderId: v.optional(v.id("users")),
  highestBidderUsername: v.optional(v.string()),
  bidCount: v.number(),
  updatedAt: v.number(),
  claimed: v.optional(v.boolean()),
};

/**
 * Battle pass progress fields patched during XP gain and reward claims.
 * Source: `battlePassProgress` table in schema.ts (lines 2664-2681)
 */
export const patchableBattlePassProgressFields = {
  currentXP: v.number(),
  currentTier: v.number(),
  isPremium: v.boolean(),
  premiumPurchasedAt: v.optional(v.number()),
  claimedFreeTiers: v.array(v.number()),
  claimedPremiumTiers: v.array(v.number()),
  lastXPGainAt: v.optional(v.number()),
  updatedAt: v.number(),
};

/**
 * Friendship fields patched when accepting, blocking, or updating.
 * Source: `friendships` table in schema.ts (lines 2360-2373)
 */
export const patchableFriendshipFields = {
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("blocked")
  ),
  respondedAt: v.optional(v.number()),
  lastInteraction: v.optional(v.number()),
};

/**
 * Guild fields patched during updates (settings, images, member count).
 * Source: `guilds` table in schema.ts (lines 2388-2408)
 */
export const patchableGuildFields = {
  name: v.string(),
  description: v.optional(v.string()),
  profileImageId: v.optional(v.id("_storage")),
  bannerImageId: v.optional(v.id("_storage")),
  visibility: v.union(v.literal("public"), v.literal("private")),
  ownerId: v.id("users"),
  memberCount: v.number(),
  updatedAt: v.number(),
};

/**
 * Game lobby fields patched during gameplay progression.
 * Source: `gameLobbies` table in schema.ts (lines 474-508)
 */
export const patchableGameLobbyFields = {
  status: v.string(),
  opponentId: v.optional(v.id("users")),
  opponentUsername: v.optional(v.string()),
  opponentRank: v.optional(v.string()),
  gameId: v.optional(v.string()),
  turnNumber: v.optional(v.number()),
  currentTurnPlayerId: v.optional(v.id("users")),
  turnStartedAt: v.optional(v.number()),
  lastMoveAt: v.optional(v.number()),
  winnerId: v.optional(v.id("users")),
  startedAt: v.optional(v.number()),
  spectatorCount: v.optional(v.number()),
  wagerPaid: v.optional(v.boolean()),
};

/**
 * Agent fields patched when updating wallet or streaming config.
 * Source: `agents` table in schema.ts (lines 329-366)
 */
export const patchableAgentFields = {
  name: v.string(),
  profilePictureUrl: v.optional(v.string()),
  socialLink: v.optional(v.string()),
  starterDeckCode: v.string(),
  isActive: v.boolean(),
  // Wallet fields
  walletId: v.optional(v.string()),
  walletAddress: v.optional(v.string()),
  walletChainType: v.optional(v.string()),
  walletCreatedAt: v.optional(v.number()),
  walletStatus: v.optional(literals("pending", "created", "failed")),
  walletErrorMessage: v.optional(v.string()),
  // Streaming fields
  streamingEnabled: v.optional(v.boolean()),
  streamingPlatform: v.optional(literals("twitch", "youtube", "custom")),
  streamingAutoStart: v.optional(v.boolean()),
  // Webhook fields
  callbackUrl: v.optional(v.string()),
  webhookEnabled: v.optional(v.boolean()),
};
