/**
 * @module @ltcg/core/types/api
 *
 * TypeScript interfaces for Convex API return types.
 * These match the validators defined in convex/lib/returnValidators.ts
 *
 * @example
 * ```typescript
 * import type { User, UserInfo, PlayerBalance } from "@ltcg/core/types/api";
 * ```
 */

import type {
  Id,
  GameMode,
  LobbyStatus,
} from "./common";

import type {
  JsonAbility,
} from "./card-logic";

import type {
  CardType,
  Rarity,
  Attribute,
  Archetype,
  SpellType,
  TrapType,
  CardVariant,
  ViceType,
} from "./game";

// =============================================================================
// User Types
// =============================================================================

/** Full user object returned by currentUser query */
export interface User {
  _id: Id<"users">;
  _creationTime: number;
  // Privy authentication
  privyId?: string;
  // Profile fields
  name?: string;
  image?: string;
  email?: string;
  emailVerificationTime?: number;
  phone?: string;
  phoneVerificationTime?: number;
  isAnonymous?: boolean;
  // Custom game fields
  username?: string;
  bio?: string;
  passwordHash?: string;
  activeDeckId?: Id<"userDecks">;
  createdAt?: number;
  // Rating fields
  rankedElo?: number;
  casualRating?: number;
  // Stats fields
  totalWins?: number;
  totalLosses?: number;
  rankedWins?: number;
  rankedLosses?: number;
  casualWins?: number;
  casualLosses?: number;
  storyWins?: number;
  currentWinStreak?: number;
  longestWinStreak?: number;
  // Player type
  isAiAgent?: boolean;
  // XP and Level
  xp?: number;
  level?: number;
  // Economy
  gold?: number;
  lastStatsUpdate?: number;
  // Email tracking
  welcomeEmailSent?: boolean;
  // Moderation fields
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: number;
  bannedBy?: Id<"users">;
  isSuspended?: boolean;
  suspendedUntil?: number;
  suspensionReason?: string;
  suspendedBy?: Id<"users">;
  warningCount?: number;
  accountStatus?: "active" | "suspended" | "banned";
  mutedUntil?: number;
  // HD Wallet tracking
  nextWalletIndex?: number;
  // Wallet fields
  walletAddress?: string;
  walletConnectedAt?: number;
  walletType?: "privy_embedded" | "external";
  // Tutorial
  tutorialProgress?: {
    completed: boolean;
    lastMoment: number;
    dismissCount: number;
    completedAt?: number;
  };
  helpModeEnabled?: boolean;
  // Pity counter
  pityCounter?: {
    packsSinceEpic: number;
    packsSinceLegendary: number;
    packsSinceFullArt: number;
  };
  // Daily rewards
  lastDailyPackClaim?: number;
  lastWeeklyJackpotClaim?: number;
  loginStreak?: number;
  lastLoginDate?: string;
}

/** Basic user info for public profiles */
export interface UserInfo {
  _id: Id<"users">;
  username?: string;
  bio?: string;
  createdAt?: number;
}

/** User profile with stats */
export interface UserProfile extends UserInfo {
  totalWins: number;
  totalLosses: number;
  rankedWins: number;
  rankedLosses: number;
  casualWins: number;
  casualLosses: number;
  storyWins: number;
  rankedElo: number;
  casualRating: number;
  xp: number;
  level: number;
  isAiAgent: boolean;
}

// =============================================================================
// Economy Types
// =============================================================================

/** Player balance response */
export interface PlayerBalance {
  gold: number;
  gems: number;
  lifetimeStats: {
    goldEarned: number;
    goldSpent: number;
    gemsEarned: number;
    gemsSpent: number;
  };
}

/** Transaction history item */
export interface Transaction {
  _id: Id<"transactions">;
  _creationTime: number;
  userId: Id<"users">;
  type: "earn" | "spend" | "transfer";
  currency: "gold" | "gems";
  amount: number;
  reason: string;
  relatedId?: string;
  balanceAfter?: number;
}

