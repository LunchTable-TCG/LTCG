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
export type UserRole = NonNullable<Doc<"users">["role"]>;

// Shop types
export type ProductType = Doc<"shopProducts">["type"];
export type PurchaseStatus = Doc<"purchases">["status"];

// Tournament types
export type TournamentStatus = Doc<"tournaments">["status"];
export type TournamentFormat = Doc<"tournaments">["format"];

// Quest types
export type QuestType = Doc<"quests">["type"];
export type QuestStatus = Doc<"quests">["status"];

// Achievement types
export type AchievementCategory = Doc<"achievementDefinitions">["category"];

// Story types
export type StageStatus = Doc<"storyStages">["status"];

// Promo code types
export type PromoCodeType = Doc<"promoCodes">["type"];
export type PromoCodeStatus = Doc<"promoCodes">["status"];

// Alert types
export type AlertSeverity = Doc<"alertHistory">["severity"];
export type AlertStatus = Doc<"alertHistory">["status"];

// Common ID types for easy reference
export type CardId = Id<"cardDefinitions">;
export type UserId = Id<"users">;
export type SeasonId = Id<"seasons">;
export type ProductId = Id<"shopProducts">;
export type TournamentId = Id<"tournaments">;
export type QuestId = Id<"quests">;
export type AchievementId = Id<"achievementDefinitions">;
export type PromoCodeId = Id<"promoCodes">;
export type TemplateId = Id<"templates">;
export type BattlePassId = Id<"battlePasses">;
export type ChapterId = Id<"storyChapters">;
export type StageId = Id<"storyStages">;
export type FeatureFlagId = Id<"featureFlags">;
export type LaunchChecklistItemId = Id<"launchChecklistItems">;

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
}
