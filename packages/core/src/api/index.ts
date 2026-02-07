/**
 * @module @ltcg/core/api
 *
 * Comprehensive typed API references for all Convex functions.
 * Use these instead of `apiAny` for full type safety across the monorepo.
 *
 * @example
 * ```typescript
 * import { TypedAPI } from "@ltcg/core/api";
 * import { api } from "@convex/_generated/api";
 *
 * // Cast api to typed version
 * const typedApi = api as unknown as TypedAPI;
 *
 * // Now all paths are fully typed
 * useQuery(typedApi.core.users.currentUser, {});
 * useMutation(typedApi.economy.marketplace.createListing, { ... });
 * ```
 */

import type { TypedAction, TypedMutation, TypedQuery } from "../types/convex";

import type {
  BattlePassStatus,
  CardDefinition,
  CardListing,
  CardVariant,
  Difficulty,
  GameLobby,
  GameState,
  Id,
  MarketOverview,
  Notification,
  PlayerBalance,
  PriceHistoryEntry,
  Rarity,
  StoryChapter,
  StoryProgress,
  TokenBalance,
  Tournament,
  TransactionHistoryResponse,
  User,
  UserCard,
  UserDeck,
  UserInfo,
  UserProfile,
  UserWallet,
} from "../types/api";

// =============================================================================
// Base Argument Type
// =============================================================================

/**
 * Base type for function arguments that satisfies DefaultFunctionArgs.
 * All argument interfaces must extend this to be compatible with TypedQuery etc.
 */
type BaseArgs = Record<string, unknown>;

/** Empty args for queries with no parameters */
type EmptyArgs = Record<string, never>;

// =============================================================================
// Admin Analytics Return Types
// =============================================================================

/** Economy metric data point - matches backend getEconomyMetrics return */
export interface EconomyMetric {
  date: string;
  goldInCirculation: number;
  goldGenerated: number;
  goldSpent: number;
  netGoldChange: number;
  dustInCirculation: number;
  totalCards: number;
  packsOpened: number;
  activeListings: number;
  salesVolume: number;
  medianPlayerGold: number;
  top10PercentGold: number;
}

/** Economy trend data point - matches backend getEconomyTrends return */
/** Economy trend data point - matches backend getEconomyTrends return */
export interface EconomyTrend {
  date: string;
  goldGenerated: number;
  goldSpent: number;
  netGoldChange: number;
  packsOpened: number;
  marketplaceSales: number;
  marketplaceVolume: number;
}

/** Economy snapshot from getCurrentEconomySnapshot */
export interface EconomySnapshot {
  totalGoldInCirculation: number;
  totalGemsInCirculation: number;
  averageGoldPerPlayer: number;
  averageGemsPerPlayer: number;
  totalTransactions: number;
  totalCards: number;
  totalPacks: number;
  totalListings: number;
  goldInCirculation: number;
  weeklyNetGoldChange: number;
  dustInCirculation: number;
  activeListings: number;
  medianPlayerGold: number;
  top10PercentShare: number;
  top1PercentShare: number;
  inflationTrend: "inflationary" | "deflationary" | "stable";
  timestamp: number;
}

/** Wealth distribution item (from getWealthDistribution) */
export interface WealthDistributionItem {
  label: string;
  count: number;
  percentage: number;
}

/** Wealth distribution data from getWealthDistribution */
export interface WealthDistribution {
  distribution: WealthDistributionItem[];
  medianGold: number;
  averageGold: number;
  totalPlayers: number;
  giniCoefficient: number;
}

/** Card stats by archetype */
export interface CardArchetypeStats {
  archetype: string;
  totalCards: number;
  uniqueCards: number;
  avgWinRate: number;
  avgPlayRate: number;
  distribution: Record<string, number>;
}

/** Card win/play rate stats */
export interface CardRateStats {
  cardId: Id<"cardDefinitions">;
  cardName: string;
  archetype: string;
  rarity: string;
  winRate: number;
  playRate: number;
  gamesPlayed: number;
}

/** Game stats from getGameStats */
export interface GameStats {
  totalGames: number;
  completedGames: number;
  activeGames: number;
  averageGameDuration: number;
  averageTurns: number;
}

/** Marketplace stats from getMarketplaceStats */
export interface MarketplaceStats {
  totalListings: number;
  byStatus: {
    active: number;
    sold: number;
    cancelled: number;
    expired: number;
  };
  salesLast24h: number;
  salesLastWeek: number;
  volumeLast24h: number;
  volumeLastWeek: number;
  priceAnomaliesCount: number;
  // Legacy fields for backward compatibility
  activeListings?: number;
  activeListingsCount?: number;
  fixedListings?: number;
  auctionListings?: number;
  totalTransactions?: number;
  totalVolume?: number;
  averagePrice?: number;
  volume24h?: number;
  sales24h?: number;
}

/** Player distribution stats */
export interface PlayerDistributionStats {
  totalPlayers: number;
  newPlayersToday: number;
  activePlayersToday: number;
  distribution: { level: number; count: number }[];
}

/** Player retention stats */
export interface PlayerRetentionStats {
  day1: number;
  day7: number;
  day30: number;
  cohorts: { date: string; day1: number; day7: number; day30: number }[];
}

/** Matchmaking stats from getMatchmakingStats */
export interface MatchmakingStats {
  averageQueueTime: number;
  matchSuccessRate: number;
  playersInQueue: number;
}

/** Matchmaking health from getMatchmakingHealth */
export interface MatchmakingHealth {
  status: "healthy" | "degraded" | "unhealthy";
  averageWaitTime: number;
  queueDepth: number;
  matchQuality: number;
  ranked: {
    tierDistribution: {
      bronze: number;
      silver: number;
      gold: number;
      platinum: number;
      diamond: number;
    };
    healthScore: number;
    avgQueueTime: number;
    avgRatingDiff: number;
    totalMatchesToday: number;
  };
  casual: {
    healthScore: number;
    avgQueueTime: number;
    totalMatchesToday: number;
  };
}

/** Daily active stats from getDailyActiveStats */
export interface DailyStat {
  date: string;
  dau: number;
  dauHumans: number;
  dauAi: number;
  newUsers: number;
  returningUsers: number;
  totalGames: number;
  rankedGames: number;
  casualGames: number;
  day1Retention: number;
  day7Retention: number;
  averageGameDuration: number;
}

/** Skill/Rating distribution from getSkillDistribution */
export interface SkillDistribution {
  distribution: {
    under800: number;
    r800_1000: number;
    r1000_1200: number;
    r1200_1400: number;
    r1400_1600: number;
    r1600_1800: number;
    r1800_2000: number;
    r2000_2200: number;
    over2200: number;
  };
  summary: { totalPlayers: number; average: number; median: number };
  percentiles: { p25: number; p50: number; p75: number; p90: number; p99: number };
}

/** Matchmaking stats detailed from getMatchmakingStatsDetailed */
export interface MatchmakingStatsDetailed {
  date: string;
  queueType: string;
  avgQueueTime: number;
  avgRatingDiff: number;
  fairMatches: number;
  aiFilledMatches: number;
  totalMatches: number;
  avgWaitTime: number;
}

/** Retention overview from getRetentionOverview */
export interface RetentionOverview {
  day1: number;
  day3: number;
  day7: number;
  day14: number;
  day30: number;
  day1Avg: number;
  day7Avg: number;
  day30Avg: number;
  trend: "improving" | "declining" | "stable";
}

/** Engaged player from getTopEngagedPlayers */
export interface EngagedPlayer {
  rank: number;
  userId: Id<"users">;
  username: string;
  gamesPlayed: number;
  daysActive: number;
  avgGamesPerDay: number;
  lastActiveAt: number;
  engagementScore: number;
}

/** Player engagement from getPlayerEngagement */
export interface PlayerEngagement {
  userId: Id<"users">;
  username?: string;
  period: { days: number; cutoffTime: number };
  metrics: {
    totalGames: number;
    daysActive: number;
    avgGamesPerDay: number;
    engagementRate: number;
    lastActiveAt: number;
    daysSinceLastActive: number;
  };
  timestamp: number;
}

/** Admin role info */
export interface AdminRoleInfo {
  _id: Id<"adminRoles">;
  userId: Id<"users">;
  role: "moderator" | "admin" | "superadmin";
  grantedBy: Id<"users">;
  grantedAt: number;
  expiresAt?: number;
  grantNote?: string;
  username?: string;
  email?: string;
}

/** Alert channel */
export interface AlertChannel {
  _id: Id<"alertChannels">;
  name: string;
  type: "email" | "webhook" | "slack" | "discord";
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: number;
}

/** Alert rule */
export interface AlertRule {
  _id: Id<"alertRules">;
  name: string;
  condition: string;
  threshold: number;
  channelId: Id<"alertChannels">;
  isActive: boolean;
  lastTriggered?: number;
  createdAt: number;
}

/** Alert history entry */
export interface AlertHistoryEntry {
  _id: Id<"alertHistory">;
  ruleId: Id<"alertRules">;
  ruleName: string;
  message: string;
  severity: "info" | "warning" | "critical";
  triggeredAt: number;
  acknowledged: boolean;
  acknowledgedBy?: Id<"users">;
  acknowledgedAt?: number;
}

/** Battle pass season */
export interface BattlePassSeasonData {
  _id: Id<"battlePassSeasons">;
  seasonId: Id<"seasons">;
  name: string;
  startDate: number;
  endDate: number;
  totalTiers: number;
  xpPerTier: number;
  isActive: boolean;
  createdAt: number;
}

/** Battle pass tier */
export interface BattlePassTier {
  _id: Id<"battlePassTiers">;
  seasonId: Id<"battlePassSeasons">;
  tier: number;
  freeReward?: { type: string; amount: number };
  premiumReward?: { type: string; amount: number };
  xpRequired: number;
}

/** Season data */
export interface SeasonData {
  _id: Id<"seasons">;
  _creationTime: number;
  number: number;
  name: string;
  status: "upcoming" | "active" | "ended";
  startDate: number;
  endDate: number;
  description?: string;
  rankResetType: "full" | "soft" | "none";
  softResetPercentage?: number;
  rewards: Array<{
    tier: string;
    minElo: number;
    goldReward: number;
    gemsReward: number;
    cardPackReward?: number;
    exclusiveCardId?: Id<"cardDefinitions">;
  }>;
  createdBy: Id<"users">;
  createdAt: number;
}

/** Promo code */
export interface PromoCodeData {
  _id: Id<"promoCodes">;
  code: string;
  description?: string;
  rewardType: string;
  rewardAmount: number;
  rewardData?: Record<string, unknown>;
  maxUses?: number;
  currentUses: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
  createdBy: Id<"users">;
}

/** Shop product */
export interface ShopProduct {
  _id: Id<"shopProducts">;
  name: string;
  description?: string;
  type: string;
  price: number;
  currency: "gold" | "gems" | "usd";
  contents?: Record<string, unknown>;
  imageUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: number;
}

/** Quest data */
export interface QuestData {
  _id: Id<"quests">;
  name: string;
  description: string;
  type: string;
  target: number;
  rewardType: string;
  rewardAmount: number;
  isActive: boolean;
  isDaily: boolean;
  category?: string;
  sortOrder: number;
}

/** Achievement data */
export interface AchievementData {
  _id: Id<"achievements">;
  name: string;
  description: string;
  category: string;
  tier: number;
  requirement: number;
  rewardType: string;
  rewardAmount: number;
  iconUrl?: string;
  isActive: boolean;
}

/** Story chapter */
export interface StoryChapterData {
  _id: Id<"storyChapters">;
  number: number;
  title: string;
  description?: string;
  requiredLevel: number;
  isActive: boolean;
  stages: number;
}

/** Story stage */
export interface StoryStageData {
  _id: Id<"storyStages">;
  chapterId: Id<"storyChapters">;
  stageNumber: number;
  title: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  enemyDeckId?: Id<"decks">;
  rewards: { type: string; amount: number }[];
  isActive: boolean;
}

