/**
 * Return Value Validators
 *
 * Reusable validators for Convex query/mutation return values.
 * Per Convex best practices: "It is recommended to add argument validation
 * to all public functions in production apps for security."
 *
 * This extends that guidance to return values for runtime type safety.
 */

import { type Infer, v } from "convex/values";
import type { GenericValidator } from "convex/values";
import { jsonAbilityValidator } from "../gameplay/effectSystem/jsonEffectValidators";

// ============================================================================
// INFERRED TYPES - These types are derived from validators (single source of truth)
// Import these types in frontend code for full type safety and autocomplete
// ============================================================================

// Export inferred types that match validators exactly
// These types are used in frontend/packages for autocomplete without TS2589

// ============================================================================
// AUTHENTICATION VALIDATORS
// ============================================================================

/**
 * Authentication is handled by Privy with Convex JWT verification
 * - Frontend: usePrivy() for auth actions, useConvexAuth() for Convex auth state
 * - Backend: ctx.auth.getUserIdentity() returns Privy user identity
 * - User lookup: Query users table by privyId index
 */

// ============================================================================
// USER VALIDATORS
// ============================================================================

/**
 * Public user profile validator
 */
export const userProfileValidator = v.union(
  v.null(),
  v.object({
    _id: v.id("users"),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    totalWins: v.number(),
    totalLosses: v.number(),
    rankedWins: v.number(),
    rankedLosses: v.number(),
    casualWins: v.number(),
    casualLosses: v.number(),
    storyWins: v.number(),
    rankedElo: v.number(),
    casualRating: v.number(),
    xp: v.number(),
    level: v.number(),
    isAiAgent: v.boolean(),
  })
);

/**
 * Basic user info validator
 */
export const userInfoValidator = v.union(
  v.null(),
  v.object({
    _id: v.id("users"),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
);

/**
 * Full user object validator (for authenticated currentUser queries)
 * Must include ALL fields from the users schema to avoid validation errors
 */
export const fullUserValidator = v.union(
  v.null(),
  v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    // Privy authentication
    privyId: v.optional(v.string()),
    // Profile fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom game fields
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    activeDeckId: v.optional(v.id("userDecks")),
    createdAt: v.optional(v.number()),
    // Rating fields
    rankedElo: v.optional(v.number()),
    casualRating: v.optional(v.number()),
    // Stats fields
    totalWins: v.optional(v.number()),
    totalLosses: v.optional(v.number()),
    rankedWins: v.optional(v.number()),
    rankedLosses: v.optional(v.number()),
    casualWins: v.optional(v.number()),
    casualLosses: v.optional(v.number()),
    storyWins: v.optional(v.number()),
    currentWinStreak: v.optional(v.number()),
    longestWinStreak: v.optional(v.number()),
    // Player type
    isAiAgent: v.optional(v.boolean()),
    // XP and Level
    xp: v.optional(v.number()),
    level: v.optional(v.number()),
    // Economy
    gold: v.optional(v.number()),
    lastStatsUpdate: v.optional(v.number()),
    // Email tracking
    welcomeEmailSent: v.optional(v.boolean()),
    // Moderation fields
    isBanned: v.optional(v.boolean()),
    banReason: v.optional(v.string()),
    bannedAt: v.optional(v.number()),
    bannedBy: v.optional(v.id("users")),
    isSuspended: v.optional(v.boolean()),
    suspendedUntil: v.optional(v.number()),
    suspensionReason: v.optional(v.string()),
    suspendedBy: v.optional(v.id("users")),
    warningCount: v.optional(v.number()),
    accountStatus: v.optional(v.string()), // "active" | "suspended" | "banned"
    mutedUntil: v.optional(v.number()),
    // HD Wallet tracking
    nextWalletIndex: v.optional(v.number()),
    // Wallet fields
    walletAddress: v.optional(v.string()),
    walletConnectedAt: v.optional(v.number()),
    walletType: v.optional(v.string()),
    // Tutorial progress
    tutorialProgress: v.optional(
      v.object({
        completed: v.boolean(),
        lastMoment: v.number(),
        dismissCount: v.number(),
        completedAt: v.optional(v.number()),
      })
    ),
    helpModeEnabled: v.optional(v.boolean()),
    // Pity counter for guaranteed pulls
    pityCounter: v.optional(
      v.object({
        packsSinceEpic: v.number(),
        packsSinceLegendary: v.number(),
        packsSinceFullArt: v.number(),
      })
    ),
    // Daily/weekly reward tracking
    lastDailyPackClaim: v.optional(v.number()),
    lastWeeklyJackpotClaim: v.optional(v.number()),
    loginStreak: v.optional(v.number()),
    lastLoginDate: v.optional(v.string()),
    // ElizaOS token tracking
    lastElizaOSCheck: v.optional(v.number()),
    hasElizaOSToken: v.optional(v.boolean()),
    elizaOSBalance: v.optional(v.number()),
  })
);

// ============================================================================
// ECONOMY VALIDATORS
// ============================================================================

/**
 * Player balance response validator
 */
export const playerBalanceValidator = v.object({
  gold: v.number(),
  gems: v.number(),
  lifetimeStats: v.object({
    goldEarned: v.number(),
    goldSpent: v.number(),
    gemsEarned: v.number(),
    gemsSpent: v.number(),
  }),
  lastUpdatedAt: v.number(),
});

