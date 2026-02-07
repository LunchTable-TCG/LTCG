/**
 * Convex Type Utilities for Admin Dashboard
 *
 * Centralized type definitions derived from Convex schema
 * to avoid "as any" throughout the codebase.
 */

import type { Doc, Id } from "@convex/_generated/dataModel";

// Card types
export type CardRarity = Doc<"cardDefinitions">["rarity"];
export type CardArchetype = Doc<"cardDefinitions">["archetype"];
export type CardType = Doc<"cardDefinitions">["cardType"];
export type CardAttribute = NonNullable<Doc<"cardDefinitions">["attribute"]>;
export type MonsterType = NonNullable<Doc<"cardDefinitions">["monsterType"]>;
export type SpellType = NonNullable<Doc<"cardDefinitions">["spellType"]>;
export type TrapType = NonNullable<Doc<"cardDefinitions">["trapType"]>;

// Season types
export type SeasonStatus = Doc<"seasons">["status"];

// User/Player types
export type UserRole = Doc<"adminRoles">["role"];

// Shop types
export type ProductType = Doc<"shopProducts">["productType"];
export type PurchaseStatus = Doc<"tokenGemPurchases">["status"];

// Tournament types
export type TournamentStatus = Doc<"tournaments">["status"];
export type TournamentFormat = Doc<"tournaments">["format"];

// Quest types
export type QuestType = Doc<"questDefinitions">["questType"];
export type QuestStatus = Doc<"userQuests">["status"];

// Achievement types
export type AchievementCategory = Doc<"achievementDefinitions">["category"];

// Story types
export type StageStatus = Doc<"storyStages">["status"];

// Promo code types
export type PromoCodeRewardType = Doc<"promoCodes">["rewardType"];

// Alert types - severity is a string
export type AlertSeverity = string;

// Common ID types for easy reference
export type CardId = Id<"cardDefinitions">;
export type UserId = Id<"users">;
export type SeasonId = Id<"seasons">;
export type ProductId = Id<"shopProducts">;
export type TournamentId = Id<"tournaments">;
export type QuestId = Id<"questDefinitions">;
export type AchievementId = Id<"achievementDefinitions">;
export type PromoCodeId = Id<"promoCodes">;
export type TemplateId = Id<"cardTemplates">;
export type BattlePassId = Id<"battlePassSeasons">;
export type ChapterId = Id<"storyChapters">;
export type StageId = Id<"storyStages">;
export type FeatureFlagId = Id<"featureFlags">;
// Analytics query result types
export interface CardWinRateStat {
  cardId: CardId;
  cardName: string;
  winRate: number;
  gamesPlayed: number;
  rarity: string;
  archetype?: string;
}

export interface CardPlayRateStat {
  cardId: CardId;
  cardName: string;
  playRate?: number;
  timesPlayed?: number;
  totalGames?: number;
  rarity: string;
  archetype?: string;
}

// Season types
export interface TierBreakdown {
  tier: string;
  playerCount: number;
  totalGold: number;
  totalGems: number;
  totalPacks: number;
}

export interface SeasonLeaderboardEntry {
  userId: UserId;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  rank: number;
  tier: string;
  winRate: number;
  rewardsDistributed?: boolean;
}
