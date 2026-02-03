"use client";

import { PrivyProvider } from "@privy-io/react-auth";
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
        // Appearance - dark theme for admin dashboard
        appearance: {
          theme: "dark",
          accentColor: "#6366f1", // Indigo for admin branding
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