/**
 * Currency transaction validator
 */
export const currencyTransactionValidator = v.object({
  _id: v.id("currencyTransactions"),
  userId: v.id("users"),
  transactionType: v.union(
    v.literal("purchase"),
    v.literal("reward"),
    v.literal("sale"),
    v.literal("gift"),
    v.literal("refund"),
    v.literal("admin_refund"),
    v.literal("conversion"),
    v.literal("marketplace_fee"),
    v.literal("auction_bid"),
    v.literal("auction_refund"),
    v.literal("wager"),
    v.literal("wager_payout"),
    v.literal("wager_refund"),
    v.literal("tournament_entry"),
    v.literal("tournament_refund"),
    v.literal("tournament_prize")
  ),
  currencyType: v.union(v.literal("gold"), v.literal("gems")),
  amount: v.number(),
  balanceAfter: v.number(),
  referenceId: v.optional(v.string()),
  description: v.string(),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
});

/**
 * Paginated transaction history validator
 */
export const transactionHistoryValidator = v.object({
  transactions: v.array(currencyTransactionValidator),
  page: v.number(),
  pageSize: v.number(),
  total: v.number(),
  hasMore: v.boolean(),
});

// ============================================================================
// SHOP VALIDATORS
// ============================================================================

/**
 * Card result from pack opening
 */
export const cardResultValidator = v.object({
  cardDefinitionId: v.id("cardDefinitions"),
  name: v.string(),
  rarity: v.union(
    v.literal("common"),
    v.literal("uncommon"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  ),
  archetype: v.string(),
  imageUrl: v.optional(v.string()),
});

/**
 * Pack purchase response validator
 */
export const packPurchaseValidator = v.object({
  success: v.boolean(),
  productName: v.string(),
  cardsReceived: v.array(cardResultValidator),
  currencyUsed: v.union(v.literal("gold"), v.literal("gems")),
  amountPaid: v.number(),
});

// ============================================================================
// SOCIAL VALIDATORS
// ============================================================================

/**
 * Friend info validator
 */
export const friendInfoValidator = v.object({
  userId: v.id("users"),
  username: v.optional(v.string()),
  level: v.number(),
  rankedElo: v.number(),
  isOnline: v.boolean(),
  friendsSince: v.number(),
  lastInteraction: v.optional(v.number()),
});

/**
 * Friend request validator
 */
export const friendRequestValidator = v.object({
  userId: v.id("users"),
  username: v.optional(v.string()),
  level: v.number(),
  rankedElo: v.number(),
  requestedAt: v.number(),
});

/**
 * Friend operation response
 */
export const friendOperationValidator = v.object({
  success: v.boolean(),
  autoAccepted: v.optional(v.boolean()),
});

// ============================================================================
// GAME VALIDATORS
// ============================================================================

/**
 * Game lobby validator (matches schema definition exactly)
 */
export const gameLobbyValidator = v.object({
  _id: v.id("gameLobbies"),
  _creationTime: v.number(),
  hostId: v.id("users"),
  hostUsername: v.string(),
  hostRank: v.string(),
  hostRating: v.number(),
  deckArchetype: v.string(),
  mode: v.string(),
  status: v.string(),
  isPrivate: v.boolean(),
  joinCode: v.optional(v.string()),
  maxRatingDiff: v.optional(v.number()),
  opponentId: v.optional(v.id("users")),
  opponentUsername: v.optional(v.string()),
  opponentRank: v.optional(v.string()),
  gameId: v.optional(v.string()),
  turnNumber: v.optional(v.number()),
  currentTurnPlayerId: v.optional(v.id("users")),
  turnStartedAt: v.optional(v.number()),
  lastMoveAt: v.optional(v.number()),
  winnerId: v.optional(v.id("users")),
  createdAt: v.number(),
  startedAt: v.optional(v.number()),
  spectatorCount: v.optional(v.number()),
  allowSpectators: v.optional(v.boolean()),
  maxSpectators: v.optional(v.number()),
});

/**
 * Simplified lobby validator for cleanup queries
 * Only includes fields needed by cleanup.ts to avoid type depth issues
 */
export const lobbyForCleanupValidator = v.object({
  _id: v.id("gameLobbies"),
  createdAt: v.number(),
  lastMoveAt: v.optional(v.number()),
  currentTurnPlayerId: v.optional(v.id("users")),
  hostId: v.id("users"),
  hostUsername: v.string(),
});

// ============================================================================
// QUEST/ACHIEVEMENT VALIDATORS
// ============================================================================

/**
 * Quest reward validator
 */
export const questRewardValidator = v.object({
  gold: v.number(),
  xp: v.number(),
  gems: v.optional(v.number()),
});

/**
 * Quest claim response validator
 */
export const questClaimValidator = v.object({
  success: v.boolean(),
  rewards: questRewardValidator,
});

/**
 * User quest validator
 */
export const userQuestValidator = v.object({
  questRecordId: v.id("userQuests"),
  questId: v.string(),
  name: v.string(),
  description: v.string(),
  questType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("achievement")),
  requirementType: v.string(),
  currentProgress: v.number(),
  targetValue: v.number(),
  rewardGold: v.number(),
  rewardXp: v.number(),
  rewardGems: v.optional(v.number()),
  status: v.union(v.literal("active"), v.literal("completed"), v.literal("claimed")),
  expiresAt: v.number(),
});

