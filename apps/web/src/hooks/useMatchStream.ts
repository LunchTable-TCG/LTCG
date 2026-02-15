import { usePrivy } from "@/hooks/auth/useConvexAuthHook";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

export function useMatchStream(lobbyId: Id<"gameLobbies">) {
  const { user } = usePrivy();
  const userId = user?.id;

  // 1. Fetch Match Metadata (Lobby)
  const meta = useQuery(api.ltcgGame.lobbies.getLobby, { lobbyId });

  // 2. Fetch Player View (Game State)
  // We only fetch this if we have a user ID. If not logged in, maybe fetch as spectator?
  // The query handles masking based on observerId.
  const gameState = useQuery(
    api.ltcgGame.states.getPlayerView,
    userId ? { lobbyId, observerId: userId } : "skip"
  );

  // 3. Fetch Event Log (for history/toast)
  const events = useQuery(api.ltcgGame.events.getEventsForLobby, { lobbyId, limit: 100 });

  // 4. Mutations
  const submitAction = useMutation(api.ltcgGame.gameplay.actions.submitAction); // Assuming this exists or will exist

  // Derived State
  const isHost = meta?.hostId === userId;
  const isOpponent = meta?.opponentId === userId;
  const isSpectator = !isHost && !isOpponent;
  const userSeat = isHost ? "host" : isOpponent ? "opponent" : "spectator";

  return {
    meta,
    gameState,
    events,
    isLoading: !meta || !gameState,
    isSpectator,
    userSeat,
    // Actions
    submitAction,
  };
}
