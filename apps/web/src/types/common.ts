/**
 * Common types used across the application.
 * Re-exported from @ltcg/core for frontend usage.
 */

export type {
  BaseHookReturn,
  HookWithError,
  MutationHookReturn,
  ActionResult,
  PaginationState,
  Visibility,
  TournamentStatus,
  MatchMode,
  LobbyMode,
  DatabaseGameMode,
  LeaderboardType,
  GameMode,
  PlayerStatus,
  SortOption,
} from "@ltcg/core/types";

export {
  isLobbyMode,
  isDatabaseGameMode,
  isLeaderboardType,
  isGameMode,
  isPlayerStatus,
  isSortOption,
} from "@ltcg/core/types";