/** Template data */
export interface TemplateData {
  _id: Id<"cardTemplates">;
  name: string;
  description?: string;
  baseImageUrl?: string;
  layers: Record<string, unknown>[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Feature flag */
export interface FeatureFlagData {
  _id: Id<"featureFlags">;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  category?: string;
  rolloutPercentage: number;
  targetUsers?: Id<"users">[];
  createdAt: number;
  updatedAt: number;
}

/** Chat message (admin view) */
export interface AdminChatMessage {
  _id: Id<"globalChatMessages">;
  _creationTime: number;
  userId: Id<"users">;
  username?: string;
  message: string;
  createdAt: number;
  isSystem?: boolean;
  isDeleted?: boolean;
  deletedBy?: Id<"users">;
  deletedAt?: number;
}

/** Paginated chat messages response */
export interface AdminChatMessagesResponse {
  messages: AdminChatMessage[];
  totalCount: number;
  hasMore: boolean;
}

/** Chat stats */
export interface AdminChatStats {
  totalMessages: number;
  messagesLastHour: number;
  messagesLast24h: number;
  uniqueUsersToday: number;
  mutedUsersCount: number;
}

/** Muted user info */
export interface AdminMutedUser {
  _id: Id<"users">;
  username?: string;
  mutedUntil: number;
  remainingMinutes: number;
}

/** Moderation report */
export interface ModerationReport {
  _id: Id<"moderationReports">;
  reporterId: Id<"users">;
  targetId: Id<"users">;
  targetType: "user" | "message" | "listing";
  reason: string;
  description?: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  reviewedBy?: Id<"users">;
  reviewedAt?: number;
  resolution?: string;
  createdAt: number;
}

/** Player moderation status */
export interface PlayerModerationStatus {
  userId: Id<"users">;
  username: string;
  isBanned: boolean;
  bannedAt?: number;
  bannedReason?: string;
  isSuspended: boolean;
  suspendedUntil?: number;
  suspendedReason?: string;
  warningCount: number;
  lastWarningAt?: number;
}

// NOTE: ApiKeyData is defined in the Admin API Keys section below

/** Revenue data */
export interface RevenueData {
  date: number;
  totalRevenue: number;
  subscriptions: number;
  oneTimePurchases: number;
  gemPurchases: number;
  refunds: number;
}

/** Sales data */
export interface SalesData {
  _id: Id<"shopSales">;
  productId: Id<"shopProducts">;
  userId: Id<"users">;
  amount: number;
  currency: string;
  createdAt: number;
}

/** RNG config */
export interface RngConfigData {
  _id: Id<"rngConfig">;
  key: string;
  value: number;
  description?: string;
  minValue?: number;
  maxValue?: number;
  updatedAt: number;
  updatedBy: Id<"users">;
}

/** AI config */
export interface AiConfigData {
  _id: Id<"aiConfig">;
  key: string;
  value: string | number | boolean;
  description?: string;
  category: string;
  updatedAt: number;
}

/** AI usage stats */
export interface AiUsageStats {
  totalRequests: number;
  totalTokens: number;
  avgResponseTime: number;
  errorRate: number;
  byModel: Record<string, { requests: number; tokens: number }>;
}

/** Asset data */
export interface AssetData {
  _id: Id<"assets">;
  name: string;
  type: string;
  url: string;
  size: number;
  mimeType: string;
  tags?: string[];
  uploadedBy: Id<"users">;
  uploadedAt: number;
}

/** Branding config */
export interface BrandingConfig {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  siteName: string;
  tagline?: string;
  socialLinks?: Record<string, string>;
}

/** Player info for admin */
export interface AdminPlayerInfo {
  _id: Id<"users">;
  username: string;
  email?: string;
  createdAt: number;
  lastLoginAt?: number;
  level: number;
  xp: number;
  gold: number;
  gems: number;
  gamesPlayed: number;
  gamesWon: number;
  isBanned: boolean;
  isSuspended: boolean;
}

/** Marketplace listing for admin (from listListings) */
export interface AdminMarketplaceListing {
  _id: Id<"marketplaceListings">;
  _creationTime: number;
  sellerId: Id<"users">;
  sellerUsername: string;
  cardDefinitionId: Id<"cardDefinitions">;
  cardName: string;
  cardRarity: string;
  price: number;
  status: "active" | "sold" | "cancelled" | "expired" | "suspended";
  createdAt: number;
  soldAt?: number;
  soldFor?: number;
  buyerId?: Id<"users">;
  listingType: "fixed" | "auction";
  quantity?: number;
  currentBid?: number;
  highestBidderUsername?: string;
  endsAt?: number;
}

/** Detailed marketplace listing (from getListing) */
export interface AdminMarketplaceListingDetail extends AdminMarketplaceListing {
  seller: {
    _id: Id<"users">;
    username?: string;
    accountStatus?: string;
  } | null;
  card: {
    _id: Id<"cardDefinitions">;
    name: string;
    rarity: string;
    archetype: string;
  } | null;
  bids: Array<{
    _id: Id<"auctionBids">;
    bidderId: Id<"users">;
    bidderUsername?: string;
    amount: number;
    bidAmount?: number;
    bidStatus?: string;
    createdAt: number;
  }>;
  sellerOtherListings: number;
  priceStats: {
    activeListings: number;
    avgActivePrice: number;
    minActivePrice: number;
    maxActivePrice: number;
    recentSales: number;
    avgSalePrice: number;
  };
}

/** Paginated marketplace listing response */
export interface AdminMarketplaceListResponse {
  listings: AdminMarketplaceListing[];
  totalCount: number;
  hasMore: boolean;
}

/** Price anomaly data */
export interface PriceAnomalyData {
  listingId: Id<"marketplaceListings">;
  cardDefinitionId?: Id<"cardDefinitions">;
  cardName: string;
  price: number;
  avgPrice: number;
  averagePrice: number;
  deviation: number;
  sellerUsername: string;
  sellerId?: Id<"users">;
}

/** Config setting */
export interface ConfigSetting {
  _id: Id<"config">;
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  description?: string;
  category: string;
  updatedAt: number;
  updatedBy: Id<"users">;
}

/** Tournament data for admin */
export interface AdminTournamentData {
  _id: Id<"tournaments">;
  name: string;
  description?: string;
  startDate: number;
  endDate: number;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  prizePool: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  format: string;
  createdAt: number;
}

/** General feedback analytics (unused, kept for reference) */
export interface GeneralFeedbackAnalytics {
  totalFeedback: number;
  avgRating: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  recentTrend: number;
}

/** Feedback stats */
export interface FeedbackStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  avgRating: number;
}

/** Pack opening entry */
export interface PackOpeningEntry {
  _id: Id<"packOpenings">;
  packType: string;
  cardsReceived: Array<{ cardId: Id<"cardDefinitions">; name: string; rarity: string }>;
  openedAt: number;
}

/** Reward data */
export interface RewardData {
  type: "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";
  amount?: number;
  cardId?: Id<"cardDefinitions">;
  packProductId?: string;
  titleName?: string;
  avatarUrl?: string;
}

/** RNG configuration values */
export interface RngConfigValues {
  rarityWeights: Record<string, number>;
  variantRates: Record<string, number>;
  packMultipliers: Record<string, number>;
  goldPackMultipliers: Record<string, number>;
  pityThresholds: Record<string, number>;
}

/** Battle pass tier definition (from battlePassTiers table) */
export interface BattlePassTierDefinition {
  _id: Id<"battlePassTiers">;
  _creationTime: number;
  battlePassId: Id<"battlePassSeasons">;
  tier: number;
  freeReward?: RewardData;
  premiumReward?: RewardData;
  isMilestone: boolean;
}

/** SEGOC queue item */
export interface SegocQueueItem {
  effectId: string;
  cardId: Id<"cardDefinitions">;
  cardName: string;
  triggerType: string;
  priority: number;
}

/** Player badge */
export interface PlayerBadge {
  badgeId: string;
  displayName: string;
  description: string;
  category: string;
  earnedAt: number;
  iconUrl?: string;
}

/** Story stage data (detailed) */
export interface StoryStageDetail {
  _id: Id<"storyStages">;
  stageNumber: number;
  name: string;
  title?: string;
  description?: string;
  difficulty: string;
  enemyDeckId?: Id<"decks">;
  rewards: RewardData[];
  isActive: boolean;
}

/** Story chapter info for battle */
export interface StoryBattleChapterInfo {
  chapterId: Id<"storyChapters">;
  chapterNumber: number;
  title: string;
  stageNumber: number;
  difficulty: string;
}

/** Story battle attempt result */
export interface StoryBattleResult {
  won: boolean;
  rewards: {
    gold: number;
    xp: number;
    cards: Array<{ cardId: Id<"cardDefinitions">; name: string; rarity: string }>;
  };
  starsEarned: 0 | 1 | 2 | 3;
  levelUp?: { newLevel: number; oldLevel: number };
  newBadges: PlayerBadge[];
  cardsReceived: Array<{
    cardId: Id<"cardDefinitions">;
    name: string;
    rarity: string;
    imageUrl?: string;
  }>;
}

/** Battle history entry */
export interface BattleHistoryEntry {
  _id: Id<"storyBattleAttempts">;
  chapterId: Id<"storyChapters">;
  stageNumber: number;
  difficulty: string;
  result: "win" | "loss" | "abandoned";
  finalLP: number;
  completedAt: number;
}

/** Leaderboard ranking entry */
export interface LeaderboardRankingEntry {
  userId: Id<"users">;
  username?: string;
  rank: number;
  rating: number;
  level: number;
  wins: number;
  losses: number;
  winRate: number;
  isAiAgent: boolean;
}

/** AI tool call */
export interface AIToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

/** AI usage data */
export interface AIUsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Treasury policy rules */
export interface TreasuryPolicyRules {
  maxTransactionAmount?: number;
  dailyLimit?: number;
  allowedRecipients?: string[];
  requiresApproval: boolean;
  minApprovers?: number;
}

/** Treasury wallet data */
export interface TreasuryWalletData {
  _id: Id<"treasuryWallets">;
  name: string;
  address?: string;
  purpose: "fee_collection" | "distribution" | "liquidity" | "reserves";
  type: "custodial" | "multisig" | "program";
  status: "active" | "frozen" | "archived" | "pending" | "failed";
  solBalance: number;
  tokenBalance: number;
  policyId?: Id<"treasuryPolicies">;
  createdAt: number;
}

/** Treasury transaction data */
export interface TreasuryTransactionData {
  _id: Id<"treasuryTransactions">;
  walletId: Id<"treasuryWallets">;
  type: "fee_received" | "distribution" | "transfer" | "swap";
  status: "pending" | "approved" | "submitted" | "confirmed" | "failed";
  amount: number;
  tokenMint: string;
  signature?: string;
  recipientAddress?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  approvals: Array<{ userId: Id<"users">; approvedAt: number }>;
}

/** Token holder data */
export interface TokenHolderData {
  address: string;
  balance: number;
  percentage: number;
  firstBuyAt?: number;
  lastActivityAt?: number;
  isTeamWallet?: boolean;
  label?: string;
}

/** Token distribution bucket */
export interface TokenDistributionBucket {
  range: string;
  minBalance: number;
  maxBalance: number;
  count: number;
  totalBalance: number;
  percentage: number;
}

/** Token metrics */
export interface TokenMetrics {
  _id: Id<"tokenMetrics">;
  priceUsd: number;
  priceChange24h: number;
  marketCapUsd: number;
  volume24h: number;
  liquidity: number;
  holders: number;
  trades24h: number;
  recordedAt: number;
}

/** Token rollup period */
export interface TokenRollupPeriod {
  _id: Id<"tokenRollups">;
  period: "hour" | "day";
  periodStart: number;
  priceOpen: number;
  priceClose: number;
  priceHigh: number;
  priceLow: number;
  volume: number;
  trades: number;
  uniqueTraders: number;
  newHolders: number;
}

/** Token trade data */
export interface TokenTradeData {
  _id: Id<"tokenTrades">;
  type: "buy" | "sell";
  traderAddress: string;
  amountSol: number;
  amountTokens: number;
  pricePerToken: number;
  signature: string;
  isWhale: boolean;
  timestamp: number;
}

/** Alert channel data */
export interface AlertChannelData {
  _id: Id<"alertChannels">;
  type: "in_app" | "push" | "slack" | "discord" | "email";
  name: string;
  config: { webhookUrl?: string; email?: string; minSeverity: "info" | "warning" | "critical" };
  isEnabled: boolean;
  createdAt: number;
  lastTestedAt?: number;
}

/** Alert rule data */
export interface AlertRuleData {
  _id: Id<"alertRules">;
  name: string;
  description?: string;
  triggerType: string;
  conditions: {
    threshold?: number;
    direction?: "above" | "below" | "change";
    timeframeMinutes?: number;
    percentChange?: number;
  };
  severity: "info" | "warning" | "critical";
  cooldownMinutes: number;
  isEnabled: boolean;
  channelIds: Id<"alertChannels">[];
  lastTriggeredAt?: number;
  createdAt: number;
}

/** Alert history data */
export interface AlertHistoryData {
  _id: Id<"alertHistory">;
  ruleId: Id<"alertRules">;
  ruleName: string;
  message: string;
  severity: "info" | "warning" | "critical";
  triggeredAt: number;
  acknowledged: boolean;
  acknowledgedBy?: Id<"users">;
  acknowledgedAt?: number;
  metadata?: Record<string, unknown>;
}

/** Admin notification data */
export interface AdminNotificationData {
  _id: Id<"adminNotifications">;
  userId: Id<"users">;
  alertId: Id<"alertHistory">;
  read: boolean;
  createdAt: number;
}

/** Audit log entry */
export interface AuditLogEntry {
  _id: Id<"auditLog">;
  table: string;
  documentId: string;
  operation: "insert" | "patch" | "delete";
  userId?: Id<"users">;
  changes: Record<string, { old?: unknown; new?: unknown }>;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
}

/** Admin achievement definition */
export interface AdminAchievementDefinition {
  _id: Id<"achievementDefinitions">;
  key: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  requirement: number;
  rewardType: string;
  rewardAmount: number;
  iconUrl?: string;
  isActive: boolean;
  createdAt: number;
}

/** Admin battle pass season data (from getBattlePass) */
export interface AdminBattlePassSeasonData {
  _id: Id<"battlePassSeasons">;
  _creationTime: number;
  seasonId: Id<"seasons">;
  name: string;
  description?: string;
  startDate: number;
  endDate: number;
  totalTiers: number;
  xpPerTier: number;
  status: "upcoming" | "active" | "ended";
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  // Extended fields from getBattlePass
  seasonName: string;
  seasonNumber: number;
  tierCount: number;
  stats: {
    totalPlayers: number;
    premiumPlayers: number;
    freeToPlayPlayers: number;
    averageTier: number;
    premiumConversionRate: number;
  };
  creatorUsername: string;
}

/** Paginated battle pass list response */
export interface AdminBattlePassListResponse {
  battlePasses: AdminBattlePassSeasonData[];
  totalCount: number;
  hasMore: boolean;
}

/** Battle pass overview stats */
export interface AdminBattlePassOverviewStats {
  totalBattlePasses: number;
  activeBattlePass: {
    name: string;
    totalPlayers: number;
    premiumPlayers: number;
    averageTier: number;
    daysRemaining: number;
    tierDistribution: Record<string, number>;
  } | null;
  upcomingCount: number;
  endedCount: number;
}

/** Admin story chapter data */
export interface AdminStoryChapterData {
  _id: Id<"storyChapters">;
  actNumber: number;
  chapterNumber: number;
  title: string;
  description?: string;
  requiredLevel: number;
  isPublished: boolean;
  createdAt: number;
}

/** Admin promo code data */
export interface AdminPromoCodeData {
  _id: Id<"promoCodes">;
  code: string;
  description?: string;
  rewardType: string;
  rewardAmount: number;
  rewardData?: Record<string, unknown>;
  maxUses?: number;
  currentUses: number;
  expiresAt?: number;
  isActive: boolean;
  createdBy: Id<"users">;
  createdAt: number;
}

/** Admin config data */
export interface AdminConfigData {
  _id: Id<"systemConfigs">;
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  description?: string;
  category: string;
  updatedAt: number;
  updatedBy?: Id<"users">;
}

/** Admin shop product data */
export interface AdminShopProductData {
  _id: Id<"shopProducts">;
  productId: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  priceGold?: number;
  priceGems?: number;
  contents?: Record<string, unknown>;
  imageUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: number;
}

/** Admin quest definition data */
export interface AdminQuestDefinitionData {
  _id: Id<"questDefinitions">;
  key: string;
  name: string;
  description: string;
  type: string;
  target: number;
  rewardType: string;
  rewardAmount: number;
  isActive: boolean;
  isDaily: boolean;
  category?: string;
  sortOrder: number;
  createdAt: number;
}

/** Admin tournament data (full) */
export interface AdminTournamentFullData {
  _id: Id<"tournaments">;
  name: string;
  description?: string;
  format: string;
  startDate: number;
  endDate: number;
  registrationDeadline?: number;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  prizePool: number;
  status: "draft" | "registration" | "active" | "completed" | "cancelled";
  createdAt: number;
}

/** Admin template data */
export interface AdminTemplateData {
  _id: Id<"cardTemplates">;
  name: string;
  description?: string;
  cardType: string;
  baseImageUrl?: string;
  layers: Array<{ id: string; type: string; zIndex: number; settings: Record<string, unknown> }>;
  isDefault: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Admin template stats */
export interface AdminTemplateStats {
  total: number;
  byCardType: Record<string, number>;
  defaultTemplates: number;
}

/** Batch user filter */
export interface BatchUserFilter {
  minLevel?: number;
  maxLevel?: number;
  minGold?: number;
  maxGold?: number;
  createdAfter?: number;
  createdBefore?: number;
  hasPlayedRecently?: boolean;
  isPremium?: boolean;
}

/** Preview user data */
export interface PreviewUserData {
  _id: Id<"users">;
  username?: string;
  level: number;
  gold: number;
  createdAt: number;
}

/** Revenue overview */
export interface RevenueOverview {
  totalRevenue: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  avgRevenuePerUser: number;
  topRevenueSource: string;
}

/** Revenue trend point */
export interface RevenueTrendPoint {
  date: number;
  revenue: number;
  transactions: number;
}

/** Pack sales breakdown */
export interface PackSalesBreakdown {
  totalPacksSold: number;
  byPackType: Record<string, { count: number; revenue: number }>;
  avgPackPrice: number;
}

/** Gem purchase metrics */
export interface GemPurchaseMetrics {
  totalGemsPurchased: number;
  totalRevenueUsd: number;
  avgPurchaseSize: number;
  uniqueBuyers: number;
}

/** Top spender data */
export interface TopSpenderData {
  userId: Id<"users">;
  username?: string;
  totalSpent: number;
  transactionCount: number;
}

/** Currency circulation */
export interface CurrencyCirculation {
  goldInCirculation: number;
  gemsInCirculation: number;
  dustInCirculation: number;
  avgGoldPerPlayer: number;
  avgGemsPerPlayer: number;
}

/** Large purchase data */
export interface LargePurchaseData {
  _id: Id<"transactions">;
  userId: Id<"users">;
  username?: string;
  amount: number;
  type: string;
  createdAt: number;
}

/** Admin sale data */
export interface AdminSaleData {
  _id: Id<"sales">;
  name: string;
  description?: string;
  discountPercent: number;
  applicableProducts: string[];
  startDate: number;
  endDate: number;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  priority: number;
  createdAt: number;
}

/** Sale stats */
export interface AdminSaleStats {
  totalUses: number;
  totalDiscount: number;
  uniqueUsers: number;
  topProducts: Array<{ productId: string; uses: number }>;
}

/** RNG config history entry */
export interface RngConfigHistoryEntry {
  _id: Id<"rngConfigHistory">;
  changedBy: Id<"users">;
  changedAt: number;
  changes: Record<string, { old: unknown; new: unknown }>;
}

/** Stripe overview */
export interface StripeOverview {
  totalSubscribers: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  churnRate: number;
}

/** Subscription breakdown */
export interface SubscriptionBreakdown {
  byPlan: Record<string, number>;
  byStatus: Record<string, number>;
}

/** Stripe event data */
export interface StripeEventData {
  _id: Id<"stripeEvents">;
  eventType: string;
  status: "processed" | "failed" | "pending";
  processedAt?: number;
  error?: string;
  createdAt: number;
}

/** Customer subscription details */
export interface CustomerSubscriptionDetails {
  userId: Id<"users">;
  stripeCustomerId?: string;
  subscription?: {
    id: string;
    status: string;
    plan: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  };
  paymentMethods: number;
}

/** AI config item */
export interface AIConfigItem {
  _id: Id<"aiConfig">;
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  description?: string;
  category: string;
  updatedAt: number;
}

/** AI provider status */
export interface AIProviderStatus {
  providers: Record<string, { enabled: boolean; hasApiKey: boolean; lastUsed?: number }>;
  defaultProvider: string;
}

/** AI API key status */
export interface AIApiKeyStatus {
  provider: string;
  hasKey: boolean;
  lastValidated?: number;
  isValid?: boolean;
}

/** AI usage summary */
export interface AIUsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  errorRate: number;
}

/** AI usage record */
export interface AIUsageRecord {
  _id: Id<"aiUsage">;
  model: string;
  feature: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  responseTimeMs: number;
  createdAt: number;
}

/** AI top model stats */
export interface AITopModelStats {
  model: string;
  requests: number;
  tokens: number;
  avgCost: number;
}

/** AI usage by feature */
export interface AIUsageByFeature {
  byFeature: Record<string, { requests: number; tokens: number; cost: number }>;
}

/** Asset metadata */
export interface AssetMetadata {
  _id: Id<"assetMetadata">;
  storageId?: Id<"_storage">;
  blobUrl?: string;
  filename: string;
  folder?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  tags?: string[];
  uploadedBy: Id<"users">;
  uploadedAt: number;
}

/** Asset stats */
export interface AssetStats {
  total: number;
  totalSize: number;
  byType: Record<string, number>;
  byFolder: Record<string, number>;
}

/** Branding folder */
export interface BrandingFolder {
  _id: Id<"brandingFolders">;
  name: string;
  path: string;
  parentId?: Id<"brandingFolders">;
  order: number;
  createdAt: number;
}

/** Branding folder tree node */
export interface BrandingFolderTreeNode extends BrandingFolder {
  children: BrandingFolderTreeNode[];
}

/** Branding asset */
export interface BrandingAsset {
  _id: Id<"brandingAssets">;
  name: string;
  folderId?: Id<"brandingFolders">;
  storageId?: Id<"_storage">;
  blobUrl?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  tags: string[];
  altText?: string;
  description?: string;
  uploadedBy: Id<"users">;
  uploadedAt: number;
}

/** Brand guidelines */
export interface BrandGuidelines {
  _id: Id<"brandGuidelines">;
  section: string;
  content: string;
  updatedAt: number;
  updatedBy?: Id<"users">;
}

/** API key details */
export interface ApiKeyDetails {
  _id: Id<"apiKeys">;
  name: string;
  keyPrefix: string;
  userId: Id<"users">;
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: number;
  expiresAt?: number;
  createdAt: number;
  usageCount: number;
}

/** User analytics */
export interface UserAnalytics {
  userId: Id<"users">;
  totalGamesPlayed: number;
  winRate: number;
  avgGameDuration: number;
  favoriteDeck?: string;
  totalSpent: number;
  accountAge: number;
  lastActive: number;
}

/** Test user data */
export interface TestUserData {
  _id: Id<"users">;
  email?: string;
  username?: string;
  createdAt: number;
  isTestUser: boolean;
}

/** Admin audit log entry */
export interface AdminAuditLogEntry {
  _id: Id<"adminAuditLog">;
  adminId: Id<"users">;
  adminUsername: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

/** Audit log stats */
export interface AuditLogStats {
  total: number;
  byAction: Record<string, number>;
  byAdmin: Record<string, number>;
  avgPerDay: number;
}

/** System stats */
export interface SystemStats {
  totalUsers: number;
  activeUsersToday: number;
  activeGames: number;
  totalGamesPlayed: number;
  totalCards: number;
  marketplaceVolume24h: number;
  serverUptime: number;
}

/** Suspicious activity report */
export interface SuspiciousActivityReport {
  multipleAccounts: Array<{ ip: string; accounts: number }>;
  unusualTrading: Array<{ userId: Id<"users">; reason: string }>;
  rapidLevelGain: Array<{ userId: Id<"users">; levelGain: number; timeframe: number }>;
}

/** Admin list entry */
export interface AdminListEntry {
  _id: Id<"adminRoles">;
  userId: Id<"users">;
  username?: string;
  email?: string;
  role: string;
  grantedAt: number;
  grantedBy: Id<"users">;
}

/** Player profile (admin view) */
export interface AdminPlayerProfile {
  _id: Id<"users">;
  username?: string;
  email?: string;
  createdAt: number;
  lastLoginAt?: number;
  level: number;
  xp: number;
  gold: number;
  gems: number;
  dust: number;
  gamesPlayed: number;
  gamesWon: number;
  rankedElo: number;
  rank: string;
  isBanned: boolean;
  isSuspended: boolean;
  isPremium: boolean;
  walletAddress?: string;
}

/** Player inventory (admin view) */
export interface AdminPlayerInventory {
  cards: Array<{ cardId: Id<"cardDefinitions">; name: string; quantity: number; rarity: string }>;
  decks: Array<{ deckId: Id<"userDecks">; name: string; cardCount: number }>;
  totalCards: number;
  uniqueCards: number;
}

/** Chat message for paginated response */
export interface PaginatedChatMessage {
  _id: Id<"globalChat">;
  userId: Id<"users">;
  username: string;
  content: string;
  createdAt: number;
}

/** Token transaction entry */
export interface TokenTransactionEntry {
  _id: Id<"tokenTransactions">;
  listingId: Id<"marketplaceListings">;
  sellerId: Id<"users">;
  buyerId: Id<"users">;
  cardId: Id<"playerCards">;
  cardName: string;
  tokenAmount: number;
  signature: string;
  completedAt: number;
}

/** Transaction entry (for economy) */
export interface EconomyTransactionEntry {
  _id: Id<"transactions">;
  userId: Id<"users">;
  type: string;
  amount: number;
  currency: "gold" | "gems";
  description: string;
  createdAt: number;
}

/** Spectator game view */
export interface SpectatorGameView {
  lobbyId: Id<"gameLobbies">;
  hostUsername: string;
  opponentUsername: string;
  turnNumber: number;
  currentPhase: string;
  hostLP: number;
  opponentLP: number;
  hostFieldCards: number;
  opponentFieldCards: number;
  spectatorCount: number;
}

// =============================================================================
// Common Argument Types
// =============================================================================

/** Standard pagination arguments */
export interface PaginationArgs extends BaseArgs {
  limit?: number;
  cursor?: string;
}

/** Convex pagination options */
export interface PaginationOpts {
  numItems: number;
  cursor: string | null;
}

/** Standard filter arguments for card queries */
export interface CardFilterArgs extends BaseArgs {
  cardType?: string;
  rarity?: string;
  element?: string;
  search?: string;
}

// =============================================================================
// Common Response Types
// =============================================================================

interface SuccessResponse {
  success: boolean;
  message?: string;
}

interface PaginatedResponse<T> {
  page: T[];
  isDone: boolean;
  continueCursor: string;
}

// =============================================================================
// CORE MODULE TYPES
// =============================================================================

export interface CoreUserQueries {
  currentUser: TypedQuery<EmptyArgs, User | null>;
  getUser: TypedQuery<{ userId: Id<"users"> } & BaseArgs, UserInfo | null>;
  getUserByUsername: TypedQuery<{ username: string } & BaseArgs, UserInfo | null>;
  getUserProfile: TypedQuery<{ username: string } & BaseArgs, UserProfile | null>;
  getUserStats: TypedQuery<{ userId: Id<"users"> } & BaseArgs, UserProfile | null>;
}

export interface CoreUserMutations {
  setMyUsername: TypedMutation<{ username: string } & BaseArgs, SuccessResponse>;
  adminUpdateUsername: TypedMutation<
    { userId: Id<"users">; newUsername: string } & BaseArgs,
    SuccessResponse
  >;
}

export interface CoreCardQueries {
  getAllCardDefinitions: TypedQuery<EmptyArgs, CardDefinition[]>;
  getCardDefinition: TypedQuery<
    { cardId: Id<"cardDefinitions"> } & BaseArgs,
    CardDefinition | null
  >;
  getUserCards: TypedQuery<EmptyArgs, UserCard[]>;
  getUserFavoriteCards: TypedQuery<EmptyArgs, UserCard[]>;
  getUserCollectionStats: TypedQuery<
    EmptyArgs,
    { uniqueCards: number; totalCards: number; favoriteCount: number }
  >;
}

export interface CoreCardMutations {
  toggleFavorite: TypedMutation<
    { playerCardId: string } & BaseArgs,
    { success: boolean; isFavorite: boolean }
  >;
  addCardsToInventory: TypedMutation<
    { cardDefinitionId: Id<"cardDefinitions">; quantity: number } & BaseArgs,
    { success: boolean; newQuantity: number }
  >;
  giveStarterCollection: TypedMutation<EmptyArgs, { success: boolean; cardsAdded: number }>;
}

export interface CoreDeckQueries {
  getUserDecks: TypedQuery<EmptyArgs, UserDeck[]>;
  getUserDecksPaginated: TypedQuery<
    { paginationOpts: PaginationOpts } & BaseArgs,
    PaginatedResponse<UserDeck>
  >;
  getDeckWithCards: TypedQuery<{ deckId: Id<"userDecks"> } & BaseArgs, UserDeck | null>;
  getDeckStats: TypedQuery<
    { deckId: Id<"userDecks"> } & BaseArgs,
    {
      elementDistribution: Record<string, number>;
      rarityDistribution: Record<string, number>;
      avgCost: number;
      cardTypeDistribution: Record<string, number>;
    } | null
  >;
  validateDeck: TypedQuery<
    { deckId: Id<"userDecks"> } & BaseArgs,
    { isValid: boolean; errors: string[]; warnings: string[]; totalCards: number }
  >;
}

export interface CoreDeckMutations {
  createDeck: TypedMutation<
    { name: string; description?: string } & BaseArgs,
    { deckId: Id<"userDecks"> }
  >;
  saveDeck: TypedMutation<
    {
      deckId: Id<"userDecks">;
      cards: Array<{ cardDefinitionId: Id<"cardDefinitions">; quantity: number }>;
    } & BaseArgs,
    SuccessResponse
  >;
  renameDeck: TypedMutation<
    { deckId: Id<"userDecks">; newName: string } & BaseArgs,
    SuccessResponse
  >;
  deleteDeck: TypedMutation<
    { deckId: Id<"userDecks"> } & BaseArgs,
    { success: boolean; newActiveDeckId?: Id<"userDecks"> | null }
  >;
  duplicateDeck: TypedMutation<
    { sourceDeckId: Id<"userDecks">; newName: string } & BaseArgs,
    { deckId: Id<"userDecks"> }
  >;
  setActiveDeck: TypedMutation<{ deckId: Id<"userDecks"> } & BaseArgs, SuccessResponse>;
  selectStarterDeck: TypedMutation<
    {
      deckCode:
        | "INFERNAL_DRAGONS"
        | "ABYSSAL_DEPTHS"
        | "IRON_LEGION"
        | "STORM_RIDERS"
        | "NECRO_EMPIRE";
    } & BaseArgs,
    {
      success: boolean;
      deckId: Id<"userDecks">;
      deckName: string;
      cardsReceived: number;
      deckSize: number;
    }
  >;
}

export interface CoreTutorialQueries {
  getTutorialStatus: TypedQuery<
    EmptyArgs,
    {
      needsTutorial: boolean;
      completed: boolean;
      lastMoment: number;
      dismissCount: number;
      shouldShowResumePrompt: boolean;
    } | null
  >;
  getHelpModeEnabled: TypedQuery<EmptyArgs, boolean | null>;
}

export interface CoreTutorialMutations {
  updateTutorialProgress: TypedMutation<{ moment: number } & BaseArgs, SuccessResponse>;
  completeTutorial: TypedMutation<EmptyArgs, SuccessResponse>;
  dismissTutorial: TypedMutation<EmptyArgs, { success: boolean; dismissCount: number }>;
  resetTutorial: TypedMutation<EmptyArgs, SuccessResponse>;
  setHelpModeEnabled: TypedMutation<{ enabled: boolean } & BaseArgs, SuccessResponse>;
  initializeTutorial: TypedMutation<EmptyArgs, SuccessResponse>;
}

export interface CoreUserPreferencesQueries {
  getPreferences: TypedQuery<
    EmptyArgs,
    {
      notifications: Record<string, boolean>;
      display: Record<string, unknown>;
      game: Record<string, unknown>;
      privacy: Record<string, boolean>;
    }
  >;
}

export interface CoreUserPreferencesMutations {
  updatePreferences: TypedMutation<
    {
      notifications?: Record<string, boolean>;
      display?: Record<string, unknown>;
      game?: Record<string, unknown>;
      privacy?: Record<string, boolean>;
    } & BaseArgs,
    null
  >;
  updateUsername: TypedMutation<
    { username: string } & BaseArgs,
    { success: boolean; error?: string }
  >;
  updateBio: TypedMutation<{ bio: string } & BaseArgs, null>;
  changePassword: TypedMutation<
    { currentPassword: string; newPassword: string } & BaseArgs,
    { success: boolean; error?: string }
  >;
  deleteAccount: TypedMutation<
    { confirmPassword: string } & BaseArgs,
    { success: boolean; error?: string }
  >;
}

// =============================================================================
// ECONOMY MODULE TYPES
// =============================================================================

export interface EconomyQueries {
  getPlayerBalance: TypedQuery<EmptyArgs, PlayerBalance>;
  getTransactionHistory: TypedQuery<
    { page?: number; currencyType?: "gold" | "gems" } & BaseArgs,
    TransactionHistoryResponse
  >;
  getTransactionHistoryPaginated: TypedQuery<
    { paginationOpts: PaginationOpts; currencyType?: "gold" | "gems" } & BaseArgs,
    PaginatedResponse<EconomyTransactionEntry>
  >;
}

export interface EconomyMutations {
  redeemPromoCode: TypedMutation<
    { code: string } & BaseArgs,
    { success: boolean; rewardDescription: string; cardsReceived?: CardDefinition[] }
  >;
}

export interface MarketplaceQueries {
  getMarketplaceListings: TypedQuery<
    {
      rarity?: Rarity;
      archetype?: string;
      listingType?: string;
      sortBy?: string;
      page?: number;
    } & BaseArgs,
    { listings: CardListing[]; page: number; pageSize: number; total: number; hasMore: boolean }
  >;
  getUserListings: TypedQuery<EmptyArgs, CardListing[]>;
  getAuctionBidHistory: TypedQuery<
    { listingId: Id<"marketplaceListings"> } & BaseArgs,
    Array<{ bidderId: Id<"users">; amount: number; timestamp: number }>
  >;
}

export interface MarketplaceMutations {
  createListing: TypedMutation<
    {
      cardDefinitionId: Id<"cardDefinitions">;
      quantity: number;
      listingType: string;
      price: number;
      duration?: number;
    } & BaseArgs,
    { success: boolean; listingId: Id<"marketplaceListings"> }
  >;
  cancelListing: TypedMutation<
    { listingId: Id<"marketplaceListings"> } & BaseArgs,
    SuccessResponse
  >;
  buyNow: TypedMutation<
    { listingId: Id<"marketplaceListings"> } & BaseArgs,
    { success: boolean; price: number; platformFee: number; totalCost: number }
  >;
  placeBid: TypedMutation<
    { listingId: Id<"marketplaceListings">; bidAmount: number } & BaseArgs,
    { success: boolean; bidAmount: number; currentBid: number }
  >;
  claimAuctionWin: TypedMutation<
    { listingId: Id<"marketplaceListings"> } & BaseArgs,
    { success: boolean; finalPrice: number; platformFee: number }
  >;
}

export interface ShopQueries {
  getShopProducts: TypedQuery<
    EmptyArgs,
    Array<{
      _id: Id<"shopProducts">;
      productId: string;
      name: string;
      description: string;
      price: number;
      currency: "gold" | "gems";
      category: string;
      imageUrl?: string;
    }>
  >;
  getPackOpeningHistory: TypedQuery<
    { page?: number } & BaseArgs,
    { history: PackOpeningEntry[]; hasMore: boolean }
  >;
  getPackOpeningHistoryPaginated: TypedQuery<
    { paginationOpts: PaginationOpts } & BaseArgs,
    PaginatedResponse<PackOpeningEntry>
  >;
}

export interface ShopMutations {
  purchasePack: TypedMutation<
    { productId: string; useGems: boolean } & BaseArgs,
    {
      success: boolean;
      productName: string;
      cardsReceived: CardDefinition[];
      currencyUsed: "gold" | "gems";
      amountPaid: number;
    }
  >;
  purchaseBox: TypedMutation<
    { productId: string; useGems: boolean } & BaseArgs,
    {
      success: boolean;
      productName: string;
      packsOpened: number;
      bonusCards: number;
      cardsReceived: CardDefinition[];
      currencyUsed: "gold" | "gems";
      amountPaid: number;
    }
  >;
  purchaseCurrencyBundle: TypedMutation<
    { productId: string } & BaseArgs,
    { success: boolean; productName: string; gemsSpent: number; goldReceived: number }
  >;
}

export interface DailyRewardsQueries {
  getDailyRewardStatus: TypedQuery<
    EmptyArgs,
    {
      dailyPack: { canClaim: boolean; resetAt: number };
      loginStreak: { canClaim: boolean; currentStreak: number; reward: number };
      weeklyJackpot: { canClaim: boolean; resetAt: number };
    }
  >;
  getRewardHistory: TypedQuery<
    { limit?: number } & BaseArgs,
    Array<{ type: string; timestamp: number; reward: RewardData }>
  >;
}

export interface DailyRewardsMutations {
  claimDailyPack: TypedMutation<EmptyArgs, { success: boolean; cardsReceived: CardDefinition[] }>;
  claimLoginStreak: TypedMutation<
    EmptyArgs,
    { success: boolean; goldReceived: number; currentStreak: number }
  >;
  claimWeeklyJackpot: TypedMutation<
    EmptyArgs,
    { success: boolean; won: boolean; variant?: CardVariant; card?: CardDefinition }
  >;
}

export interface GemPurchasesQueries {
  getGemPackages: TypedQuery<
    EmptyArgs,
    Array<{ packageId: string; gems: number; priceUsd: number; bonusPercent?: number }>
  >;
  getGemPurchaseHistory: TypedQuery<
    { limit?: number } & BaseArgs,
    Array<{ purchaseId: Id<"tokenGemPurchases">; gems: number; timestamp: number; status: string }>
  >;
  getPendingPurchases: TypedQuery<
    EmptyArgs,
    Array<{ purchaseId: Id<"tokenGemPurchases">; expectedGems: number; expiresAt: number }>
  >;
}

export interface GemPurchasesMutations {
  createPendingPurchase: TypedMutation<
    {
      packageId: string;
      tokenAmount: number;
      tokenPriceUsd: number;
      expectedSignature?: string;
    } & BaseArgs,
    { purchaseId: Id<"tokenGemPurchases">; gemsToReceive: number; expiresAt: number }
  >;
  updatePurchaseSignature: TypedMutation<
    { purchaseId: Id<"tokenGemPurchases">; solanaSignature: string } & BaseArgs,
    SuccessResponse
  >;
}

export interface GemPurchasesActions {
  getTokenPrice: TypedAction<EmptyArgs, { usdCents: number; cachedAt: number; fresh: boolean }>;
  verifyAndConfirmPurchase: TypedAction<
    { solanaSignature: string } & BaseArgs,
    { success: boolean; reason?: string; gemsCredited?: number }
  >;
}

export interface PriceHistoryQueries {
  getCardPriceHistory: TypedQuery<
    {
      cardDefinitionId?: Id<"cardDefinitions">;
      timeRange?: string;
      currencyType?: string;
    } & BaseArgs,
    PriceHistoryEntry[]
  >;
  getTopTradedCards: TypedQuery<
    { limit?: number; timeRange?: "7d" | "30d" | "90d" | "all" } & BaseArgs,
    Array<{ cardId: Id<"cardDefinitions">; name: string; volume: number; avgPrice: number }>
  >;
  getMarketOverview: TypedQuery<EmptyArgs, MarketOverview>;
}

export interface TokenBalanceQueries {
  getTokenBalance: TypedQuery<EmptyArgs, TokenBalance | null>;
}

export interface TokenBalanceMutations {
  requestBalanceRefresh: TypedMutation<EmptyArgs, SuccessResponse>;
}

export interface TokenMarketplaceQueries {
  getTokenListings: TypedQuery<
    { limit?: number; cursor?: string; cardType?: string; rarity?: string } & BaseArgs,
    { listings: CardListing[]; nextCursor?: string; hasMore: boolean }
  >;
  getUserTokenListings: TypedQuery<EmptyArgs, CardListing[]>;
  getUserPendingPurchases: TypedQuery<
    EmptyArgs,
    Array<{
      _id: Id<"pendingTokenPurchases">;
      listingId: Id<"marketplaceListings">;
      expiresAt: number;
    }>
  >;
  getTokenTransactionHistory: TypedQuery<
    { paginationOpts: PaginationOpts } & BaseArgs,
    PaginatedResponse<TokenTransactionEntry>
  >;
}

export interface TokenMarketplaceMutations {
  createTokenListing: TypedMutation<
    { cardId: Id<"playerCards">; price: number } & BaseArgs,
    { success: boolean; listingId: Id<"marketplaceListings"> }
  >;
  cancelTokenListing: TypedMutation<
    { listingId: Id<"marketplaceListings"> } & BaseArgs,
    SuccessResponse
  >;
  initiateTokenPurchase: TypedMutation<
    { listingId: Id<"marketplaceListings"> } & BaseArgs,
    { pendingPurchaseId: Id<"pendingTokenPurchases">; transactionBase64: string; expiresAt: number }
  >;
  submitSignedTransaction: TypedMutation<
    {
      pendingPurchaseId: Id<"pendingTokenPurchases">;
      signedTransactionBase64: string;
      transactionSignature?: string;
    } & BaseArgs,
    SuccessResponse
  >;
  cancelPendingPurchase: TypedMutation<
    { pendingPurchaseId: Id<"pendingTokenPurchases"> } & BaseArgs,
    SuccessResponse
  >;
}

export interface RngConfigQueries {
  getRngConfig: TypedQuery<EmptyArgs, { current: RngConfigValues; defaults: RngConfigValues }>;
}

export interface SalesQueries {
  getActiveSales: TypedQuery<
    EmptyArgs,
    Array<{
      _id: Id<"sales">;
      name: string;
      discountPercent: number;
      priority: number;
      endsAt: number;
    }>
  >;
  getSalesForProduct: TypedQuery<
    { productId: string } & BaseArgs,
    Array<{ _id: Id<"sales">; name: string; discountPercent: number }>
  >;
  getDiscountedPrice: TypedQuery<
    { productId: string } & BaseArgs,
    {
      originalGold?: number;
      originalGems?: number;
      discountedGold?: number;
      discountedGems?: number;
      discountPercent: number;
      saleId: Id<"sales">;
      saleName: string;
    } | null
  >;
  getAvailableSalesForUser: TypedQuery<
    EmptyArgs,
    Array<{ _id: Id<"sales">; name: string; discountPercent: number }>
  >;
  getSaleUsageHistory: TypedQuery<
    { limit?: number } & BaseArgs,
    Array<{ saleId: Id<"sales">; productId: string; usedAt: number }>
  >;
}

export interface SalesMutations {
  recordSaleUsage: TypedMutation<
    {
      saleId: string;
      productId: string;
      originalPrice: number;
      discountedPrice: number;
    } & BaseArgs,
    SuccessResponse
  >;
}

// =============================================================================
// GAMEPLAY MODULE TYPES
// =============================================================================

export interface GameLobbyQueries {
  listWaitingLobbies: TypedQuery<
    { mode?: "casual" | "ranked" | "pvp" | "all"; userRating?: number } & BaseArgs,
    Array<{
      id: Id<"gameLobbies">;
      hostUsername: string;
      hostRank: string;
      hostRating: number;
      deckArchetype: string;
      mode: string;
      createdAt: number;
      isPrivate: boolean;
    }>
  >;
  getActiveLobby: TypedQuery<{ userId?: Id<"users"> } & BaseArgs, GameLobby | null>;
  getIncomingChallenge: TypedQuery<
    EmptyArgs,
    {
      _id: Id<"gameLobbies">;
      hostId: Id<"users">;
      hostUsername: string;
      hostRank: string;
      mode: string;
      createdAt: number;
    } | null
  >;
  getLobbyDetails: TypedQuery<{ lobbyId: Id<"gameLobbies"> } & BaseArgs, GameLobby | null>;
  getMyPrivateLobby: TypedQuery<
    EmptyArgs,
    { lobbyId: Id<"gameLobbies">; joinCode: string; mode: string } | null
  >;
  listActiveGames: TypedQuery<
    { mode?: "casual" | "ranked" | "pvp" | "all"; limit?: number } & BaseArgs,
    Array<{
      lobbyId: Id<"gameLobbies">;
      hostUsername: string;
      opponentUsername: string;
      mode: string;
      turnNumber: number;
      spectatorCount: number;
      deckArchetype: string;
      startedAt?: number;
    }>
  >;
  getGameSpectatorView: TypedQuery<
    { lobbyId: Id<"gameLobbies"> } & BaseArgs,
    SpectatorGameView | null
  >;
  checkForActiveGame: TypedQuery<
    EmptyArgs,
    {
      hasActiveGame: boolean;
      lobbyId: Id<"gameLobbies">;
      gameId: string;
      isHost: boolean;
      opponentUsername: string;
      turnNumber?: number;
      isYourTurn: boolean;
      lastMoveAt: number;
    } | null
  >;
  getAvailableActions: TypedQuery<
    { lobbyId: Id<"gameLobbies"> } & BaseArgs,
    { currentPhase: string; isMyTurn: boolean; normalSummonedThisTurn?: boolean; actions: string[] }
  >;
  getGameStateForPlayer: TypedQuery<
    { lobbyId: Id<"gameLobbies">; userId?: Id<"users"> } & BaseArgs,
    GameState | null
  >;
  getPendingOptionalTriggers: TypedQuery<
    { lobbyId: Id<"gameLobbies"> } & BaseArgs,
    SegocQueueItem[]
  >;
  getTimeoutStatus: TypedQuery<
    { lobbyId: Id<"gameLobbies"> } & BaseArgs,
    {
      actionTimeRemainingMs: number;
      matchTimeRemainingMs: number;
      isWarning: boolean;
      isTimedOut: boolean;
      isMatchTimedOut: boolean;
    } | null
  >;
  getSegocQueueStatus: TypedQuery<
    { lobbyId: Id<"gameLobbies"> } & BaseArgs,
    { hasItems: boolean; itemCount: number; nextItem?: SegocQueueItem }
  >;
  getCurrentPhaseInfo: TypedQuery<
    { lobbyId: Id<"gameLobbies"> } & BaseArgs,
    { currentPhase: string | null; availableSkips: string[]; isInteractivePhase: boolean }
  >;
}

export interface GameLobbyMutations {
  createLobby: TypedMutation<
    {
      mode: "casual" | "ranked";
      isPrivate?: boolean;
      allowSpectators?: boolean;
      maxSpectators?: number;
    } & BaseArgs,
    { lobbyId: Id<"gameLobbies">; joinCode?: string }
  >;
  joinLobby: TypedMutation<
    { lobbyId: Id<"gameLobbies">; joinCode?: string } & BaseArgs,
    { gameId: string; lobbyId: Id<"gameLobbies">; opponentUsername: string }
  >;
  joinLobbyByCode: TypedMutation<
    { joinCode: string } & BaseArgs,
    { gameId: string; lobbyId: Id<"gameLobbies">; opponentUsername: string }
  >;
  cancelLobby: TypedMutation<EmptyArgs, SuccessResponse>;
  leaveLobby: TypedMutation<EmptyArgs, SuccessResponse>;
  surrenderGame: TypedMutation<{ lobbyId: Id<"gameLobbies"> } & BaseArgs, SuccessResponse>;
}

export interface GameSpectatorMutations {
  joinAsSpectator: TypedMutation<
    { lobbyId: Id<"gameLobbies"> } & BaseArgs,
    { success: boolean; spectatorCount: number }
  >;
  leaveAsSpectator: TypedMutation<
    { lobbyId: Id<"gameLobbies"> } & BaseArgs,
    { success: boolean; spectatorCount: number }
  >;
}

export interface GameEngineTurnMutations {
  endTurn: TypedMutation<
    { lobbyId: Id<"gameLobbies"> } & BaseArgs,
    {
      success: boolean;
      gameEnded?: boolean;
      winnerId?: Id<"users">;
      newTurnPlayer?: string;
      newTurnNumber?: number;
      endReason?: string;
    }
  >;
}

export interface GameEngineSummonMutations {
  normalSummon: TypedMutation<
    {
      lobbyId: Id<"gameLobbies">;
      cardId: Id<"cardDefinitions">;
      tributeCardIds?: Id<"cardDefinitions">[];
      position: "attack" | "defense";
    } & BaseArgs,
    {
      success: boolean;
      cardName: string;
      position: string;
      tributesUsed?: number;
      triggerMessage?: string;
    }
  >;
  setMonster: TypedMutation<
    { lobbyId: Id<"gameLobbies">; cardId: Id<"cardDefinitions"> } & BaseArgs,
    SuccessResponse
  >;
  flipSummon: TypedMutation<
    { lobbyId: Id<"gameLobbies">; cardId: Id<"cardDefinitions"> } & BaseArgs,
    SuccessResponse
  >;
  changePosition: TypedMutation<
    { lobbyId: Id<"gameLobbies">; cardId: Id<"cardDefinitions"> } & BaseArgs,
    SuccessResponse
  >;
}

export interface GameEngineSpellTrapMutations {
  setSpellTrap: TypedMutation<
    { lobbyId: Id<"gameLobbies">; cardId: Id<"cardDefinitions"> } & BaseArgs,
    { success: boolean; cardType: "spell" | "trap" }
  >;
  activateSpell: TypedMutation<
    { lobbyId: Id<"gameLobbies">; cardId: Id<"cardDefinitions">; targets?: string[] } & BaseArgs,
    SuccessResponse
  >;
  activateTrap: TypedMutation<
    { lobbyId: Id<"gameLobbies">; cardId: Id<"cardDefinitions">; targets?: string[] } & BaseArgs,
    SuccessResponse
  >;
}

export interface AITurnMutations {
  executeAITurn: TypedMutation<
    { gameId: string } & BaseArgs,
    {
      success: boolean;
      message: string;
      actionsTaken: number;
      actions: string[];
      difficulty: string;
    }
  >;
}

export interface MatchmakingQueries {
  getMyStatus: TypedQuery<
    EmptyArgs,
    {
      status: "searching";
      mode: "ranked" | "casual";
      rating: number;
      deckArchetype: string;
      elapsedSeconds: number;
      currentRatingWindow: number;
      joinedAt: number;
    } | null
  >;
  getQueueStats: TypedQuery<
    EmptyArgs,
    { totalPlayers: number; byMode: { ranked: number; casual: number }; averageWaitTime: number }
  >;
}

export interface MatchmakingMutations {
  joinQueue: TypedMutation<{ mode: "ranked" | "casual" } & BaseArgs, SuccessResponse>;
  leaveQueue: TypedMutation<EmptyArgs, SuccessResponse>;
}

// =============================================================================
// PROGRESSION MODULE TYPES
// =============================================================================

export interface AchievementsQueries {
  getUserAchievements: TypedQuery<
    EmptyArgs,
    Array<{
      achievementId: string;
      name: string;
      description: string;
      progress: number;
      target: number;
      unlocked: boolean;
      unlockedAt?: number;
    }>
  >;
  getUnlockedAchievements: TypedQuery<
    { username: string } & BaseArgs,
    Array<{ achievementId: string; name: string; unlockedAt: number }>
  >;
}

export interface BattlePassQueries {
  getBattlePassStatus: TypedQuery<EmptyArgs, BattlePassStatus | null>;
  getBattlePassTiers: TypedQuery<
    { battlePassId?: Id<"battlePassSeasons"> } & BaseArgs,
    BattlePassTierDefinition[]
  >;
  getUserBattlePassProgress: TypedQuery<
    { battlePassId?: Id<"battlePassSeasons"> } & BaseArgs,
    { currentTier: number; currentXp: number; claimedFree: number[]; claimedPremium: number[] }
  >;
  getCurrentBattlePass: TypedQuery<
    EmptyArgs,
    {
      _id: Id<"battlePassSeasons">;
      name: string;
      startDate: number;
      endDate: number;
      totalTiers: number;
    } | null
  >;
}

export interface BattlePassMutations {
  claimBattlePassReward: TypedMutation<
    { tier: number; track: "free" | "premium" } & BaseArgs,
    { success: boolean; tier: number; track: string; reward: { type: string; amount?: number } }
  >;
  claimAllAvailableRewards: TypedMutation<
    EmptyArgs,
    { success: boolean; claimedFree: number; claimedPremium: number }
  >;
}

export interface MatchHistoryQueries {
  getMatchHistory: TypedQuery<
    { limit?: number } & BaseArgs,
    Array<{
      _id: Id<"matchHistory">;
      opponentId: Id<"users">;
      opponentUsername: string;
      gameType: string;
      result: "win" | "loss";
      ratingChange: number;
      completedAt: number;
    }>
  >;
  getPublicMatchHistory: TypedQuery<
    { userId: Id<"users">; limit?: number } & BaseArgs,
    Array<{ opponentUsername: string; result: "win" | "loss"; completedAt: number }> | null
  >;
  getProfilePrivacy: TypedQuery<
    { userId: Id<"users"> } & BaseArgs,
    { isPublic: boolean; isOwnProfile: boolean }
  >;
}

export interface NotificationsQueries {
  getUnreadNotifications: TypedQuery<EmptyArgs, Notification[]>;
  getAllNotifications: TypedQuery<{ limit?: number } & BaseArgs, Notification[]>;
}

export interface NotificationsMutations {
  markNotificationAsRead: TypedMutation<
    { notificationId: Id<"playerNotifications"> } & BaseArgs,
    SuccessResponse
  >;
  markAllAsRead: TypedMutation<EmptyArgs, { success: boolean; count: number }>;
}

export interface QuestsQueries {
  getUserQuests: TypedQuery<
    EmptyArgs,
    Array<{
      _id: Id<"userQuests">;
      questId: string;
      name: string;
      description: string;
      progress: number;
      target: number;
      reward: RewardData;
      expiresAt?: number;
    }>
  >;
}

export interface QuestsMutations {
  claimQuestReward: TypedMutation<
    { questRecordId: Id<"userQuests"> } & BaseArgs,
    { success: boolean; rewards: { gold?: number; xp?: number; gems?: number } }
  >;
}

export interface StoryQueries {
  getPlayerProgress: TypedQuery<
    EmptyArgs,
    {
      progressByAct: Record<number, StoryProgress[]>;
      totalChaptersCompleted: number;
      totalStarsEarned: number;
    }
  >;
  getChapterDetails: TypedQuery<
    { actNumber: number; chapterNumber: number } & BaseArgs,
    (StoryChapter & { stages: StoryStageDetail[] }) | null
  >;
  getAvailableChapters: TypedQuery<EmptyArgs, StoryChapter[]>;
  getPlayerXPInfo: TypedQuery<
    EmptyArgs,
    {
      currentLevel: number;
      currentXP: number;
      lifetimeXP: number;
      xpForNextLevel: number;
      levelProgress: number;
    }
  >;
  getPlayerBadges: TypedQuery<
    EmptyArgs,
    { badges: PlayerBadge[]; badgesByType: Record<string, PlayerBadge[]>; totalBadges: number }
  >;
  getBattleHistory: TypedQuery<
    { actNumber: number; chapterNumber: number } & BaseArgs,
    BattleHistoryEntry[]
  >;
  getRetryLimits: TypedQuery<
    EmptyArgs,
    {
      hard: { remaining: number; resetAt: number };
      legendary: { remaining: number; resetAt: number };
    }
  >;
}

export interface StoryMutations {
  startChapter: TypedMutation<
    { actNumber: number; chapterNumber: number; difficulty: Difficulty } & BaseArgs,
    { attemptId: Id<"storyBattleAttempts">; chapterInfo: StoryBattleChapterInfo }
  >;
  completeChapter: TypedMutation<
    { attemptId: Id<"storyBattleAttempts">; won: boolean; finalLP: number } & BaseArgs,
    {
      success: boolean;
      rewards: {
        gold: number;
        xp: number;
        cards: Array<{ cardId: Id<"cardDefinitions">; name: string; rarity: string }>;
      };
      starsEarned: 0 | 1 | 2 | 3;
      levelUp?: { newLevel: number; oldLevel: number };
      newBadges: PlayerBadge[];
      cardsReceived: Array<{
        cardId: Id<"cardDefinitions">;
        name: string;
        rarity: string;
        imageUrl?: string;
      }>;
    }
  >;
  abandonChapter: TypedMutation<
    { attemptId: Id<"storyBattleAttempts"> } & BaseArgs,
    SuccessResponse
  >;
  initializeStoryProgress: TypedMutation<EmptyArgs, SuccessResponse>;
}

export interface StoryBattleQueries {
  getDifficultyRequirements: TypedQuery<
    EmptyArgs,
    {
      normal: { requiredLevel: number; unlocked: boolean };
      hard: { requiredLevel: number; unlocked: boolean };
      legendary: { requiredLevel: number; unlocked: boolean };
    }
  >;
  getChapterUnlockStatus: TypedQuery<
    { chapterId: string } & BaseArgs,
    { unlocked: boolean; reason?: string }
  >;
}

export interface StoryBattleMutations {
  initializeStoryBattle: TypedMutation<
    { chapterId: string; stageNumber?: number; difficulty?: Difficulty } & BaseArgs,
    { gameId: string; lobbyId: Id<"gameLobbies">; chapterTitle: string; aiOpponentName: string }
  >;
}

export interface StoryQueriesModule {
  getStageByChapterAndNumber: TypedQuery<
    { chapterId: string; stageNumber: number } & BaseArgs,
    {
      _id: Id<"storyStages">;
      stageNumber: number;
      name?: string;
      title?: string;
      description?: string;
      opponentName?: string;
      preMatchDialogue?: Array<{ speaker: string; text: string; emotion?: string }>;
      postMatchWinDialogue?: Array<{ speaker: string; text: string; emotion?: string }>;
      postMatchLoseDialogue?: Array<{ speaker: string; text: string; emotion?: string }>;
    } | null
  >;
}

export interface StoryStagesQueries {
  getChapterStages: TypedQuery<
    { chapterId: Id<"storyChapters"> } & BaseArgs,
    Array<{
      _id: Id<"storyStages">;
      stageNumber: number;
      name: string;
      status: "locked" | "available" | "completed" | "starred";
      aiDifficulty: string;
      rewardGold: number;
      firstClearClaimed: boolean;
    }>
  >;
}

export interface StoryStagesMutations {
  initializeChapterStageProgress: TypedMutation<
    { chapterId: Id<"storyChapters"> } & BaseArgs,
    SuccessResponse
  >;
  completeStage: TypedMutation<
    { stageId: Id<"storyStages">; won: boolean; finalLP: number } & BaseArgs,
    {
      won: boolean;
      rewards: { gold: number; xp: number; gems?: number };
      starsEarned: 0 | 1 | 2 | 3;
      newBestScore?: number;
      unlockedNextStage?: boolean;
      levelUp?: { newLevel: number; oldLevel: number } | null;
      newBadges: Array<{ badgeId: string; displayName: string; description: string }>;
      cardReward?: { cardDefinitionId: string; name: string; rarity: string; imageUrl?: string };
    }
  >;
}

// =============================================================================
// SOCIAL MODULE TYPES
// =============================================================================

export interface FriendsQueries {
  getFriends: TypedQuery<
    EmptyArgs,
    Array<{
      userId: Id<"users">;
      username?: string;
      level: number;
      rankedElo: number;
      isOnline: boolean;
      friendsSince: number;
      lastInteraction?: number;
    }>
  >;
  getIncomingRequests: TypedQuery<
    EmptyArgs,
    Array<{
      userId: Id<"users">;
      username?: string;
      level: number;
      rankedElo: number;
      requestedAt: number;
    }>
  >;
  getOutgoingRequests: TypedQuery<
    EmptyArgs,
    Array<{
      userId: Id<"users">;
      username?: string;
      level: number;
      rankedElo: number;
      requestedAt: number;
    }>
  >;
  getBlockedUsers: TypedQuery<
    EmptyArgs,
    Array<{ userId: Id<"users">; username?: string; blockedAt: number }>
  >;
  searchUsers: TypedQuery<
    { query: string; limit?: number } & BaseArgs,
    Array<{
      userId: Id<"users">;
      username?: string;
      level: number;
      rankedElo: number;
      friendshipStatus: "pending" | "accepted" | "blocked" | null;
      isSentRequest: boolean;
    }>
  >;
}

export interface FriendsMutations {
  sendFriendRequest: TypedMutation<
    { friendUsername: string } & BaseArgs,
    { success: boolean; autoAccepted: boolean }
  >;
  acceptFriendRequest: TypedMutation<{ friendId: Id<"users"> } & BaseArgs, SuccessResponse>;
  declineFriendRequest: TypedMutation<{ friendId: Id<"users"> } & BaseArgs, SuccessResponse>;
  cancelFriendRequest: TypedMutation<{ friendId: Id<"users"> } & BaseArgs, SuccessResponse>;
  removeFriend: TypedMutation<{ friendId: Id<"users"> } & BaseArgs, SuccessResponse>;
  blockUser: TypedMutation<{ friendId: Id<"users"> } & BaseArgs, SuccessResponse>;
  unblockUser: TypedMutation<{ friendId: Id<"users"> } & BaseArgs, SuccessResponse>;
}

export interface GlobalChatQueries {
  getRecentMessages: TypedQuery<
    { limit?: number } & BaseArgs,
    Array<{
      _id: Id<"globalChat">;
      userId: Id<"users">;
      username: string;
      content: string;
      createdAt: number;
    }>
  >;
  getPaginatedMessages: TypedQuery<
    { paginationOpts: PaginationOpts } & BaseArgs,
    PaginatedResponse<PaginatedChatMessage>
  >;
  getOnlineUsers: TypedQuery<
    EmptyArgs,
    Array<{
      userId: Id<"users">;
      username: string;
      status: "online" | "in_game" | "idle";
      lastActiveAt: number;
      rank: string;
      rankedElo: number;
    }>
  >;
  getMessageCount: TypedQuery<{ since?: number } & BaseArgs, number>;
  getTotalMessageCount: TypedQuery<EmptyArgs, number>;
}

export interface GlobalChatMutations {
  sendMessage: TypedMutation<{ content: string } & BaseArgs, Id<"globalChat">>;
  updatePresence: TypedMutation<
    { status?: "online" | "in_game" | "idle"; presenceId?: Id<"userPresence"> } & BaseArgs,
    Id<"userPresence">
  >;
}

export interface LeaderboardQueries {
  getLeaderboard: TypedQuery<
    {
      type: "ranked" | "casual" | "story";
      segment: "all" | "humans" | "ai";
      limit?: number;
    } & BaseArgs,
    Array<{
      userId: Id<"users">;
      username?: string;
      rank: number;
      rating: number;
      level: number;
      wins: number;
      losses: number;
      winRate: number;
      isAiAgent: boolean;
    }>
  >;
  getCachedLeaderboard: TypedQuery<
    { type: "ranked" | "casual" | "story"; segment: "all" | "humans" | "ai" } & BaseArgs,
    { rankings: LeaderboardRankingEntry[]; lastUpdated: number; isCached: boolean } | null
  >;
  getUserRank: TypedQuery<
    { type: "ranked" | "casual" | "story" } & BaseArgs,
    { rank: number; rating: number; level: number; totalPlayers: number; percentile: number }
  >;
  getBattleHistory: TypedQuery<
    { limit?: number; gameType?: "ranked" | "casual" | "story" } & BaseArgs,
    Array<{
      _id: Id<"matchHistory">;
      opponentId: Id<"users">;
      opponentUsername: string;
      gameType: string;
      result: "win" | "loss";
      ratingBefore: number;
      ratingAfter: number;
      ratingChange: number;
      xpAwarded: number;
      completedAt: number;
    }>
  >;
}

export interface TournamentsQueries {
  getActiveTournaments: TypedQuery<EmptyArgs, Tournament[]>;
  getTournament: TypedQuery<{ tournamentId: Id<"tournaments"> } & BaseArgs, Tournament | null>;
  isRegistered: TypedQuery<{ tournamentId: Id<"tournaments"> } & BaseArgs, boolean>;
}

export interface TournamentsMutations {
  register: TypedMutation<{ tournamentId: Id<"tournaments"> } & BaseArgs, SuccessResponse>;
  unregister: TypedMutation<{ tournamentId: Id<"tournaments"> } & BaseArgs, SuccessResponse>;
}

export interface AIChatQueries {
  getActiveSession: TypedQuery<EmptyArgs, { sessionId: string; createdAt: number } | null>;
  getSessionMessages: TypedQuery<
    { sessionId: string } & BaseArgs,
    Array<{
      _id: Id<"aiChatMessages">;
      role: "user" | "assistant";
      content: string;
      createdAt: number;
    }>
  >;
  getUserSessions: TypedQuery<
    EmptyArgs,
    Array<{ sessionId: string; createdAt: number; messageCount: number }>
  >;
}

export interface AIChatMutations {
  createSession: TypedMutation<EmptyArgs, { sessionId: string }>;
  sendUserMessage: TypedMutation<
    { message: string; sessionId?: string } & BaseArgs,
    { messageId: Id<"aiChatMessages">; sessionId: string }
  >;
  saveAgentResponse: TypedMutation<
    { userId: Id<"users">; sessionId: string; message: string } & BaseArgs,
    { messageId: Id<"aiChatMessages"> }
  >;
  endSession: TypedMutation<{ sessionId: string } & BaseArgs, SuccessResponse>;
}

// =============================================================================
// WALLET MODULE TYPES
// =============================================================================

export interface WalletQueries {
  getUserWallet: TypedQuery<EmptyArgs, UserWallet | null>;
}

export interface WalletMutations {
  saveConnectedWallet: TypedMutation<
    { walletAddress: string; walletType: "privy_embedded" | "external" } & BaseArgs,
    boolean
  >;
  disconnectWallet: TypedMutation<EmptyArgs, boolean>;
}

export interface WalletActions {
  buildTransferTransaction: TypedAction<
    { from: string; to: string; amount: number } & BaseArgs,
    {
      transaction: string;
      description: string;
      totalAmount: number;
      blockhash: string;
      lastValidBlockHeight: number;
    }
  >;
}

// =============================================================================
// AGENTS MODULE TYPES
// =============================================================================

export interface AgentsQueries {
  getStarterDecks: TypedQuery<
    EmptyArgs,
    Array<{ code: string; name: string; description: string; archetype: string }>
  >;
  getUserAgents: TypedQuery<
    EmptyArgs,
    Array<{
      _id: Id<"agents">;
      name: string;
      profilePictureUrl?: string;
      walletAddress?: string;
      createdAt: number;
    }>
  >;
  getAgentCount: TypedQuery<EmptyArgs, number>;
  getAgent: TypedQuery<
    { agentId: Id<"agents"> } & BaseArgs,
    {
      _id: Id<"agents">;
      name: string;
      profilePictureUrl?: string;
      socialLink?: string;
      walletAddress?: string;
      createdAt: number;
    } | null
  >;
}

export interface AgentsMutations {
  validateApiKey: TypedMutation<
    { apiKey: string } & BaseArgs,
    { agentId: string; name: string; userId: string; starterDeckCode: string }
  >;
  registerAgent: TypedMutation<
    {
      name: string;
      profilePictureUrl?: string;
      socialLink?: string;
      starterDeckCode: string;
    } & BaseArgs,
    { agentId: string; apiKey: string; keyPrefix: string; message: string }
  >;
  regenerateApiKey: TypedMutation<
    { agentId: Id<"agents"> } & BaseArgs,
    { apiKey: string; keyPrefix: string }
  >;
  updateAgent: TypedMutation<
    {
      agentId: Id<"agents">;
      name?: string;
      profilePictureUrl?: string;
      socialLink?: string;
    } & BaseArgs,
    SuccessResponse
  >;
  deleteAgent: TypedMutation<{ agentId: Id<"agents"> } & BaseArgs, SuccessResponse>;
  retryWalletCreation: TypedMutation<
    { agentId: Id<"agents"> } & BaseArgs,
    { success: boolean; message: string }
  >;
}

export interface AgentsWebhookMutations {
  updateCallbackUrl: TypedMutation<
    { agentId: Id<"agents">; callbackUrl?: string; webhookSecret?: string } & BaseArgs,
    SuccessResponse
  >;
}

export interface AgentsWebhookActions {
  sendWebhook: TypedAction<
    {
      agentId: Id<"agents">;
      eventType: string;
      gameId: string;
      data: Record<string, unknown>;
    } & BaseArgs,
    { sent: boolean; reason?: string }
  >;
}

// =============================================================================
// AI MODULE TYPES (Admin Agent)
// =============================================================================

export interface AdminAgentApiActions {
  getOrCreateThread: TypedAction<
    EmptyArgs,
    { threadId: string; title: string; createdAt: number; isNew: boolean }
  >;
  getThreadHistory: TypedAction<
    { threadId: string; limit?: number } & BaseArgs,
    {
      threadId: string;
      messages: Array<{ id: string; role: string; content: string; createdAt: number }>;
      hasMore: boolean;
    }
  >;
  listThreads: TypedAction<
    { limit?: number } & BaseArgs,
    {
      threads: Array<{
        threadId: string;
        title: string;
        summary?: string;
        createdAt: number;
        status?: string;
      }>;
      hasMore: boolean;
    }
  >;
  sendMessage: TypedAction<
    { threadId: string; message: string } & BaseArgs,
    { messageId: string; text: string; toolCalls?: AIToolCall[]; usage?: AIUsageData }
  >;
  streamMessage: TypedAction<
    { threadId: string; message: string } & BaseArgs,
    { messageId: string; text: string }
  >;
  deleteThread: TypedAction<{ threadId: string } & BaseArgs, { success: boolean; error?: string }>;
  clearAllThreads: TypedAction<EmptyArgs, { success: boolean; deletedCount: number }>;
  getStreamDeltas: TypedAction<
    { threadId: string; messageId: string } & BaseArgs,
    { deltas: string[]; isComplete: boolean }
  >;
}

// =============================================================================
// AUTH MODULE TYPES
// =============================================================================

export interface AuthQueries {
  loggedInUser: TypedQuery<EmptyArgs, User | null>;
}

export interface AuthMutations {
  createOrGetUser: TypedMutation<
    {
      email?: string;
      walletAddress?: string;
      walletType?: "privy_embedded" | "external";
    } & BaseArgs,
    {
      userId: Id<"users">;
      isNewUser: boolean;
      hasUsername: boolean;
      hasStarterDeck: boolean;
      hasWallet: boolean;
    }
  >;
  setUsername: TypedMutation<{ username: string } & BaseArgs, SuccessResponse>;
  getCurrentUserProfile: TypedMutation<
    EmptyArgs,
    {
      userId: Id<"users">;
      username?: string;
      name?: string;
      email?: string;
      gold: number;
      xp: number;
      level: number;
      hasUsername: boolean;
    } | null
  >;
}

export interface OnboardingQueries {
  getOnboardingStatus: TypedQuery<
    EmptyArgs,
    { hasUsername: boolean; hasStarterDeck: boolean; hasWallet: boolean } | null
  >;
}

// =============================================================================
// STORAGE MODULE TYPES
// =============================================================================

export interface StorageCardsQueries {
  getCardWithImages: TypedQuery<
    { cardId: Id<"cardDefinitions"> } & BaseArgs,
    { _id: Id<"cardDefinitions">; name: string; resolvedImageUrl: string | null } | null
  >;
  getCardsWithImages: TypedQuery<
    { cardIds: Id<"cardDefinitions">[] } & BaseArgs,
    Array<{ _id: Id<"cardDefinitions">; name: string; resolvedImageUrl: string | null } | null>
  >;
}

export interface StorageCardsMutations {
  updateCardImage: TypedMutation<
    {
      cardId: Id<"cardDefinitions">;
      imageStorageId?: Id<"_storage">;
      thumbnailStorageId?: Id<"_storage">;
    } & BaseArgs,
    SuccessResponse
  >;
}

export interface StorageImagesQueries {
  getImageUrl: TypedQuery<{ storageId: Id<"_storage"> } & BaseArgs, string | null>;
  getCardImageUrls: TypedQuery<
    { cardId: Id<"cardDefinitions"> } & BaseArgs,
    { imageUrl: string | null; thumbnailUrl: string | null } | null
  >;
}

export interface StorageImagesMutations {
  generateUploadUrl: TypedMutation<EmptyArgs, string>;
  saveCardImage: TypedMutation<
    {
      cardId: Id<"cardDefinitions">;
      storageId: Id<"_storage">;
      imageType: "image" | "thumbnail";
    } & BaseArgs,
    SuccessResponse
  >;
  deleteCardImage: TypedMutation<
    { cardId: Id<"cardDefinitions">; imageType: "image" | "thumbnail" } & BaseArgs,
    SuccessResponse
  >;
}

// =============================================================================
// FEEDBACK MODULE TYPES
// =============================================================================

/** Feedback stats */
export interface FeedbackStats {
  total: number;
  byType: { bug: number; feature: number };
  byStatus: { new: number; triaged: number; in_progress: number; resolved: number; closed: number };
  byPriority: { low: number; medium: number; high: number; critical: number; unset: number };
}

/** Feedback analytics from getAnalytics */
export interface FeedbackAnalytics {
  summary: {
    total: number;
    bugs: number;
    features: number;
    open: number;
    resolved: number;
    last24h: number;
    last7d: number;
  };
  resolution: {
    avgTimeMs: number;
    avgTimeHours: number;
    fastestMs: number;
    slowestMs: number;
    resolutionRate: number;
  };
  trend: Array<{ date: string; bugs: number; features: number; total: number }>;
  topReporters: Array<{
    userId: string;
    username: string;
    count: number;
    bugs: number;
    features: number;
  }>;
  attachments: {
    withScreenshot: number;
    withRecording: number;
    screenshotRate: number;
  };
}

export interface FeedbackQueries {
  getMyFeedback: TypedQuery<
    { limit?: number } & BaseArgs,
    Array<{
      _id: Id<"feedback">;
      type: "bug" | "feature";
      title: string;
      status: string;
      createdAt: number;
    }>
  >;
  getStats: TypedQuery<EmptyArgs, FeedbackStats>;
  getAnalytics: TypedQuery<{ days?: number } & BaseArgs, FeedbackAnalytics>;
}

export interface FeedbackMutations {
  submit: TypedMutation<
    {
      type: "bug" | "feature";
      title: string;
      description: string;
      screenshotUrl?: string;
      recordingUrl?: string;
      pageUrl: string;
      userAgent: string;
      viewport: { width: number; height: number };
    } & BaseArgs,
    { feedbackId: Id<"feedback"> }
  >;
}

// =============================================================================
// STRIPE MODULE TYPES
// =============================================================================

export interface StripeQueries {
  getCurrentSubscription: TypedQuery<
    EmptyArgs,
    {
      stripeSubscriptionId: string;
      status: string;
      priceId?: string;
      currentPeriodEnd?: number;
      cancelAtPeriodEnd?: boolean;
    } | null
  >;
  hasActiveSubscription: TypedQuery<EmptyArgs, boolean>;
}

export interface StripeActions {
  createCheckoutSession: TypedAction<
    { planInterval: "month" | "year" } & BaseArgs,
    { checkoutUrl: string; sessionId: string }
  >;
  verifyCheckoutSession: TypedAction<
    { sessionId: string } & BaseArgs,
    { success: boolean; hasSubscription?: boolean }
  >;
  createBillingPortalSession: TypedAction<EmptyArgs, { portalUrl: string }>;
}

// =============================================================================
// TREASURY MODULE TYPES
// =============================================================================

export interface TreasuryPoliciesQueries {
  listPolicies: TypedQuery<
    { includeInactive?: boolean } & BaseArgs,
    Array<{
      _id: Id<"treasuryPolicies">;
      name: string;
      description?: string;
      rules: TreasuryPolicyRules;
      isActive: boolean;
    }>
  >;
  getPolicy: TypedQuery<
    { policyId: Id<"treasuryPolicies"> } & BaseArgs,
    { _id: Id<"treasuryPolicies">; name: string; rules: TreasuryPolicyRules }
  >;
  getWalletsUsingPolicy: TypedQuery<
    { policyId: Id<"treasuryPolicies"> } & BaseArgs,
    TreasuryWalletData[]
  >;
  checkTransaction: TypedQuery<
    { policyId: Id<"treasuryPolicies">; amount: number; recipientAddress?: string } & BaseArgs,
    { allowed: boolean; reason?: string; requiresApproval?: boolean; minApprovers?: number }
  >;
}

export interface TreasuryPoliciesMutations {
  createPolicy: TypedMutation<
    {
      name: string;
      description?: string;
      rules: {
        maxTransactionAmount?: number;
        dailyLimit?: number;
        allowedRecipients?: string[];
        requiresApproval: boolean;
        minApprovers?: number;
      };
    } & BaseArgs,
    Id<"treasuryPolicies">
  >;
  updatePolicy: TypedMutation<
    {
      policyId: Id<"treasuryPolicies">;
      name?: string;
      description?: string;
      rules?: TreasuryPolicyRules;
      isActive?: boolean;
    } & BaseArgs,
    SuccessResponse
  >;
  deletePolicy: TypedMutation<{ policyId: Id<"treasuryPolicies"> } & BaseArgs, SuccessResponse>;
  setupDefaultPolicies: TypedMutation<EmptyArgs, { message: string; count: number }>;
}

export interface TreasuryWalletsQueries {
  listWallets: TypedQuery<
    {
      purpose?: "fee_collection" | "distribution" | "liquidity" | "reserves";
      status?: "active" | "frozen" | "archived";
    } & BaseArgs,
    TreasuryWalletData[]
  >;
  getWallet: TypedQuery<{ walletId: Id<"treasuryWallets"> } & BaseArgs, TreasuryWalletData | null>;
  getWalletByAddress: TypedQuery<{ address: string } & BaseArgs, TreasuryWalletData | null>;
  getOverview: TypedQuery<
    EmptyArgs,
    {
      totalWallets: number;
      totalSolBalance: number;
      totalTokenBalance: number;
      byPurpose: Record<string, number>;
      byType: Record<string, number>;
      recentTransactions: TreasuryTransactionData[];
      pendingTransactions: number;
    }
  >;
}

export interface TreasuryWalletsMutations {
  createWallet: TypedMutation<
    {
      name: string;
      purpose: "fee_collection" | "distribution" | "liquidity" | "reserves";
      policyId?: string;
    } & BaseArgs,
    Id<"treasuryWallets">
  >;
  updateWallet: TypedMutation<
    {
      walletId: Id<"treasuryWallets">;
      name?: string;
      policyId?: string;
      status?: "active" | "frozen" | "archived";
    } & BaseArgs,
    SuccessResponse
  >;
  syncBalance: TypedMutation<
    { walletId: Id<"treasuryWallets"> } & BaseArgs,
    { success: boolean; message: string }
  >;
  retryWalletCreation: TypedMutation<
    { walletId: Id<"treasuryWallets"> } & BaseArgs,
    { success: boolean; message: string }
  >;
  setupX402TreasuryWallets: TypedMutation<
    EmptyArgs,
    {
      created: boolean;
      walletId?: Id<"treasuryWallets">;
      address?: string;
      status?: string;
      message?: string;
    }
  >;
}

export interface TreasuryTransactionsQueries {
  listTransactions: TypedQuery<
    {
      walletId?: Id<"treasuryWallets">;
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } & BaseArgs,
    { transactions: TreasuryTransactionData[]; total: number; limit: number; offset: number }
  >;
  getTransaction: TypedQuery<
    { transactionId: Id<"treasuryTransactions"> } & BaseArgs,
    TreasuryTransactionData | null
  >;
  getBySignature: TypedQuery<{ signature: string } & BaseArgs, TreasuryTransactionData | null>;
  getStats: TypedQuery<
    { walletId?: Id<"treasuryWallets">; daysBack?: number } & BaseArgs,
    {
      totalTransactions: number;
      totalVolume: number;
      byType: Record<string, number>;
      byStatus: Record<string, number>;
      daysBack: number;
    }
  >;
}

export interface TreasuryTransactionsMutations {
  recordFeeReceived: TypedMutation<
    {
      walletId: Id<"treasuryWallets">;
      amount: number;
      tokenMint: string;
      signature: string;
      metadata?: Record<string, unknown>;
    } & BaseArgs,
    Id<"treasuryTransactions">
  >;
  createDistribution: TypedMutation<
    {
      walletId: Id<"treasuryWallets">;
      amount: number;
      tokenMint: string;
      recipientAddress: string;
      reason?: string;
    } & BaseArgs,
    Id<"treasuryTransactions">
  >;
  approveTransaction: TypedMutation<
    { transactionId: Id<"treasuryTransactions"> } & BaseArgs,
    { success: boolean; approverCount: number }
  >;
  updateStatus: TypedMutation<
    {
      transactionId: Id<"treasuryTransactions">;
      status: string;
      signature?: string;
      errorMessage?: string;
    } & BaseArgs,
    SuccessResponse
  >;
}

// =============================================================================
// TOKEN ANALYTICS MODULE TYPES
// =============================================================================

export interface TokenAnalyticsHoldersQueries {
  getAll: TypedQuery<
    {
      limit?: number;
      offset?: number;
      sortBy?: "balance" | "firstBuy" | "lastActivity";
      sortOrder?: "asc" | "desc";
    } & BaseArgs,
    { holders: TokenHolderData[]; total: number; hasMore: boolean }
  >;
  getTop: TypedQuery<{ limit?: number } & BaseArgs, TokenHolderData[]>;
  getByAddress: TypedQuery<{ address: string } & BaseArgs, TokenHolderData | null>;
  getDistribution: TypedQuery<
    EmptyArgs,
    {
      totalHolders: number;
      totalSupplyHeld: number;
      distribution: TokenDistributionBucket[];
      topHoldersPercentage: number;
    }
  >;
  getGrowth: TypedQuery<
    { days?: number } & BaseArgs,
    Array<{ timestamp: number; newHolders: number; totalHolders: number }>
  >;
}

export interface TokenAnalyticsMetricsQueries {
  getLatest: TypedQuery<EmptyArgs, TokenMetrics | null>;
  getHistory: TypedQuery<{ limit?: number; since?: number } & BaseArgs, TokenMetrics[]>;
  getBondingCurveProgress: TypedQuery<
    EmptyArgs,
    {
      currentMarketCap: number;
      targetMarketCap: number;
      progress: number;
      liquidity: number;
      estimatedGraduationTime: number | null;
    }
  >;
  getPriceChart: TypedQuery<
    { period: "1h" | "24h" | "7d" | "30d" } & BaseArgs,
    Array<{ timestamp: number; priceUsd: number; volume: number }>
  >;
}

export interface TokenAnalyticsRollupQueries {
  getByPeriod: TypedQuery<
    { period: "hour" | "day"; limit?: number } & BaseArgs,
    TokenRollupPeriod[]
  >;
  getRange: TypedQuery<
    { period: "hour" | "day"; startTime: number; endTime: number } & BaseArgs,
    TokenRollupPeriod[]
  >;
  getSummary: TypedQuery<
    EmptyArgs,
    {
      currentPrice: number;
      currentMarketCap: number;
      currentHolders: number;
      priceChange24h: number;
      mcChange24h: number;
      volume24h: number;
      trades24h: number;
      uniqueTraders24h: number;
      newHolders24h: number;
    }
  >;
  getHistoricalSummary: TypedQuery<
    { days?: number } & BaseArgs,
    {
      period: string;
      totalVolume: number;
      totalTrades: number;
      totalNewHolders: number;
      priceChange: number;
      avgDailyVolume: number;
      avgDailyTrades: number;
      dailyData: TokenRollupPeriod[];
    }
  >;
}

export interface TokenAnalyticsTradesQueries {
  getRecent: TypedQuery<{ limit?: number } & BaseArgs, TokenTradeData[]>;
  getByTrader: TypedQuery<{ traderAddress: string; limit?: number } & BaseArgs, TokenTradeData[]>;
  getByType: TypedQuery<{ type: "buy" | "sell"; limit?: number } & BaseArgs, TokenTradeData[]>;
  getWhaleTrades: TypedQuery<{ limit?: number } & BaseArgs, TokenTradeData[]>;
  getStats: TypedQuery<
    { period?: "1h" | "24h" | "7d" | "all" } & BaseArgs,
    {
      totalTrades: number;
      buyCount: number;
      sellCount: number;
      buyVolumeSol: number;
      sellVolumeSol: number;
      buyVolumeTokens: number;
      sellVolumeTokens: number;
      uniqueTraders: number;
      avgTradeSize: number;
      largestBuy: number;
      largestSell: number;
      whaleTradeCount: number;
    }
  >;
  getVolumeChart: TypedQuery<
    { period: "1h" | "24h" | "7d" } & BaseArgs,
    Array<{
      timestamp: number;
      buys: number;
      sells: number;
      buyVolume: number;
      sellVolume: number;
      totalVolume: number;
    }>
  >;
}

// =============================================================================
// ALERTS MODULE TYPES
// =============================================================================

export interface AlertChannelsQueries {
  getAll: TypedQuery<{ enabledOnly?: boolean } & BaseArgs, AlertChannelData[]>;
  getByType: TypedQuery<
    { type: "in_app" | "push" | "slack" | "discord" | "email" } & BaseArgs,
    AlertChannelData[]
  >;
  getForSeverity: TypedQuery<
    { severity: "info" | "warning" | "critical" } & BaseArgs,
    AlertChannelData[]
  >;
}

export interface AlertChannelsMutations {
  create: TypedMutation<
    {
      type: "in_app" | "push" | "slack" | "discord" | "email";
      name: string;
      config: { webhookUrl?: string; email?: string; minSeverity: "info" | "warning" | "critical" };
    } & BaseArgs,
    Id<"alertChannels">
  >;
  update: TypedMutation<
    {
      channelId: Id<"alertChannels">;
      name?: string;
      config?: {
        webhookUrl?: string;
        email?: string;
        minSeverity?: "info" | "warning" | "critical";
      };
      isEnabled?: boolean;
    } & BaseArgs,
    SuccessResponse
  >;
  remove: TypedMutation<{ channelId: Id<"alertChannels"> } & BaseArgs, SuccessResponse>;
  test: TypedMutation<
    { channelId: Id<"alertChannels"> } & BaseArgs,
    { success: boolean; message: string }
  >;
  setupDefaults: TypedMutation<EmptyArgs, { message: string; count: number }>;
}

export interface AlertHistoryQueries {
  getRecent: TypedQuery<{ limit?: number } & BaseArgs, AlertHistoryData[]>;
  getByRule: TypedQuery<
    { ruleId: Id<"alertRules">; limit?: number } & BaseArgs,
    AlertHistoryData[]
  >;
  getUnacknowledged: TypedQuery<EmptyArgs, AlertHistoryData[]>;
  getStats: TypedQuery<
    { days?: number } & BaseArgs,
    {
      totalAlerts: number;
      bySeverity: { info: number; warning: number; critical: number };
      acknowledged: number;
      unacknowledged: number;
      avgPerDay: number;
    }
  >;
}

export interface AlertHistoryMutations {
  acknowledge: TypedMutation<
    { alertId: Id<"alertHistory"> } & BaseArgs,
    { success: boolean; message?: string }
  >;
  acknowledgeAll: TypedMutation<EmptyArgs, { success: boolean; acknowledged: number }>;
}

export interface AlertRulesQueries {
  getAll: TypedQuery<{ enabledOnly?: boolean } & BaseArgs, AlertRuleData[]>;
  getByType: TypedQuery<{ triggerType: string } & BaseArgs, AlertRuleData[]>;
  getById: TypedQuery<{ ruleId: Id<"alertRules"> } & BaseArgs, AlertRuleData | null>;
}

export interface AlertRulesMutations {
  create: TypedMutation<
    {
      name: string;
      description?: string;
      triggerType: string;
      conditions: {
        threshold?: number;
        direction?: "above" | "below" | "change";
        timeframeMinutes?: number;
        percentChange?: number;
      };
      severity: "info" | "warning" | "critical";
      cooldownMinutes: number;
    } & BaseArgs,
    Id<"alertRules">
  >;
  update: TypedMutation<
    {
      ruleId: Id<"alertRules">;
      name?: string;
      description?: string;
      conditions?: {
        threshold?: number;
        direction?: "above" | "below" | "change";
        timeframeMinutes?: number;
        percentChange?: number;
      };
      severity?: string;
      cooldownMinutes?: number;
      isEnabled?: boolean;
    } & BaseArgs,
    SuccessResponse
  >;
  remove: TypedMutation<{ ruleId: Id<"alertRules"> } & BaseArgs, SuccessResponse>;
  toggleEnabled: TypedMutation<
    { ruleId: Id<"alertRules"> } & BaseArgs,
    { success: boolean; isEnabled: boolean }
  >;
  setupDefaults: TypedMutation<EmptyArgs, { message: string; count: number }>;
}

export interface AlertNotificationsQueries {
  getMy: TypedQuery<{ unreadOnly?: boolean; limit?: number } & BaseArgs, AdminNotificationData[]>;
  getUnreadCount: TypedQuery<EmptyArgs, number>;
  getWithAlertDetails: TypedQuery<
    { limit?: number } & BaseArgs,
    (AdminNotificationData & { alert: AlertHistoryData })[]
  >;
}

export interface AlertNotificationsMutations {
  markAsRead: TypedMutation<
    { notificationId: Id<"adminNotifications"> } & BaseArgs,
    SuccessResponse
  >;
  markAllAsRead: TypedMutation<EmptyArgs, { success: boolean; count: number }>;
  remove: TypedMutation<{ notificationId: Id<"adminNotifications"> } & BaseArgs, SuccessResponse>;
  clearAll: TypedMutation<EmptyArgs, { success: boolean; count: number }>;
}

// =============================================================================
// INFRASTRUCTURE MODULE TYPES
// =============================================================================

export interface AuditLogQueries {
  getRecentAuditLogs: TypedQuery<{ limit?: number } & BaseArgs, AuditLogEntry[]>;
  getAuditLogsByTable: TypedQuery<{ table: string; limit?: number } & BaseArgs, AuditLogEntry[]>;
  getAuditLogsByDocument: TypedQuery<
    { table: string; documentId: string; limit?: number } & BaseArgs,
    AuditLogEntry[]
  >;
  getAuditLogsByUser: TypedQuery<
    { userId: Id<"users">; limit?: number } & BaseArgs,
    AuditLogEntry[]
  >;
  getAuditLogsByOperation: TypedQuery<
    { operation: "insert" | "patch" | "delete"; limit?: number } & BaseArgs,
    AuditLogEntry[]
  >;
  getAuditLogsByTimeRange: TypedQuery<
    { startTime: number; endTime: number; limit?: number } & BaseArgs,
    AuditLogEntry[]
  >;
  getAuditStatistics: TypedQuery<
    { startTime: number; endTime: number } & BaseArgs,
    {
      total: number;
      byTable: Record<string, number>;
      byOperation: { insert: number; patch: number; delete: number };
      byUser: Record<string, number>;
    }
  >;
  getMyAuditLogs: TypedQuery<{ limit?: number } & BaseArgs, AuditLogEntry[]>;
}

export interface EmailActions {
  sendWelcomeEmail: TypedAction<{ email: string; username: string } & BaseArgs, { runId: string }>;
  sendSecurityAlert: TypedAction<
    { email: string; username: string; alertType: string; alertDetails: string } & BaseArgs,
    { runId: string }
  >;
  sendCardSoldNotification: TypedAction<
    { email: string; username: string; cardName: string; rarity: string; price: number } & BaseArgs,
    { runId: string }
  >;
  sendAuctionWonNotification: TypedAction<
    {
      email: string;
      username: string;
      cardName: string;
      rarity: string;
      winningBid: number;
    } & BaseArgs,
    { runId: string }
  >;
  sendAuctionOutbidNotification: TypedAction<
    {
      email: string;
      username: string;
      cardName: string;
      currentBid: number;
      auctionEndsAt: string;
    } & BaseArgs,
    { runId: string }
  >;
  sendFriendRequestNotification: TypedAction<
    { email: string; username: string; fromUsername: string } & BaseArgs,
    { runId: string }
  >;
}

// =============================================================================
// ADMIN MODULE TYPES
// =============================================================================

type NewsCategory = "update" | "event" | "patch" | "announcement" | "maintenance";

interface NewsArticle {
  _id: Id<"newsArticles">;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: NewsCategory;
  imageUrl?: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AdminNewsQueries {
  getPublishedNews: TypedQuery<
    { category?: NewsCategory; limit?: number } & BaseArgs,
    NewsArticle[]
  >;
  getArticleBySlug: TypedQuery<{ slug: string } & BaseArgs, NewsArticle | null>;
  listArticles: TypedQuery<
    { category?: NewsCategory; includeUnpublished?: boolean } & BaseArgs,
    NewsArticle[]
  >;
  getArticle: TypedQuery<{ articleId: Id<"newsArticles"> } & BaseArgs, NewsArticle | null>;
  getNewsStats: TypedQuery<
    EmptyArgs,
    { total: number; published: number; drafts: number; byCategory: Record<string, number> }
  >;
}

export interface AdminNewsMutations {
  createArticle: TypedMutation<
    {
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      category: NewsCategory;
      imageUrl?: string;
      isPinned?: boolean;
      isPublished?: boolean;
    } & BaseArgs,
    Id<"newsArticles">
  >;
  updateArticle: TypedMutation<
    {
      articleId: Id<"newsArticles">;
      title?: string;
      slug?: string;
      excerpt?: string;
      content?: string;
      category?: NewsCategory;
      imageUrl?: string;
      isPinned?: boolean;
    } & BaseArgs,
    SuccessResponse
  >;
  deleteArticle: TypedMutation<{ articleId: Id<"newsArticles"> } & BaseArgs, SuccessResponse>;
  togglePublished: TypedMutation<
    { articleId: Id<"newsArticles"> } & BaseArgs,
    { isPublished: boolean }
  >;
  togglePinned: TypedMutation<{ articleId: Id<"newsArticles"> } & BaseArgs, { isPinned: boolean }>;
}

export interface AdminCardsQueries {
  listCards: TypedQuery<
    { cardType?: string; rarity?: string; archetype?: string; isActive?: boolean } & BaseArgs,
    CardDefinition[]
  >;
  getCard: TypedQuery<{ cardId: Id<"cardDefinitions"> } & BaseArgs, CardDefinition | null>;
  getCardStats: TypedQuery<
    EmptyArgs,
    {
      total: number;
      active: number;
      byType: Record<string, number>;
      byRarity: Record<string, number>;
    }
  >;
}

export interface AdminCardsMutations {
  createCard: TypedMutation<
    {
      name: string;
      rarity: string;
      archetype: string;
      cardType: string;
      attack?: number;
      defense?: number;
      cost: number;
      ability?: {
        name: string;
        description: string;
        effects: Array<{ type: string; value?: number; target?: string }>;
      };
      flavorText?: string;
      imageUrl?: string;
    } & BaseArgs,
    Id<"cardDefinitions">
  >;
  updateCard: TypedMutation<
    { cardId: Id<"cardDefinitions"> } & Record<string, unknown>,
    SuccessResponse
  >;
  toggleCardActive: TypedMutation<
    { cardId: Id<"cardDefinitions"> } & BaseArgs,
    { isActive: boolean }
  >;
  deleteCard: TypedMutation<{ cardId: Id<"cardDefinitions"> } & BaseArgs, SuccessResponse>;
  duplicateCard: TypedMutation<
    { cardId: Id<"cardDefinitions">; newName: string } & BaseArgs,
    Id<"cardDefinitions">
  >;
}

export interface AdminAchievementsQueries {
  listAchievements: TypedQuery<
    { category?: string; isActive?: boolean } & BaseArgs,
    AdminAchievementDefinition[]
  >;
  getAchievement: TypedQuery<
    { achievementId: Id<"achievementDefinitions"> } & BaseArgs,
    AdminAchievementDefinition | null
  >;
  getAchievementStats: TypedQuery<
    EmptyArgs,
    { total: number; active: number; byCategory: Record<string, number> }
  >;
}

export interface AdminAchievementsMutations {
  createAchievement: TypedMutation<Record<string, unknown>, Id<"achievementDefinitions">>;
  updateAchievement: TypedMutation<
    { achievementId: Id<"achievementDefinitions"> } & Record<string, unknown>,
    SuccessResponse
  >;
  toggleAchievementActive: TypedMutation<
    { achievementId: Id<"achievementDefinitions"> } & BaseArgs,
    { isActive: boolean }
  >;
  deleteAchievement: TypedMutation<
    { achievementId: Id<"achievementDefinitions"> } & BaseArgs,
    SuccessResponse
  >;
  duplicateAchievement: TypedMutation<
    { achievementId: Id<"achievementDefinitions">; newName: string } & BaseArgs,
    Id<"achievementDefinitions">
  >;
}

export interface AdminBattlePassQueries {
  listBattlePassSeasons: TypedQuery<
    { status?: string; limit?: number; offset?: number } & BaseArgs,
    AdminBattlePassListResponse
  >;
  getBattlePass: TypedQuery<
    { battlePassId: Id<"battlePassSeasons"> } & BaseArgs,
    AdminBattlePassSeasonData | null
  >;
  getBattlePassTiers: TypedQuery<
    { battlePassId: Id<"battlePassSeasons"> } & BaseArgs,
    BattlePassTierDefinition[]
  >;
  getBattlePassStats: TypedQuery<EmptyArgs, AdminBattlePassOverviewStats>;
  getAvailableSeasonsForBattlePass: TypedQuery<EmptyArgs, SeasonData[]>;
}

export interface AdminBattlePassMutations {
  createBattlePassSeason: TypedMutation<
    {
      seasonId: Id<"seasons">;
      name: string;
      description?: string;
      totalTiers?: number;
      xpPerTier?: number;
      useDefaultRewards?: boolean;
    } & BaseArgs,
    { battlePassId: Id<"battlePassSeasons">; message: string }
  >;
  updateBattlePassSeason: TypedMutation<
    { battlePassId: Id<"battlePassSeasons"> } & Record<string, unknown>,
    SuccessResponse
  >;
  defineBattlePassTier: TypedMutation<
    { battlePassId: Id<"battlePassSeasons"> } & Record<string, unknown>,
    Id<"battlePassTiers">
  >;
  defineBattlePassTiers: TypedMutation<
    {
      battlePassId: Id<"battlePassSeasons">;
      tiers: Array<{
        tier: number;
        freeReward?: RewardData;
        premiumReward?: RewardData;
        isMilestone?: boolean;
      }>;
      replaceExisting?: boolean;
    } & BaseArgs,
    { success: boolean; message: string; created: number; updated: number }
  >;
  activateBattlePass: TypedMutation<
    { battlePassId: Id<"battlePassSeasons"> } & BaseArgs,
    SuccessResponse
  >;
  endBattlePass: TypedMutation<
    { battlePassId: Id<"battlePassSeasons"> } & BaseArgs,
    SuccessResponse
  >;
  deleteBattlePass: TypedMutation<
    { battlePassId: Id<"battlePassSeasons"> } & BaseArgs,
    SuccessResponse
  >;
}

export interface AdminStoryQueries {
  listChapters: TypedQuery<{ actNumber?: number } & BaseArgs, AdminStoryChapterData[]>;
  getChapter: TypedQuery<
    { chapterId: Id<"storyChapters"> } & BaseArgs,
    AdminStoryChapterData | null
  >;
  getChapterStats: TypedQuery<
    { chapterId: Id<"storyChapters"> } & BaseArgs,
    { totalPlayers: number; completionRate: number; avgStars: number }
  >;
  listStages: TypedQuery<{ chapterId: Id<"storyChapters"> } & BaseArgs, StoryStageDetail[]>;
  getStage: TypedQuery<{ stageId: Id<"storyStages"> } & BaseArgs, StoryStageDetail | null>;
}

export interface AdminStoryMutations {
  createChapter: TypedMutation<Record<string, unknown>, Id<"storyChapters">>;
  updateChapter: TypedMutation<
    { chapterId: Id<"storyChapters"> } & Record<string, unknown>,
    SuccessResponse
  >;
  publishChapter: TypedMutation<{ chapterId: Id<"storyChapters"> } & BaseArgs, SuccessResponse>;
  deleteChapter: TypedMutation<{ chapterId: Id<"storyChapters"> } & BaseArgs, SuccessResponse>;
  reorderChapters: TypedMutation<{ chapterIds: Id<"storyChapters">[] } & BaseArgs, SuccessResponse>;
  createStage: TypedMutation<
    { chapterId: Id<"storyChapters"> } & Record<string, unknown>,
    Id<"storyStages">
  >;
  updateStage: TypedMutation<
    { stageId: Id<"storyStages"> } & Record<string, unknown>,
    SuccessResponse
  >;
  publishStage: TypedMutation<{ stageId: Id<"storyStages"> } & BaseArgs, SuccessResponse>;
  deleteStage: TypedMutation<{ stageId: Id<"storyStages"> } & BaseArgs, SuccessResponse>;
  reorderStages: TypedMutation<{ stageIds: Id<"storyStages">[] } & BaseArgs, SuccessResponse>;
}

export interface AdminPromoCodesQueries {
  listPromoCodes: TypedQuery<{ isActive?: boolean } & BaseArgs, AdminPromoCodeData[]>;
  getPromoCode: TypedQuery<{ promoCodeId: Id<"promoCodes"> } & BaseArgs, AdminPromoCodeData | null>;
  getPromoCodeStats: TypedQuery<
    { promoCodeId: Id<"promoCodes"> } & BaseArgs,
    { totalUses: number; uniqueUsers: number; lastUsedAt?: number }
  >;
  exportPromoCodes: TypedQuery<{ isActive?: boolean } & BaseArgs, AdminPromoCodeData[]>;
}

export interface AdminPromoCodesMutations {
  createPromoCode: TypedMutation<Record<string, unknown>, Id<"promoCodes">>;
  updatePromoCode: TypedMutation<
    { promoCodeId: Id<"promoCodes"> } & Record<string, unknown>,
    SuccessResponse
  >;
  togglePromoCodeActive: TypedMutation<
    { promoCodeId: Id<"promoCodes"> } & BaseArgs,
    { isActive: boolean }
  >;
  deletePromoCode: TypedMutation<{ promoCodeId: Id<"promoCodes"> } & BaseArgs, SuccessResponse>;
  bulkGeneratePromoCodes: TypedMutation<
    { count: number } & Record<string, unknown>,
    { codes: string[] }
  >;
}

export interface AdminConfigQueries {
  listConfigs: TypedQuery<{ category?: string } & BaseArgs, AdminConfigData[]>;
  getConfig: TypedQuery<{ configId: Id<"systemConfigs"> } & BaseArgs, AdminConfigData | null>;
  getConfigValue: TypedQuery<
    { key: string } & BaseArgs,
    string | number | boolean | Record<string, unknown> | null
  >;
  getConfigStats: TypedQuery<EmptyArgs, { total: number; byCategory: Record<string, number> }>;
}

export interface AdminConfigMutations {
  updateConfig: TypedMutation<
    { configId: Id<"systemConfigs">; value: unknown } & BaseArgs,
    SuccessResponse
  >;
  bulkUpdateConfigs: TypedMutation<
    { updates: Array<{ key: string; value: unknown }> } & BaseArgs,
    { updated: number }
  >;
  resetToDefault: TypedMutation<{ configId: Id<"systemConfigs"> } & BaseArgs, SuccessResponse>;
  initializeDefaults: TypedMutation<EmptyArgs, { initialized: number }>;
}

export interface AdminShopQueries {
  listProducts: TypedQuery<
    { category?: string; isActive?: boolean } & BaseArgs,
    AdminShopProductData[]
  >;
  getProduct: TypedQuery<{ productId: Id<"shopProducts"> } & BaseArgs, AdminShopProductData | null>;
  getShopStats: TypedQuery<
    EmptyArgs,
    { total: number; active: number; byCategory: Record<string, number> }
  >;
}

export interface AdminShopMutations {
  createProduct: TypedMutation<Record<string, unknown>, Id<"shopProducts">>;
  updateProduct: TypedMutation<
    { productId: Id<"shopProducts"> } & Record<string, unknown>,
    SuccessResponse
  >;
  toggleProductActive: TypedMutation<
    { productId: Id<"shopProducts"> } & BaseArgs,
    { isActive: boolean }
  >;
  deleteProduct: TypedMutation<{ productId: Id<"shopProducts"> } & BaseArgs, SuccessResponse>;
  duplicateProduct: TypedMutation<
    { productId: Id<"shopProducts">; newName: string } & BaseArgs,
    Id<"shopProducts">
  >;
  reorderProducts: TypedMutation<{ productIds: Id<"shopProducts">[] } & BaseArgs, SuccessResponse>;
}

export interface AdminQuestsQueries {
  listQuests: TypedQuery<
    { questType?: string; isActive?: boolean } & BaseArgs,
    AdminQuestDefinitionData[]
  >;
  getQuest: TypedQuery<
    { questId: Id<"questDefinitions"> } & BaseArgs,
    AdminQuestDefinitionData | null
  >;
  getQuestStats: TypedQuery<
    EmptyArgs,
    { total: number; active: number; byType: Record<string, number> }
  >;
}

export interface AdminQuestsMutations {
  createQuest: TypedMutation<Record<string, unknown>, Id<"questDefinitions">>;
  updateQuest: TypedMutation<
    { questId: Id<"questDefinitions"> } & Record<string, unknown>,
    SuccessResponse
  >;
  toggleQuestActive: TypedMutation<
    { questId: Id<"questDefinitions"> } & BaseArgs,
    { isActive: boolean }
  >;
  deleteQuest: TypedMutation<{ questId: Id<"questDefinitions"> } & BaseArgs, SuccessResponse>;
  duplicateQuest: TypedMutation<
    { questId: Id<"questDefinitions">; newName: string } & BaseArgs,
    Id<"questDefinitions">
  >;
}

export interface AdminTournamentsQueries {
  listTournaments: TypedQuery<{ status?: string } & BaseArgs, AdminTournamentFullData[]>;
  getTournament: TypedQuery<
    { tournamentId: Id<"tournaments"> } & BaseArgs,
    AdminTournamentFullData | null
  >;
  getTournamentStats: TypedQuery<
    { tournamentId: Id<"tournaments"> } & BaseArgs,
    { participants: number; matches: number; avgMatchDuration: number; prizeDistributed: number }
  >;
  getTournamentLeaderboard: TypedQuery<
    { tournamentId: Id<"tournaments"> } & BaseArgs,
    Array<{
      userId: Id<"users">;
      username?: string;
      rank: number;
      points: number;
      wins: number;
      losses: number;
    }>
  >;
}

export interface AdminTournamentsMutations {
  createTournament: TypedMutation<Record<string, unknown>, Id<"tournaments">>;
  updateTournament: TypedMutation<
    { tournamentId: Id<"tournaments"> } & Record<string, unknown>,
    SuccessResponse
  >;
  cancelTournament: TypedMutation<
    { tournamentId: Id<"tournaments">; reason?: string } & BaseArgs,
    SuccessResponse
  >;
  grantTournamentEntry: TypedMutation<
    { tournamentId: Id<"tournaments">; userId: Id<"users"> } & BaseArgs,
    SuccessResponse
  >;
  removeParticipant: TypedMutation<
    { tournamentId: Id<"tournaments">; userId: Id<"users"> } & BaseArgs,
    SuccessResponse
  >;
  forceStartTournament: TypedMutation<
    { tournamentId: Id<"tournaments"> } & BaseArgs,
    SuccessResponse
  >;
  disqualifyParticipant: TypedMutation<
    { tournamentId: Id<"tournaments">; userId: Id<"users">; reason: string } & BaseArgs,
    SuccessResponse
  >;
}

/** Period type for analytics queries */
export type AnalyticsPeriodType = "daily" | "weekly" | "monthly" | "all_time";

export interface AdminAnalyticsQueries {
  getTopCardsByWinRate: TypedQuery<
    { limit: number; periodType: AnalyticsPeriodType; minGames?: number } & BaseArgs,
    CardRateStats[]
  >;
  getTopCardsByPlayRate: TypedQuery<
    { limit: number; periodType: AnalyticsPeriodType } & BaseArgs,
    CardRateStats[]
  >;
  getCardStatsByArchetype: TypedQuery<
    { archetype: string; periodType: AnalyticsPeriodType } & BaseArgs,
    CardArchetypeStats[]
  >;
  getCurrentEconomySnapshot: TypedQuery<EmptyArgs, EconomySnapshot>;
  getEconomyTrends: TypedQuery<
    { periodType: "daily" | "weekly" | "monthly"; days: number } & BaseArgs,
    EconomyTrend[]
  >;
  getEconomyMetrics: TypedQuery<{ days: number } & BaseArgs, EconomyMetric[]>;
  getWealthDistribution: TypedQuery<EmptyArgs, WealthDistribution>;
  getPlayerDistribution: TypedQuery<EmptyArgs, PlayerDistributionStats>;
  getPlayerRetention: TypedQuery<
    { periodType: "daily" | "weekly" | "monthly" } & BaseArgs,
    PlayerRetentionStats
  >;
  getGameStats: TypedQuery<{ periodType: AnalyticsPeriodType } & BaseArgs, GameStats>;
  getMatchmakingStats: TypedQuery<EmptyArgs, MatchmakingStats>;
  getMatchmakingHealth: TypedQuery<EmptyArgs, MatchmakingHealth>;
  getMatchmakingStatsDetailed: TypedQuery<{ days: number } & BaseArgs, MatchmakingStatsDetailed[]>;
  getSkillDistribution: TypedQuery<{ ratingType: string } & BaseArgs, SkillDistribution>;
  getRetentionOverview: TypedQuery<EmptyArgs, RetentionOverview>;
  getTopEngagedPlayers: TypedQuery<{ days: number; limit: number } & BaseArgs, EngagedPlayer[]>;
  getDailyActiveStats: TypedQuery<{ days: number } & BaseArgs, DailyStat[]>;
  getMarketplaceStats: TypedQuery<{ periodType: AnalyticsPeriodType } & BaseArgs, MarketplaceStats>;
  getPlayerEngagement: TypedQuery<
    { userId: Id<"users">; days: number } & BaseArgs,
    PlayerEngagement
  >;
}

export interface AdminModerationQueries {
  getPlayerModerationStatus: TypedQuery<{ userId: Id<"users"> } & BaseArgs, PlayerModerationStatus>;
  getModerationHistory: TypedQuery<
    { userId: Id<"users">; limit?: number } & BaseArgs,
    ModerationReport[]
  >;
  listBannedPlayers: TypedQuery<{ limit?: number } & BaseArgs, AdminPlayerInfo[]>;
  listSuspendedPlayers: TypedQuery<{ limit?: number } & BaseArgs, AdminPlayerInfo[]>;
}

export interface AdminModerationMutations {
  banPlayer: TypedMutation<{ userId: Id<"users">; reason: string } & BaseArgs, SuccessResponse>;
  unbanPlayer: TypedMutation<{ userId: Id<"users"> } & BaseArgs, SuccessResponse>;
  suspendPlayer: TypedMutation<
    { userId: Id<"users">; reason: string; durationDays: number } & BaseArgs,
    SuccessResponse
  >;
  unsuspendPlayer: TypedMutation<{ userId: Id<"users"> } & BaseArgs, SuccessResponse>;
  warnPlayer: TypedMutation<{ userId: Id<"users">; reason: string } & BaseArgs, SuccessResponse>;
  addModerationNote: TypedMutation<
    { userId: Id<"users">; note: string } & BaseArgs,
    SuccessResponse
  >;
}

export interface AdminChatQueries {
  listMessages: TypedQuery<
    {
      limit?: number;
      userId?: Id<"users">;
      search?: string;
      offset?: number;
      since?: number;
    } & BaseArgs,
    AdminChatMessagesResponse
  >;
  getMessage: TypedQuery<
    { messageId: Id<"globalChatMessages"> } & BaseArgs,
    AdminChatMessage | null
  >;
  getChatStats: TypedQuery<EmptyArgs, AdminChatStats>;
  getMutedUsers: TypedQuery<EmptyArgs, AdminMutedUser[]>;
}

export interface AdminChatMutations {
  deleteMessage: TypedMutation<
    { messageId: Id<"globalChatMessages">; reason?: string } & BaseArgs,
    SuccessResponse
  >;
  bulkDeleteMessages: TypedMutation<
    { messageIds: Id<"globalChatMessages">[]; reason?: string } & BaseArgs,
    { deleted: number }
  >;
  deleteUserMessages: TypedMutation<{ userId: Id<"users"> } & BaseArgs, { deleted: number }>;
  muteUser: TypedMutation<
    { userId: Id<"users">; durationMinutes: number; reason?: string } & BaseArgs,
    SuccessResponse
  >;
  unmuteUser: TypedMutation<{ userId: Id<"users"> } & BaseArgs, SuccessResponse>;
  clearAllMessages: TypedMutation<EmptyArgs, { deleted: number }>;
}

export interface AdminReportsQueries {
  listReports: TypedQuery<{ status?: string; type?: string } & BaseArgs, ModerationReport[]>;
  getReport: TypedQuery<{ reportId: Id<"playerReports"> } & BaseArgs, ModerationReport | null>;
  getReportStats: TypedQuery<
    EmptyArgs,
    { total: number; pending: number; resolved: number; byType: Record<string, number> }
  >;
}

export interface AdminReportsMutations {
  updateReportStatus: TypedMutation<
    { reportId: Id<"playerReports">; status: string } & BaseArgs,
    SuccessResponse
  >;
  resolveReportWithAction: TypedMutation<
    { reportId: Id<"playerReports">; action: string; notes?: string } & BaseArgs,
    SuccessResponse
  >;
  bulkUpdateReportStatus: TypedMutation<
    { reportIds: Id<"playerReports">[]; status: string } & BaseArgs,
    { updated: number }
  >;
}

export interface AdminMarketplaceQueries {
  listListings: TypedQuery<
    {
      status?: string;
      sellerId?: Id<"users">;
      search?: string;
      priceMin?: number;
      priceMax?: number;
      flagged?: boolean;
      limit?: number;
      offset?: number;
    } & BaseArgs,
    AdminMarketplaceListResponse
  >;
  getListing: TypedQuery<
    { listingId: Id<"marketplaceListings"> } & BaseArgs,
    AdminMarketplaceListingDetail | null
  >;
  getMarketplaceStats: TypedQuery<EmptyArgs, MarketplaceStats>;
  getPriceAnomalies: TypedQuery<EmptyArgs, PriceAnomalyData[]>;
  getSellerHistory: TypedQuery<{ sellerId: Id<"users"> } & BaseArgs, AdminMarketplaceListing[]>;
  getPriceCaps: TypedQuery<
    EmptyArgs,
    {
      _id: Id<"marketplacePriceCaps">;
      cardDefinitionId: Id<"cardDefinitions">;
      cardName: string;
      cardRarity: string;
      maxPrice: number;
    }[]
  >;
}

export interface AdminMarketplaceMutations {
  suspendListing: TypedMutation<
    { listingId: Id<"marketplaceListings">; reason: string } & BaseArgs,
    SuccessResponse
  >;
  suspendSellerListings: TypedMutation<
    { sellerId: Id<"users">; reason: string } & BaseArgs,
    { suspended: number }
  >;
  setPriceCap: TypedMutation<
    { cardDefinitionId: Id<"cardDefinitions">; maxPrice: number } & BaseArgs,
    SuccessResponse
  >;
  refundBid: TypedMutation<
    { listingId: Id<"marketplaceListings">; bidderId: Id<"users"> } & BaseArgs,
    SuccessResponse
  >;
  removePriceCap: TypedMutation<
    { cardDefinitionId: Id<"cardDefinitions"> } & BaseArgs,
    SuccessResponse
  >;
  unsuspendListing: TypedMutation<
    { listingId: Id<"marketplaceListings"> } & BaseArgs,
    SuccessResponse
  >;
}

export interface AdminSeasonsQueries {
  listSeasons: TypedQuery<{ status?: string } & BaseArgs, SeasonData[]>;
  getSeason: TypedQuery<{ seasonId: Id<"seasons"> } & BaseArgs, SeasonData | null>;
  getCurrentSeason: TypedQuery<EmptyArgs, SeasonData | null>;
  getSeasonStats: TypedQuery<
    { seasonId: Id<"seasons"> } & BaseArgs,
    { totalPlayers: number; activePlayers: number; gamesPlayed: number; avgGamesPerPlayer: number }
  >;
  getSeasonLeaderboard: TypedQuery<
    { seasonId: Id<"seasons">; limit?: number } & BaseArgs,
    { userId: Id<"users">; username: string; rank: number; points: number }[]
  >;
  previewSeasonRewards: TypedQuery<
    { seasonId: Id<"seasons"> } & BaseArgs,
    { rank: number; rewardType: string; amount: number }[]
  >;
}

export interface AdminSeasonsMutations {
  createSeason: TypedMutation<Record<string, unknown>, Id<"seasons">>;
  updateSeason: TypedMutation<
    { seasonId: Id<"seasons"> } & Record<string, unknown>,
    SuccessResponse
  >;
  startSeason: TypedMutation<{ seasonId: Id<"seasons"> } & BaseArgs, SuccessResponse>;
  endSeason: TypedMutation<{ seasonId: Id<"seasons"> } & BaseArgs, SuccessResponse>;
  distributeSeasonRewards: TypedMutation<
    { seasonId: Id<"seasons"> } & BaseArgs,
    { distributed: number }
  >;
  deleteSeason: TypedMutation<{ seasonId: Id<"seasons"> } & BaseArgs, SuccessResponse>;
}

export interface AdminRolesQueries {
  listAdminsByRole: TypedQuery<{ role?: string } & BaseArgs, AdminRoleInfo[]>;
  getMyRole: TypedQuery<EmptyArgs, { role: string | null; permissions: string[] }>;
  getExpiringRoles: TypedQuery<{ withinDays?: number } & BaseArgs, AdminRoleInfo[]>;
}

export interface AdminRolesMutations {
  grantRole: TypedMutation<
    {
      targetUserId: Id<"users">;
      role: "moderator" | "admin" | "superadmin";
      expiresAt?: number;
      grantNote?: string;
    } & BaseArgs,
    SuccessResponse
  >;
  revokeRole: TypedMutation<{ targetUserId: Id<"users"> } & BaseArgs, SuccessResponse>;
  extendRole: TypedMutation<
    { targetUserId: Id<"users">; newExpiresAt: number } & BaseArgs,
    SuccessResponse
  >;
  makeRolePermanent: TypedMutation<{ targetUserId: Id<"users"> } & BaseArgs, SuccessResponse>;
  cleanupExpiredRoles: TypedMutation<EmptyArgs, { removed: number }>;
}

export interface AdminFeaturesQueries {
  listFeatureFlags: TypedQuery<{ category?: string } & BaseArgs, FeatureFlagData[]>;
  getFeatureFlag: TypedQuery<{ flagId: Id<"featureFlags"> } & BaseArgs, FeatureFlagData | null>;
  getFeatureFlagStats: TypedQuery<
    EmptyArgs,
    { total: number; enabled: number; byCategory: Record<string, number> }
  >;
  checkFeatureFlag: TypedQuery<{ key: string } & BaseArgs, boolean>;
  checkFeatureFlags: TypedQuery<{ keys: string[] } & BaseArgs, Record<string, boolean>>;
}

export interface AdminFeaturesMutations {
  createFeatureFlag: TypedMutation<Record<string, unknown>, Id<"featureFlags">>;
  updateFeatureFlag: TypedMutation<
    { flagId: Id<"featureFlags"> } & Record<string, unknown>,
    SuccessResponse
  >;
  toggleFeatureFlag: TypedMutation<
    { flagId: Id<"featureFlags"> } & BaseArgs,
    { isEnabled: boolean }
  >;
  deleteFeatureFlag: TypedMutation<{ flagId: Id<"featureFlags"> } & BaseArgs, SuccessResponse>;
}

export interface AdminTemplatesQueries {
  listTemplates: TypedQuery<{ cardType?: string } & BaseArgs, AdminTemplateData[]>;
  getTemplate: TypedQuery<{ templateId: Id<"cardTemplates"> } & BaseArgs, AdminTemplateData | null>;
  getDefaultTemplate: TypedQuery<{ cardType: string } & BaseArgs, AdminTemplateData | null>;
  getTemplateStats: TypedQuery<EmptyArgs, AdminTemplateStats>;
}

export interface AdminTemplatesMutations {
  createTemplate: TypedMutation<Record<string, unknown>, Id<"cardTemplates">>;
  updateTemplate: TypedMutation<
    { templateId: Id<"cardTemplates"> } & Record<string, unknown>,
    SuccessResponse
  >;
  setDefaultTemplate: TypedMutation<
    { templateId: Id<"cardTemplates"> } & BaseArgs,
    SuccessResponse
  >;
  duplicateTemplate: TypedMutation<
    { templateId: Id<"cardTemplates">; newName: string } & BaseArgs,
    Id<"cardTemplates">
  >;
  deleteTemplate: TypedMutation<{ templateId: Id<"cardTemplates"> } & BaseArgs, SuccessResponse>;
  addBlock: TypedMutation<
    { templateId: Id<"cardTemplates"> } & Record<string, unknown>,
    Id<"cardTemplateBlocks">
  >;
  updateBlock: TypedMutation<
    { blockId: Id<"cardTemplateBlocks"> } & Record<string, unknown>,
    SuccessResponse
  >;
  deleteBlock: TypedMutation<{ blockId: Id<"cardTemplateBlocks"> } & BaseArgs, SuccessResponse>;
  reorderBlocks: TypedMutation<
    { blockIds: Id<"cardTemplateBlocks">[] } & BaseArgs,
    SuccessResponse
  >;
}

// Batch preview user type
export interface BatchPreviewUser {
  _id: Id<"users">;
  username?: string;
  email?: string;
  gold?: number;
  rating?: number;
}

export interface AdminBatchQueries {
  previewBatchGrantGold: TypedQuery<
    { filter: Record<string, unknown>; amount: number } & BaseArgs,
    { affectedCount: number; users: BatchPreviewUser[] }
  >;
  previewBatchResetRatings: TypedQuery<
    { filter: Record<string, unknown> } & BaseArgs,
    { affectedCount: number; users: BatchPreviewUser[] }
  >;
  previewBatchGrantPacks: TypedQuery<
    { filter: Record<string, unknown>; packType: string; quantity: number } & BaseArgs,
    { affectedCount: number; users: BatchPreviewUser[] }
  >;
  previewBatchGrantCards: TypedQuery<
    {
      filter: Record<string, unknown>;
      cardIds: Id<"cardDefinitions">[];
      quantity: number;
    } & BaseArgs,
    { affectedCount: number; users: BatchPreviewUser[] }
  >;
}

export interface AdminBatchMutations {
  batchGrantGold: TypedMutation<
    { filter: Record<string, unknown>; amount: number; reason: string } & BaseArgs,
    { affected: number }
  >;
  batchResetRatings: TypedMutation<
    { filter: Record<string, unknown>; reason: string } & BaseArgs,
    { affected: number }
  >;
  batchGrantPremium: TypedMutation<
    { filter: Record<string, unknown>; durationDays: number; reason: string } & BaseArgs,
    { affected: number }
  >;
  batchGrantPacks: TypedMutation<
    {
      filter: Record<string, unknown>;
      packType: string;
      quantity: number;
      reason: string;
    } & BaseArgs,
    { affected: number }
  >;
  grantCardsToPlayer: TypedMutation<
    {
      userId: Id<"users">;
      cardIds: Id<"cardDefinitions">[];
      quantity: number;
      reason: string;
    } & BaseArgs,
    { granted: number }
  >;
  removeCardsFromPlayer: TypedMutation<
    {
      userId: Id<"users">;
      cardIds: Id<"cardDefinitions">[];
      quantity: number;
      reason: string;
    } & BaseArgs,
    { removed: number }
  >;
  batchGrantCards: TypedMutation<
    {
      filter: Record<string, unknown>;
      cardIds: Id<"cardDefinitions">[];
      quantity: number;
      reason: string;
    } & BaseArgs,
    { affected: number }
  >;
  sendAnnouncement: TypedMutation<
    {
      playerIds: Id<"users">[];
      title: string;
      message: string;
      priority?: "normal" | "important" | "urgent";
      expiresInDays?: number;
    } & BaseArgs,
    { success: boolean; message: string; recipientCount: number }
  >;
  broadcastAnnouncement: TypedMutation<
    { title: string; message: string; filter?: Record<string, unknown> } & BaseArgs,
    { sent: number }
  >;
  sendSystemMessage: TypedMutation<
    { userId: Id<"users">; message: string } & BaseArgs,
    SuccessResponse
  >;
}

// Revenue overview types
export interface RevenueTimePeriodMetrics {
  today: number;
  week: number;
  month: number;
  allTime: number;
}

export interface RevenueOverviewData {
  packs: RevenueTimePeriodMetrics;
  gems: RevenueTimePeriodMetrics;
  combined: RevenueTimePeriodMetrics;
  spenders: { today: number; week: number };
  packCount: RevenueTimePeriodMetrics;
}

export interface RevenueTrendData {
  date: string;
  packs: number;
  gems: number;
  packCount: number;
  gemCount: number;
}

export interface PackSalesBreakdownData {
  packType: string;
  count: number;
  goldRevenue: number;
  gemRevenue: number;
}

export interface GemPurchaseMetricsData {
  totals: { usdVolume: number; tokenVolume: number; gemsGranted: number; purchases: number };
  today: { usdVolume: number; purchases: number };
  week: { usdVolume: number; purchases: number };
  averages: { usdPerPurchase: number; gemsPerPurchase: number };
  status: { confirmed: number; pending: number; failed: number; conversionRate: number };
  byPackage: Array<{ packageId: string; count: number }>;
}

export interface RevenueTopSpenderData {
  usedId: string;
  totalSpend: number;
  packSpend: number;
  gemSpend: number;
  packCount: number;
  gemCount: number;
  username: string;
}

export interface CurrencyCirculationData {
  gold: {
    total: number;
    holders: number;
    average: number;
    inflowToday: number;
    outflowToday: number;
    netFlowToday: number;
  };
  gems: {
    total: number;
    holders: number;
    average: number;
    inflowToday: number;
    outflowToday: number;
    netFlowToday: number;
  };
  totalUsers: number;
}

export interface RevenueLargePurchaseData {
  _id: Id<"packOpeningHistory">;
  packType: string;
  userId: Id<"users">;
  amountPaid: number;
  openedAt: number;
  username: string;
}

export interface AdminRevenueQueries {
  getRevenueOverview: TypedQuery<EmptyArgs, RevenueOverviewData>;
  getRevenueTrend: TypedQuery<{ days?: number } & BaseArgs, RevenueTrendData[]>;
  getPackSalesBreakdown: TypedQuery<
    { period?: "day" | "week" | "month" | "all" } & BaseArgs,
    PackSalesBreakdownData[]
  >;
  getGemPurchaseMetrics: TypedQuery<EmptyArgs, GemPurchaseMetricsData>;
  getTopSpenders: TypedQuery<
    { limit?: number; period?: "day" | "week" | "month" | "all" } & BaseArgs,
    RevenueTopSpenderData[]
  >;
  getCurrencyCirculation: TypedQuery<EmptyArgs, CurrencyCirculationData>;
  getRecentLargePurchases: TypedQuery<
    { limit?: number; minAmount?: number } & BaseArgs,
    RevenueLargePurchaseData[]
  >;
}

// Sales types
export type SaleType = "flash" | "weekend" | "launch" | "holiday" | "anniversary" | "returning";

export interface SaleData {
  _id: Id<"shopSales">;
  saleId: string;
  name: string;
  description: string;
  saleType: SaleType;
  discountPercent?: number;
  bonusCards?: number;
  bonusGems?: number;
  applicableProducts: string[];
  startsAt: number;
  endsAt: number;
  isActive: boolean;
  priority: number;
  usageCount: number;
  totalDiscountGiven: number;
  createdBy: Id<"users">;
  createdAt: number;
  conditions?: {
    minPurchaseAmount?: number;
    maxUsesTotal?: number;
    maxUsesPerUser?: number;
    returningPlayerOnly?: boolean;
    newPlayerOnly?: boolean;
  };
}

export interface SaleStatsData {
  totalSales: number;
  activeSales: number;
  upcomingSales: number;
  expiredSales: number;
  totalUsage: number;
  usageByType: Record<string, number>;
}

export interface AdminSalesQueries {
  listSales: TypedQuery<
    { includeInactive?: boolean; includeExpired?: boolean; saleType?: SaleType } & BaseArgs,
    SaleData[]
  >;
  getSale: TypedQuery<{ saleDbId: Id<"shopSales"> } & BaseArgs, SaleData | null>;
  getSaleStats: TypedQuery<EmptyArgs, SaleStatsData>;
}

export interface AdminSalesMutations {
  createSale: TypedMutation<
    {
      saleId: string;
      name: string;
      description: string;
      saleType: SaleType;
      discountPercent?: number;
      bonusCards?: number;
      bonusGems?: number;
      applicableProducts: string[];
      startsAt: number;
      endsAt: number;
      priority?: number;
      minPurchaseAmount?: number;
      maxUsesTotal?: number;
      maxUsesPerUser?: number;
      returningPlayerOnly?: boolean;
      newPlayerOnly?: boolean;
    },
    { saleDbId: Id<"shopSales">; message: string }
  >;
  updateSale: TypedMutation<
    { saleDbId: Id<"shopSales"> } & Record<string, unknown>,
    SuccessResponse
  >;
  endSaleEarly: TypedMutation<{ saleDbId: Id<"shopSales"> } & BaseArgs, SuccessResponse>;
  toggleSaleActive: TypedMutation<
    { saleDbId: Id<"shopSales"> } & BaseArgs,
    { success: boolean; isActive: boolean; message: string }
  >;
  deleteSale: TypedMutation<{ saleDbId: Id<"shopSales"> } & BaseArgs, SuccessResponse>;
  createFlashSale: TypedMutation<
    { name: string; discountPercent: number; applicableProducts: string[]; durationHours?: number },
    { saleDbId: Id<"shopSales">; saleId: string; endsAt: number; message: string }
  >;
}

// RNG admin action log types
export interface RngAdminActionLog {
  _id: Id<"adminAuditLogs">;
  adminId: Id<"users">;
  action: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  success: boolean;
  adminName: string;
}

export interface AdminRngConfigQueries {
  getRngConfigHistory: TypedQuery<{ limit?: number } & BaseArgs, RngAdminActionLog[]>;
}

export interface AdminRngConfigMutations {
  updateRarityWeights: TypedMutation<
    { weights: Record<string, number> } & BaseArgs,
    SuccessResponse
  >;
  updateVariantRates: TypedMutation<{ rates: Record<string, number> } & BaseArgs, SuccessResponse>;
  updatePackMultipliers: TypedMutation<
    { multipliers: Record<string, number> } & BaseArgs,
    SuccessResponse
  >;
  updateGoldPackMultipliers: TypedMutation<
    { multipliers: Record<string, number> } & BaseArgs,
    SuccessResponse
  >;
  updatePityThresholds: TypedMutation<
    { thresholds: Record<string, number> } & BaseArgs,
    SuccessResponse
  >;
  resetRngConfigToDefaults: TypedMutation<EmptyArgs, SuccessResponse>;
}

// Stripe types
export interface StripeOverviewData {
  mrr: number;
  arr: number;
  arpu: number;
  subscriptions: {
    active: number;
    trialing: number;
    canceled: number;
    pastDue: number;
    pendingCancellation: number;
    total: number;
  };
  plans: { monthly: number; yearly: number };
  churn: { rate: number; recentCancellations: number };
  customers: { total: number; withActiveSubscription: number };
}

export interface SubscriptionBreakdownData {
  byStatus: Array<{ status: string; count: number }>;
  byPlanAmount: Array<{ plan: string; count: number; mrr: number }>;
}

export interface SubscriptionTrendData {
  date: string;
  created: number;
  canceled: number;
  updated: number;
}

export interface StripeWebhookEventData {
  _id: Id<"stripeWebhookEvents">;
  type: string;
  receivedAt: number;
  processed: boolean;
  error?: string;
  age: number;
  ageFormatted: string;
}

export interface CustomerSubscriptionDetailsData {
  customer: { stripeCustomerId: string; email: string; createdAt: number };
  subscriptions: Array<{
    _id: Id<"stripeSubscriptions">;
    status: string;
    planAmount: number;
    planInterval: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    isExpiring: boolean;
    daysUntilRenewal: number;
  }>;
  user: { username: string; email?: string } | null;
}

export interface StripeCustomerSearchResult {
  _id: Id<"stripeCustomers">;
  userId: Id<"users">;
  stripeCustomerId: string;
  email: string;
  createdAt: number;
  username: string;
}

export interface AdminStripeQueries {
  getStripeOverview: TypedQuery<EmptyArgs, StripeOverviewData>;
  getSubscriptionBreakdown: TypedQuery<EmptyArgs, SubscriptionBreakdownData>;
  getSubscriptionTrend: TypedQuery<{ days?: number } & BaseArgs, SubscriptionTrendData[]>;
  getRecentStripeEvents: TypedQuery<
    { limit?: number; includeProcessed?: boolean } & BaseArgs,
    StripeWebhookEventData[]
  >;
  getFailedWebhookEvents: TypedQuery<{ limit?: number } & BaseArgs, StripeWebhookEventData[]>;
  getCustomerSubscriptionDetails: TypedQuery<
    { targetUserId: Id<"users"> } & BaseArgs,
    CustomerSubscriptionDetailsData | null
  >;
  searchStripeCustomers: TypedQuery<
    { search: string; limit?: number } & BaseArgs,
    StripeCustomerSearchResult[]
  >;
}

// AI config types
export interface AIConfigEntry {
  _id: Id<"systemConfig">;
  key: string;
  value: number | string | boolean | string[];
  category: string;
  displayName: string;
  description: string;
  valueType: "number" | "string" | "boolean" | "json" | "secret";
  minValue?: number;
  maxValue?: number;
  updatedAt: number;
  updatedBy: Id<"users">;
  updatedByUsername: string;
}

export interface AIConfigsData {
  configs: AIConfigEntry[];
  totalCount: number;
}

export interface ProviderStatusData {
  message: string;
  providers: Record<string, boolean> | null;
}

export interface APIKeyStatusData {
  [provider: string]: { isSet: boolean; maskedKey: string; source: "database" | "env" | "none" };
}

export interface AdminAIConfigQueries {
  getAIConfigs: TypedQuery<EmptyArgs, AIConfigsData>;
  getAIConfigValue: TypedQuery<
    { key: string } & BaseArgs,
    number | string | boolean | string[] | null
  >;
  getProviderStatus: TypedQuery<EmptyArgs, ProviderStatusData>;
  getAPIKeyStatus: TypedQuery<EmptyArgs, APIKeyStatusData>;
}

export interface AdminAIConfigMutations {
  updateAIConfig: TypedMutation<
    { key: string; value: number | string | boolean | string[] } & BaseArgs,
    SuccessResponse
  >;
  bulkUpdateAIConfigs: TypedMutation<
    { updates: Array<{ key: string; value: number | string | boolean | string[] }> } & BaseArgs,
    {
      success: boolean;
      results: Array<{ key: string; success: boolean; error?: string }>;
      message: string;
    }
  >;
  initializeAIDefaults: TypedMutation<
    EmptyArgs,
    { success: boolean; createdCount: number; skippedCount: number; message: string }
  >;
  setAPIKey: TypedMutation<
    { provider: "openrouter" | "anthropic" | "openai" | "vercel"; apiKey: string } & BaseArgs,
    SuccessResponse
  >;
  clearAPIKey: TypedMutation<
    { provider: "openrouter" | "anthropic" | "openai" | "vercel" } & BaseArgs,
    SuccessResponse
  >;
}

export interface AdminAIConfigActions {
  testProviderConnection: TypedAction<
    { provider?: "openrouter" | "anthropic" | "openai" | "vercel" } & BaseArgs,
    {
      success: boolean;
      providerStatus: Record<string, boolean>;
      testedProvider?: string;
      latencyMs?: number;
      error?: string;
      message: string;
    }
  >;
}

// AI usage types
export interface AIUsageSummaryProviderData {
  requests: number;
  tokens: number;
  cost: number;
  successRate: number;
  avgLatency: number;
}

export interface AIUsageSummaryData {
  period: { days: number; startDate: string };
  total: { requests: number; tokens: number; cost: number };
  byProvider: { openrouter: AIUsageSummaryProviderData; vercel: AIUsageSummaryProviderData };
  dailyBreakdown: Array<{ date: string; requests: number; tokens: number; cost: number }>;
}

export interface AIUsageRecord {
  _id: Id<"aiUsage">;
  provider: "openrouter" | "vercel";
  modelId: string;
  modelType: "language" | "embedding" | "image";
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  feature: string;
  userId?: Id<"users">;
  success: boolean;
  errorMessage?: string;
  latencyMs: number;
  createdAt: number;
  createdAtFormatted: string;
}

export interface TopModelData {
  modelId: string;
  requests: number;
  tokens: number;
  cost: number;
  provider: string;
}

export interface FeatureUsageData {
  feature: string;
  requests: number;
  tokens: number;
  cost: number;
  successRate: number;
}

export interface AdminAIUsageQueries {
  getUsageSummary: TypedQuery<{ days?: number } & BaseArgs, AIUsageSummaryData>;
  getRecentUsage: TypedQuery<
    { limit?: number; provider?: "openrouter" | "vercel" } & BaseArgs,
    AIUsageRecord[]
  >;
  getTopModels: TypedQuery<{ days?: number; limit?: number } & BaseArgs, TopModelData[]>;
  getUsageByFeature: TypedQuery<{ days?: number } & BaseArgs, FeatureUsageData[]>;
}

export interface AdminAIUsageMutations {
  clearOldUsageRecords: TypedMutation<
    { olderThanDays: number } & BaseArgs,
    { deletedCount: number; hasMore: boolean }
  >;
}

// Asset types
export type AssetCategory =
  | "profile_picture"
  | "card_image"
  | "document"
  | "other"
  | "background"
  | "texture"
  | "ui_element"
  | "shop_asset"
  | "story_asset"
  | "logo";

export interface FileMetadataData {
  _id: Id<"fileMetadata">;
  userId: Id<"users">;
  storageId: string;
  fileName: string;
  contentType: string;
  size: number;
  category: AssetCategory;
  description?: string;
  blobUrl?: string;
  blobPathname?: string;
  uploadedAt: number;
}

export interface AssetListResponse {
  assets: FileMetadataData[];
  nextCursor: string | null;
  totalCount: number;
}

export interface AssetStatsData {
  totalAssets: number;
  totalSize: number;
  categoryCounts: Array<{ category: string; count: number }>;
}

export interface AdminAssetsQueries {
  listAssets: TypedQuery<
    { category?: AssetCategory; search?: string; limit?: number; cursor?: string } & BaseArgs,
    AssetListResponse
  >;
  getAsset: TypedQuery<{ assetId: Id<"fileMetadata"> } & BaseArgs, FileMetadataData>;
  getAssetStats: TypedQuery<EmptyArgs, AssetStatsData>;
}

export interface AdminAssetsMutations {
  saveAssetMetadata: TypedMutation<
    {
      fileName: string;
      contentType: string;
      size: number;
      category: AssetCategory;
      description?: string;
      blobUrl: string;
      blobPathname: string;
    },
    { assetId: Id<"fileMetadata">; blobUrl: string }
  >;
  updateAsset: TypedMutation<
    { assetId: Id<"fileMetadata">; category?: AssetCategory; description?: string } & BaseArgs,
    SuccessResponse
  >;
  syncBlobAssets: TypedMutation<
    { blobs: Array<{ url: string; pathname: string; size: number; uploadedAt: string }> },
    { synced: number; skipped: number; total: number }
  >;
  deleteAssetMetadata: TypedMutation<
    { assetId: Id<"fileMetadata"> } & BaseArgs,
    { success: boolean; blobUrl: string }
  >;
}

// Branding queries use existing types from earlier in the file
export interface AdminBrandingQueries {
  listFolders: TypedQuery<
    { section?: string; parentId?: Id<"brandingFolders"> } & BaseArgs,
    BrandingFolder[]
  >;
  getFolderTree: TypedQuery<EmptyArgs, BrandingFolderTreeNode[]>;
  getFolder: TypedQuery<{ folderId: Id<"brandingFolders"> } & BaseArgs, BrandingFolder | null>;
  getFolderByPath: TypedQuery<{ path: string } & BaseArgs, BrandingFolder | null>;
  listAssets: TypedQuery<
    { folderId?: Id<"brandingFolders">; tags?: string[] } & BaseArgs,
    BrandingAsset[]
  >;
  getAsset: TypedQuery<{ assetId: Id<"brandingAssets"> } & BaseArgs, BrandingAsset | null>;
  getAllTags: TypedQuery<EmptyArgs, string[]>;
  getGuidelines: TypedQuery<{ section: string } & BaseArgs, BrandGuidelines | null>;
  getAllGuidelines: TypedQuery<EmptyArgs, BrandGuidelines[]>;
  getBrandGuidelinesForAI: TypedQuery<EmptyArgs, string>;
  searchBrandingAssets: TypedQuery<{ query: string } & BaseArgs, BrandingAsset[]>;
  getAssetsForContext: TypedQuery<{ context: string } & BaseArgs, BrandingAsset[]>;
}

export interface AdminBrandingMutations {
  createFolder: TypedMutation<
    {
      name: string;
      parentId?: Id<"brandingFolders">;
      section: string;
      description?: string;
    } & BaseArgs,
    Id<"brandingFolders">
  >;
  updateFolder: TypedMutation<
    { folderId: Id<"brandingFolders">; name?: string; description?: string } & BaseArgs,
    SuccessResponse
  >;
  moveFolder: TypedMutation<
    { folderId: Id<"brandingFolders">; newParentId?: Id<"brandingFolders"> } & BaseArgs,
    SuccessResponse
  >;
  deleteFolder: TypedMutation<{ folderId: Id<"brandingFolders"> } & BaseArgs, SuccessResponse>;
  createAsset: TypedMutation<
    {
      name: string;
      folderId?: Id<"brandingFolders">;
      blobUrl: string;
      contentType: string;
      size: number;
      tags?: string[];
      description?: string;
      usageContext?: string[];
    },
    Id<"brandingAssets">
  >;
  updateAsset: TypedMutation<
    {
      assetId: Id<"brandingAssets">;
      name?: string;
      tags?: string[];
      description?: string;
      usageContext?: string[];
    } & BaseArgs,
    SuccessResponse
  >;
  moveAsset: TypedMutation<
    { assetId: Id<"brandingAssets">; newFolderId?: Id<"brandingFolders"> } & BaseArgs,
    SuccessResponse
  >;
  deleteAsset: TypedMutation<{ assetId: Id<"brandingAssets"> } & BaseArgs, SuccessResponse>;
  updateGuidelines: TypedMutation<{ section: string; content: string } & BaseArgs, SuccessResponse>;
  initializeBranding: TypedMutation<EmptyArgs, { initialized: number }>;
}

// API key types (from listApiKeys/getApiKeyDetails)
export interface ApiKeyData {
  _id: Id<"apiKeys">;
  keyPrefix: string;
  userId: Id<"users">;
  agentId: Id<"agents">;
  playerName: string;
  agentName: string;
  isActive: boolean;
  lastUsedAt?: number;
  createdAt: number;
}

export interface AdminApiKeysQueries {
  listApiKeys: TypedQuery<{ limit?: number } & BaseArgs, ApiKeyData[]>;
  getApiKeyDetails: TypedQuery<{ keyId: Id<"apiKeys"> } & BaseArgs, ApiKeyData>;
}

export interface AdminApiKeysMutations {
  revokeApiKey: TypedMutation<{ keyId: Id<"apiKeys"> } & BaseArgs, SuccessResponse>;
  reactivateApiKey: TypedMutation<{ keyId: Id<"apiKeys"> } & BaseArgs, SuccessResponse>;
  deleteApiKey: TypedMutation<{ keyId: Id<"apiKeys"> } & BaseArgs, SuccessResponse>;
}

// User analytics types
export interface UserAnalyticsData {
  userId: Id<"users">;
  username?: string;
  email?: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalSpent: number;
  cardsOwned: number;
  decksCreated: number;
  lastLogin?: number;
  createdAt: number;
}

export interface TestUserData {
  _id: Id<"users">;
  username?: string;
  email?: string;
  createdAt: number;
  isTestUser: boolean;
}

export interface AdminOperationLogEntry {
  _id: Id<"adminAuditLogs">;
  adminId: Id<"users">;
  action: string;
  targetUserId?: Id<"users">;
  targetEmail?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  adminUsername?: string;
}

export interface AuditLogStatsData {
  totalLogs: number;
  byAction: Record<string, number>;
  byAdmin: Array<{ adminId: Id<"users">; count: number; username?: string }>;
  successRate: number;
}

export interface AdminMutationsQueries {
  getUserAnalytics: TypedQuery<{ userId: Id<"users"> } & BaseArgs, UserAnalyticsData | null>;
  getAllTestUsers: TypedQuery<EmptyArgs, TestUserData[]>;
  getAdminAuditLogs: TypedQuery<
    { limit?: number; action?: string } & BaseArgs,
    AdminOperationLogEntry[]
  >;
  getAuditLogStats: TypedQuery<{ days?: number } & BaseArgs, AuditLogStatsData>;
}

export interface AdminMutationsMutations {
  deleteUserByEmail: TypedMutation<{ email: string } & BaseArgs, SuccessResponse>;
  deleteTestUsers: TypedMutation<{ dryRun?: boolean } & BaseArgs, { deleted: number }>;
  addGoldToCurrentUser: TypedMutation<{ amount: number } & BaseArgs, { newBalance: number }>;
  forceCloseMyGame: TypedMutation<EmptyArgs, SuccessResponse>;
  seedProgressionSystem: TypedMutation<EmptyArgs, SuccessResponse>;
  devSeedProgressionSystem: TypedMutation<EmptyArgs, SuccessResponse>;
}

// Admin management types
/** System stats from getSystemStats */
export interface SystemStatsData {
  totalPlayers: number;
  humanPlayers: number;
  aiPlayers: number;
  totalGames: number;
  activeGames: number;
  completedGames: number;
  recentGames: number;
  totalApiKeys: number;
  activeApiKeys: number;
  playersInQueue: number;
  activeSeason: {
    id: string;
    name: string;
    startDate: number;
    endDate: number;
    isActive: boolean;
  };
}

/** Suspicious activity report from getSuspiciousActivityReport */
export interface SuspiciousActivityData {
  reportGeneratedAt: number;
  lookbackDays: number;
  suspiciousMatchups: number;
  abnormalRatingChanges: number;
  recentBans: number;
  recentWarnings: number;
  summary: Array<{
    category: string;
    count: number;
    severity: "high" | "medium" | "low";
  }>;
}

export interface AdminUserData {
  userId: Id<"users">;
  username?: string;
  email?: string;
  role: string;
  grantedBy: { userId: Id<"users">; username?: string; email?: string };
  grantedAt: number;
  expiresAt?: number;
  grantNote?: string;
  isTemporary: boolean;
  isExpired: boolean;
  timeRemaining?: number;
}

export interface PlayerListData {
  _id: Id<"users">;
  username?: string;
  email?: string;
  gold?: number;
  rating?: number;
  createdAt: number;
  lastLogin?: number;
}

export interface PlayerProfileData {
  _id: Id<"users">;
  username?: string;
  email?: string;
  name?: string;
  gold: number;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  rank?: string;
  createdAt: number;
  lastLogin?: number;
}

export interface PlayerInventoryData {
  cards: Array<{
    cardId: Id<"userCards">;
    definitionId: Id<"cardDefinitions">;
    name: string;
    rarity: string;
    quantity: number;
  }>;
  decks: Array<{ deckId: Id<"userDecks">; name: string; cardCount: number }>;
  totalCards: number;
  totalDecks: number;
}

export interface AdminAdminQueries {
  getSystemStats: TypedQuery<EmptyArgs, SystemStatsData>;
  getSuspiciousActivityReport: TypedQuery<{ days?: number } & BaseArgs, SuspiciousActivityData>;
  getMyAdminRole: TypedQuery<
    EmptyArgs,
    {
      role: string;
      roleLevel: number;
      isAdmin: boolean;
      isModerator: boolean;
      isFullAdmin: boolean;
      isSuperAdmin: boolean;
    }
  >;
  listAdmins: TypedQuery<
    { role?: "moderator" | "admin" | "superadmin" } & BaseArgs,
    AdminUserData[]
  >;
  getAuditLog: TypedQuery<
    { limit?: number; userId?: Id<"users">; action?: string } & BaseArgs,
    AdminOperationLogEntry[]
  >;
  listPlayers: TypedQuery<{ limit?: number; search?: string } & BaseArgs, PlayerListData[]>;
  getPlayerProfile: TypedQuery<{ userId: Id<"users"> } & BaseArgs, PlayerProfileData | null>;
  getPlayerInventory: TypedQuery<{ userId: Id<"users"> } & BaseArgs, PlayerInventoryData>;
}

export interface AdminAdminMutations {
  grantAdminRole: TypedMutation<
    {
      targetUserId: Id<"users">;
      role: "moderator" | "admin" | "superadmin";
      expiresAt?: number;
      grantNote?: string;
    } & BaseArgs,
    { success: boolean; message: string; expiresAt?: number }
  >;
  revokeAdminRole: TypedMutation<{ targetUserId: Id<"users"> } & BaseArgs, SuccessResponse>;
}

export interface AdminShopSetupMutations {
  clearShop: TypedMutation<EmptyArgs, { deleted: number }>;
  populateShop: TypedMutation<EmptyArgs, { created: number }>;
  seedGemPackages: TypedMutation<EmptyArgs, { created: number }>;
  clearGemPackages: TypedMutation<EmptyArgs, { deleted: number }>;
  fullSetup: TypedMutation<EmptyArgs, { shop: number; gems: number }>;
}

// =============================================================================
// COMPLETE TYPED API STRUCTURE
// =============================================================================

/**
 * Complete typed API structure for all Convex functions.
 * Use this to access fully typed Convex functions across the monorepo.
 */
export interface TypedAPI {
  // Core module
  core: {
    users: CoreUserQueries & CoreUserMutations;
    cards: CoreCardQueries & CoreCardMutations;
    decks: CoreDeckQueries & CoreDeckMutations;
    tutorial: CoreTutorialQueries & CoreTutorialMutations;
    userPreferences: CoreUserPreferencesQueries & CoreUserPreferencesMutations;
  };