/**
 * Achievement validator (with progress)
 */
export const achievementValidator = v.object({
  achievementId: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("wins"),
    v.literal("games_played"),
    v.literal("collection"),
    v.literal("social"),
    v.literal("story"),
    v.literal("ranked"),
    v.literal("special")
  ),
  rarity: v.union(
    v.literal("common"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  ),
  icon: v.string(),
  requirementType: v.string(),
  targetValue: v.number(),
  currentProgress: v.number(),
  isUnlocked: v.boolean(),
  unlockedAt: v.optional(v.number()),
  rewards: v.optional(
    v.object({
      gold: v.optional(v.number()),
      xp: v.optional(v.number()),
      gems: v.optional(v.number()),
      badge: v.optional(v.string()),
    })
  ),
  isSecret: v.boolean(),
});

/**
 * Unlocked achievement validator (for profile display)
 */
export const achievementUnlockedValidator = v.object({
  achievementId: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("wins"),
    v.literal("games_played"),
    v.literal("collection"),
    v.literal("social"),
    v.literal("story"),
    v.literal("ranked"),
    v.literal("special")
  ),
  rarity: v.union(
    v.literal("common"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  ),
  icon: v.string(),
  unlockedAt: v.optional(v.number()),
});

// ============================================================================
// MATCHMAKING VALIDATORS
// ============================================================================

/**
 * Matchmaking status validator
 */
export const matchmakingStatusValidator = v.union(
  v.null(),
  v.object({
    status: v.literal("searching"),
    mode: v.union(v.literal("ranked"), v.literal("casual")),
    rating: v.number(),
    deckArchetype: v.string(),
    elapsedSeconds: v.number(),
    currentRatingWindow: v.number(),
    joinedAt: v.number(),
  })
);

/**
 * Queue statistics validator
 */
export const queueStatsValidator = v.object({
  totalPlayers: v.number(),
  byMode: v.object({
    ranked: v.number(),
    casual: v.number(),
  }),
  averageWaitTime: v.number(),
});

// ============================================================================
// LEADERBOARD VALIDATORS
// ============================================================================

/**
 * Leaderboard entry validator
 */
export const leaderboardEntryValidator = v.object({
  userId: v.id("users"),
  username: v.optional(v.string()),
  rank: v.number(),
  rating: v.number(),
  level: v.optional(v.number()), // Optional: only used for story mode
  wins: v.number(),
  losses: v.number(),
  winRate: v.number(),
  isAiAgent: v.boolean(),
});

/**
 * Cached leaderboard response validator
 */
export const cachedLeaderboardValidator = v.union(
  v.null(),
  v.object({
    rankings: v.array(leaderboardEntryValidator),
    lastUpdated: v.number(),
    isCached: v.boolean(),
  })
);

/**
 * User rank validator
 */
export const userRankValidator = v.object({
  rank: v.number(),
  rating: v.number(),
  level: v.number(),
  totalPlayers: v.number(),
  percentile: v.number(),
});

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

/**
 * Generic success response validator
 */
export const successResponseValidator = v.object({
  success: v.boolean(),
  message: v.optional(v.string()),
});

/**
 * Paginated response wrapper
 */
export const paginatedResponseValidator = <T extends GenericValidator>(itemValidator: T) =>
  v.object({
    items: v.array(itemValidator),
    page: v.number(),
    pageSize: v.number(),
    total: v.number(),
    hasMore: v.boolean(),
  });

/**
 * Optional data response
 */
export const optionalDataValidator = <T extends GenericValidator>(dataValidator: T) =>
  v.union(v.null(), dataValidator);

// ============================================================================
// CARD VALIDATORS
// ============================================================================

/**
 * Card with ownership info validator (getUserCards/getUserFavoriteCards return type)
 */
