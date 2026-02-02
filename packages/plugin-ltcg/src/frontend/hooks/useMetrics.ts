/**
 * React Query hook for fetching performance metrics
 *
 * Polls every 10 seconds to track agent performance
 */

import { useQuery } from '@tanstack/react-query';
import type { AgentMetrics } from '../types/panel';

/**
 * Fetch performance metrics from the API
 */
async function fetchMetrics(agentId: string): Promise<AgentMetrics> {
  const response = await fetch(`/api/ltcg/metrics?agentId=${encodeURIComponent(agentId)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch and poll performance metrics
 */
export function useMetrics(agentId: string) {
  return useQuery({
    queryKey: ['ltcg', 'metrics', agentId],
    queryFn: () => fetchMetrics(agentId),
    refetchInterval: 10000, // Poll every 10 seconds (less frequent than other hooks)
    staleTime: 9000, // Consider data stale after 9 seconds
    enabled: !!agentId,
  });
}