  // Economy module
  economy: EconomyQueries &
    EconomyMutations & {
      marketplace: MarketplaceQueries & MarketplaceMutations;
      shop: ShopQueries & ShopMutations;
      dailyRewards: DailyRewardsQueries & DailyRewardsMutations;
      gemPurchases: GemPurchasesQueries & GemPurchasesMutations & GemPurchasesActions;
      priceHistory: PriceHistoryQueries;
      tokenBalance: TokenBalanceQueries & TokenBalanceMutations;
      tokenMarketplace: TokenMarketplaceQueries & TokenMarketplaceMutations;
      rngConfig: RngConfigQueries;
      sales: SalesQueries & SalesMutations;
    };

  // Shop (root level alias)
  shop: ShopQueries & ShopMutations;

  // Gameplay module
  gameplay: {
    games: {
      lobby: GameLobbyQueries & GameLobbyMutations;
      spectator: GameSpectatorMutations;
      queries: GameLobbyQueries;
    };
    gameEngine: {
      turns: GameEngineTurnMutations;
      summons: GameEngineSummonMutations;
      spellsTraps: GameEngineSpellTrapMutations;
    };
    ai: {
      aiTurn: AITurnMutations;
    };
  };

  // Social matchmaking
  social: {
    matchmaking: MatchmakingQueries & MatchmakingMutations;
    friends: FriendsQueries & FriendsMutations;
    globalChat: GlobalChatQueries & GlobalChatMutations;
    leaderboards: LeaderboardQueries;
    tournaments: TournamentsQueries & TournamentsMutations;
    aiChat: AIChatQueries & AIChatMutations;
  };