export const cardWithOwnershipValidator = v.object({
  id: v.string(),
  cardDefinitionId: v.id("cardDefinitions"),
  name: v.string(),
  rarity: v.union(
    v.literal("common"),
    v.literal("uncommon"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  ),
  archetype: v.string(),
  element: v.union(
    v.literal("fire"),
    v.literal("water"),
    v.literal("earth"),
    v.literal("wind"),
    v.literal("neutral")
  ),
  cardType: v.union(
    v.literal("creature"),
    v.literal("spell"),
    v.literal("trap"),
    v.literal("equipment")
  ),
  attack: v.optional(v.number()),
  defense: v.optional(v.number()),
  cost: v.number(),
  ability: v.optional(jsonAbilityValidator),
  flavorText: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  owned: v.number(), // How many copies the user owns
  isFavorite: v.boolean(),
  acquiredAt: v.number(),
});

// ============================================================================
// DECK VALIDATORS
// ============================================================================

/**
 * Deck with card count validator (getUserDecks return type)
 */
export const deckWithCountValidator = v.object({
  id: v.id("userDecks"),
  name: v.string(),
  description: v.optional(v.string()),
  deckArchetype: v.optional(
    v.union(
      v.literal("fire"),
      v.literal("water"),
      v.literal("earth"),
      v.literal("wind"),
      v.literal("dark"),
      v.literal("neutral")
    )
  ),
  cardCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * Deck card entry validator (getDeckWithCards card type)
 */
export const deckCardEntryValidator = v.object({
  cardDefinitionId: v.id("cardDefinitions"),
  name: v.string(),
  rarity: v.union(
    v.literal("common"),
    v.literal("uncommon"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  ),
  archetype: v.string(),
  element: v.union(
    v.literal("fire"),
    v.literal("water"),
    v.literal("earth"),
    v.literal("wind"),
    v.literal("neutral")
  ),
  cardType: v.union(
    v.literal("creature"),
    v.literal("spell"),
    v.literal("trap"),
    v.literal("equipment")
  ),
  attack: v.optional(v.number()),
  defense: v.optional(v.number()),
  cost: v.number(),
  ability: v.optional(jsonAbilityValidator),
  flavorText: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  quantity: v.number(),
  position: v.optional(v.number()),
});

/**
 * Deck with full card list validator (getDeckWithCards return type)
 */
export const deckWithCardsValidator = v.object({
  id: v.id("userDecks"),
  name: v.string(),
  description: v.optional(v.string()),
  deckArchetype: v.optional(
    v.union(
      v.literal("fire"),
      v.literal("water"),
      v.literal("earth"),
      v.literal("wind"),
      v.literal("dark"),
      v.literal("neutral")
    )
  ),
  cards: v.array(deckCardEntryValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * Deck statistics validator (getDeckStats return type)
 * Note: elementCounts uses v.any() because it has dynamic keys based on archetype
 */
export const deckStatsValidator = v.object({
  elementCounts: v.any(), // Dynamic keys (fire, water, earth, wind, neutral, etc.)
  rarityCounts: v.any(), // Dynamic keys based on rarities present
  avgCost: v.string(),
  creatureCount: v.number(),
  spellCount: v.number(),
  trapCount: v.number(),
  equipmentCount: v.number(),
  totalCards: v.number(),
});

// ============================================================================
// MARKETPLACE VALIDATORS
// ============================================================================

/**
 * Marketplace listing validator
 */
export const marketplaceListingValidator = v.object({
  _id: v.id("marketplaceListings"),
  sellerId: v.id("users"),
  sellerUsername: v.optional(v.string()),
  cardDefinitionId: v.id("cardDefinitions"),
  cardName: v.string(),
  cardRarity: v.union(
    v.literal("common"),
    v.literal("uncommon"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  ),
  cardArchetype: v.string(),
  cardImageUrl: v.optional(v.string()),
  listingType: v.union(v.literal("fixed"), v.literal("auction")),
  price: v.optional(v.number()),
  currentBid: v.optional(v.number()),
  buyoutPrice: v.optional(v.number()),
  auctionEndTime: v.optional(v.number()),
  status: v.union(
    v.literal("active"),
    v.literal("sold"),
    v.literal("cancelled"),
    v.literal("expired")
  ),
  createdAt: v.number(),
  expiresAt: v.number(),
});

/**
 * Paginated marketplace listings validator
 */
export const marketplaceListingsValidator = v.object({
  listings: v.array(marketplaceListingValidator),
  page: v.number(),
  pageSize: v.number(),
  total: v.number(),
  hasMore: v.boolean(),
});

/**
 * Auction bid validator
 */
export const auctionBidValidator = v.object({
  _id: v.id("auctionBids"),
  listingId: v.id("marketplaceListings"),
  bidderId: v.id("users"),
  bidderUsername: v.optional(v.string()),
  bidAmount: v.number(),
  createdAt: v.number(),
});

// ============================================================================
// STORY VALIDATORS
// ============================================================================

/**
 * Story progress record validator
 */
export const storyProgressRecordValidator = v.object({
  _id: v.id("storyProgress"),
  userId: v.id("users"),
  actNumber: v.number(),
  chapterNumber: v.number(),
  difficulty: v.union(v.literal("normal"), v.literal("hard"), v.literal("legendary")),
  status: v.union(
    v.literal("locked"),
    v.literal("available"),
    v.literal("in_progress"),
    v.literal("completed")
  ),
  starsEarned: v.number(),
  timesAttempted: v.number(),
  timesCompleted: v.number(),
  lastAttemptAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
});

/**
 * Player progress grouped by act validator
 */
export const playerProgressValidator = v.object({
  acts: v.array(
    v.object({
      actNumber: v.number(),
      chapters: v.array(storyProgressRecordValidator),
      totalStars: v.number(),
      completedChapters: v.number(),
    })
  ),
  totalStars: v.number(),
  overallCompletion: v.number(),
});

/**
 * Chapter definition validator
 */
export const chapterDefinitionValidator = v.union(
  v.null(),
  v.object({
    _id: v.id("storyChapters"),
    actNumber: v.number(),
    chapterNumber: v.number(),
    title: v.string(),
    description: v.string(),
    difficulty: v.union(v.literal("normal"), v.literal("hard"), v.literal("legendary")),
    enemyDeckArchetype: v.string(),
    enemyLevel: v.number(),
    requiredLevel: v.number(),
    rewards: v.object({
      gold: v.number(),
      xp: v.number(),
      gems: v.optional(v.number()),
      guaranteedCardId: v.optional(v.id("cardDefinitions")),
    }),
    unlockRequirements: v.optional(
      v.object({
        previousChapter: v.optional(
          v.object({
            actNumber: v.number(),
            chapterNumber: v.number(),
          })
        ),
        minStars: v.optional(v.number()),
      })
    ),
  })
);

/**
 * Available chapter info validator
 */
export const availableChapterValidator = v.object({
  _id: v.id("storyChapters"),
  actNumber: v.number(),
  chapterNumber: v.number(),
  title: v.string(),
  description: v.string(),
  difficulty: v.union(v.literal("normal"), v.literal("hard"), v.literal("legendary")),
  enemyLevel: v.number(),
  requiredLevel: v.number(),
  status: v.union(
    v.literal("locked"),
    v.literal("available"),
    v.literal("in_progress"),
    v.literal("completed")
  ),
  starsEarned: v.number(),
  timesCompleted: v.number(),
  rewards: v.object({
    gold: v.number(),
    xp: v.number(),
    gems: v.optional(v.number()),
  }),
});

/**
 * Player badge validator
 */
export const playerBadgeValidator = v.object({
  badgeId: v.string(),
  name: v.string(),
  description: v.string(),
  icon: v.string(),
  rarity: v.union(
    v.literal("common"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  ),
  earnedAt: v.number(),
});

/**
 * Player badges grouped by type
 */
export const playerBadgesValidator = v.object({
  story: v.array(playerBadgeValidator),
  ranked: v.array(playerBadgeValidator),
  special: v.array(playerBadgeValidator),
  total: v.number(),
});

/**
 * Battle attempt validator
 */
export const battleAttemptValidator = v.object({
  _id: v.id("storyBattleAttempts"),
  userId: v.id("users"),
  actNumber: v.number(),
  chapterNumber: v.number(),
  difficulty: v.union(v.literal("normal"), v.literal("hard"), v.literal("legendary")),
  status: v.union(v.literal("in_progress"), v.literal("won"), v.literal("lost")),
  deckId: v.id("userDecks"),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  finalLP: v.optional(v.number()),
  turnsPlayed: v.optional(v.number()),
  starsEarned: v.optional(v.number()),
});

/**
 * Story battle start response
 */
export const storyBattleStartValidator = v.object({
  attemptId: v.id("storyBattleAttempts"),
  chapter: chapterDefinitionValidator,
  enemyDeck: v.array(v.id("cardDefinitions")),
  playerDeck: v.array(v.id("cardDefinitions")),
  startingLP: v.number(),
});

/**
 * Story battle completion response
 */
export const storyBattleCompletionValidator = v.object({
  success: v.boolean(),
  won: v.boolean(),
  starsEarned: v.number(),
  rewards: v.object({
    gold: v.number(),
    xp: v.number(),
    gems: v.optional(v.number()),
    leveledUp: v.boolean(),
    newLevel: v.optional(v.number()),
    guaranteedCard: v.optional(cardResultValidator),
  }),
  updatedProgress: storyProgressRecordValidator,
  nextChapterUnlocked: v.optional(
    v.object({
      actNumber: v.number(),
      chapterNumber: v.number(),
    })
  ),
});

// ============================================================================
// SHOP VALIDATORS (ADDITIONAL)
// ============================================================================

/**
 * Shop product validator
 */
export const shopProductValidator = v.object({
  _id: v.id("shopProducts"),
  name: v.string(),
  description: v.string(),
  productType: v.union(
    v.literal("booster_pack"),
    v.literal("starter_deck"),
    v.literal("bundle"),
    v.literal("cosmetic")
  ),
  goldPrice: v.optional(v.number()),
  gemPrice: v.optional(v.number()),
  guaranteedRarity: v.optional(
    v.union(
      v.literal("common"),
      v.literal("uncommon"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary")
    )
  ),
  cardsPerPack: v.optional(v.number()),
  bonusCards: v.optional(v.number()),
  imageUrl: v.optional(v.string()),
  isAvailable: v.boolean(),
  isFeatured: v.boolean(),
  displayOrder: v.number(),
});

/**
 * Pack opening history entry validator
 */
export const packOpeningHistoryValidator = v.object({
  _id: v.id("packOpeningHistory"),
  userId: v.id("users"),
  productId: v.id("shopProducts"),
  productName: v.string(),
  packsOpened: v.number(),
  cardsReceived: v.array(cardResultValidator),
  currencyUsed: v.union(v.literal("gold"), v.literal("gems")),
  amountPaid: v.number(),
  openedAt: v.number(),
});

// ============================================================================
// MATCH HISTORY VALIDATORS
// ============================================================================

/**
 * Match history entry validator
 */
export const matchHistoryEntryValidator = v.object({
  _id: v.id("gameResults"),
  gameId: v.string(),
  winnerId: v.optional(v.id("users")),
  winnerUsername: v.optional(v.string()),
  loserId: v.optional(v.id("users")),
  loserUsername: v.optional(v.string()),
  mode: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
  gameType: v.union(
    v.literal("ranked"),
    v.literal("casual"),
    v.literal("story"),
    v.literal("tutorial")
  ),
  result: v.union(v.literal("win"), v.literal("loss"), v.literal("draw")),
  opponentId: v.id("users"),
  opponentUsername: v.optional(v.string()),
  finalLP: v.number(),
  opponentFinalLP: v.number(),
  turnsPlayed: v.number(),
  duration: v.number(),
  ratingChange: v.optional(v.number()),
  playedAt: v.number(),
});

/**
 * Battle history entry validator (from matchHistory table)
 */
export const battleHistoryEntryValidator = v.object({
  _id: v.id("matchHistory"),
  opponentId: v.id("users"),
  opponentUsername: v.string(),
  gameType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
  result: v.union(v.literal("win"), v.literal("loss")),
  ratingBefore: v.number(),
  ratingAfter: v.number(),
  ratingChange: v.number(),
  xpAwarded: v.optional(v.number()),
  completedAt: v.number(),
});

// ============================================================================
// BATTLE PASS VALIDATORS
// ============================================================================

/**
 * Battle pass reward type validator
 */
export const battlePassRewardTypeValidator = v.union(
  v.literal("gold"),
  v.literal("gems"),
  v.literal("xp"),
  v.literal("card"),
  v.literal("pack"),
  v.literal("title"),
  v.literal("avatar")
);

/**
 * Battle pass reward object validator
 */
export const battlePassRewardValidator = v.object({
  type: battlePassRewardTypeValidator,
  amount: v.optional(v.number()),
  cardId: v.optional(v.id("cardDefinitions")),
  packProductId: v.optional(v.string()),
  titleName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
});

/**
 * Battle pass status validator (getBattlePassStatus return type)
 */
export const battlePassStatusValidator = v.union(
  v.null(),
  v.object({
    battlePassId: v.id("battlePassSeasons"),
    seasonId: v.id("seasons"),
    name: v.string(),
    description: v.optional(v.string()),
    seasonName: v.optional(v.string()),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("ended")),
    totalTiers: v.number(),
    xpPerTier: v.number(),
    // Note: premiumPrice and tokenPrice removed - premium access now via Stripe subscriptions
    startDate: v.number(),
    endDate: v.number(),
    // User progress
    currentXP: v.number(),
    currentTier: v.number(),
    isPremium: v.boolean(),
    claimedFreeTiers: v.array(v.number()),
    claimedPremiumTiers: v.array(v.number()),
    xpToNextTier: v.number(),
    daysRemaining: v.number(),
  })
);

/**
 * Battle pass tier validator (getBattlePassTiers return type)
 */
export const battlePassTierValidator = v.object({
  tier: v.number(),
  freeReward: v.optional(battlePassRewardValidator),
  premiumReward: v.optional(battlePassRewardValidator),
  isMilestone: v.boolean(),
  isUnlocked: v.boolean(),
  freeRewardClaimed: v.boolean(),
  premiumRewardClaimed: v.boolean(),
  canClaimFree: v.boolean(),
  canClaimPremium: v.boolean(),
});

/**
 * Battle pass progress validator (getUserBattlePassProgress return type)
 */
export const battlePassProgressValidator = v.union(
  v.null(),
  v.object({
    battlePassId: v.id("battlePassSeasons"),
    currentXP: v.number(),
    currentTier: v.number(),
    isPremium: v.boolean(),
    premiumPurchasedAt: v.optional(v.number()),
    claimedFreeTiers: v.array(v.number()),
    claimedPremiumTiers: v.array(v.number()),
    lastXPGainAt: v.optional(v.number()),
    xpPerTier: v.number(),
    totalTiers: v.number(),
    xpToNextTier: v.number(),
    tierProgress: v.number(),
  })
);

/**
 * Claim battle pass reward response validator
 */
export const claimBattlePassRewardValidator = v.object({
  success: v.boolean(),
  tier: v.number(),
  track: v.union(v.literal("free"), v.literal("premium")),
  reward: v.object({
    type: battlePassRewardTypeValidator,
    amount: v.optional(v.number()),
  }),
});

// ============================================================================
// TOURNAMENT VALIDATORS
// ============================================================================

/**
 * Tournament status union validator
 */
export const tournamentStatusValidator = v.union(
  v.literal("registration"),
  v.literal("checkin"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("cancelled")
);

/**
 * Tournament participant status union validator
 */
export const tournamentParticipantStatusValidator = v.union(
  v.literal("registered"),
  v.literal("checked_in"),
  v.literal("active"),
  v.literal("eliminated"),
  v.literal("winner"),
  v.literal("forfeit"),
  v.literal("refunded")
);

/**
 * Tournament match status union validator
 */
export const tournamentMatchStatusValidator = v.union(
  v.literal("pending"),
  v.literal("ready"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("forfeit")
);

/**
 * Tournament prize pool validator
 */
export const tournamentPrizePoolValidator = v.object({
  first: v.number(),
  second: v.number(),
  thirdFourth: v.number(),
});

/**
 * Tournament summary validator (for list views)
 */
export const tournamentSummaryValidator = v.object({
  _id: v.id("tournaments"),
  name: v.string(),
  description: v.optional(v.string()),
  format: v.literal("single_elimination"),
  maxPlayers: v.union(v.literal(4), v.literal(8), v.literal(16), v.literal(32)),
  entryFee: v.number(),
  mode: v.union(v.literal("ranked"), v.literal("casual")),
  prizePool: tournamentPrizePoolValidator,
  status: tournamentStatusValidator,
  registrationStartsAt: v.number(),
  registrationEndsAt: v.number(),
  scheduledStartAt: v.number(),
  registeredCount: v.number(),
  checkedInCount: v.number(),
  currentRound: v.number(),
  totalRounds: v.optional(v.number()),
  winnerId: v.optional(v.id("users")),
  winnerUsername: v.optional(v.string()),
});

/**
 * Tournament details validator (full tournament info)
 */
export const tournamentDetailsValidator = v.object({
  _id: v.id("tournaments"),
  name: v.string(),
  description: v.optional(v.string()),
  format: v.literal("single_elimination"),
  maxPlayers: v.union(v.literal(4), v.literal(8), v.literal(16), v.literal(32)),
  entryFee: v.number(),
  mode: v.union(v.literal("ranked"), v.literal("casual")),
  prizePool: tournamentPrizePoolValidator,
  status: tournamentStatusValidator,
  registrationStartsAt: v.number(),
  registrationEndsAt: v.number(),
  checkInStartsAt: v.number(),
  checkInEndsAt: v.number(),
  scheduledStartAt: v.number(),
  actualStartedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  currentRound: v.number(),
  totalRounds: v.optional(v.number()),
  registeredCount: v.number(),
  checkedInCount: v.number(),
  winnerId: v.optional(v.id("users")),
  winnerUsername: v.optional(v.string()),
  secondPlaceId: v.optional(v.id("users")),
  secondPlaceUsername: v.optional(v.string()),
  createdAt: v.number(),
  // User-specific fields
  isRegistered: v.boolean(),
  isCheckedIn: v.boolean(),
  userParticipantId: v.optional(v.id("tournamentParticipants")),
  userStatus: v.optional(tournamentParticipantStatusValidator),
});

/**
 * Tournament participant validator
 */
export const tournamentParticipantValidator = v.object({
  _id: v.id("tournamentParticipants"),
  tournamentId: v.id("tournaments"),
  userId: v.id("users"),
  username: v.string(),
  registeredAt: v.number(),
  seedRating: v.number(),
  status: tournamentParticipantStatusValidator,
  checkedInAt: v.optional(v.number()),
  currentRound: v.optional(v.number()),
  bracket: v.optional(v.number()),
  eliminatedInRound: v.optional(v.number()),
  finalPlacement: v.optional(v.number()),
  prizeAwarded: v.optional(v.number()),
});

/**
 * Tournament match validator
 */
export const tournamentMatchValidator = v.object({
  _id: v.id("tournamentMatches"),
  tournamentId: v.id("tournaments"),
  round: v.number(),
  matchNumber: v.number(),
  bracketPosition: v.number(),
  player1Id: v.optional(v.id("users")),
  player1Username: v.optional(v.string()),
  player2Id: v.optional(v.id("users")),
  player2Username: v.optional(v.string()),
  status: tournamentMatchStatusValidator,
  lobbyId: v.optional(v.id("gameLobbies")),
  gameId: v.optional(v.string()),
  winnerId: v.optional(v.id("users")),
  winnerUsername: v.optional(v.string()),
  loserId: v.optional(v.id("users")),
  loserUsername: v.optional(v.string()),
  winReason: v.optional(
    v.union(
      v.literal("game_win"),
      v.literal("opponent_forfeit"),
      v.literal("opponent_no_show"),
      v.literal("bye")
    )
  ),
  scheduledAt: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
});

/**
 * Tournament bracket response validator
 */
export const tournamentBracketValidator = v.object({
  tournament: tournamentSummaryValidator,
  rounds: v.array(
    v.object({
      roundNumber: v.number(),
      roundName: v.string(), // "Round 1", "Quarterfinals", "Semifinals", "Finals"
      matches: v.array(tournamentMatchValidator),
    })
  ),
  participants: v.array(tournamentParticipantValidator),
});

/**
 * Tournament history entry validator (user's tournament history)
 */
export const tournamentHistoryEntryValidator = v.object({
  _id: v.id("tournamentHistory"),
  tournamentId: v.id("tournaments"),
  tournamentName: v.string(),
  maxPlayers: v.number(),
  placement: v.number(),
  prizeWon: v.number(),
  matchesPlayed: v.number(),
  matchesWon: v.number(),
  completedAt: v.number(),
});

/**
 * Tournament registration response validator
 */
export const tournamentRegistrationResponseValidator = v.object({
  success: v.boolean(),
  participantId: v.id("tournamentParticipants"),
  message: v.string(),
});

/**
 * Tournament check-in response validator
 */
export const tournamentCheckInResponseValidator = v.object({
  success: v.boolean(),
  message: v.string(),
});

/**
 * User tournament stats validator
 */
export const userTournamentStatsValidator = v.object({
  tournamentsPlayed: v.number(),
  tournamentsWon: v.number(),
  totalPrizeWon: v.number(),
  totalMatchesPlayed: v.number(),
  totalMatchesWon: v.number(),
  bestPlacement: v.optional(v.number()),
  winRate: v.number(),
});

// ============================================================================
// INFERRED TYPES - Single source of truth for TypeScript types
// These types are derived directly from validators above
// Import these in frontend code for full type safety and autocomplete
// ============================================================================

// User types
export type UserProfile = Infer<typeof userProfileValidator>;
export type UserInfo = Infer<typeof userInfoValidator>;
export type FullUser = Infer<typeof fullUserValidator>;

// Economy types
export type PlayerBalance = Infer<typeof playerBalanceValidator>;
export type CurrencyTransaction = Infer<typeof currencyTransactionValidator>;
export type TransactionHistory = Infer<typeof transactionHistoryValidator>;
export type CardResult = Infer<typeof cardResultValidator>;
export type PackPurchase = Infer<typeof packPurchaseValidator>;

// Social types
export type FriendInfo = Infer<typeof friendInfoValidator>;
export type FriendRequest = Infer<typeof friendRequestValidator>;
export type FriendOperation = Infer<typeof friendOperationValidator>;

// Game types
export type GameLobby = Infer<typeof gameLobbyValidator>;
export type LobbyForCleanup = Infer<typeof lobbyForCleanupValidator>;
export type MatchmakingStatus = Infer<typeof matchmakingStatusValidator>;
export type QueueStats = Infer<typeof queueStatsValidator>;

// Quest/Achievement types
export type QuestReward = Infer<typeof questRewardValidator>;
export type QuestClaim = Infer<typeof questClaimValidator>;
export type UserQuest = Infer<typeof userQuestValidator>;
export type Achievement = Infer<typeof achievementValidator>;
export type AchievementUnlocked = Infer<typeof achievementUnlockedValidator>;

// Leaderboard types
export type LeaderboardEntry = Infer<typeof leaderboardEntryValidator>;
export type CachedLeaderboard = Infer<typeof cachedLeaderboardValidator>;
export type UserRank = Infer<typeof userRankValidator>;

// Response types
export type SuccessResponse = Infer<typeof successResponseValidator>;

// Card/Deck types
export type CardWithOwnership = Infer<typeof cardWithOwnershipValidator>;
export type DeckWithCount = Infer<typeof deckWithCountValidator>;
export type DeckCardEntry = Infer<typeof deckCardEntryValidator>;
export type DeckWithCards = Infer<typeof deckWithCardsValidator>;
export type DeckStats = Infer<typeof deckStatsValidator>;

// Marketplace types
export type MarketplaceListing = Infer<typeof marketplaceListingValidator>;
export type MarketplaceListings = Infer<typeof marketplaceListingsValidator>;
export type AuctionBid = Infer<typeof auctionBidValidator>;

// Story/Progress types
export type StoryProgressRecord = Infer<typeof storyProgressRecordValidator>;
export type PlayerProgress = Infer<typeof playerProgressValidator>;
export type ChapterDefinition = Infer<typeof chapterDefinitionValidator>;
export type AvailableChapter = Infer<typeof availableChapterValidator>;
export type PlayerBadge = Infer<typeof playerBadgeValidator>;
export type PlayerBadges = Infer<typeof playerBadgesValidator>;
export type BattleAttempt = Infer<typeof battleAttemptValidator>;
export type StoryBattleStart = Infer<typeof storyBattleStartValidator>;
export type StoryBattleCompletion = Infer<typeof storyBattleCompletionValidator>;

// Shop types
export type ShopProduct = Infer<typeof shopProductValidator>;
export type PackOpeningHistory = Infer<typeof packOpeningHistoryValidator>;

// History types
export type MatchHistoryEntry = Infer<typeof matchHistoryEntryValidator>;
export type BattleHistoryEntry = Infer<typeof battleHistoryEntryValidator>;

// Battle Pass types
export type BattlePassRewardType = Infer<typeof battlePassRewardTypeValidator>;
export type BattlePassReward = Infer<typeof battlePassRewardValidator>;
export type BattlePassStatus = Infer<typeof battlePassStatusValidator>;
export type BattlePassTier = Infer<typeof battlePassTierValidator>;
export type BattlePassProgress = Infer<typeof battlePassProgressValidator>;
export type ClaimBattlePassReward = Infer<typeof claimBattlePassRewardValidator>;

// Tournament types
export type TournamentStatus = Infer<typeof tournamentStatusValidator>;
export type TournamentParticipantStatus = Infer<typeof tournamentParticipantStatusValidator>;
export type TournamentMatchStatus = Infer<typeof tournamentMatchStatusValidator>;
export type TournamentPrizePool = Infer<typeof tournamentPrizePoolValidator>;
export type TournamentSummary = Infer<typeof tournamentSummaryValidator>;
export type TournamentDetails = Infer<typeof tournamentDetailsValidator>;
export type TournamentParticipant = Infer<typeof tournamentParticipantValidator>;
export type TournamentMatch = Infer<typeof tournamentMatchValidator>;
export type TournamentBracket = Infer<typeof tournamentBracketValidator>;
export type TournamentHistoryEntry = Infer<typeof tournamentHistoryEntryValidator>;
export type TournamentRegistrationResponse = Infer<typeof tournamentRegistrationResponseValidator>;
export type TournamentCheckInResponse = Infer<typeof tournamentCheckInResponseValidator>;
export type UserTournamentStats = Infer<typeof userTournamentStatsValidator>;
