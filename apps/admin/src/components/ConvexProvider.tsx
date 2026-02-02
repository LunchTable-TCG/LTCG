"use client";

/**
 * Convex Provider
 *
 * Wraps the app with Convex Auth client for real-time data and authentication.
 * Uses ConvexAuthProvider to enable password authentication.
 */

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
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

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
