"use client";

import { toast } from "sonner";

/**
 * useMatchmaking Hook (PLACEHOLDER)
 *
 * Quick match queue functionality.
 * TODO: Backend API not yet implemented
 * Expected: api.matchmaking.joinQueue, api.matchmaking.leaveQueue
 */
export function useMatchmaking() {
  // TODO: Implement when backend API is ready

  return {
    isInQueue: false,
    queuePosition: null,
    estimatedWaitTime: null,
    joinQueue: async () => {
      toast.info("Quick match coming soon!");
    },
    leaveQueue: async () => {
      // No-op
    },
  };
}
