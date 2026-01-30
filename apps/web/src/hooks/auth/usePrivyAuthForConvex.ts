"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect } from "react";

/**
 * Hook that bridges Privy authentication to Convex
 * This is passed to ConvexProviderWithAuth to enable authenticated Convex calls
 */
export function usePrivyAuthForConvex() {
  const { ready, authenticated, getAccessToken } = usePrivy();

  // Debug: log auth state changes
  useEffect(() => {
    console.log("[CONVEX AUTH] State:", { ready, authenticated });
  }, [ready, authenticated]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      console.log("[CONVEX AUTH] fetchAccessToken called:", { forceRefreshToken, ready, authenticated });

      if (!authenticated) {
        console.log("[CONVEX AUTH] Not authenticated, returning null");
        return null;
      }

      try {
        const token = await getAccessToken();
        if (token) {
          console.log("[CONVEX AUTH] Token obtained, length:", token.length);
          // Decode and log claims (without signature)
          try {
            const parts = token.split(".");
            if (parts[1]) {
              const payload = JSON.parse(atob(parts[1]));
              console.log("[CONVEX AUTH] Token claims:", {
                iss: payload.iss,
                aud: payload.aud,
                sub: payload.sub?.substring(0, 20) + "...",
                exp: new Date(payload.exp * 1000).toISOString(),
              });
            }
          } catch {
            console.log("[CONVEX AUTH] Could not decode token payload");
          }
        } else {
          console.log("[CONVEX AUTH] getAccessToken returned null/undefined");
        }
        return token;
      } catch (err) {
        console.error("[CONVEX AUTH] Error getting access token:", err);
        return null;
      }
    },
    [getAccessToken, ready, authenticated]
  );

  return {
    isLoading: !ready,
    isAuthenticated: authenticated,
    fetchAccessToken,
  };
}
