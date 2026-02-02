"use client";

import { usePrivyAuthForConvex } from "@/hooks/auth/usePrivyAuthForConvex";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={usePrivyAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}
