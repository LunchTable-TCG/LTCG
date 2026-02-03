"use client";

import { apiAny } from "@/lib/convexHelpers";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

interface AuthGuardProps {
  children: ReactNode;
  /** If true, redirects to login when not authenticated. Default: true */
  requireAuth?: boolean;
  /** If true, requires complete onboarding (username + deck). Default: true */
  requireOnboarding?: boolean;
}

type AuthState =
  | "loading" // Privy or Convex still initializing
  | "unauthenticated" // Not logged in
  | "syncing" // Convex verified, creating/fetching user
  | "needs_onboarding" // User exists but missing username or starter deck
  | "authenticated"; // Fully ready

/**
 * Check if a wallet is a Privy embedded wallet
 */
function isPrivyEmbeddedWallet(wallet: {
  standardWallet: { name?: string; isPrivyWallet?: boolean };
}) {
  const standardWallet = wallet.standardWallet;
  if ("isPrivyWallet" in standardWallet && standardWallet.isPrivyWallet) {
    return true;
  }
  if (standardWallet.name?.toLowerCase().includes("privy")) {
    return true;
  }
  return false;
}

/**
 * Central authentication state machine component.
 * Handles the entire auth lifecycle from login to fully authenticated.
 *
 * State flow:
 * 1. loading - Waiting for Privy/Convex to initialize
 * 2. unauthenticated - User not logged in
 * 3. syncing - JWT verified, creating user in DB + auto-syncing wallet
 * 4. needs_onboarding - User exists but needs username or starter deck
 * 5. authenticated - Fully ready, render children
 */
export function AuthGuard({
  children,
  requireAuth = true,
  requireOnboarding = true,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Auth providers state
  const { ready: privyReady, authenticated: privyAuthenticated, user: privyUser } = usePrivy();
  const { isAuthenticated: convexAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const { wallets, ready: walletsReady } = useWallets();

  // Find embedded wallet for auto-sync
  const embeddedWallet = wallets.find((w) => isPrivyEmbeddedWallet(w));

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
    walletsReady,
    currentUser,
    syncCompleted: syncCompleted.current,
  });

  // Handle user sync when needed - auto-create user in DB with wallet
  useEffect(() => {
    async function syncUser() {
      // Only sync if:
      // 1. Convex is authenticated (JWT verified)
      // 2. Wallets are ready (to capture embedded wallet)
      // 3. User query returned null (no user in DB)
      // 4. Not already syncing
      // 5. Not already completed sync this session
      if (
        convexAuthenticated &&
        walletsReady &&
        currentUser === null &&
        !syncInProgress.current &&
        !syncCompleted.current
      ) {
        syncInProgress.current = true;
        try {
          // Auto-sync wallet during user creation
          await createOrGetUser({
            email: privyUser?.email?.address,
            walletAddress: embeddedWallet?.address,
            walletType: embeddedWallet ? "privy_embedded" : undefined,
          });
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
  }, [convexAuthenticated, walletsReady, currentUser, createOrGetUser, embeddedWallet, privyUser]);

  // Handle redirects based on state
  useEffect(() => {
    if (authState === "unauthenticated" && requireAuth) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }

    if (authState === "needs_onboarding" && requireOnboarding) {
      router.replace("/onboarding");
    }
  }, [authState, requireAuth, requireOnboarding, router, pathname]);

  // Render based on state
  if (authState === "loading" || authState === "syncing") {
    return <AuthLoadingScreen message={getLoadingMessage(authState)} />;
  }

  if (authState === "unauthenticated" && requireAuth) {
    return <AuthLoadingScreen message="Redirecting to login..." />;
  }

  if (authState === "needs_onboarding" && requireOnboarding) {
    return <AuthLoadingScreen message="Completing setup..." />;
  }

  return <>{children}</>;
}

function deriveAuthState(params: {
  privyReady: boolean;
  privyAuthenticated: boolean;
  convexLoading: boolean;
  convexAuthenticated: boolean;
  walletsReady: boolean;
  currentUser: unknown;
  syncCompleted: boolean;
}): AuthState {
  const {
    privyReady,
    privyAuthenticated,
    convexLoading,
    convexAuthenticated,
    walletsReady,
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

  // Stage 3: Privy authenticated, waiting for Convex or wallets
  if (!convexAuthenticated || !walletsReady) {
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

  // Stage 6: User exists but missing username OR starter deck
  if (currentUser && typeof currentUser === "object") {
    const user = currentUser as { username?: string; activeDeckId?: string };
    if (!user.username || !user.activeDeckId) {
      return "needs_onboarding";
    }
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
