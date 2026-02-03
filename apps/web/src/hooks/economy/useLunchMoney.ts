"use client";

/**
 * LunchMoney Hook
 *
 * Unified economy dashboard data hook combining balances, listings,
 * and transaction history for the LunchMoney page.
 */

import { typedApi, useTypedMutation, useTypedQuery } from "@/lib/convexTypedHelpers";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

interface UseLunchMoneyReturn {
  // Balances
  gold: number;
  gems: number;
  lifetimeGoldEarned: number;
  lifetimeGoldSpent: number;
  lifetimeGemsEarned: number;
  lifetimeGemsSpent: number;

  // Token
  tokenBalance: number;
  tokenBalanceStale: boolean;
  walletAddress: string | undefined;
  lastTokenUpdate: number | undefined;

  // Listings
  goldListings: any[];
  tokenListings: any[];
  pendingPurchases: any[];
  activeListingsCount: number;

  // Market overview
  marketOverview: {
    activeListings: number;
    totalSold: number;
    volumeToday: number;
    volumeThisWeek: number;
    goldVolumeToday: number;
    tokenVolumeToday: number;
    averageListingPrice: number;
  } | null;

  // Loading states
  isLoading: boolean;
  isTokenLoading: boolean;

  // Actions
  refreshTokenBalance: () => Promise<void>;
  cancelGoldListing: (listingId: string) => Promise<void>;
  cancelTokenListing: (listingId: string) => Promise<void>;
}

/**
 * Unified economy data for the LunchMoney dashboard.
 *
 * Combines all economy-related data into a single hook for the LunchMoney page.
 * Provides balances, active listings, market overview, and management actions.
 *
 * @example
 * ```tsx
 * const {
 *   gold,
 *   gems,
 *   tokenBalance,
 *   goldListings,
 *   tokenListings,
 *   marketOverview,
 *   isLoading,
 * } = useLunchMoney();
 *
 * return (
 *   <div>
 *     <p>Gold: {gold.toLocaleString()}</p>
 *     <p>LTCG: {tokenBalance}</p>
 *     <p>Active Listings: {goldListings.length + tokenListings.length}</p>
 *   </div>
 * );
 * ```
 */
export function useLunchMoney(): UseLunchMoneyReturn {
  const { isAuthenticated } = useAuth();

  // Balance queries
  const balance = useTypedQuery(typedApi.economy.getPlayerBalance, isAuthenticated ? {} : "skip");
  const tokenData = useTypedQuery(
    typedApi.economy.tokenBalance.getTokenBalance,
    isAuthenticated ? {} : "skip"
  );

  // Listings queries
  const goldListings = useTypedQuery(
    typedApi.economy.marketplace.getUserListings,
    isAuthenticated ? {} : "skip"
  );
  const tokenListingsData = useTypedQuery(
    typedApi.economy.tokenMarketplace.getUserTokenListings,
    isAuthenticated ? {} : "skip"
  );
  const pendingPurchases = useTypedQuery(
    typedApi.economy.tokenMarketplace.getUserPendingPurchases,
    isAuthenticated ? {} : "skip"
  );

  // Market overview
  const marketOverview = useTypedQuery(typedApi.economy.priceHistory.getMarketOverview, {});

  // Mutations
  const refreshBalanceMutation = useTypedMutation(
    typedApi.economy.tokenBalance.requestBalanceRefresh
  );
  const cancelGoldListingMutation = useTypedMutation(typedApi.economy.marketplace.cancelListing);
  const cancelTokenListingMutation = useTypedMutation(
    typedApi.economy.tokenMarketplace.cancelTokenListing
  );

  // Actions
  const refreshTokenBalance = async () => {
    try {
      await refreshBalanceMutation({});
      toast.success("Token balance refreshed");
    } catch (_error) {
      toast.error("Failed to refresh balance");
    }
  };

  const cancelGoldListing = async (listingId: string) => {
    try {
      await cancelGoldListingMutation({ listingId });
      toast.success("Listing cancelled");
    } catch (_error) {
      toast.error("Failed to cancel listing");
    }
  };

  const cancelTokenListing = async (listingId: string) => {
    try {
      await cancelTokenListingMutation({ listingId });
      toast.success("Token listing cancelled");
    } catch (_error) {
      toast.error("Failed to cancel listing");
    }
  };

  // Combine listings
  const allGoldListings = goldListings ?? [];
  const allTokenListings = tokenListingsData?.listings ?? [];

  return {
    // Balances
    gold: balance?.gold ?? 0,
    gems: balance?.gems ?? 0,
    lifetimeGoldEarned: balance?.lifetimeGoldEarned ?? 0,
    lifetimeGoldSpent: balance?.lifetimeGoldSpent ?? 0,
    lifetimeGemsEarned: balance?.lifetimeGemsEarned ?? 0,
    lifetimeGemsSpent: balance?.lifetimeGemsSpent ?? 0,

    // Token
    tokenBalance: tokenData?.balance ?? 0,
    tokenBalanceStale: tokenData?.isStale ?? false,
    walletAddress: tokenData?.walletAddress,
    lastTokenUpdate: tokenData?.lastVerifiedAt,

    // Listings
    goldListings: allGoldListings,
    tokenListings: allTokenListings,
    pendingPurchases: pendingPurchases ?? [],
    activeListingsCount: allGoldListings.length + allTokenListings.length,

    // Market overview
    marketOverview: marketOverview ?? null,

    // Loading states
    isLoading: balance === undefined,
    isTokenLoading: tokenData === undefined,

    // Actions
    refreshTokenBalance,
    cancelGoldListing,
    cancelTokenListing,
  };
}
