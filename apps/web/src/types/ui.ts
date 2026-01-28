/**
 * UI Display Types
 *
 * Lightweight types optimized for component rendering.
 * These types contain only the data needed for display,
 * not the full database records.
 *
 * This file separates UI/display concerns from data/domain types.
 */

import type { Id } from "@convex/_generated/dataModel";

// =============================================================================
// Card Display Types
// =============================================================================

/**
 * Minimal card data for UI rendering
 *
 * Used in card lists, search results, and collection views.
 * Does not include full card stats or effects.
 *
 * @example
 * ```typescript
 * const cardPreview: CardDisplay = {
 *   id: "card_123",
 *   name: "Blue-Eyes White Dragon",
 *   imageUrl: "https://...",
 *   cardType: "monster",
 *   rarity: "legendary"
 * };
 * ```
 */
export interface CardDisplay {
  id: string;
  name: string;
  imageUrl?: string;
  cardType: string;
  rarity: string;
}

/**
 * Extended card display with stats
 *
 * Used in detailed views and deck builder.
 * Adds monster stats to the base CardDisplay.
 *
 * @example
 * ```typescript
 * const card: CardDisplayWithStats = {
 *   ...cardPreview,
 *   attack: 3000,
 *   defense: 2500,
 *   level: 8,
 *   archetype: "dragon"
 * };
 * ```
 */
export interface CardDisplayWithStats extends CardDisplay {
  attack?: number;
  defense?: number;
  level?: number;
  archetype?: string;
  attribute?: string;
}

/**
 * Card with ownership info for collection views
 *
 * Used in binder and collection management.
 * Shows how many copies the player owns.
 *
 * @example
 * ```typescript
 * const ownedCard: CardDisplayOwned = {
 *   ...card,
 *   owned: 3,
 *   maxCopies: 3
 * };
 * ```
 */
export interface CardDisplayOwned extends CardDisplayWithStats {
  owned: number;
  maxCopies: number;
}

// =============================================================================
// Deck Display Types
// =============================================================================

/**
 * Minimal deck data for list views
 *
 * Used in deck selection, deck browser, and profile views.
 * Lightweight representation for deck cards/previews.
 *
 * @example
 * ```typescript
 * const deck: DeckDisplay = {
 *   id: "deck_123" as Id<"userDecks">,
 *   name: "Blue-Eyes Beatdown",
 *   cardCount: 42,
 *   archetype: "light",
 *   isActive: true
 * };
 * ```
 */
export interface DeckDisplay {
  id: Id<"userDecks">;
  name: string;
  cardCount: number;
  archetype: string;
  isActive: boolean;
}

/**
 * Extended deck display with metadata
 *
 * Used in detailed deck views and statistics pages.
 * Includes win/loss stats and last played info.
 *
 * @example
 * ```typescript
 * const deckDetails: DeckDisplayWithMeta = {
 *   ...deck,
 *   wins: 15,
 *   losses: 5,
 *   winRate: 0.75,
 *   lastPlayed: 1234567890,
 *   thumbnailUrl: "https://..."
 * };
 * ```
 */
export interface DeckDisplayWithMeta extends DeckDisplay {
  wins?: number;
  losses?: number;
  winRate?: number;
  lastPlayed?: number;
  thumbnailUrl?: string;
}

// =============================================================================
// User Display Types
// =============================================================================

/**
 * Minimal user profile for UI cards
 *
 * Used in leaderboards, friend lists, and player cards.
 * Contains essential player info for compact displays.
 *
 * @example
 * ```typescript
 * const profile: UserProfileSummary = {
 *   userId: "user_123" as Id<"users">,
 *   username: "DragonMaster",
 *   level: 42,
 *   xp: 15000,
 *   rank: "Diamond"
 * };
 * ```
 */
export interface UserProfileSummary {
  userId: Id<"users">;
  username: string;
  level?: number;
  xp?: number;
  rank?: string;
}

/**
 * Extended user profile with avatar and status
 *
 * Used in detailed profile views and player dialogs.
 * Includes visual elements like avatar and status indicators.
 *
 * @example
 * ```typescript
 * const fullProfile: UserProfileDisplay = {
 *   ...profile,
 *   avatarUrl: "https://...",
 *   status: "online",
 *   title: "Legendary Duelist",
 *   badgeCount: 15
 * };
 * ```
 */
export interface UserProfileDisplay extends UserProfileSummary {
  avatarUrl?: string;
  status?: "online" | "in_game" | "offline";
  title?: string;
  badgeCount?: number;
}

// =============================================================================
// Game Display Types
// =============================================================================

