/**
 * @module @ltcg/core/types/common
 *
 * Common shared types used across the application.
 */

// =============================================================================
// ID Types
// =============================================================================

/** Convex document ID type */
export type Id<TableName extends string> = string & { __tableName: TableName };

// =============================================================================
// Base Hook Patterns
// =============================================================================

/**
 * Base return type for hooks that perform async operations.
 */
export interface BaseHookReturn {
  /** Indicates if the hook is currently loading data */
  isLoading: boolean;
}

/**
 * Extended hook return type that includes error handling.
 */
export interface HookWithError extends BaseHookReturn {
  /** Error message if the operation failed */
  error?: string;
}

/**
 * Return type for hooks that expose mutation functions.
 */
export interface MutationHookReturn<T = void, TArgs extends unknown[] = unknown[]> {
  /** Function to execute the mutation */
  execute: (...args: TArgs) => Promise<T>;
  /** Indicates if the mutation is currently executing */
  isLoading: boolean;
  /** Error message if the mutation failed */
  error?: string;
}

/**
 * Standard result format for action-based operations.
 */
export interface ActionResult<T = void> {
  /** Indicates if the action completed successfully */
  success: boolean;
  /** Data returned by the action (only present on success) */
  data?: T;
  /** Error message if the action failed */
  error?: string;
}

/**
 * State and controls for paginated data loading.
 */
export interface PaginationState {
  /** Indicates if more data is available to load */
  canLoadMore: boolean;
  /** Function to load additional data */
  loadMore: (count?: number) => void;
  /** Indicates if a load operation is in progress */
  isLoading: boolean;
}

// =============================================================================
// Enums & Constants
// =============================================================================

/** Visibility setting (guilds, tournaments, etc). */
export type Visibility = "public" | "private";

/** Tournament lifecycle status. */
export type TournamentStatus = "registration" | "checkin" | "active" | "completed" | "cancelled";

export type LobbyStatus = "waiting" | "ready" | "in_game" | "completed" | "cancelled";

/** Actual game match mode (no filter option). */
export type MatchMode = "casual" | "ranked";

export type LobbyMode = MatchMode | "all";

/**
 * Database game mode field (indicates PvP vs Story).
 */
export type DatabaseGameMode = "pvp" | "story";

/**
 * Leaderboard type filter (for ranking tables).
 */
export type LeaderboardType = "ranked" | "casual" | "story";

/**
 * @deprecated Use LeaderboardType for leaderboards, LobbyMode for lobby filtering, or DatabaseGameMode for game records.
 * Kept for backward compatibility - currently aliases LeaderboardType.
 */
export type GameMode = LeaderboardType;

/**
 * Player online status indicators.
 */
export type PlayerStatus = "online" | "in_game" | "idle" | "offline";

/**
 * Available sorting options for card collections.
 */
export type SortOption =
  | "name"
  | "rarity"
  | "type"
  | "archetype"
  | "attack"
  | "defense"
  | "element"
  | "cost"
  | "owned";

// =============================================================================
// Type Guards
// =============================================================================

export function isLobbyMode(value: string): value is LobbyMode {
  return ["ranked", "casual", "all"].includes(value);
}

export function isDatabaseGameMode(value: string): value is DatabaseGameMode {
  return ["pvp", "story"].includes(value);
}

export function isLeaderboardType(value: string): value is LeaderboardType {
  return ["ranked", "casual", "story"].includes(value);
}

/**
 * @deprecated Use isLeaderboardType, isLobbyMode, or isDatabaseGameMode instead
 */
export function isGameMode(value: string): value is GameMode {
  return isLeaderboardType(value);
}

export function isPlayerStatus(value: string): value is PlayerStatus {
  return ["online", "in_game", "idle", "offline"].includes(value);
}

export function isSortOption(value: string): value is SortOption {
  return [
    "name",
    "rarity",
    "type",
    "archetype",
    "attack",
    "defense",
    "element",
    "cost",
    "owned",
  ].includes(value);
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API success response wrapper.
 * Used by HTTP endpoints and plugin clients.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: number;
}

/**
 * Standard API error response wrapper.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: number;
}

/**
 * Union of success and error API responses.
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
