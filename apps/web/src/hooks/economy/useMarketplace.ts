"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

/**
 * useMarketplace Hook
 *
 * Marketplace operations for buying/selling cards:
 * - Browse listings
 * - Create/cancel listings
 * - Buy now purchases
 * - Place bids on auctions
 * - Claim auction wins
 */
export function useMarketplace() {
  const { token } = useAuth();

  // Queries
  const listings = useQuery(
    api.marketplace.getMarketplaceListings,
    {}
  );

  const myListings = useQuery(
    api.marketplace.getUserListings,
    token ? { token } : "skip"
  );

  // Mutations
  const createListingMutation = useMutation(api.marketplace.createListing);
  const cancelListingMutation = useMutation(api.marketplace.cancelListing);
  const buyNowMutation = useMutation(api.marketplace.buyNow);
  const placeBidMutation = useMutation(api.marketplace.placeBid);
  const claimAuctionMutation = useMutation(api.marketplace.claimAuctionWin);

  // Actions
  const createListing = async (params: {
    cardDefinitionId: Id<"cardDefinitions">;
    quantity: number;
    listingType: "fixed" | "auction";
    price: number;
    duration?: number;
  }) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const listingId = await createListingMutation({ token, ...params });
      toast.success("Listing created");
      return listingId;
    } catch (error: any) {
      toast.error(error.message || "Failed to create listing");
      throw error;
    }
  };

  const cancelListing = async (listingId: Id<"marketplaceListings">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await cancelListingMutation({ token, listingId });
      toast.success("Listing cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel listing");
      throw error;
    }
  };

  const buyNow = async (listingId: Id<"marketplaceListings">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const result = await buyNowMutation({ token, listingId });
      toast.success(`Purchased for ${result.price} gold`);
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to purchase");
      throw error;
    }
  };

  const placeBid = async (
    listingId: Id<"marketplaceListings">,
    bidAmount: number
  ) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await placeBidMutation({ token, listingId, bidAmount });
      toast.success(`Bid placed: ${bidAmount} gold`);
    } catch (error: any) {
      toast.error(error.message || "Failed to place bid");
      throw error;
    }
  };

  const claimAuction = async (listingId: Id<"marketplaceListings">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await claimAuctionMutation({ token, listingId });
      toast.success("Auction won! Cards added to your collection");
    } catch (error: any) {
      toast.error(error.message || "Failed to claim auction");
      throw error;
    }
  };

  return {
    listings,
    myListings,
    isLoading: listings === undefined,
    createListing,
    cancelListing,
    buyNow,
    placeBid,
    claimAuction,
  };
}
