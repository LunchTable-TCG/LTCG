/**
 * React Query hook for fetching game state
 *
 * Polls every 5 seconds to keep game state up-to-date
 */

import { useQuery } from "@tanstack/react-query";
import type { GameSnapshot } from "../types/panel";

/**
 * Fetch game state from the API
 */
async function fetchGameState(agentId: string, gameId: string): Promise<GameSnapshot> {
  const response = await fetch(
    `/api/ltcg/game?agentId=${encodeURIComponent(agentId)}&gameId=${encodeURIComponent(gameId)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch game state: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch and poll game state
 */
export function useGameState(agentId: string, gameId: string | null) {
  return useQuery({
    queryKey: ["ltcg", "game", agentId, gameId],
    queryFn: () => fetchGameState(agentId, gameId!),
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 4000, // Consider data stale after 4 seconds
    enabled: !!agentId && !!gameId,
  });
}
