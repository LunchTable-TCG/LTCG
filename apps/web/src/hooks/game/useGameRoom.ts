"use client";

import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useGameRoom(lobbyId: Id<"gameLobbies">) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const currentUser = useConvexQuery(
    typedApi.core.users.currentUser,
    isAuthenticated ? {} : "skip"
  );

  // Get lobby details to check if user is a player
  const lobby = useConvexQuery(typedApi.gameplay.games.queries.getLobbyDetails, {
    lobbyId,
  });

  // Get game state to check if game exists
  const gameState = useConvexQuery(
    typedApi.gameplay.games.queries.getGameStateForPlayer,
    lobby ? { lobbyId } : "skip"
  );

  // Redirect to lunchtable if game doesn't exist or is closed
  useEffect(() => {
    if (gameState === null || lobby === null) {
      router.push("/lunchtable");
    }
  }, [gameState, lobby, router]);

  const isLoading = !currentUser || lobby === undefined || gameState === undefined;

  const isPlayer =
    lobby &&
    currentUser &&
    (lobby.hostId === currentUser._id || lobby.opponentId === currentUser._id);

  return {
    currentUser,
    lobby,
    gameState,
    isLoading,
    isPlayer,
  };
}
