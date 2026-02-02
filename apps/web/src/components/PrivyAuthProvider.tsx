"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { type ReactNode, useEffect } from "react";

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
  useSuppressPrivyHydrationWarnings();
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        // Login configuration - email only as requested
        loginMethods: ["email"],
        // Embedded wallet configuration - auto-create Solana wallet
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        // Appearance - dark theme with gold accent to match game theme
        appearance: {
          theme: "dark",
          accentColor: "#d4af37", // Gold color matching LTCG branding
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
