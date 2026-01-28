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
 * Available game modes in LTCG.
 *
 * Valid values:
 * - `"ranked"` - Competitive matches that affect player rating
 * - `"casual"` - Non-ranked matches for practice
 * - `"story"` - Single-player story mode battles
 *
 * @example
 * ```typescript
 * const mode: GameMode = "ranked";
 * if (mode === "ranked") {
 *   // Show rating changes
 * }
 * ```
 */
export type GameMode = "ranked" | "casual" | "story";

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
 * Type guard to check if a string is a valid GameMode.
 *
 * @param value - The string to check
 * @returns True if the value is a valid GameMode
 *
 * @example
 * ```typescript
 * const userInput = "ranked";
 * if (isGameMode(userInput)) {
 *   // TypeScript knows userInput is GameMode here
 *   startGame(userInput);
 * }
 * ```
 */
export function isGameMode(value: string): value is GameMode {
  return ["ranked", "casual", "story"].includes(value);
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
