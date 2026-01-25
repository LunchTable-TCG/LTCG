"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

/**
 * useGameState Hook
 *
 * Manages game state and reconnection functionality.
 * Provides:
 * - Reconnection detection (checkForActiveGame)
 * - Game state retrieval (secure, sanitized)
 * - Surrender functionality
 */
export function useGameState(lobbyId?: Id<"gameLobbies">) {
  const { token } = useAuth();

  // Check for active game (reconnection)
  const activeGame = useQuery(
    api.games.checkForActiveGame,
    token ? { token } : "skip"
  );

  // Get detailed game state
  const gameState = useQuery(
    api.games.getGameStateForPlayer,
    token && lobbyId ? { token, lobbyId } : "skip"
  );

  // Game actions
  const surrenderMutation = useMutation(api.games.surrenderGame);

  const surrender = async () => {
    if (!token || !lobbyId) throw new Error("No active game");
    try {
      await surrenderMutation({ token, lobbyId });
      toast.info("You surrendered the game");
    } catch (error: any) {
      toast.error(error.message || "Failed to surrender");
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