/**
 * Game lobby info for lobby browser
 *
 * Used in the game lobby list and matchmaking UI.
 * Shows essential info for players choosing a game.
 *
 * @example
 * ```typescript
 * const lobby: GameLobbyDisplay = {
 *   id: "lobby_123" as Id<"gameLobbies">,
 *   hostUsername: "DragonMaster",
 *   mode: "ranked",
 *   hostRating: 1500,
 *   hostRank: "Diamond",
 *   isPrivate: false
 * };
 * ```
 */
export interface GameLobbyDisplay {
  id: Id<"gameLobbies">;
  hostUsername: string;
  mode: "ranked" | "casual" | "story";
  hostRating: number;
  hostRank?: string;
  isPrivate: boolean;
  joinCode?: string;
}

/**
 * Match result for history display
 *
 * Used in match history pages and player profiles.
 * Compact view of past game results.
 *
 * @example
 * ```typescript
 * const match: MatchDisplay = {
 *   id: "match_123" as Id<"matchHistory">,
 *   opponentUsername: "BlueDragon",
 *   result: "win",
 *   mode: "ranked",
 *   ratingChange: +25,
 *   date: 1234567890,
 *   turnsPlayed: 12
 * };
 * ```
 */
export interface MatchDisplay {
  id: Id<"matchHistory">;
  opponentUsername: string;
  result: "win" | "loss";
  mode: "ranked" | "casual" | "story";
  ratingChange?: number;
  date: number;
  turnsPlayed?: number;
  duration?: number;
}

// =============================================================================
// Notification Display Types
// =============================================================================

/**
 * Notification for UI rendering
 *
 * Used in notification toasts and notification center.
 * Simplified version of the full Notification type from database.
 *
 * @example
 * ```typescript
 * const notification: NotificationDisplay = {
 *   id: "notif_123" as Id<"playerNotifications">,
 *   type: "achievement_unlocked",
 *   title: "Achievement Unlocked!",
 *   message: "You've unlocked Legendary Collector",
 *   timestamp: 1234567890,
 *   isRead: false,
 *   icon: "🏆"
 * };
 * ```
 */
export interface NotificationDisplay {
  id: Id<"playerNotifications">;
  type: "achievement_unlocked" | "level_up" | "quest_completed" | "badge_earned";
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  icon?: string;
  actionUrl?: string;
}

// =============================================================================
// Badge Display Types
// =============================================================================

/**
 * Badge for profile and achievement displays
 *
 * Used in player profiles, badge collections, and achievement pop-ups.
 * Focused on visual presentation of badge data.
 *
 * @example
 * ```typescript
 * const badge: BadgeDisplay = {
 *   id: "badge_123",
 *   name: "Dragon Tamer",
 *   description: "Defeated 100 dragon-type monsters",
 *   iconUrl: "https://...",
 *   rarity: "epic",
 *   earnedAt: 1234567890
 * };
 * ```
 */
export interface BadgeDisplay {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
  earnedAt?: number;
  badgeType?: "story_complete" | "archetype_complete" | "achievement" | "special" | "milestone";
}

/**
 * Badge with progress tracking
 *
 * Used when showing badge progress (e.g., "Defeat 50/100 dragons").
 * Extends BadgeDisplay with completion tracking.
 *
 * @example
 * ```typescript
 * const progressBadge: BadgeDisplayWithProgress = {
 *   ...badge,
 *   currentProgress: 50,
 *   requiredProgress: 100,
 *   progressPercent: 50
 * };
 * ```
 */
export interface BadgeDisplayWithProgress extends BadgeDisplay {
  currentProgress?: number;
  requiredProgress?: number;
  progressPercent?: number;
}

// =============================================================================
// Leaderboard Display Types
// =============================================================================

/**
 * Leaderboard entry for ranking displays
 *
 * Used in leaderboard tables and rank cards.
 * Compact view of player ranking info.
 *
 * @example
 * ```typescript
 * const entry: LeaderboardEntryDisplay = {
 *   rank: 1,
 *   userId: "user_123" as Id<"users">,
 *   username: "DragonMaster",
 *   rating: 2100,
 *   wins: 150,
 *   losses: 50,
 *   winRate: 0.75
 * };
 * ```
 */
export interface LeaderboardEntryDisplay {
  rank: number;
  userId: Id<"users">;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
  avatarUrl?: string;
  title?: string;
}

// =============================================================================
// Quest Display Types
// =============================================================================

