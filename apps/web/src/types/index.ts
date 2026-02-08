/**
 * Types barrel export
 *
 * All types are explicitly exported for better tree-shaking and IDE support.
 * Import what you need, not everything.
 */

// Types inferred from Convex validators (convex/lib/returnValidators.ts)
export type * from "./generated";

// Common types
export type {
  BaseHookReturn,
  HookWithError,
  MutationHookReturn,
  ActionResult,
  PaginationState,
  MatchMode,
  LobbyMode,
  DatabaseGameMode,
  LeaderboardType,
  GameMode, // @deprecated - use specific types
  PlayerStatus,
  SortOption,
  Visibility,
  TournamentStatus,
} from "./common";

export {
  isLobbyMode,
  isDatabaseGameMode,
  isLeaderboardType,
  isGameMode, // @deprecated - use specific type guards
  isPlayerStatus,
  isSortOption,
} from "./common";

// UI Display types
export type {
  CardDisplay,
  CardDisplayWithStats,
  CardDisplayOwned,
  DeckDisplay,
  DeckDisplayWithMeta,
  UserProfileSummary,
  UserProfileDisplay,
  GameLobbyDisplay,
  MatchDisplay,
  NotificationDisplay,
  BadgeDisplay,
  BadgeDisplayWithProgress,
  LeaderboardEntryDisplay,
  QuestDisplay,
  StoryChapterDisplay,
  StoryStageDisplay,
  ShopProductDisplay,
} from "./ui";

export {
  isCardDisplay,
  isDeckDisplay,
  isUserProfileSummary,
  isNotificationDisplay,
  isBadgeDisplay,
  isQuestDisplay,
} from "./ui";

// Progression types
export type {
  Achievement,
  Quest,
  Badge,
  BadgeData,
  Notification,
  QuestRewardResult,
  NotificationActionResult,
  MarkAllAsReadResult,
} from "./progression";

export {
  isAchievement,
  isQuest,
  isBadge,
  isNotification,
} from "./progression";

// Social types
export type {
  LeaderboardEntry,
  LeaderboardData,
  BattleHistoryEntry,
  Friend,
  FriendRequest,
  FriendRequestResult,
} from "./social";

export {
  isLeaderboardEntry,
  isFriend,
} from "./social";

// Card types
export type {
  Rarity,
  Element,
  ElementWithNeutral,
  CardType,
} from "./cards";

// Economy types
export type {
  Currency,
  RewardType,
  TransactionFilter,
  ProductType,
} from "./economy";

// Game types
export type {
  HandCard,
  BoardCard,
  BackrowCard,
  GraveyardCard,
} from "./game";

// Card helper types and functions (for JSON abilities)
export type {
  EffectType,
  TriggerCondition,
  CostType,
  JsonCost,
  JsonEffect,
  JsonAbility,
  DisplayEffect,
} from "../lib/cardHelpers";

export {
  getCardEffectsArray,
  getAbilityDisplayText,
  isJsonAbility,
  getTriggerLabel,
  getEffectTypeLabel,
  hasOPTRestriction,
  hasHOPTRestriction,
  isContinuousAbility,
  getProtectionFlags,
} from "../lib/cardHelpers";

// Story types
export type {
  StoryChapter,
  StoryChapterDetails,
  StoryStage,
  CompleteChapterResult,
} from "./story";

// =============================================================================
// Utility Types
// =============================================================================

// Nullability utilities
export type {
  Nullable,
  Optional,
  Maybe,
  NonNullish,
} from "./utils";

// Object utilities
export type {
  RequireProps,
  MakeOptional,
  OptionalExcept,
  DeepReadonly,
  Mutable,
  PickByType,
  OmitByType,
} from "./utils";

// Convex ID utilities
export type {
  ExtractTableName,
  UnionIds,
  OptionalId,
  NullableId,
  MaybeId,
} from "./utils";

// Array utilities
export type {
  ArrayElement,
  ImmutableArray,
  NonEmptyArray,
  Tuple,
} from "./utils";

// Function utilities
export type {
  AsyncReturnType,
  FunctionParams,
  VoidFunction,
  AsyncFunction,
  FirstParameter,
} from "./utils";

// Union & intersection utilities
export type {
  ValueOf,
  KeysOfType,
  Exhaustive,
  UnionToIntersection,
} from "./utils";

// Conditional utilities
export type {
  IfNever,
  IfExtends,
  IfAny,
} from "./utils";

// String utilities
export type {
  UppercaseString,
  LowercaseString,
  CapitalizeString,
  Split,
} from "./utils";

// Branded types
export type { Brand } from "./utils";

// Result/Either types
export type {
  Success,
  Failure,
  Result,
} from "./utils";

// Type guard functions
export {
  isDefined,
  isNonEmptyArray,
  hasKey,
  isNull,
  isUndefined,
  isFunction,
  isString,
  isNumber,
  isBoolean,
  isObject,
} from "./utils";

// Result helpers
export {
  ok,
  err,
  isOk,
  isErr,
  brand,
} from "./utils";
