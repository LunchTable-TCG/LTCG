/**
 * React Query hook for fetching matchmaking status
 *
 * Polls every 5 seconds to track auto-matchmaking activity
 */

import { useQuery } from '@tanstack/react-query';
import type { MatchmakingStatus } from '../types/panel';

/**
 * Fetch matchmaking status from the API
 */
async function fetchMatchmakingStatus(agentId: string): Promise<MatchmakingStatus> {
  const response = await fetch(`/api/ltcg/matchmaking?agentId=${encodeURIComponent(agentId)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch matchmaking status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch and poll matchmaking status
 */
export function useMatchmakingStatus(agentId: string) {
  return useQuery({
    queryKey: ['ltcg', 'matchmaking', agentId],
    queryFn: () => fetchMatchmakingStatus(agentId),
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 4000, // Consider data stale after 4 seconds
    enabled: !!agentId,
  });
}
