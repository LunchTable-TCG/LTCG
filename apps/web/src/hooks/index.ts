/**
 * Hooks Barrel Export
 *
 * Centralized export for all custom hooks organized by domain.
 * Import any hook with: import { useHookName } from "@/hooks"
 */

// Shared Types
export type {
  BaseHookReturn,
  HookWithError,
  MutationHookReturn,
  ActionResult,
  PaginationState,
  SortOption,
  CardDisplay,
  DeckDisplay,
  UserProfileSummary,
  GameMode,
  PlayerStatus,
} from "@/types";
export { isSortOption, isGameMode, isPlayerStatus } from "@/types";

// Auth Hooks
// Use usePrivy, useLogin, useLogout from "@privy-io/react-auth" for authentication
// User data is synced to Convex via auth/syncUser mutations

// Game Hooks
export { useGameLobby } from "./game/useGameLobby";
export { useGameState } from "./game/useGameState";
export { useSpectator } from "./game/useSpectator";
export { useMatchmaking } from "./game/useMatchmaking";

// Collection Hooks
export { useDeckBuilder, useDeck, useValidateDeck } from "./collection/useDeckBuilder";
export { useCardBinder } from "./collection/useCardBinder";

// Economy Hooks
export { useCurrency } from "./economy/useCurrency";
export { useShop } from "./economy/useShop";
export { useMarketplace } from "./economy/useMarketplace";
export { usePromoCode } from "./economy/usePromoCode";
export { useTokenBalance } from "./economy/useTokenBalance";

// Social Hooks
export { useGlobalChat } from "./social/useGlobalChat";
export { usePresence } from "./social/usePresence";
export { useLeaderboard } from "./social/useLeaderboard";
export { useProfile } from "./social/useProfile";
export { useFriends, useSearchUsers } from "./social/useFriends";
export { usePlayerCard } from "./social/usePlayerCard";
export { useTournaments, useTournament, useTournamentHistory } from "./social/useTournament";
export type {
  TournamentStatus,
  TournamentMode,
  ParticipantStatus,
  MatchStatus,
  TournamentPrizePool,
  TournamentSummary,
  TournamentDetails,
  TournamentParticipant,
  TournamentMatch,
  TournamentRound,
  TournamentBracket,
  TournamentHistoryEntry,
  UserTournamentStats,
} from "./social/useTournament";

// Story Hooks
export { useStoryProgress } from "./story/useStoryProgress";
export { usePlayerXP } from "./story/usePlayerXP";
export { useBadges } from "./story/useBadges";

// Progression Hooks
export { useQuests } from "./progression/useQuests";
export { useAchievements } from "./progression/useAchievements";
export { useNotifications } from "./progression/useNotifications";
export { useBattlePass } from "./progression/useBattlePass";

// Wallet Hooks
export { useGameWallet } from "./wallet/useGameWallet";
export type { UseGameWalletReturn, WalletType } from "./wallet/useGameWallet";
