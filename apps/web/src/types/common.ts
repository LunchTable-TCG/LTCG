/**
 * Common types used across the application.
 *
 * This module provides foundational types for hooks, UI state, and common patterns
 * used throughout the LTCG frontend application.
 */

// =============================================================================
// Base Hook Patterns
// =============================================================================

/**
 * Base return type for hooks that perform async operations.
 *
 * @example
 * ```typescript
 * function useGameData(): BaseHookReturn {
 *   const [isLoading, setIsLoading] = useState(true);
 *   return { isLoading };
 * }
 * ```
 */
export interface BaseHookReturn {
  /** Indicates if the hook is currently loading data */
  isLoading: boolean;
}

/**
 * Extended hook return type that includes error handling.
 *
 * @example
 * ```typescript
 * function useCardData(): HookWithError {
 *   const [isLoading, setIsLoading] = useState(true);
 *   const [error, setError] = useState<string>();
 *   return { isLoading, error };
 * }
 * ```
 */
export interface HookWithError extends BaseHookReturn {
  /** Error message if the operation failed */
  error?: string;
}

/**
 * Return type for hooks that expose mutation functions.
 *
 * @template T - The type of data returned by the mutation
 *
 * @example
 * ```typescript
 * function useCreateDeck(): MutationHookReturn<{ deckId: string }> {
 *   const [isLoading, setIsLoading] = useState(false);
 *   const [error, setError] = useState<string>();
 *
 *   const execute = async (name: string, cards: string[]) => {
 *     setIsLoading(true);
 *     try {
 *       const result = await createDeck({ name, cards });
 *       return result;
 *     } catch (e) {
 *       setError(e.message);
 *       throw e;
 *     } finally {
 *       setIsLoading(false);
 *     }
 *   };
 *
 *   return { execute, isLoading, error };
 * }
 * ```
 */
export interface MutationHookReturn<T = void> {
  /** Function to execute the mutation */
  execute: (...args: any[]) => Promise<T>;
  /** Indicates if the mutation is currently executing */
  isLoading: boolean;
  /** Error message if the mutation failed */
  error?: string;
}

/**
 * Standard result format for action-based operations.
 *
 * @template T - The type of data returned on success
 *
 * @example
 * ```typescript
 * async function deleteCard(cardId: string): Promise<ActionResult> {
 *   try {
 *     await api.cards.delete({ cardId });
 *     return { success: true };
 *   } catch (error) {
 *     return { success: false, error: error.message };
 *   }
 * }
 * ```
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
 *
 * @example
 * ```typescript
 * function useLeaderboard(): { data: Entry[] } & PaginationState {
 *   const [data, setData] = useState<Entry[]>([]);
 *   const [isLoading, setIsLoading] = useState(false);
 *   const [canLoadMore, setCanLoadMore] = useState(true);
 *
 *   const loadMore = async (count = 10) => {
 *     setIsLoading(true);
 *     const newData = await fetchMore(count);
 *     setData([...data, ...newData]);
 *     setCanLoadMore(newData.length >= count);
 *     setIsLoading(false);
 *   };
 *
 *   return { data, canLoadMore, loadMore, isLoading };
 * }
 * ```
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

/**
 * Lobby matchmaking modes.
 *
 * Valid values:
 * - `"ranked"` - Competitive matches that affect player rating
 * - `"casual"` - Non-ranked matches for practice
 * - `"all"` - Filter to show all lobby types
 *
 * @example
 * ```typescript
 * const mode: LobbyMode = "ranked";
 * const lobbies = await getLobbies(mode);
 * ```
 */
export type LobbyMode = "ranked" | "casual" | "all";

/**
 * Database game mode field (indicates PvP vs Story).
 *
 * Valid values:
 * - `"pvp"` - Player vs Player match
 * - `"story"` - Single-player story mode battle
 *
 * Note: This is different from lobby mode. A game can be:
 * - mode: "casual", gameMode: "pvp" (casual PvP)
 * - mode: "ranked", gameMode: "pvp" (ranked PvP)
 * - gameMode: "story" (story battle, no lobby mode)
 *
 * @example
 * ```typescript
 * const gameMode: DatabaseGameMode = "pvp";
 * if (gameMode === "story") {
 *   // Load AI opponent
 * }
 * ```
 */
export type DatabaseGameMode = "pvp" | "story";

/**
 * Leaderboard type filter (for ranking tables).
 *
 * Valid values:
 * - `"ranked"` - Ranked competitive match leaderboard
 * - `"casual"` - Casual match leaderboard
 * - `"story"` - Story mode battle leaderboard
 *
 * Note: This matches Convex gameModeValidator and is used for leaderboard filtering.
 *
 * @example
 * ```typescript
 * const type: LeaderboardType = "ranked";
 * const rankings = await getLeaderboard(type);
 * ```
 */