  // Progression module
  progression: {
    achievements: AchievementsQueries;
    battlePass: BattlePassQueries & BattlePassMutations;
    matchHistory: MatchHistoryQueries;
    notifications: NotificationsQueries & NotificationsMutations;
    quests: QuestsQueries & QuestsMutations;
    story: StoryQueries & StoryMutations;
    storyBattle: StoryBattleQueries & StoryBattleMutations;
    storyQueries: StoryQueriesModule;
    storyStages: StoryStagesQueries & StoryStagesMutations;
  };

  // Wallet module
  wallet: {
    userWallet: WalletQueries & WalletMutations;
    tokenTransfer: WalletActions;
  };

  // Agents module
  agents: {
    agents: AgentsQueries & AgentsMutations;
    webhooks: AgentsWebhookMutations & AgentsWebhookActions;
  };

  // AI module (admin)
  ai: {
    adminAgentApi: AdminAgentApiActions;
  };

  // Auth module
  auth: {
    auth: AuthQueries;
    syncUser: AuthMutations & OnboardingQueries;
  };

  // Storage module
  storage: {
    cards: StorageCardsQueries & StorageCardsMutations;
    images: StorageImagesQueries & StorageImagesMutations;
  };

  // Feedback module
  feedback: {
    feedback: FeedbackQueries & FeedbackMutations;
  };

