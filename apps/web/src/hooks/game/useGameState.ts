"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { handleHookError } from "@/lib/errorHandling";
import { useAuth } from "../auth/useConvexAuthHook";

interface UseGameStateReturn {
  hasActiveGame: boolean;
  activeGameInfo: ReturnType<typeof useQuery<typeof api.games.checkForActiveGame>> | undefined;
  gameState: ReturnType<typeof useQuery<typeof api.games.getGameStateForPlayer>> | undefined;
  isLoading: boolean;
  surrender: () => Promise<void>;
}

/**
 * Game state management with reconnection support.
 *
 * Handles game state retrieval and provides reconnection detection for players
 * who refresh the page or disconnect during a game. Also provides surrender
 * functionality for active games.
 *
 * Features:
 * - Check for active games (reconnection)
 * - Retrieve secure, sanitized game state
 * - Surrender active games
 * - Automatic active game detection on mount
 *
 * @example
 * ```typescript
 * // Check for reconnection
 * const { hasActiveGame, activeGameInfo } = useGameState();
 *
 * if (hasActiveGame && activeGameInfo) {
 *   // Redirect to game
 *   router.push(`/game/${activeGameInfo.lobbyId}`);
 * }
 *
 * // In game component
 * const { gameState, surrender } = useGameState(lobbyId);
 *
 * // Surrender
 * await surrender();
 * ```
 *
 * @param lobbyId - Optional lobby ID to get detailed game state
 *
 * @returns {UseGameStateReturn} Game state interface
 *
 * @throws {Error} When user is not authenticated or no active game
 */
export function useGameState(lobbyId?: Id<"gameLobbies">): UseGameStateReturn {
  const { isAuthenticated } = useAuth();

  // Check for active game (reconnection)
  const activeGame = useQuery(api.games.checkForActiveGame, isAuthenticated ? {} : "skip");

  // Get detailed game state
  const gameState = useQuery(
    api.games.getGameStateForPlayer,
    isAuthenticated && lobbyId ? { lobbyId } : "skip"
  );

  // Game actions
  const surrenderMutation = useMutation(api.games.surrenderGame);

  const surrender = async () => {
    if (!isAuthenticated || !lobbyId) throw new Error("No active game");
    try {
      await surrenderMutation({ lobbyId });
      toast.info("You surrendered the game");
    } catch (error) {
      const message = handleHookError(error, "Failed to surrender");
      toast.error(message);
      throw error;
    }
  };

  return {
    // Reconnection
    hasActiveGame: activeGame?.hasActiveGame || false,
    activeGameInfo: activeGame,

    // Current game
    gameState,
    isLoading: gameState === undefined,

    // Actions
    surrender,
  };
}
