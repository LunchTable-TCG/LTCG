"use client";

/**
 * Convex Provider
 *
 * Wraps the app with Convex client and Privy authentication.
 * Uses ConvexProviderWithAuth to bridge Privy JWTs to Convex.
 */

import { usePrivyAuthForConvex } from "@/hooks/usePrivyAuthForConvex";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";

interface ConvexClientProviderProps {
  children: ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error(
        "NEXT_PUBLIC_CONVEX_URL is not set. " +
          "Make sure .env.local exists with your Convex deployment URL."
      );
    }
    return new ConvexReactClient(url);
  }, []);

  return (
    <ConvexProviderWithAuth client={convex} useAuth={usePrivyAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}