  // Stripe module
  stripe: {
    queries: StripeQueries;
    checkout: StripeActions;
    portal: StripeActions;
  };

  // Treasury module
  treasury: {
    policies: TreasuryPoliciesQueries & TreasuryPoliciesMutations;
    wallets: TreasuryWalletsQueries & TreasuryWalletsMutations;
    transactions: TreasuryTransactionsQueries & TreasuryTransactionsMutations;
  };

  // Token Analytics module
  tokenAnalytics: {
    holders: TokenAnalyticsHoldersQueries;
    metrics: TokenAnalyticsMetricsQueries;
    rollup: TokenAnalyticsRollupQueries;
    trades: TokenAnalyticsTradesQueries;
  };

  // Alerts module
  alerts: {
    channels: AlertChannelsQueries & AlertChannelsMutations;
    history: AlertHistoryQueries & AlertHistoryMutations;
    rules: AlertRulesQueries & AlertRulesMutations;
    notifications: AlertNotificationsQueries & AlertNotificationsMutations;
  };

  // Infrastructure module
  infrastructure: {
    auditLog: AuditLogQueries;
    emailActions: EmailActions;
  };

  // Admin module - full type-safe admin API
  admin: {
    news: AdminNewsQueries & AdminNewsMutations;
    cards: AdminCardsQueries & AdminCardsMutations;
    achievements: AdminAchievementsQueries & AdminAchievementsMutations;
    battlePass: AdminBattlePassQueries & AdminBattlePassMutations;
    story: AdminStoryQueries & AdminStoryMutations;
    promoCodes: AdminPromoCodesQueries & AdminPromoCodesMutations;
    config: AdminConfigQueries & AdminConfigMutations;
    shop: AdminShopQueries & AdminShopMutations;
    quests: AdminQuestsQueries & AdminQuestsMutations;
    tournaments: AdminTournamentsQueries & AdminTournamentsMutations;
    analytics: AdminAnalyticsQueries;
    moderation: AdminModerationQueries & AdminModerationMutations;
    chat: AdminChatQueries & AdminChatMutations;
    reports: AdminReportsQueries & AdminReportsMutations;
    marketplace: AdminMarketplaceQueries & AdminMarketplaceMutations;
    seasons: AdminSeasonsQueries & AdminSeasonsMutations;
    roles: AdminRolesQueries & AdminRolesMutations;
    features: AdminFeaturesQueries & AdminFeaturesMutations;
    templates: AdminTemplatesQueries & AdminTemplatesMutations;
    batchAdmin: AdminBatchQueries & AdminBatchMutations;
    revenue: AdminRevenueQueries;
    sales: AdminSalesQueries & AdminSalesMutations;
    rngConfig: AdminRngConfigQueries & AdminRngConfigMutations;
    stripe: AdminStripeQueries;
    aiConfig: AdminAIConfigQueries & AdminAIConfigMutations;
    aiUsage: AdminAIUsageQueries & AdminAIUsageMutations;
    assets: AdminAssetsQueries & AdminAssetsMutations;
    branding: AdminBrandingQueries & AdminBrandingMutations;
    apiKeys: AdminApiKeysQueries & AdminApiKeysMutations;
    mutations: AdminMutationsQueries & AdminMutationsMutations;
    admin: AdminAdminQueries & AdminAdminMutations;
    shopSetup: AdminShopSetupMutations;
  };

  // Root level exports for backward compatibility
  friends: FriendsQueries & FriendsMutations;
  leaderboards: LeaderboardQueries;
  globalChat: GlobalChatQueries & GlobalChatMutations;
  story: StoryQueries & StoryMutations;
  matchmaking: MatchmakingQueries & MatchmakingMutations;
}

// =============================================================================
// Factory Functions for Creating Typed References
// =============================================================================

/**
 * Create a typed query reference from an untyped API path.
 */
export function createTypedQuery<Args extends Record<string, unknown>, Return>(
  ref: unknown
): TypedQuery<Args, Return> {
  return ref as TypedQuery<Args, Return>;
}

/**
 * Create a typed mutation reference from an untyped API path.
 */
export function createTypedMutation<Args extends Record<string, unknown>, Return>(
  ref: unknown
): TypedMutation<Args, Return> {
  return ref as TypedMutation<Args, Return>;
}

/**
 * Create a typed action reference from an untyped API path.
 */
export function createTypedAction<Args extends Record<string, unknown>, Return>(
  ref: unknown
): TypedAction<Args, Return> {
  return ref as TypedAction<Args, Return>;
}
