"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback } from "react";

/**
 * Hook that bridges Privy authentication to Convex
 * This is passed to ConvexProviderWithAuth to enable authenticated Convex calls
 */
export function usePrivyAuthForConvex() {
  const { ready, authenticated, getAccessToken } = usePrivy();

  const fetchAccessToken = useCallback(
    async (_options: { forceRefreshToken: boolean }) => {
      try {
        const token = await getAccessToken();
        return token;
      } catch {
        return null;
      }
    },
    [getAccessToken]
  );

  return {
    isLoading: !ready,
    isAuthenticated: authenticated,
    fetchAccessToken,
  };
}