export type LeaderboardType = "ranked" | "casual" | "story";

/**
 * @deprecated Use LeaderboardType for leaderboards, LobbyMode for lobby filtering, or DatabaseGameMode for game records.
 * Kept for backward compatibility - currently aliases LeaderboardType.
 */
export type GameMode = LeaderboardType;

/**
 * Player online status indicators.
 *
 * Valid values:
 * - `"online"` - Player is online and available
 * - `"in_game"` - Player is currently in a match
 * - `"idle"` - Player is online but inactive
 * - `"offline"` - Player is not connected
 *
 * @example
 * ```typescript
 * const status: PlayerStatus = "in_game";
 * const canChallenge = status === "online";
 * ```
 */
export type PlayerStatus = "online" | "in_game" | "idle" | "offline";

/**
 * Available sorting options for card collections.
 *
 * Valid values:
 * - `"name"` - Sort alphabetically by card name
 * - `"rarity"` - Sort by rarity tier (common to legendary)
 * - `"type"` - Sort by card type (monster, spell, trap)
 * - `"archetype"` - Sort by deck archetype
 * - `"attack"` - Sort by attack points (monsters only)
 * - `"defense"` - Sort by defense points (monsters only)
 * - `"element"` - Sort by elemental attribute
 * - `"cost"` - Sort by mana/resource cost
 * - `"owned"` - Sort by quantity owned
 *
 * @example
 * ```typescript
 * const sortBy: SortOption = "attack";
 * const sorted = cards.sort((a, b) => {
 *   if (sortBy === "attack") return (b.attack ?? 0) - (a.attack ?? 0);
 *   return 0;
 * });
 * ```
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
// Display Types (UI)
// =============================================================================

// UserProfileSummary and other UI display types moved to ui.ts for better organization

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a string is a valid LobbyMode.
 *
 * @param value - The string to check
 * @returns True if the value is a valid LobbyMode
 *
 * @example
 * ```typescript
 * const userInput = "ranked";
 * if (isLobbyMode(userInput)) {
 *   // TypeScript knows userInput is LobbyMode here
 *   const lobbies = await getLobbies(userInput);
 * }
 * ```
 */
export function isLobbyMode(value: string): value is LobbyMode {
  return ["ranked", "casual", "all"].includes(value);
}

/**
 * Type guard to check if a string is a valid DatabaseGameMode.
 *
 * @param value - The string to check
 * @returns True if the value is a valid DatabaseGameMode
 *
 * @example
 * ```typescript
 * const mode = "pvp";
 * if (isDatabaseGameMode(mode)) {
 *   // TypeScript knows mode is DatabaseGameMode here
 *   loadGameByMode(mode);
 * }
 * ```
 */
export function isDatabaseGameMode(value: string): value is DatabaseGameMode {
  return ["pvp", "story"].includes(value);
}

/**
 * Type guard to check if a string is a valid LeaderboardType.
 *
 * @param value - The string to check
 * @returns True if the value is a valid LeaderboardType
 *
 * @example
 * ```typescript
 * const type = "ranked";
 * if (isLeaderboardType(type)) {
 *   // TypeScript knows type is LeaderboardType here
 *   const rankings = await getLeaderboard(type);
 * }
 * ```
 */
export function isLeaderboardType(value: string): value is LeaderboardType {
  return ["ranked", "casual", "story"].includes(value);
}

/**
 * @deprecated Use isLeaderboardType, isLobbyMode, or isDatabaseGameMode instead
 * Type guard for backward compatibility (checks LeaderboardType)
 */
export function isGameMode(value: string): value is GameMode {
  return isLeaderboardType(value);
}

/**
 * Type guard to check if a string is a valid PlayerStatus.
 *
 * @param value - The string to check
 * @returns True if the value is a valid PlayerStatus
 *
 * @example
 * ```typescript
 * const status = getUserStatus();
 * if (isPlayerStatus(status)) {
 *   // Safe to use as PlayerStatus
 *   updatePresence(status);
 * }
 * ```
 */
export function isPlayerStatus(value: string): value is PlayerStatus {
  return ["online", "in_game", "idle", "offline"].includes(value);
}

/**
 * Type guard to check if a string is a valid SortOption.
 *
 * @param value - The string to check
 * @returns True if the value is a valid SortOption
 *
 * @example
 * ```typescript
 * const urlParam = searchParams.get("sort");
 * if (urlParam && isSortOption(urlParam)) {
 *   // Safe to use as SortOption
 *   sortCards(urlParam);
 * }
 * ```
 */
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
