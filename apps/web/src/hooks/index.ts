/**
 * Hooks Barrel Export
 *
 * Centralized export for all custom hooks organized by domain.
 * Import any hook with: import { useHookName } from "@/hooks"
 */

// Auth Hooks
export { useSession } from "./auth/useSession";

// Game Hooks
export { useGameLobby } from "./game/useGameLobby";
export { useGameState } from "./game/useGameState";
export { useSpectator } from "./game/useSpectator";
export { useMatchmaking } from "./game/useMatchmaking";

// Collection Hooks
export { useDeckBuilder } from "./collection/useDeckBuilder";
export { useCardBinder } from "./collection/useCardBinder";

// Economy Hooks
export { useCurrency } from "./economy/useCurrency";
export { useShop } from "./economy/useShop";
export { useMarketplace } from "./economy/useMarketplace";
export { usePromoCode } from "./economy/usePromoCode";

// Social Hooks
export { useGlobalChat } from "./social/useGlobalChat";
export { usePresence } from "./social/usePresence";
export { useLeaderboard } from "./social/useLeaderboard";
export { useProfile } from "./social/useProfile";
export { useFriends } from "./social/useFriends";

// Story Hooks
export { useStoryProgress } from "./story/useStoryProgress";
export { usePlayerXP } from "./story/usePlayerXP";
export { useBadges } from "./story/useBadges";
