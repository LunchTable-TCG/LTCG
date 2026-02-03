/**
 * Convex Validator Type Exports
 *
 * This file exports TypeScript types inferred from Convex validators.
 * Add new types here when you add validators to convex/lib/returnValidators.ts.
 *
 * Usage: import type { Achievement, Quest } from "@/types/generated";
 */

import type { Infer } from "convex/values";
import type {
  achievementUnlockedValidator,
  achievementValidator,
  auctionBidValidator,
  availableChapterValidator,
  battleAttemptValidator,
  battleHistoryEntryValidator,
  cachedLeaderboardValidator,
  cardResultValidator,
  cardWithOwnershipValidator,
  chapterDefinitionValidator,
  currencyTransactionValidator,
  deckCardEntryValidator,
  deckStatsValidator,
  deckWithCardsValidator,
  deckWithCountValidator,
  friendInfoValidator,
  friendOperationValidator,
  friendRequestValidator,
  fullUserValidator,
  gameLobbyValidator,
  leaderboardEntryValidator,
  lobbyForCleanupValidator,
  marketplaceListingValidator,
  marketplaceListingsValidator,
  matchHistoryEntryValidator,
  matchmakingStatusValidator,
  packOpeningHistoryValidator,
  packPurchaseValidator,
  playerBadgeValidator,
  playerBadgesValidator,
  playerBalanceValidator,
  playerProgressValidator,
  questClaimValidator,
  questRewardValidator,
  queueStatsValidator,
  shopProductValidator,
  storyBattleCompletionValidator,
  storyBattleStartValidator,
  storyProgressRecordValidator,
  successResponseValidator,
  transactionHistoryValidator,
  userInfoValidator,
  userProfileValidator,
  userQuestValidator,
  userRankValidator,
} from "../../../../convex/lib/returnValidators";

export type UserProfile = Infer<typeof userProfileValidator>;
export type UserInfo = Infer<typeof userInfoValidator>;
export type FullUser = Infer<typeof fullUserValidator>;
export type PlayerBalance = Infer<typeof playerBalanceValidator>;
export type CurrencyTransaction = Infer<typeof currencyTransactionValidator>;
export type TransactionHistory = Infer<typeof transactionHistoryValidator>;
export type CardResult = Infer<typeof cardResultValidator>;
export type PackPurchase = Infer<typeof packPurchaseValidator>;
export type FriendInfo = Infer<typeof friendInfoValidator>;
export type FriendRequest = Infer<typeof friendRequestValidator>;
export type FriendOperation = Infer<typeof friendOperationValidator>;
export type GameLobby = Infer<typeof gameLobbyValidator>;
export type LobbyForCleanup = Infer<typeof lobbyForCleanupValidator>;
export type QuestReward = Infer<typeof questRewardValidator>;
export type QuestClaim = Infer<typeof questClaimValidator>;
export type UserQuest = Infer<typeof userQuestValidator>;
export type Achievement = Infer<typeof achievementValidator>;
export type AchievementUnlocked = Infer<typeof achievementUnlockedValidator>;
export type MatchmakingStatus = Infer<typeof matchmakingStatusValidator>;
export type QueueStats = Infer<typeof queueStatsValidator>;
export type LeaderboardEntry = Infer<typeof leaderboardEntryValidator>;
export type CachedLeaderboard = Infer<typeof cachedLeaderboardValidator>;
export type UserRank = Infer<typeof userRankValidator>;
export type SuccessResponse = Infer<typeof successResponseValidator>;
export type CardWithOwnership = Infer<typeof cardWithOwnershipValidator>;
export type DeckWithCount = Infer<typeof deckWithCountValidator>;
export type DeckCardEntry = Infer<typeof deckCardEntryValidator>;
export type DeckWithCards = Infer<typeof deckWithCardsValidator>;
export type DeckStats = Infer<typeof deckStatsValidator>;
export type MarketplaceListing = Infer<typeof marketplaceListingValidator>;
export type MarketplaceListings = Infer<typeof marketplaceListingsValidator>;
export type AuctionBid = Infer<typeof auctionBidValidator>;
export type StoryProgressRecord = Infer<typeof storyProgressRecordValidator>;
export type PlayerProgress = Infer<typeof playerProgressValidator>;
export type ChapterDefinition = Infer<typeof chapterDefinitionValidator>;
export type AvailableChapter = Infer<typeof availableChapterValidator>;
export type PlayerBadge = Infer<typeof playerBadgeValidator>;
export type PlayerBadges = Infer<typeof playerBadgesValidator>;
export type BattleAttempt = Infer<typeof battleAttemptValidator>;
export type StoryBattleStart = Infer<typeof storyBattleStartValidator>;
export type StoryBattleCompletion = Infer<typeof storyBattleCompletionValidator>;
export type ShopProduct = Infer<typeof shopProductValidator>;
export type PackOpeningHistory = Infer<typeof packOpeningHistoryValidator>;
export type MatchHistoryEntry = Infer<typeof matchHistoryEntryValidator>;
export type BattleHistoryEntry = Infer<typeof battleHistoryEntryValidator>;
