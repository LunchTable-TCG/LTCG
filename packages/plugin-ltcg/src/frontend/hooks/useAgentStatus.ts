/**
 * React Query hook for fetching agent runtime status
 *
 * Polls every 5 seconds to keep status up-to-date
 */

import { useQuery } from '@tanstack/react-query';
import type { AgentStatus } from '../types/panel';

/**
 * Fetch agent status from the API
 */
async function fetchAgentStatus(agentId: string): Promise<AgentStatus> {
  const response = await fetch(`/api/ltcg/status?agentId=${encodeURIComponent(agentId)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch agent status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch and poll agent runtime status
 */
export function useAgentStatus(agentId: string) {
  return useQuery({
    queryKey: ['ltcg', 'status', agentId],
    queryFn: () => fetchAgentStatus(agentId),
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 4000, // Consider data stale after 4 seconds
    enabled: !!agentId,
  });
}
