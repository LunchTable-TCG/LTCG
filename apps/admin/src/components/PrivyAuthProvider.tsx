"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";

// Suppress Privy SDK hydration warnings (their modal has <div> inside <p>)
function useSuppressPrivyHydrationWarnings() {
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const message = typeof args[0] === "string" ? args[0] : "";
      if (
        message.includes("cannot be a descendant of") ||
        message.includes("cannot contain a nested")
      ) {
        return;
      }
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);
}

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  useSuppressPrivyHydrationWarnings();

  // Only render PrivyProvider on client side to avoid SSG/SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR/SSG, render children without Privy wrapper
  // This prevents the "invalid Privy app ID" error during static generation
  if (!mounted) {
    return <>{children}</>;
  }

  const appId = process.env["NEXT_PUBLIC_PRIVY_APP_ID"];
  if (!appId) {
    console.error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
    return <>{children}</>;
  }

  // ZAuth-inspired emerald/teal accent color
  const accentColor = "#34d399"; // emerald-400

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Login configuration - email only for admin
        loginMethods: ["email"],
        // No embedded wallets needed for admin dashboard
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
        // Appearance - dynamic theme matching app theme
        appearance: {
          theme: resolvedTheme === "light" ? "light" : "dark",
          accentColor,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
