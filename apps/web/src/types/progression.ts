/**
 * Progression system types (achievements, quests, badges, notifications).
 *
 * This module defines types for player progression tracking including:
 * - Achievements: Long-term goals with rarity-based rewards
 * - Quests: Daily/weekly objectives with progress tracking
 * - Badges: Visual rewards for completing milestones
 * - Notifications: In-game alerts for progression events
 */

import type { Id } from "@convex/_generated/dataModel";

/**
 * Player badge earned from completing achievements or milestones.
 *
 * Badges are visual rewards displayed on player profiles and serve as status symbols.
 *
 * Valid badge types:
 * - `"story_complete"` - Completing story chapters
 * - `"archetype_complete"` - Mastering a deck archetype
 * - `"achievement"` - Unlocking specific achievements
 * - `"special"` - Event or seasonal rewards
 * - `"milestone"` - Reaching level or rank milestones
 *
 * @example
 * ```typescript
 * const badge: Badge = {
 *   _id: "jb3k5m8..." as Id<"playerBadges">,
 *   _creationTime: 1234567890,
 *   userId: "ju8s9d0..." as Id<"users">,
 *   badgeId: "chapter1_master",
 *   badgeType: "story_complete",
 *   displayName: "Chapter 1 Master",
 *   description: "Completed all stages in Chapter 1 with 3 stars",
 *   iconUrl: "/badges/chapter1.png",
 *   earnedAt: 1234567890
 * };
 * ```
 *
 * @see Achievement - Badges are often earned from achievements
 */
export interface Badge {
  /** Unique badge instance ID */
  _id: Id<"playerBadges">;
  /** Timestamp when the badge was earned */
  _creationTime: number;
  /** Owner of the badge */
  userId: Id<"users">;
  /** Badge template identifier */
  badgeId: string;
  /** Category of the badge */
  badgeType: "story_complete" | "archetype_complete" | "achievement" | "special" | "milestone";
  /** Human-readable badge name */
  displayName: string;
  /** Description of how the badge was earned */
  description: string;
  /** URL to the badge icon image (optional) */
  iconUrl?: string;
  /** Associated archetype (for archetype_complete badges) */
  archetype?: string;
  /** Timestamp when the badge was earned */
  earnedAt: number;
}

/**
 * Organized collection of player badges with metadata.
 *
 * Used in profile displays to show earned badges grouped by category.
 *
 * @example
 * ```typescript
 * const badgeData: BadgeData = {
 *   badges: [badge1, badge2, badge3],
 *   badgesByType: {
 *     story_complete: [badge1, badge2],
 *     achievement: [badge3]
 *   },
 *   totalBadges: 3
 * };
 * ```
 */
export interface BadgeData {
  /** All badges earned by the player */
  badges: Badge[];
  /** Badges organized by type */
  badgesByType: Record<string, Badge[]>;
  /** Total count of earned badges */
  totalBadges: number;
}

/**
 * Base notification fields shared across all notification types
 */
interface BaseNotification {
  /** Unique notification ID */
  _id: Id<"playerNotifications">;
  /** Timestamp when notification was created */
  _creationTime: number;
  /** Recipient user ID */
  userId: Id<"users">;
  /** Notification title */
  title: string;
  /** Notification message body */
  message: string;
  /** Whether the notification has been read */
  isRead: boolean;
  /** Timestamp when notification was marked as read (optional) */
  readAt?: number;
  /** Timestamp when notification was created */
  createdAt: number;
}

/**
 * Achievement unlocked notification
 */
export interface AchievementNotification extends BaseNotification {
  type: "achievement_unlocked";
  data: {
    achievementId: string;
    rarity: string;
    rewards: {
      gold?: number;
      xp?: number;
      gems?: number;
    };
  };
}

/**
 * Level up notification
 */
export interface LevelUpNotification extends BaseNotification {
  type: "level_up";
  data: {
    newLevel: number;
    oldLevel: number;
  };
}

/**
 * Quest completed notification
 */
export interface QuestCompletedNotification extends BaseNotification {
  type: "quest_completed";
  data: {
    questType: string;
  };
}

/**
 * Badge earned notification
 */
export interface BadgeEarnedNotification extends BaseNotification {
  type: "badge_earned";
  data: {
    description: string;
  };
}

// =============================================================================
// Match History Types
// =============================================================================

/**
 * Game mode for matches.
 */
export type MatchHistoryMode = "ranked" | "casual" | "story";

/**
 * Result of a match.
 */
export type MatchHistoryResult = "victory" | "defeat";

/**
 * Unified Match History Entry.
 */
export interface MatchHistoryEntry {
  id: string;
  mode: MatchHistoryMode;
  result: MatchHistoryResult;
  opponent: {
    username: string;
    avatarUrl?: string;
  };
  xpGained: number;
  ratingChange?: number;
  timestamp: number;
}

/**
 * Match history statistics overview.
 */
export interface MatchHistoryStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

// =============================================================================
// Battle Pass Types
// =============================================================================

import type { RewardType } from "./economy";

/**
 * Battle Pass reward structure.
 */
export interface BattlePassReward {
  type: RewardType;
  amount?: number;
  cardId?: string;
  packProductId?: string;
  titleName?: string;
  avatarUrl?: string;
}

/**
 * Individual Battle Pass tier.
 */
export interface BattlePassTier {
  tier: number;
  freeReward?: BattlePassReward;
  premiumReward?: BattlePassReward;
  isMilestone: boolean;
  isUnlocked: boolean;
  freeRewardClaimed: boolean;
  premiumRewardClaimed: boolean;
  canClaimFree: boolean;
  canClaimPremium: boolean;
}

/**
 * Battle Pass season status.
 */
