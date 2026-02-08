import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Preference enforcement helpers.
 *
 * Use these to check user preferences before performing actions
 * like sending notifications or accepting friend requests.
 */

const DEFAULT_PRIVACY = {
  profilePublic: true,
  showOnlineStatus: true,
  allowFriendRequests: true,
  showMatchHistory: true,
};

const DEFAULT_NOTIFICATIONS = {
  questComplete: true,
  matchInvites: true,
  friendRequests: true,
  marketplaceSales: true,
  dailyReminders: false,
  promotions: false,
};

type PrivacyKey = keyof typeof DEFAULT_PRIVACY;
type NotificationKey = keyof typeof DEFAULT_NOTIFICATIONS;

/**
 * Get a user's privacy preference. Returns the default if no preferences are saved.
 */
export async function getPrivacySetting(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  key: PrivacyKey
) {
  const prefs = await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  return prefs?.privacy?.[key] ?? DEFAULT_PRIVACY[key];
}

/**
 * Get a user's notification preference. Returns the default if no preferences are saved.
 */
export async function getNotificationSetting(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  key: NotificationKey
) {
  const prefs = await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  return prefs?.notifications?.[key] ?? DEFAULT_NOTIFICATIONS[key];
}
