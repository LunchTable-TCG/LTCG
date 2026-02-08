"use client";

import { usePrivyAuthForConvex } from "@/hooks/auth/usePrivyAuthForConvex";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env["NEXT_PUBLIC_CONVEX_URL"];
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
}
const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={usePrivyAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}