export interface BattlePassStatus {
  battlePassId: string;
  seasonId: string;
  name: string;
  description?: string;
  seasonName?: string;
  status: "upcoming" | "active" | "ended";
  totalTiers: number;
  xpPerTier: number;
  startDate: number;
  endDate: number;
  currentXP: number;
  currentTier: number;
  isPremium: boolean;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
  xpToNextTier: number;
  daysRemaining: number;
}

// =============================================================================
// Achievement & Quest Types
// =============================================================================

/**
 * Achievement categories.
 */
export type AchievementCategory = "combat" | "collection" | "social" | "progression" | "special";

/**
 * Achievement rarities.
 */
export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

/**
 * Achievement definition.
 */
export interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  rewards: {
    gold?: number;
    xp?: number;
    gems?: number;
  };
  targetValue: number;
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt?: number;
}

/**
 * Quest types.
 */
export type QuestType = "daily" | "weekly" | "achievement" | "event";

/**
 * Quest definition and progress.
 */
export interface Quest {
  questRecordId: Id<"userQuests">;
  questId: string;
  questType: QuestType;
  name: string;
  description: string;
  currentProgress: number;
  targetValue: number;
  status: "active" | "completed" | "claimed";
  rewardGold: number;
  rewardXp: number;
  rewardGems?: number;
  expiresAt?: number;
}

// =============================================================================
// Notification Types
// =============================================================================

/**
 * In-game notification alerting players to progression events.
 *
 * Notifications appear in the notification center and can trigger toasts/popups.
 *
 * Valid notification types:
 * - `"achievement_unlocked"` - Achievement completed
 * - `"level_up"` - Player leveled up
 * - `"quest_completed"` - Quest objective finished
 * - `"badge_earned"` - New badge awarded
 *
 * @example
 * ```typescript
 * // Achievement notification
 * const notification: AchievementNotification = {
 *   _id: "jn2k9m3..." as Id<"playerNotifications">,
 *   _creationTime: 1234567890,
 *   userId: "ju8s9d0..." as Id<"users">,
 *   type: "achievement_unlocked",
 *   title: "Achievement Unlocked!",
 *   message: "You earned 'First Victory'",
 *   data: {
 *     achievementId: "first_win",
 *     rarity: "common",
 *     rewards: { gold: 100, xp: 50 }
 *   },
 *   isRead: false,
 *   createdAt: 1234567890
 * };
 *
 * // Level up notification
 * const levelUp: LevelUpNotification = {
 *   _id: "jn3m8k2..." as Id<"playerNotifications">,
 *   _creationTime: 1234567890,
 *   userId: "ju8s9d0..." as Id<"users">,
 *   type: "level_up",
 *   title: "Level Up!",
 *   message: "You reached level 10",
 *   data: {
 *     newLevel: 10,
 *     oldLevel: 9
 *   },
 *   isRead: false,
 *   createdAt: 1234567890
 * };
 * ```
 */
export type Notification =
  | AchievementNotification
  | LevelUpNotification
  | QuestCompletedNotification
  | BadgeEarnedNotification;

// =============================================================================
// Mutation Results
// =============================================================================

/**
 * Result of claiming quest rewards.
 *
 * @example
 * ```typescript
 * const result: QuestRewardResult = {
 *   success: true,
 *   rewards: {
 *     gold: 200,
 *     xp: 100,
 *     gems: 5
 *   }
 * };
 * ```
 */
export interface QuestRewardResult {
  /** Indicates if rewards were successfully claimed */
  success: boolean;
  /** Rewards awarded to the player */
  rewards: {
    /** Gold currency awarded */
    gold: number;
    /** Experience points awarded */
    xp: number;
    /** Premium currency awarded (optional) */
    gems?: number;
  };
}

/**
 * Result of notification-related actions (mark as read, delete).
 *
 * @example
 * ```typescript
 * const result: NotificationActionResult = {
 *   success: true
 * };
 * ```
 */
export interface NotificationActionResult {
  /** Indicates if the action completed successfully */
  success: boolean;
}

/**
 * Result of marking all notifications as read.
 *
 * @example
 * ```typescript
 * const result: MarkAllAsReadResult = {
 *   success: true,
 *   count: 12
 * };
 * ```
 */
export interface MarkAllAsReadResult {
  /** Indicates if the operation completed successfully */
  success: boolean;
  /** Number of notifications marked as read */
  count: number;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a Badge.
 *
 * @param value - The value to check
 * @returns True if the value is a Badge
 *
 * @example
 * ```typescript
 * const data = await fetchReward();
 * if (isBadge(data)) {
 *   showBadgeAnimation(data);
 * }
 * ```
 */
export function isBadge(value: unknown): value is Badge {
  return typeof value === "object" && value !== null && "badgeId" in value;
}

/**
 * Type guard to check if a value is a Quest.
 *
 * @param value - The value to check
 * @returns True if the value is a Quest
 *
 * @example
 * ```typescript
 * const data = await fetchProgression();
 * if (isQuest(data)) {
 *   console.log(`Quest: ${data.currentProgress}/${data.targetValue}`);
 * }
 * ```
 */
export function isQuest(value: unknown): value is Quest {
  return (
    typeof value === "object" && value !== null && "questRecordId" in value && "questType" in value
  );
}

/**
 * Type guard to check if a value is a Notification.
 *
 * @param value - The value to check
 * @returns True if the value is a Notification
 *
 * @example
 * ```typescript
 * const items = await fetchInbox();
 * const notifications = items.filter(isNotification);
 * ```
 */
export function isNotification(value: unknown): value is Notification {
  return typeof value === "object" && value !== null && "_id" in value && "type" in value;
}