/**
 * Quest for UI cards and quest lists
 *
 * Used in quest log and daily quest displays.
 * Shows quest info with progress tracking.
 *
 * @example
 * ```typescript
 * const quest: QuestDisplay = {
 *   id: "quest_123" as Id<"userQuests">,
 *   name: "Win 5 Ranked Matches",
 *   description: "Achieve 5 victories in ranked mode",
 *   currentProgress: 3,
 *   requiredProgress: 5,
 *   progressPercent: 60,
 *   rewards: { gold: 500, xp: 100 },
 *   isCompleted: false,
 *   expiresAt: 1234567890
 * };
 * ```
 */
export interface QuestDisplay {
  id: Id<"userQuests">;
  name: string;
  description: string;
  currentProgress: number;
  requiredProgress: number;
  progressPercent: number;
  rewards: {
    gold: number;
    xp: number;
    gems?: number;
  };
  isCompleted: boolean;
  expiresAt?: number;
  questType?: "daily" | "weekly" | "story" | "achievement";
}

// =============================================================================
// Story Display Types
// =============================================================================

/**
 * Story chapter for chapter selection screen
 *
 * Used in story mode navigation and chapter cards.
 * Shows chapter overview and completion status.
 *
 * @example
 * ```typescript
 * const chapter: StoryChapterDisplay = {
 *   id: "chapter_1" as Id<"storyChapters">,
 *   chapterId: "chapter_1",
 *   name: "The Beginning",
 *   description: "Start your journey...",
 *   difficulty: "Easy",
 *   status: "available",
 *   stagesCompleted: 3,
 *   totalStages: 10,
 *   starsEarned: 9,
 *   thumbnailUrl: "https://..."
 * };
 * ```
 */
export interface StoryChapterDisplay {
  id: Id<"storyChapters">;
  chapterId: string;
  name: string;
  description: string;
  difficulty: string;
  status: "locked" | "available" | "in_progress" | "completed";
  stagesCompleted: number;
  totalStages: number;
  starsEarned: number;
  thumbnailUrl?: string;
}

/**
 * Story stage for stage selection and progression
 *
 * Used in stage selection within chapters.
 * Shows individual stage info and completion.
 *
 * @example
 * ```typescript
 * const stage: StoryStageDisplay = {
 *   id: "stage_1" as Id<"storyStages">,
 *   stageNumber: 1,
 *   name: "First Challenge",
 *   opponentName: "Rookie Duelist",
 *   opponentLevel: 5,
 *   status: "available",
 *   starsEarned: 3,
 *   rewards: { gold: 100, xp: 50 }
 * };
 * ```
 */
export interface StoryStageDisplay {
  id: Id<"storyStages">;
  stageNumber: number;
  name: string;
  opponentName: string;
  opponentLevel: number;
  status: "locked" | "available" | "completed" | "starred";
  starsEarned: number;
  rewards: {
    gold: number;
    xp: number;
    gems?: number;
  };
}

// =============================================================================
// Shop Display Types
// =============================================================================

/**
 * Shop product for store displays
 *
 * Used in shop UI and product cards.
 * Shows product info and pricing.
 *
 * @example
 * ```typescript
 * const product: ShopProductDisplay = {
 *   id: "product_123" as Id<"shopProducts">,
 *   name: "Booster Pack - Dragons",
 *   description: "Contains 5 random dragon cards",
 *   price: { gold: 500, gems: 50 },
 *   imageUrl: "https://...",
 *   category: "packs",
 *   rarity: "rare"
 * };
 * ```
 */
export interface ShopProductDisplay {
  id: Id<"shopProducts">;
  name: string;
  description: string;
  price: {
    gold?: number;
    gems?: number;
  };
  imageUrl?: string;
  category: string;
  rarity?: string;
  stock?: number;
  isLimited?: boolean;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a value is a valid CardDisplay
 */
export function isCardDisplay(value: unknown): value is CardDisplay {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "cardType" in value &&
    "rarity" in value
  );
}

/**
 * Check if a value is a valid DeckDisplay
 */
export function isDeckDisplay(value: unknown): value is DeckDisplay {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "cardCount" in value &&
    "archetype" in value
  );
}

/**
 * Check if a value is a valid UserProfileSummary
 */
export function isUserProfileSummary(value: unknown): value is UserProfileSummary {
  return typeof value === "object" && value !== null && "userId" in value && "username" in value;
}

/**
 * Check if a value is a valid NotificationDisplay
 */
export function isNotificationDisplay(value: unknown): value is NotificationDisplay {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "type" in value &&
    "title" in value &&
    "message" in value
  );
}

/**
 * Check if a value is a valid BadgeDisplay
 */
export function isBadgeDisplay(value: unknown): value is BadgeDisplay {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "description" in value
  );
}

/**
 * Check if a value is a valid QuestDisplay
 */
export function isQuestDisplay(value: unknown): value is QuestDisplay {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "currentProgress" in value &&
    "requiredProgress" in value
  );
}