/** Paginated transaction history response */
export interface TransactionHistoryResponse {
  transactions: Transaction[];
  hasMore: boolean;
  nextCursor?: string;
}

/** Token balance response */
export interface TokenBalance {
  balance: number;
  lastUpdated: number;
  walletAddress?: string;
}

// =============================================================================
// Game Lobby Types
// =============================================================================

/** Game lobby document */
export interface GameLobby {
  _id: Id<"gameLobbies">;
  _creationTime: number;
  hostId: Id<"users">;
  opponentId?: Id<"users">;
  status: LobbyStatus;
  gameMode: GameMode;
  lobbyCode?: string;
  gameId?: Id<"gameStates">;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

// =============================================================================
// Game State Types
// =============================================================================

export type GamePhase = "draw" | "main" | "combat" | "breakdown_check" | "end" | "game_over";

export type ZoneType =
  | "hand"
  | "deck"
  | "graveyard"
  | "monsterZone"
  | "spellTrapZone"
  | "field"
  | "extraDeck"
  | "banished";

/** Card instance in game */
export interface CardInstance {
  instanceId: string;
  definitionId: Id<"cardDefinitions">;
  name: string;
  cardType: "stereotype" | "spell" | "trap" | "class";
  currentAttack?: number;
  currentDefense?: number;
  position?: "attack" | "defense" | "facedown";
  counters?: Record<string, number>;
  attachedCards?: string[];
  isRevealed?: boolean;
}

/** Player state within a game */
export interface PlayerGameState {
  id: Id<"users">;
  lifePoints: number;
  hand: CardInstance[];
  deck: CardInstance[];
  graveyard: CardInstance[];
  banished: CardInstance[];
  monsterZones: (CardInstance | null)[];
  spellTrapZones: (CardInstance | null)[];
  fieldZone: CardInstance | null;
  extraDeck: CardInstance[];
  hasNormalSummoned: boolean;
  canDraw: boolean;
}

/** Full game state */
export interface GameState {
  _id: Id<"gameStates">;
  lobbyId: Id<"gameLobbies">;
  status: "active" | "completed" | "abandoned";
  currentPhase: GamePhase;
  turnNumber: number;
  activePlayerId: Id<"users">;
  priorityPlayerId: Id<"users">;
  player1: PlayerGameState;
  player2: PlayerGameState;
  chain: ChainLink[];
  winnerId?: Id<"users">;
  winReason?: string;
}

/** Chain link for spell/trap resolution */
export interface ChainLink {
  sourceCard: CardInstance;
  effect: string;
  activatingPlayer: Id<"users">;
  targets?: string[];
}

// =============================================================================
// Card Definition Types
// =============================================================================

/** Card definition from database - matches convex/schema.ts cardDefinitions */
export interface CardDefinition {
  _id: Id<"cardDefinitions">;
  _creationTime: number;
  name: string;
  rarity: Rarity;
  archetype: Archetype;
  cardType: CardType;
  attack?: number;
  defense?: number;
  cost: number;
  // Industry-standard TCG fields
  level?: number;
  attribute?: Attribute;
  spellType?: SpellType;
  trapType?: TrapType;
  viceType?: ViceType;
  breakdownEffect?: unknown;
  breakdownFlavorText?: string;
  // Ability (JSON format)
  ability?: JsonAbility;
  flavorText?: string;
  imageUrl?: string;
  imageStorageId?: Id<"_storage">;
  thumbnailStorageId?: Id<"_storage">;
  isActive: boolean;
  createdAt: number;
  templateId?: Id<"cardTemplates">;
}

/** @deprecated Use JsonAbility instead - legacy card ability definition */
export interface CardAbility {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  effectType: string;
  cost?: AbilityCost;
  targets?: TargetRequirement[];
}

export interface AbilityCost {
  type: string;
  amount?: number;
}

export interface TargetRequirement {
  type: string;
  count?: number;
  filter?: Record<string, unknown>;
}

// =============================================================================
// Collection Types
// =============================================================================

/** User's card in collection */
export interface UserCard {
  _id: Id<"userCards">;
  userId: Id<"users">;
  cardDefinitionId: Id<"cardDefinitions">;
  variant: CardVariant;
  obtainedAt: number;
  obtainedFrom: string;
  serialNumber?: number;
  isTrading?: boolean;
}

/** User deck */
export interface UserDeck {
  _id: Id<"userDecks">;
  userId: Id<"users">;
  name: string;
  cards: Id<"userCards">[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// Progression Types
// =============================================================================

/** Battle pass status */
export interface BattlePassStatus {
  seasonId: Id<"battlePassSeasons">;
  currentTier: number;
  currentXp: number;
  isPremium: boolean;
  claimedRewards: number[];
}

/** Notification */
export interface Notification {
  _id: Id<"notifications">;
  userId: Id<"users">;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Story Mode Types
// =============================================================================

export type Difficulty = "normal" | "hard" | "legendary";
export type ProgressStatus = "locked" | "available" | "in_progress" | "completed";

/** Story chapter */
export interface StoryChapter {
  _id: Id<"storyChapters">;
  title: string;
  description: string;
  actNumber: number;
  chapterNumber: number;
  stages: StoryStage[];
  requiredChapterId?: Id<"storyChapters">;
  rewards: ChapterReward[];
}

/** Story stage within a chapter */
export interface StoryStage {
  stageNumber: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  aiDeckId: Id<"userDecks">;
  rewards: StageReward[];
}

export interface ChapterReward {
  type: "gold" | "gems" | "card" | "pack" | "xp";
  amount?: number;
  cardId?: Id<"cardDefinitions">;
}

export interface StageReward extends ChapterReward {
  difficulty: Difficulty;
}

/** Player's story progress */
export interface StoryProgress {
  _id: Id<"storyProgress">;
  userId: Id<"users">;
  progressByAct: Record<
    string,
    {
      chapters: Record<
        string,
        {
          status: ProgressStatus;
          stagesCompleted: number[];
          bestDifficulty?: Difficulty;
        }
      >;
    }
  >;
}

// =============================================================================
// Social Types
// =============================================================================

/** Tournament */
export interface Tournament {
  _id: Id<"tournaments">;
  name: string;
  description: string;
  status: "registration" | "in_progress" | "completed" | "cancelled";
  startTime: number;
  endTime?: number;
  maxParticipants: number;
  currentParticipants: number;
  entryFee?: number;
  prizePool?: number;
}

/** AI Chat session */
export interface AIChatSession {
  _id: Id<"aiChatSessions">;
  userId: Id<"users">;
  status: "active" | "ended";
  createdAt: number;
  endedAt?: number;
  messageCount: number;
}

/** AI Chat message */
export interface AIChatMessage {
  _id: Id<"aiChatMessages">;
  sessionId: Id<"aiChatSessions">;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

// =============================================================================
// Tutorial Types
// =============================================================================

/** Tutorial status */
export interface TutorialStatus {
  completed: boolean;
  lastMoment: number;
  dismissCount: number;
  completedAt?: number;
}

// =============================================================================
// Wallet Types
// =============================================================================

/** User wallet info */
export interface UserWallet {
  address: string;
  type: "privy_embedded" | "external";
  connectedAt: number;
}

// =============================================================================
// Marketplace Types
// =============================================================================

/** Card listing on marketplace */
export interface CardListing {
  _id: Id<"marketplaceListings">;
  sellerId: Id<"users">;
  cardId: Id<"userCards">;
  price: number;
  currency: "gold" | "gems" | "token";
  status: "active" | "sold" | "cancelled";
  createdAt: number;
  soldAt?: number;
  buyerId?: Id<"users">;
}

/** Price history entry */
export interface PriceHistoryEntry {
  price: number;
  timestamp: number;
  volume: number;
}

/** Market overview */
export interface MarketOverview {
  totalListings: number;
  totalVolume24h: number;
  avgPrice: number;
  topCards: {
    cardId: Id<"cardDefinitions">;
    name: string;
    avgPrice: number;
    volume: number;
    // ...
  }[];
}
