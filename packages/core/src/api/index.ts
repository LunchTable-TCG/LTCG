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
    PaginatedResponse<unknown>
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
    { history: unknown[]; hasMore: boolean }
  >;
  getPackOpeningHistoryPaginated: TypedQuery<
    { paginationOpts: PaginationOpts } & BaseArgs,
    PaginatedResponse<unknown>
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
    Array<{ type: string; timestamp: number; reward: unknown }>
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
    PaginatedResponse<unknown>
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
  getRngConfig: TypedQuery<EmptyArgs, { current: unknown; defaults: unknown }>;
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
  getGameSpectatorView: TypedQuery<{ lobbyId: Id<"gameLobbies"> } & BaseArgs, unknown>;
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
  getPendingOptionalTriggers: TypedQuery<{ lobbyId: Id<"gameLobbies"> } & BaseArgs, unknown[]>;
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
    { hasItems: boolean; itemCount: number; nextItem?: unknown }
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
    Array<{ tier: number; xpRequired: number; freeReward?: unknown; premiumReward?: unknown }>
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
      reward: unknown;
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
    (StoryChapter & { stages: unknown[] }) | null
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
    { badges: unknown[]; badgesByType: Record<string, unknown[]>; totalBadges: number }
  >;
  getBattleHistory: TypedQuery<{ actNumber: number; chapterNumber: number } & BaseArgs, unknown[]>;
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
    { attemptId: Id<"storyBattleAttempts">; chapterInfo: unknown }
  >;
  completeChapter: TypedMutation<
    { attemptId: Id<"storyBattleAttempts">; won: boolean; finalLP: number } & BaseArgs,
    {
      success: boolean;
      rewards: { gold: number; xp: number; cards: unknown[] };
      starsEarned: 0 | 1 | 2 | 3;
      levelUp?: { newLevel: number; oldLevel: number };
      newBadges: unknown[];
      cardsReceived: unknown[];
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
    PaginatedResponse<unknown>
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
    { rankings: unknown[]; lastUpdated: number; isCached: boolean } | null
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
    { agentId: Id<"agents">; eventType: string; gameId: string; data: unknown } & BaseArgs,
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
    { messageId: string; text: string; toolCalls?: unknown; usage?: unknown }
  >;
  streamMessage: TypedAction<
    { threadId: string; message: string } & BaseArgs,
    { messageId: string; text: string }
  >;
  deleteThread: TypedAction<{ threadId: string } & BaseArgs, { success: boolean; error?: string }>;
  clearAllThreads: TypedAction<EmptyArgs, { success: boolean; deletedCount: number }>;
  getStreamDeltas: TypedAction<{ threadId: string; messageId: string } & BaseArgs, unknown>;
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
      rules: unknown;
      isActive: boolean;
    }>
  >;
  getPolicy: TypedQuery<
    { policyId: Id<"treasuryPolicies"> } & BaseArgs,
    { _id: Id<"treasuryPolicies">; name: string; rules: unknown }
  >;
  getWalletsUsingPolicy: TypedQuery<{ policyId: Id<"treasuryPolicies"> } & BaseArgs, unknown[]>;
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
      rules?: unknown;
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
    unknown[]
  >;
  getWallet: TypedQuery<{ walletId: Id<"treasuryWallets"> } & BaseArgs, unknown>;
  getWalletByAddress: TypedQuery<{ address: string } & BaseArgs, unknown | null>;
  getOverview: TypedQuery<
    EmptyArgs,
    {
      totalWallets: number;
      totalSolBalance: number;
      totalTokenBalance: number;
      byPurpose: unknown;
      byType: unknown;
      recentTransactions: unknown[];
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
    { transactions: unknown[]; total: number; limit: number; offset: number }
  >;
  getTransaction: TypedQuery<{ transactionId: Id<"treasuryTransactions"> } & BaseArgs, unknown>;
  getBySignature: TypedQuery<{ signature: string } & BaseArgs, unknown | null>;
  getStats: TypedQuery<
    { walletId?: Id<"treasuryWallets">; daysBack?: number } & BaseArgs,
    {
      totalTransactions: number;
      totalVolume: number;
      byType: unknown;
      byStatus: unknown;
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
      metadata?: unknown;
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
// TOKEN LAUNCH MODULE TYPES
// =============================================================================

export interface TokenLaunchApprovalsQueries {
  getAll: TypedQuery<EmptyArgs, unknown[]>;
  getMyApproval: TypedQuery<EmptyArgs, unknown | null>;
  getSummary: TypedQuery<
    EmptyArgs,
    {
      totalApprovals: number;
      approvedCount: number;
      totalAdmins: number;
      hasCurrentUserApproved: boolean;
      currentUserApproval: unknown | null;
      requiredApprovals: number;
      hasEnoughApprovals: boolean;
    }
  >;
  isApproved: TypedQuery<
    EmptyArgs,
    { approved: boolean; approvalCount: number; requiredCount: number }
  >;
}

export interface TokenLaunchApprovalsMutations {
  approve: TypedMutation<{ comments?: string } & BaseArgs, SuccessResponse>;
  revoke: TypedMutation<{ reason?: string } & BaseArgs, SuccessResponse>;
  resetAll: TypedMutation<{ reason: string } & BaseArgs, { success: boolean; resetCount: number }>;
}

export interface TokenLaunchChecklistQueries {
  getAll: TypedQuery<
    { category?: "treasury" | "token" | "marketing" | "technical" | "team" } & BaseArgs,
    unknown[]
  >;
  getSummary: TypedQuery<
    EmptyArgs,
    {
      byCategory: unknown;
      overall: {
        total: number;
        completed: number;
        required: number;
        requiredCompleted: number;
        percentComplete: number;
        allRequiredComplete: boolean;
      };
    }
  >;
  isReadyForLaunch: TypedQuery<EmptyArgs, { ready: boolean; incompleteItems: unknown[] }>;
}

export interface TokenLaunchChecklistMutations {
  addItem: TypedMutation<
    {
      category: string;
      item: string;
      description?: string;
      isRequired: boolean;
      order?: number;
    } & BaseArgs,
    Id<"launchChecklist">
  >;
  completeItem: TypedMutation<
    { itemId: Id<"launchChecklist">; evidence?: string } & BaseArgs,
    SuccessResponse
  >;
  uncompleteItem: TypedMutation<{ itemId: Id<"launchChecklist"> } & BaseArgs, SuccessResponse>;
  deleteItem: TypedMutation<{ itemId: Id<"launchChecklist"> } & BaseArgs, SuccessResponse>;
  setupDefaults: TypedMutation<EmptyArgs, { message: string; count: number }>;
}

export interface TokenLaunchConfigQueries {
  getConfig: TypedQuery<EmptyArgs, unknown | null>;
  getByStatus: TypedQuery<
    { status: "draft" | "ready" | "launched" | "graduated" } & BaseArgs,
    unknown | null
  >;
  getReadiness: TypedQuery<
    EmptyArgs,
    { ready: boolean; issues: string[]; checklist: unknown; config?: unknown }
  >;
}

export interface TokenLaunchConfigMutations {
  upsertConfig: TypedMutation<
    {
      name: string;
      symbol: string;
      description: string;
      imageUrl?: string;
      twitter?: string;
      telegram?: string;
      website?: string;
      discord?: string;
      initialSupply?: number;
      decimals?: number;
      targetMarketCap?: number;
    } & BaseArgs,
    Id<"tokenConfig">
  >;
  updateStatus: TypedMutation<
    {
      status: string;
      mintAddress?: string;
      bondingCurveAddress?: string;
      pumpfunUrl?: string;
    } & BaseArgs,
    SuccessResponse
  >;
  markReady: TypedMutation<EmptyArgs, SuccessResponse>;
  recordLaunch: TypedMutation<
    {
      mintAddress: string;
      bondingCurveAddress?: string;
      pumpfunUrl?: string;
      launchTxSignature?: string;
    } & BaseArgs,
    SuccessResponse
  >;
}

export interface TokenLaunchScheduleQueries {
  getSchedule: TypedQuery<
    EmptyArgs,
    { status: string; scheduledAt: number | null; countdown: unknown | null }
  >;
  getStatus: TypedQuery<
    EmptyArgs,
    {
      scheduleStatus: string;
      scheduledAt: number | null;
      tokenStatus: string;
      checklist: unknown;
      approvals: unknown;
      config: unknown;
      isReady: boolean;
      canLaunch: boolean;
    }
  >;
}

export interface TokenLaunchScheduleMutations {
  setSchedule: TypedMutation<
    { scheduledAt: number; timezone: string; countdownEnabled?: boolean } & BaseArgs,
    SuccessResponse
  >;
  updateStatus: TypedMutation<
    { status: string; abortReason?: string; launchTxSignature?: string } & BaseArgs,
    SuccessResponse
  >;
  markGo: TypedMutation<EmptyArgs, SuccessResponse>;
  abort: TypedMutation<{ reason: string } & BaseArgs, SuccessResponse>;
  clearSchedule: TypedMutation<EmptyArgs, SuccessResponse>;
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
    { holders: unknown[]; total: number; hasMore: boolean }
  >;
  getTop: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
  getByAddress: TypedQuery<{ address: string } & BaseArgs, unknown | null>;
  getDistribution: TypedQuery<
    EmptyArgs,
    {
      totalHolders: number;
      totalSupplyHeld: number;
      distribution: unknown[];
      topHoldersPercentage: number;
    }
  >;
  getGrowth: TypedQuery<
    { days?: number } & BaseArgs,
    Array<{ timestamp: number; newHolders: number; totalHolders: number }>
  >;
}

export interface TokenAnalyticsMetricsQueries {
  getLatest: TypedQuery<EmptyArgs, unknown | null>;
  getHistory: TypedQuery<{ limit?: number; since?: number } & BaseArgs, unknown[]>;
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
  getByPeriod: TypedQuery<{ period: "hour" | "day"; limit?: number } & BaseArgs, unknown[]>;
  getRange: TypedQuery<
    { period: "hour" | "day"; startTime: number; endTime: number } & BaseArgs,
    unknown[]
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
      dailyData: unknown[];
    }
  >;
}

export interface TokenAnalyticsTradesQueries {
  getRecent: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
  getByTrader: TypedQuery<{ traderAddress: string; limit?: number } & BaseArgs, unknown[]>;
  getByType: TypedQuery<{ type: "buy" | "sell"; limit?: number } & BaseArgs, unknown[]>;
  getWhaleTrades: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
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
  getAll: TypedQuery<{ enabledOnly?: boolean } & BaseArgs, unknown[]>;
  getByType: TypedQuery<
    { type: "in_app" | "push" | "slack" | "discord" | "email" } & BaseArgs,
    unknown[]
  >;
  getForSeverity: TypedQuery<{ severity: "info" | "warning" | "critical" } & BaseArgs, unknown[]>;
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
      config?: unknown;
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
  getRecent: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
  getByRule: TypedQuery<{ ruleId: Id<"alertRules">; limit?: number } & BaseArgs, unknown[]>;
  getUnacknowledged: TypedQuery<EmptyArgs, unknown[]>;
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
  getAll: TypedQuery<{ enabledOnly?: boolean } & BaseArgs, unknown[]>;
  getByType: TypedQuery<{ triggerType: string } & BaseArgs, unknown[]>;
  getById: TypedQuery<{ ruleId: Id<"alertRules"> } & BaseArgs, unknown | null>;
}

export interface AlertRulesMutations {
  create: TypedMutation<
    {
      name: string;
      description?: string;
      triggerType: string;
      conditions: unknown;
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
      conditions?: unknown;
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
  getMy: TypedQuery<{ unreadOnly?: boolean; limit?: number } & BaseArgs, unknown[]>;
  getUnreadCount: TypedQuery<EmptyArgs, number>;
  getWithAlertDetails: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
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
  getRecentAuditLogs: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
  getAuditLogsByTable: TypedQuery<{ table: string; limit?: number } & BaseArgs, unknown[]>;
  getAuditLogsByDocument: TypedQuery<
    { table: string; documentId: string; limit?: number } & BaseArgs,
    unknown[]
  >;
  getAuditLogsByUser: TypedQuery<{ userId: Id<"users">; limit?: number } & BaseArgs, unknown[]>;
  getAuditLogsByOperation: TypedQuery<
    { operation: "insert" | "patch" | "delete"; limit?: number } & BaseArgs,
    unknown[]
  >;
  getAuditLogsByTimeRange: TypedQuery<
    { startTime: number; endTime: number; limit?: number } & BaseArgs,
    unknown[]
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
  getMyAuditLogs: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
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
  togglePublished: TypedMutation<{ articleId: Id<"newsArticles"> } & BaseArgs, { isPublished: boolean }>;
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
    { total: number; active: number; byType: Record<string, number>; byRarity: Record<string, number> }
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
      ability?: unknown;
      flavorText?: string;
      imageUrl?: string;
    } & BaseArgs,
    Id<"cardDefinitions">
  >;
  updateCard: TypedMutation<
    { cardId: Id<"cardDefinitions"> } & Record<string, unknown>,
    SuccessResponse
  >;
  toggleCardActive: TypedMutation<{ cardId: Id<"cardDefinitions"> } & BaseArgs, { isActive: boolean }>;
  deleteCard: TypedMutation<{ cardId: Id<"cardDefinitions"> } & BaseArgs, SuccessResponse>;
  duplicateCard: TypedMutation<{ cardId: Id<"cardDefinitions">; newName: string } & BaseArgs, Id<"cardDefinitions">>;
}

export interface AdminAchievementsQueries {
  listAchievements: TypedQuery<{ category?: string; isActive?: boolean } & BaseArgs, unknown[]>;
  getAchievement: TypedQuery<{ achievementId: Id<"achievementDefinitions"> } & BaseArgs, unknown>;
  getAchievementStats: TypedQuery<EmptyArgs, { total: number; active: number; byCategory: Record<string, number> }>;
}

export interface AdminAchievementsMutations {
  createAchievement: TypedMutation<Record<string, unknown>, Id<"achievementDefinitions">>;
  updateAchievement: TypedMutation<{ achievementId: Id<"achievementDefinitions"> } & Record<string, unknown>, SuccessResponse>;
  toggleAchievementActive: TypedMutation<{ achievementId: Id<"achievementDefinitions"> } & BaseArgs, { isActive: boolean }>;
  deleteAchievement: TypedMutation<{ achievementId: Id<"achievementDefinitions"> } & BaseArgs, SuccessResponse>;
  duplicateAchievement: TypedMutation<{ achievementId: Id<"achievementDefinitions">; newName: string } & BaseArgs, Id<"achievementDefinitions">>;
}

export interface AdminBattlePassQueries {
  listBattlePassSeasons: TypedQuery<{ status?: string } & BaseArgs, unknown[]>;
  getBattlePass: TypedQuery<{ battlePassId: Id<"battlePassSeasons"> } & BaseArgs, unknown>;
  getBattlePassTiers: TypedQuery<{ battlePassId: Id<"battlePassSeasons"> } & BaseArgs, unknown[]>;
  getBattlePassStats: TypedQuery<{ battlePassId: Id<"battlePassSeasons"> } & BaseArgs, unknown>;
  getAvailableSeasonsForBattlePass: TypedQuery<EmptyArgs, unknown[]>;
}

export interface AdminBattlePassMutations {
  createBattlePassSeason: TypedMutation<Record<string, unknown>, Id<"battlePassSeasons">>;
  updateBattlePassSeason: TypedMutation<{ battlePassId: Id<"battlePassSeasons"> } & Record<string, unknown>, SuccessResponse>;
  defineBattlePassTier: TypedMutation<{ battlePassId: Id<"battlePassSeasons"> } & Record<string, unknown>, Id<"battlePassTiers">>;
  defineBattlePassTiers: TypedMutation<{ battlePassId: Id<"battlePassSeasons">; tiers: unknown[] } & BaseArgs, { created: number }>;
  activateBattlePass: TypedMutation<{ battlePassId: Id<"battlePassSeasons"> } & BaseArgs, SuccessResponse>;
  endBattlePass: TypedMutation<{ battlePassId: Id<"battlePassSeasons"> } & BaseArgs, SuccessResponse>;
  deleteBattlePass: TypedMutation<{ battlePassId: Id<"battlePassSeasons"> } & BaseArgs, SuccessResponse>;
}

export interface AdminStoryQueries {
  listChapters: TypedQuery<{ actNumber?: number } & BaseArgs, unknown[]>;
  getChapter: TypedQuery<{ chapterId: Id<"storyChapters"> } & BaseArgs, unknown>;
  getChapterStats: TypedQuery<{ chapterId: Id<"storyChapters"> } & BaseArgs, unknown>;
  listStages: TypedQuery<{ chapterId: Id<"storyChapters"> } & BaseArgs, unknown[]>;
  getStage: TypedQuery<{ stageId: Id<"storyStages"> } & BaseArgs, unknown>;
}

export interface AdminStoryMutations {
  createChapter: TypedMutation<Record<string, unknown>, Id<"storyChapters">>;
  updateChapter: TypedMutation<{ chapterId: Id<"storyChapters"> } & Record<string, unknown>, SuccessResponse>;
  publishChapter: TypedMutation<{ chapterId: Id<"storyChapters"> } & BaseArgs, SuccessResponse>;
  deleteChapter: TypedMutation<{ chapterId: Id<"storyChapters"> } & BaseArgs, SuccessResponse>;
  reorderChapters: TypedMutation<{ chapterIds: Id<"storyChapters">[] } & BaseArgs, SuccessResponse>;
  createStage: TypedMutation<{ chapterId: Id<"storyChapters"> } & Record<string, unknown>, Id<"storyStages">>;
  updateStage: TypedMutation<{ stageId: Id<"storyStages"> } & Record<string, unknown>, SuccessResponse>;
  publishStage: TypedMutation<{ stageId: Id<"storyStages"> } & BaseArgs, SuccessResponse>;
  deleteStage: TypedMutation<{ stageId: Id<"storyStages"> } & BaseArgs, SuccessResponse>;
  reorderStages: TypedMutation<{ stageIds: Id<"storyStages">[] } & BaseArgs, SuccessResponse>;
}

export interface AdminPromoCodesQueries {
  listPromoCodes: TypedQuery<{ isActive?: boolean } & BaseArgs, unknown[]>;
  getPromoCode: TypedQuery<{ promoCodeId: Id<"promoCodes"> } & BaseArgs, unknown>;
  getPromoCodeStats: TypedQuery<{ promoCodeId: Id<"promoCodes"> } & BaseArgs, unknown>;
  exportPromoCodes: TypedQuery<{ isActive?: boolean } & BaseArgs, unknown[]>;
}

export interface AdminPromoCodesMutations {
  createPromoCode: TypedMutation<Record<string, unknown>, Id<"promoCodes">>;
  updatePromoCode: TypedMutation<{ promoCodeId: Id<"promoCodes"> } & Record<string, unknown>, SuccessResponse>;
  togglePromoCodeActive: TypedMutation<{ promoCodeId: Id<"promoCodes"> } & BaseArgs, { isActive: boolean }>;
  deletePromoCode: TypedMutation<{ promoCodeId: Id<"promoCodes"> } & BaseArgs, SuccessResponse>;
  bulkGeneratePromoCodes: TypedMutation<{ count: number } & Record<string, unknown>, { codes: string[] }>;
}

export interface AdminConfigQueries {
  listConfigs: TypedQuery<{ category?: string } & BaseArgs, unknown[]>;
  getConfig: TypedQuery<{ configId: Id<"systemConfigs"> } & BaseArgs, unknown>;
  getConfigValue: TypedQuery<{ key: string } & BaseArgs, unknown>;
  getConfigStats: TypedQuery<EmptyArgs, { total: number; byCategory: Record<string, number> }>;
}

export interface AdminConfigMutations {
  updateConfig: TypedMutation<{ configId: Id<"systemConfigs">; value: unknown } & BaseArgs, SuccessResponse>;
  bulkUpdateConfigs: TypedMutation<{ updates: Array<{ key: string; value: unknown }> } & BaseArgs, { updated: number }>;
  resetToDefault: TypedMutation<{ configId: Id<"systemConfigs"> } & BaseArgs, SuccessResponse>;
  initializeDefaults: TypedMutation<EmptyArgs, { initialized: number }>;
}

export interface AdminShopQueries {
  listProducts: TypedQuery<{ category?: string; isActive?: boolean } & BaseArgs, unknown[]>;
  getProduct: TypedQuery<{ productId: Id<"shopProducts"> } & BaseArgs, unknown>;
  getShopStats: TypedQuery<EmptyArgs, { total: number; active: number; byCategory: Record<string, number> }>;
}

export interface AdminShopMutations {
  createProduct: TypedMutation<Record<string, unknown>, Id<"shopProducts">>;
  updateProduct: TypedMutation<{ productId: Id<"shopProducts"> } & Record<string, unknown>, SuccessResponse>;
  toggleProductActive: TypedMutation<{ productId: Id<"shopProducts"> } & BaseArgs, { isActive: boolean }>;
  deleteProduct: TypedMutation<{ productId: Id<"shopProducts"> } & BaseArgs, SuccessResponse>;
  duplicateProduct: TypedMutation<{ productId: Id<"shopProducts">; newName: string } & BaseArgs, Id<"shopProducts">>;
  reorderProducts: TypedMutation<{ productIds: Id<"shopProducts">[] } & BaseArgs, SuccessResponse>;
}

export interface AdminQuestsQueries {
  listQuests: TypedQuery<{ questType?: string; isActive?: boolean } & BaseArgs, unknown[]>;
  getQuest: TypedQuery<{ questId: Id<"questDefinitions"> } & BaseArgs, unknown>;
  getQuestStats: TypedQuery<EmptyArgs, { total: number; active: number; byType: Record<string, number> }>;
}

export interface AdminQuestsMutations {
  createQuest: TypedMutation<Record<string, unknown>, Id<"questDefinitions">>;
  updateQuest: TypedMutation<{ questId: Id<"questDefinitions"> } & Record<string, unknown>, SuccessResponse>;
  toggleQuestActive: TypedMutation<{ questId: Id<"questDefinitions"> } & BaseArgs, { isActive: boolean }>;
  deleteQuest: TypedMutation<{ questId: Id<"questDefinitions"> } & BaseArgs, SuccessResponse>;
  duplicateQuest: TypedMutation<{ questId: Id<"questDefinitions">; newName: string } & BaseArgs, Id<"questDefinitions">>;
}

export interface AdminTournamentsQueries {
  listTournaments: TypedQuery<{ status?: string } & BaseArgs, unknown[]>;
  getTournament: TypedQuery<{ tournamentId: Id<"tournaments"> } & BaseArgs, unknown>;
  getTournamentStats: TypedQuery<{ tournamentId: Id<"tournaments"> } & BaseArgs, unknown>;
  getTournamentLeaderboard: TypedQuery<{ tournamentId: Id<"tournaments"> } & BaseArgs, unknown[]>;
}

export interface AdminTournamentsMutations {
  createTournament: TypedMutation<Record<string, unknown>, Id<"tournaments">>;
  updateTournament: TypedMutation<{ tournamentId: Id<"tournaments"> } & Record<string, unknown>, SuccessResponse>;
  cancelTournament: TypedMutation<{ tournamentId: Id<"tournaments">; reason?: string } & BaseArgs, SuccessResponse>;
  grantTournamentEntry: TypedMutation<{ tournamentId: Id<"tournaments">; userId: Id<"users"> } & BaseArgs, SuccessResponse>;
  removeParticipant: TypedMutation<{ tournamentId: Id<"tournaments">; userId: Id<"users"> } & BaseArgs, SuccessResponse>;
  forceStartTournament: TypedMutation<{ tournamentId: Id<"tournaments"> } & BaseArgs, SuccessResponse>;
  disqualifyParticipant: TypedMutation<{ tournamentId: Id<"tournaments">; userId: Id<"users">; reason: string } & BaseArgs, SuccessResponse>;
}

/** Period type for analytics queries */
export type AnalyticsPeriodType = "daily" | "weekly" | "monthly" | "all_time";

export interface AdminAnalyticsQueries {
  getTopCardsByWinRate: TypedQuery<{ limit?: number; archetype?: string; periodType?: AnalyticsPeriodType } & BaseArgs, unknown[]>;
  getTopCardsByPlayRate: TypedQuery<{ limit?: number; archetype?: string; periodType?: AnalyticsPeriodType } & BaseArgs, unknown[]>;
  getCardStatsByArchetype: TypedQuery<{ archetype: string; periodType?: AnalyticsPeriodType } & BaseArgs, unknown>;
  getCurrentEconomySnapshot: TypedQuery<EmptyArgs, unknown>;
  getEconomyTrends: TypedQuery<{ periodType: "daily" | "weekly" | "monthly"; days: number } & BaseArgs, unknown[]>;
  getEconomyMetrics: TypedQuery<{ days: number } & BaseArgs, unknown[]>;
  getWealthDistribution: TypedQuery<EmptyArgs, unknown>;
  getPlayerDistribution: TypedQuery<EmptyArgs, unknown>;
  getPlayerRetention: TypedQuery<{ days?: number } & BaseArgs, unknown>;
  getGameStats: TypedQuery<{ periodType?: AnalyticsPeriodType; limit?: number } & BaseArgs, unknown>;
  getMatchmakingStats: TypedQuery<EmptyArgs, unknown>;
  getMatchmakingHealth: TypedQuery<EmptyArgs, unknown>;
  getMatchmakingStatsDetailed: TypedQuery<{ periodType?: AnalyticsPeriodType; days?: number } & BaseArgs, unknown>;
  getSkillDistribution: TypedQuery<EmptyArgs, unknown>;
  getRetentionOverview: TypedQuery<EmptyArgs, unknown>;
  getTopEngagedPlayers: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
  getDailyActiveStats: TypedQuery<{ days?: number } & BaseArgs, unknown>;
  getMarketplaceStats: TypedQuery<{ periodType: AnalyticsPeriodType } & BaseArgs, unknown>;
  getPlayerEngagement: TypedQuery<EmptyArgs, unknown>;
}

export interface AdminModerationQueries {
  getPlayerModerationStatus: TypedQuery<{ userId: Id<"users"> } & BaseArgs, unknown>;
  getModerationHistory: TypedQuery<{ userId: Id<"users">; limit?: number } & BaseArgs, unknown[]>;
  listBannedPlayers: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
  listSuspendedPlayers: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
}

export interface AdminModerationMutations {
  banPlayer: TypedMutation<{ userId: Id<"users">; reason: string } & BaseArgs, SuccessResponse>;
  unbanPlayer: TypedMutation<{ userId: Id<"users"> } & BaseArgs, SuccessResponse>;
  suspendPlayer: TypedMutation<{ userId: Id<"users">; reason: string; durationDays: number } & BaseArgs, SuccessResponse>;
  unsuspendPlayer: TypedMutation<{ userId: Id<"users"> } & BaseArgs, SuccessResponse>;
  warnPlayer: TypedMutation<{ userId: Id<"users">; reason: string } & BaseArgs, SuccessResponse>;
  addModerationNote: TypedMutation<{ userId: Id<"users">; note: string } & BaseArgs, SuccessResponse>;
}

export interface AdminChatQueries {
  listMessages: TypedQuery<{ limit?: number; userId?: Id<"users"> } & BaseArgs, unknown[]>;
  getMessage: TypedQuery<{ messageId: Id<"globalChat"> } & BaseArgs, unknown>;
  getChatStats: TypedQuery<EmptyArgs, unknown>;
  getMutedUsers: TypedQuery<EmptyArgs, unknown[]>;
}

export interface AdminChatMutations {
  deleteMessage: TypedMutation<{ messageId: Id<"globalChat"> } & BaseArgs, SuccessResponse>;
  bulkDeleteMessages: TypedMutation<{ messageIds: Id<"globalChat">[] } & BaseArgs, { deleted: number }>;
  deleteUserMessages: TypedMutation<{ userId: Id<"users"> } & BaseArgs, { deleted: number }>;
  muteUser: TypedMutation<{ userId: Id<"users">; durationMinutes: number; reason?: string } & BaseArgs, SuccessResponse>;
  unmuteUser: TypedMutation<{ userId: Id<"users"> } & BaseArgs, SuccessResponse>;
  clearAllMessages: TypedMutation<EmptyArgs, { deleted: number }>;
}

export interface AdminReportsQueries {
  listReports: TypedQuery<{ status?: string; type?: string } & BaseArgs, unknown[]>;
  getReport: TypedQuery<{ reportId: Id<"playerReports"> } & BaseArgs, unknown>;
  getReportStats: TypedQuery<EmptyArgs, { total: number; pending: number; resolved: number; byType: Record<string, number> }>;
}

export interface AdminReportsMutations {
  updateReportStatus: TypedMutation<{ reportId: Id<"playerReports">; status: string } & BaseArgs, SuccessResponse>;
  resolveReportWithAction: TypedMutation<{ reportId: Id<"playerReports">; action: string; notes?: string } & BaseArgs, SuccessResponse>;
  bulkUpdateReportStatus: TypedMutation<{ reportIds: Id<"playerReports">[]; status: string } & BaseArgs, { updated: number }>;
}

export interface AdminMarketplaceQueries {
  listListings: TypedQuery<{ status?: string; sellerId?: Id<"users"> } & BaseArgs, unknown[]>;
  getListing: TypedQuery<{ listingId: Id<"marketplaceListings"> } & BaseArgs, unknown>;
  getMarketplaceStats: TypedQuery<EmptyArgs, unknown>;
  getPriceAnomalies: TypedQuery<EmptyArgs, unknown[]>;
  getSellerHistory: TypedQuery<{ sellerId: Id<"users"> } & BaseArgs, unknown[]>;
  getPriceCaps: TypedQuery<EmptyArgs, unknown[]>;
}

export interface AdminMarketplaceMutations {
  suspendListing: TypedMutation<{ listingId: Id<"marketplaceListings">; reason: string } & BaseArgs, SuccessResponse>;
  suspendSellerListings: TypedMutation<{ sellerId: Id<"users">; reason: string } & BaseArgs, { suspended: number }>;
  setPriceCap: TypedMutation<{ cardDefinitionId: Id<"cardDefinitions">; maxPrice: number } & BaseArgs, SuccessResponse>;
  refundBid: TypedMutation<{ listingId: Id<"marketplaceListings">; bidderId: Id<"users"> } & BaseArgs, SuccessResponse>;
  removePriceCap: TypedMutation<{ cardDefinitionId: Id<"cardDefinitions"> } & BaseArgs, SuccessResponse>;
  unsuspendListing: TypedMutation<{ listingId: Id<"marketplaceListings"> } & BaseArgs, SuccessResponse>;
}

export interface AdminSeasonsQueries {
  listSeasons: TypedQuery<{ status?: string } & BaseArgs, unknown[]>;
  getSeason: TypedQuery<{ seasonId: Id<"seasons"> } & BaseArgs, unknown>;
  getCurrentSeason: TypedQuery<EmptyArgs, unknown | null>;
  getSeasonStats: TypedQuery<{ seasonId: Id<"seasons"> } & BaseArgs, unknown>;
  getSeasonLeaderboard: TypedQuery<{ seasonId: Id<"seasons">; limit?: number } & BaseArgs, unknown[]>;
  previewSeasonRewards: TypedQuery<{ seasonId: Id<"seasons"> } & BaseArgs, unknown[]>;
}

export interface AdminSeasonsMutations {
  createSeason: TypedMutation<Record<string, unknown>, Id<"seasons">>;
  updateSeason: TypedMutation<{ seasonId: Id<"seasons"> } & Record<string, unknown>, SuccessResponse>;
  startSeason: TypedMutation<{ seasonId: Id<"seasons"> } & BaseArgs, SuccessResponse>;
  endSeason: TypedMutation<{ seasonId: Id<"seasons"> } & BaseArgs, SuccessResponse>;
  distributeSeasonRewards: TypedMutation<{ seasonId: Id<"seasons"> } & BaseArgs, { distributed: number }>;
  deleteSeason: TypedMutation<{ seasonId: Id<"seasons"> } & BaseArgs, SuccessResponse>;
}

export interface AdminRolesQueries {
  listAdminsByRole: TypedQuery<{ role?: string } & BaseArgs, unknown[]>;
  getMyRole: TypedQuery<EmptyArgs, { role: string | null; permissions: string[] }>;
  getExpiringRoles: TypedQuery<{ withinDays?: number } & BaseArgs, unknown[]>;
}

export interface AdminRolesMutations {
  grantRole: TypedMutation<{ targetUserId: Id<"users">; role: "moderator" | "admin" | "superadmin"; expiresAt?: number; grantNote?: string } & BaseArgs, SuccessResponse>;
  revokeRole: TypedMutation<{ targetUserId: Id<"users"> } & BaseArgs, SuccessResponse>;
  extendRole: TypedMutation<{ targetUserId: Id<"users">; newExpiresAt: number } & BaseArgs, SuccessResponse>;
  makeRolePermanent: TypedMutation<{ targetUserId: Id<"users"> } & BaseArgs, SuccessResponse>;
  cleanupExpiredRoles: TypedMutation<EmptyArgs, { removed: number }>;
}

export interface AdminFeaturesQueries {
  listFeatureFlags: TypedQuery<{ category?: string } & BaseArgs, unknown[]>;
  getFeatureFlag: TypedQuery<{ flagId: Id<"featureFlags"> } & BaseArgs, unknown>;
  getFeatureFlagStats: TypedQuery<EmptyArgs, unknown>;
  checkFeatureFlag: TypedQuery<{ key: string } & BaseArgs, boolean>;
  checkFeatureFlags: TypedQuery<{ keys: string[] } & BaseArgs, Record<string, boolean>>;
}

export interface AdminFeaturesMutations {
  createFeatureFlag: TypedMutation<Record<string, unknown>, Id<"featureFlags">>;
  updateFeatureFlag: TypedMutation<{ flagId: Id<"featureFlags"> } & Record<string, unknown>, SuccessResponse>;
  toggleFeatureFlag: TypedMutation<{ flagId: Id<"featureFlags"> } & BaseArgs, { isEnabled: boolean }>;
  deleteFeatureFlag: TypedMutation<{ flagId: Id<"featureFlags"> } & BaseArgs, SuccessResponse>;
}

export interface AdminTemplatesQueries {
  listTemplates: TypedQuery<{ cardType?: string } & BaseArgs, unknown[]>;
  getTemplate: TypedQuery<{ templateId: Id<"cardTemplates"> } & BaseArgs, unknown>;
  getDefaultTemplate: TypedQuery<{ cardType: string } & BaseArgs, unknown | null>;
  getTemplateStats: TypedQuery<EmptyArgs, unknown>;
}

export interface AdminTemplatesMutations {
  createTemplate: TypedMutation<Record<string, unknown>, Id<"cardTemplates">>;
  updateTemplate: TypedMutation<{ templateId: Id<"cardTemplates"> } & Record<string, unknown>, SuccessResponse>;
  setDefaultTemplate: TypedMutation<{ templateId: Id<"cardTemplates"> } & BaseArgs, SuccessResponse>;
  duplicateTemplate: TypedMutation<{ templateId: Id<"cardTemplates">; newName: string } & BaseArgs, Id<"cardTemplates">>;
  deleteTemplate: TypedMutation<{ templateId: Id<"cardTemplates"> } & BaseArgs, SuccessResponse>;
  addBlock: TypedMutation<{ templateId: Id<"cardTemplates"> } & Record<string, unknown>, Id<"cardTemplateBlocks">>;
  updateBlock: TypedMutation<{ blockId: Id<"cardTemplateBlocks"> } & Record<string, unknown>, SuccessResponse>;
  deleteBlock: TypedMutation<{ blockId: Id<"cardTemplateBlocks"> } & BaseArgs, SuccessResponse>;
  reorderBlocks: TypedMutation<{ blockIds: Id<"cardTemplateBlocks">[] } & BaseArgs, SuccessResponse>;
}

export interface AdminBatchQueries {
  previewBatchGrantGold: TypedQuery<{ filter: unknown; amount: number } & BaseArgs, { affectedCount: number; users: unknown[] }>;
  previewBatchResetRatings: TypedQuery<{ filter: unknown } & BaseArgs, { affectedCount: number; users: unknown[] }>;
  previewBatchGrantPacks: TypedQuery<{ filter: unknown; packType: string; quantity: number } & BaseArgs, { affectedCount: number; users: unknown[] }>;
  previewBatchGrantCards: TypedQuery<{ filter: unknown; cardIds: Id<"cardDefinitions">[]; quantity: number } & BaseArgs, { affectedCount: number; users: unknown[] }>;
}

export interface AdminBatchMutations {
  batchGrantGold: TypedMutation<{ filter: unknown; amount: number; reason: string } & BaseArgs, { affected: number }>;
  batchResetRatings: TypedMutation<{ filter: unknown; reason: string } & BaseArgs, { affected: number }>;
  batchGrantPremium: TypedMutation<{ filter: unknown; durationDays: number; reason: string } & BaseArgs, { affected: number }>;
  batchGrantPacks: TypedMutation<{ filter: unknown; packType: string; quantity: number; reason: string } & BaseArgs, { affected: number }>;
  grantCardsToPlayer: TypedMutation<{ userId: Id<"users">; cardIds: Id<"cardDefinitions">[]; quantity: number; reason: string } & BaseArgs, { granted: number }>;
  removeCardsFromPlayer: TypedMutation<{ userId: Id<"users">; cardIds: Id<"cardDefinitions">[]; quantity: number; reason: string } & BaseArgs, { removed: number }>;
  batchGrantCards: TypedMutation<{ filter: unknown; cardIds: Id<"cardDefinitions">[]; quantity: number; reason: string } & BaseArgs, { affected: number }>;
  sendAnnouncement: TypedMutation<{ userId: Id<"users">; title: string; message: string } & BaseArgs, SuccessResponse>;
  broadcastAnnouncement: TypedMutation<{ title: string; message: string; filter?: unknown } & BaseArgs, { sent: number }>;
  sendSystemMessage: TypedMutation<{ userId: Id<"users">; message: string } & BaseArgs, SuccessResponse>;
}

export interface AdminRevenueQueries {
  getRevenueOverview: TypedQuery<{ days?: number } & BaseArgs, unknown>;
  getRevenueTrend: TypedQuery<{ days?: number } & BaseArgs, unknown[]>;
  getPackSalesBreakdown: TypedQuery<{ days?: number } & BaseArgs, unknown>;
  getGemPurchaseMetrics: TypedQuery<{ days?: number } & BaseArgs, unknown>;
  getTopSpenders: TypedQuery<{ limit?: number; days?: number } & BaseArgs, unknown[]>;
  getCurrencyCirculation: TypedQuery<EmptyArgs, unknown>;
  getRecentLargePurchases: TypedQuery<{ threshold?: number; limit?: number } & BaseArgs, unknown[]>;
}

export interface AdminSalesQueries {
  listSales: TypedQuery<{ isActive?: boolean } & BaseArgs, unknown[]>;
  getSale: TypedQuery<{ saleId: Id<"sales"> } & BaseArgs, unknown>;
  getSaleStats: TypedQuery<{ saleId: Id<"sales"> } & BaseArgs, unknown>;
}

export interface AdminSalesMutations {
  createSale: TypedMutation<Record<string, unknown>, Id<"sales">>;
  updateSale: TypedMutation<{ saleId: Id<"sales"> } & Record<string, unknown>, SuccessResponse>;
  endSaleEarly: TypedMutation<{ saleId: Id<"sales"> } & BaseArgs, SuccessResponse>;
  toggleSaleActive: TypedMutation<{ saleId: Id<"sales"> } & BaseArgs, { isActive: boolean }>;
  deleteSale: TypedMutation<{ saleId: Id<"sales"> } & BaseArgs, SuccessResponse>;
  createFlashSale: TypedMutation<Record<string, unknown>, Id<"sales">>;
}

export interface AdminRngConfigQueries {
  getRngConfigHistory: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
}

export interface AdminRngConfigMutations {
  updateRarityWeights: TypedMutation<{ weights: Record<string, number> } & BaseArgs, SuccessResponse>;
  updateVariantRates: TypedMutation<{ rates: Record<string, number> } & BaseArgs, SuccessResponse>;
  updatePackMultipliers: TypedMutation<{ multipliers: Record<string, number> } & BaseArgs, SuccessResponse>;
  updateGoldPackMultipliers: TypedMutation<{ multipliers: Record<string, number> } & BaseArgs, SuccessResponse>;
  updatePityThresholds: TypedMutation<{ thresholds: Record<string, number> } & BaseArgs, SuccessResponse>;
  resetRngConfigToDefaults: TypedMutation<EmptyArgs, SuccessResponse>;
}

export interface AdminStripeQueries {
  getStripeOverview: TypedQuery<EmptyArgs, unknown>;
  getSubscriptionBreakdown: TypedQuery<EmptyArgs, unknown>;
  getSubscriptionTrend: TypedQuery<{ days?: number } & BaseArgs, unknown[]>;
  getRecentStripeEvents: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
  getFailedWebhookEvents: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
  getCustomerSubscriptionDetails: TypedQuery<{ userId: Id<"users"> } & BaseArgs, unknown>;
  searchStripeCustomers: TypedQuery<{ query: string } & BaseArgs, unknown[]>;
}

export interface AdminAIConfigQueries {
  getAIConfigs: TypedQuery<EmptyArgs, unknown[]>;
  getAIConfigValue: TypedQuery<{ key: string } & BaseArgs, unknown>;
  getProviderStatus: TypedQuery<EmptyArgs, unknown>;
  getAPIKeyStatus: TypedQuery<{ provider: string } & BaseArgs, unknown>;
}

export interface AdminAIConfigMutations {
  updateAIConfig: TypedMutation<{ key: string; value: unknown } & BaseArgs, SuccessResponse>;
  bulkUpdateAIConfigs: TypedMutation<{ updates: Array<{ key: string; value: unknown }> } & BaseArgs, { updated: number }>;
  initializeAIDefaults: TypedMutation<EmptyArgs, { initialized: number }>;
  setAPIKey: TypedMutation<{ provider: string; apiKey: string } & BaseArgs, SuccessResponse>;
  clearAPIKey: TypedMutation<{ provider: string } & BaseArgs, SuccessResponse>;
}

export interface AdminAIConfigActions {
  testProviderConnection: TypedAction<{ provider: string } & BaseArgs, { success: boolean; message: string }>;
}

export interface AdminAIUsageQueries {
  getUsageSummary: TypedQuery<{ days?: number } & BaseArgs, unknown>;
  getRecentUsage: TypedQuery<{ limit?: number } & BaseArgs, unknown[]>;
  getTopModels: TypedQuery<{ days?: number } & BaseArgs, unknown[]>;
  getUsageByFeature: TypedQuery<{ days?: number } & BaseArgs, unknown>;
}

export interface AdminAIUsageMutations {
  clearOldUsageRecords: TypedMutation<{ olderThanDays: number } & BaseArgs, { deleted: number }>;
}

export interface AdminAssetsQueries {
  listAssets: TypedQuery<{ folder?: string; type?: string } & BaseArgs, unknown[]>;
  getAsset: TypedQuery<{ assetId: Id<"assetMetadata"> } & BaseArgs, unknown>;
  getAssetStats: TypedQuery<EmptyArgs, unknown>;
}

export interface AdminAssetsMutations {
  saveAssetMetadata: TypedMutation<Record<string, unknown>, Id<"assetMetadata">>;
  updateAsset: TypedMutation<{ assetId: Id<"assetMetadata"> } & Record<string, unknown>, SuccessResponse>;
  syncBlobAssets: TypedMutation<EmptyArgs, { synced: number }>;
  deleteAssetMetadata: TypedMutation<{ assetId: Id<"assetMetadata"> } & BaseArgs, SuccessResponse>;
}

export interface AdminBrandingQueries {
  listFolders: TypedQuery<{ parentId?: Id<"brandingFolders"> } & BaseArgs, unknown[]>;
  getFolderTree: TypedQuery<EmptyArgs, unknown[]>;
  getFolder: TypedQuery<{ folderId: Id<"brandingFolders"> } & BaseArgs, unknown>;
  getFolderByPath: TypedQuery<{ path: string } & BaseArgs, unknown | null>;
  listAssets: TypedQuery<{ folderId?: Id<"brandingFolders">; tags?: string[] } & BaseArgs, unknown[]>;
  getAsset: TypedQuery<{ assetId: Id<"brandingAssets"> } & BaseArgs, unknown>;
  getAllTags: TypedQuery<EmptyArgs, string[]>;
  getGuidelines: TypedQuery<{ section: string } & BaseArgs, unknown>;
  getAllGuidelines: TypedQuery<EmptyArgs, unknown[]>;
  getBrandGuidelinesForAI: TypedQuery<EmptyArgs, string>;
  searchBrandingAssets: TypedQuery<{ query: string } & BaseArgs, unknown[]>;
  getAssetsForContext: TypedQuery<{ context: string } & BaseArgs, unknown[]>;
}

export interface AdminBrandingMutations {
  createFolder: TypedMutation<{ name: string; parentId?: Id<"brandingFolders"> } & BaseArgs, Id<"brandingFolders">>;
  updateFolder: TypedMutation<{ folderId: Id<"brandingFolders"> } & Record<string, unknown>, SuccessResponse>;
  moveFolder: TypedMutation<{ folderId: Id<"brandingFolders">; newParentId?: Id<"brandingFolders"> } & BaseArgs, SuccessResponse>;
  deleteFolder: TypedMutation<{ folderId: Id<"brandingFolders"> } & BaseArgs, SuccessResponse>;
  createAsset: TypedMutation<Record<string, unknown>, Id<"brandingAssets">>;
  updateAsset: TypedMutation<{ assetId: Id<"brandingAssets"> } & Record<string, unknown>, SuccessResponse>;
  moveAsset: TypedMutation<{ assetId: Id<"brandingAssets">; newFolderId?: Id<"brandingFolders"> } & BaseArgs, SuccessResponse>;
  deleteAsset: TypedMutation<{ assetId: Id<"brandingAssets"> } & BaseArgs, SuccessResponse>;
  updateGuidelines: TypedMutation<{ section: string; content: string } & BaseArgs, SuccessResponse>;
  initializeBranding: TypedMutation<EmptyArgs, { initialized: number }>;
}

export interface AdminApiKeysQueries {
  listApiKeys: TypedQuery<{ userId?: Id<"users"> } & BaseArgs, unknown[]>;
  getApiKeyDetails: TypedQuery<{ apiKeyId: Id<"apiKeys"> } & BaseArgs, unknown>;
}

export interface AdminApiKeysMutations {
  revokeApiKey: TypedMutation<{ apiKeyId: Id<"apiKeys"> } & BaseArgs, SuccessResponse>;
  reactivateApiKey: TypedMutation<{ apiKeyId: Id<"apiKeys"> } & BaseArgs, SuccessResponse>;
  deleteApiKey: TypedMutation<{ apiKeyId: Id<"apiKeys"> } & BaseArgs, SuccessResponse>;
}

export interface AdminMutationsQueries {
  getUserAnalytics: TypedQuery<{ userId: Id<"users"> } & BaseArgs, unknown>;
  getAllTestUsers: TypedQuery<EmptyArgs, unknown[]>;
  getAdminAuditLogs: TypedQuery<{ limit?: number; action?: string } & BaseArgs, unknown[]>;
  getAuditLogStats: TypedQuery<{ days?: number } & BaseArgs, unknown>;
}

export interface AdminMutationsMutations {
  deleteUserByEmail: TypedMutation<{ email: string } & BaseArgs, SuccessResponse>;
  deleteTestUsers: TypedMutation<{ dryRun?: boolean } & BaseArgs, { deleted: number }>;
  addGoldToCurrentUser: TypedMutation<{ amount: number } & BaseArgs, { newBalance: number }>;
  forceCloseMyGame: TypedMutation<EmptyArgs, SuccessResponse>;
  seedProgressionSystem: TypedMutation<EmptyArgs, SuccessResponse>;
  devSeedProgressionSystem: TypedMutation<EmptyArgs, SuccessResponse>;
}

export interface AdminAdminQueries {
  getSystemStats: TypedQuery<EmptyArgs, unknown>;
  getSuspiciousActivityReport: TypedQuery<{ days?: number } & BaseArgs, unknown>;
  getMyAdminRole: TypedQuery<EmptyArgs, { role: string | null; permissions: string[] }>;
  listAdmins: TypedQuery<EmptyArgs, unknown[]>;
  getAuditLog: TypedQuery<{ limit?: number; userId?: Id<"users">; action?: string } & BaseArgs, unknown[]>;
  listPlayers: TypedQuery<{ limit?: number; search?: string } & BaseArgs, unknown[]>;
  getPlayerProfile: TypedQuery<{ userId: Id<"users"> } & BaseArgs, unknown>;
  getPlayerInventory: TypedQuery<{ userId: Id<"users"> } & BaseArgs, unknown>;
}

export interface AdminAdminMutations {
  grantAdminRole: TypedMutation<{ userId: Id<"users">; role: string } & BaseArgs, SuccessResponse>;
  revokeAdminRole: TypedMutation<{ userId: Id<"users"> } & BaseArgs, SuccessResponse>;
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

  // Token Launch module
  tokenLaunch: {
    approvals: TokenLaunchApprovalsQueries & TokenLaunchApprovalsMutations;
    checklist: TokenLaunchChecklistQueries & TokenLaunchChecklistMutations;
    config: TokenLaunchConfigQueries & TokenLaunchConfigMutations;
    schedule: TokenLaunchScheduleQueries & TokenLaunchScheduleMutations;
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
    admins: AdminAdminQueries & AdminAdminMutations;
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
