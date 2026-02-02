/**
 * React Query hook for fetching AI decision history
 *
 * Polls every 5 seconds to show real-time decision stream
 */

import { useQuery } from '@tanstack/react-query';
import type { Decision } from '../types/panel';

interface DecisionHistoryResponse {
  decisions: Decision[];
}

/**
 * Fetch decision history from the API
 */
async function fetchDecisionHistory(
  agentId: string,
  gameId: string,
  limit: number = 20
): Promise<DecisionHistoryResponse> {
  const response = await fetch(
    `/api/ltcg/decisions?agentId=${encodeURIComponent(agentId)}&gameId=${encodeURIComponent(gameId)}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch decision history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch and poll decision history
 */
export function useDecisionHistory(agentId: string, gameId: string | null, limit: number = 20) {
  return useQuery({
    queryKey: ['ltcg', 'decisions', agentId, gameId, limit],
    queryFn: () => fetchDecisionHistory(agentId, gameId!, limit),
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 4000, // Consider data stale after 4 seconds
    enabled: !!agentId && !!gameId,
  });
}
