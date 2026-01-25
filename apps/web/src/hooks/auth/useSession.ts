"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";

/**
 * useSession Hook
 *
 * Provides session utilities and validation.
 * Handles session retrieval and sign out functionality.
 */
export function useSession() {
  const { token, setToken } = useAuth();

  const session = useQuery(
    api.auth.getSession,
    token ? { token } : "skip"
  );

  const signOutMutation = useMutation(api.auth.signOut);

  const handleSignOut = async () => {
    try {
      if (token) {
        await signOutMutation({ token });
      }
    } finally {
      setToken(null);
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
  };

  return {
    session,
    isValid: !!session,
    signOut: handleSignOut,
  };
}
