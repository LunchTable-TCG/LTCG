"use client";

import { apiAny } from "@/lib/convexHelpers";
import { usePrivy } from "@privy-io/react-auth";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

interface AuthGuardProps {
  children: ReactNode;
  /** If true, redirects to login when not authenticated. Default: true */
  requireAuth?: boolean;
  /** If true, requires username to be set. Default: true */
  requireUsername?: boolean;
}

type AuthState =
  | "loading" // Privy or Convex still initializing
  | "unauthenticated" // Not logged in
  | "syncing" // Convex verified, creating/fetching user
  | "needs_username" // User exists but no username
  | "authenticated"; // Fully ready

/**
 * Central authentication state machine component.
 * Handles the entire auth lifecycle from login to fully authenticated.
 *
 * State flow:
 * 1. loading - Waiting for Privy/Convex to initialize
 * 2. unauthenticated - User not logged in
 * 3. syncing - JWT verified, creating user in DB
 * 4. needs_username - User exists but needs to set username
 * 5. authenticated - Fully ready, render children
 */
export function AuthGuard({
  children,
  requireAuth = true,
  requireUsername = true,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Auth providers state
  const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy();
  const { isAuthenticated: convexAuthenticated, isLoading: convexLoading } = useConvexAuth();

  // User data - only query when Convex is authenticated
  const currentUser = useQuery(apiAny.core.users.currentUser, convexAuthenticated ? {} : "skip");

  // Mutation to create user - useRef to prevent re-creation on every render
  const createOrGetUser = useMutation(apiAny.auth.syncUser.createOrGetUser);
  const syncInProgress = useRef(false);
  const syncCompleted = useRef(false);

  // Derive auth state from all sources
  const authState = deriveAuthState({
    privyReady,
    privyAuthenticated,
    convexLoading,
    convexAuthenticated,
    currentUser,
    syncCompleted: syncCompleted.current,
  });

  // Handle user sync when needed - auto-create user in DB
  useEffect(() => {
    async function syncUser() {
      // Only sync if:
      // 1. Convex is authenticated (JWT verified)
      // 2. User query returned null (no user in DB)
      // 3. Not already syncing
      // 4. Not already completed sync this session
      if (
        convexAuthenticated &&
        currentUser === null &&
        !syncInProgress.current &&
        !syncCompleted.current
      ) {
        syncInProgress.current = true;
        try {
          await createOrGetUser({});
          syncCompleted.current = true;
        } catch (error) {
          console.error("[AuthGuard] Failed to sync user:", error);
          // Don't set syncCompleted - allow retry on next render
        } finally {
          syncInProgress.current = false;
        }
      }
    }

    syncUser();
  }, [convexAuthenticated, currentUser, createOrGetUser]);

  // Handle redirects based on state
  useEffect(() => {
    if (authState === "unauthenticated" && requireAuth) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }

    if (authState === "needs_username" && requireUsername) {
      router.replace("/setup-username");
    }
  }, [authState, requireAuth, requireUsername, router, pathname]);

  // Render based on state
  if (authState === "loading" || authState === "syncing") {
    return <AuthLoadingScreen message={getLoadingMessage(authState)} />;
  }

  if (authState === "unauthenticated" && requireAuth) {
    return <AuthLoadingScreen message="Redirecting to login..." />;
  }

  if (authState === "needs_username" && requireUsername) {
    return <AuthLoadingScreen message="Completing setup..." />;
  }

  return <>{children}</>;
}

function deriveAuthState(params: {
  privyReady: boolean;
  privyAuthenticated: boolean;
  convexLoading: boolean;
  convexAuthenticated: boolean;
  currentUser: unknown;
  syncCompleted: boolean;
}): AuthState {
  const {
    privyReady,
    privyAuthenticated,
    convexLoading,
    convexAuthenticated,
    currentUser,
    syncCompleted,
  } = params;

  // Stage 1: Still initializing
  if (!privyReady || convexLoading) {
    return "loading";
  }

  // Stage 2: Not logged in
  if (!privyAuthenticated) {
    return "unauthenticated";
  }

  // Stage 3: Privy authenticated, waiting for Convex
  if (!convexAuthenticated) {
    return "loading";
  }

  // Stage 4: Convex authenticated, but user query still loading
  if (currentUser === undefined) {
    return "loading";
  }

  // Stage 5: No user in DB yet - need to create
  if (currentUser === null && !syncCompleted) {
    return "syncing";
  }

  // Stage 6: User exists but no username
  if (
    currentUser &&
    typeof currentUser === "object" &&
    "username" in currentUser &&
    !currentUser.username
  ) {
    return "needs_username";
  }

  // Stage 7: Fully authenticated
  return "authenticated";
}

function getLoadingMessage(state: AuthState): string {
  switch (state) {
    case "loading":
      return "Entering the halls...";
    case "syncing":
      return "Setting up your account...";
    default:
      return "Loading...";
  }
}

function AuthLoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0a09]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
        <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">{message}</p>
      </div>
    </div>
  );
}
