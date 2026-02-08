"use client";

import { Button } from "@/components/ui/button";
import { getAssetUrl } from "@/lib/blob";
import { cn } from "@/lib/utils";
import { Clock, Coins, Gavel, Loader2, Package, Wallet, X } from "lucide-react";
import Image from "next/image";

interface Listing {
  _id: string;
  listingType: "fixed" | "auction";
  cardDefinitionId: string;
  cardName?: string;
  cardRarity?: string;
  cardImageUrl?: string;
  quantity: number;
  price: number;
  tokenPrice?: number;
  currencyType?: "gold" | "token";
  currentBid?: number;
  bidCount?: number;
  endsAt?: number;
  createdAt: number;
}

interface MyListingsProps {
  goldListings: Listing[];
  tokenListings: Listing[];
  pendingPurchases: unknown[];
  onCancelGoldListing: (listingId: string) => Promise<void>;
  onCancelTokenListing: (listingId: string) => Promise<void>;
  isLoading?: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-400 border-gray-400/30",
  uncommon: "text-green-400 border-green-400/30",
  rare: "text-blue-400 border-blue-400/30",
  epic: "text-purple-400 border-purple-400/30",
  legendary: "text-yellow-400 border-yellow-400/30",
};

function formatTimeRemaining(endsAt: number) {
  const now = Date.now();
  const diffMs = endsAt - now;

  if (diffMs <= 0) return "Ended";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

function ListingCard({
  listing,
  onCancel,
  isToken,
}: {
  listing: Listing;
  onCancel: () => void;
  isToken: boolean;
}) {
  const isAuction = listing.listingType === "auction";
  const rarity = listing.cardRarity || "common";
  const rarityClass = RARITY_COLORS[rarity] ?? "text-gray-400 border-gray-400/30";
  const rarityParts = rarityClass.split(" ");
  const borderClass = rarityParts[1] ?? "border-[#3d2b1f]";
  const textClass = rarityParts[0] ?? "text-gray-400";

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-black/40 p-4 transition-all hover:border-[#5a3f2a]",
        borderClass
      )}
    >
      {/* Card Image */}
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#1a1512] mb-3">
        {listing.cardImageUrl ? (
          <Image
            src={getAssetUrl(listing.cardImageUrl)}
            alt={listing.cardName || "Card"}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-8 w-8 text-[#3d2b1f]" />
          </div>
        )}
        {/* Quantity Badge */}
        {listing.quantity > 1 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs font-medium text-[#e8e0d5]">
            x{listing.quantity}
          </div>
        )}
        {/* Listing Type Badge */}
        <div
          className={cn(
            "absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium",
            isAuction ? "bg-amber-500/20 text-amber-400" : "bg-primary/20 text-primary"
          )}
        >
          {isAuction ? <Gavel className="h-3 w-3 inline mr-1" /> : null}
          {isAuction ? "Auction" : "Fixed"}
        </div>
      </div>

      {/* Card Info */}
      <div className="space-y-2">
        <h3 className="font-medium text-[#e8e0d5] truncate">
          {listing.cardName || "Unknown Card"}
        </h3>
        <p className={cn("text-xs font-medium capitalize", textClass)}>
          {listing.cardRarity || "Common"}
        </p>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {isToken ? (
              <Wallet className="h-4 w-4 text-primary" />
            ) : (
              <Coins className="h-4 w-4 text-yellow-400" />
            )}
            <span className={cn("font-medium", isToken ? "text-primary" : "text-yellow-400")}>
              {isToken
                ? (listing.tokenPrice || 0).toLocaleString()
                : listing.price.toLocaleString()}
            </span>
          </div>
          {isAuction && listing.bidCount !== undefined && (
            <span className="text-xs text-[#a89f94]">{listing.bidCount} bids</span>
          )}
        </div>

        {/* Auction Info */}
        {isAuction && listing.endsAt && (
          <div className="flex items-center gap-1 text-xs text-[#a89f94]">
            <Clock className="h-3 w-3" />
            <span>{formatTimeRemaining(listing.endsAt)}</span>
            {listing.currentBid && (
              <span className="ml-auto text-amber-400">
                Current: {listing.currentBid.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Cancel Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="w-full mt-2 border-[#3d2b1f] text-[#a89f94] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
        >
          <X className="h-4 w-4 mr-1" />
          Cancel Listing
        </Button>
      </div>
    </div>
  );
}

export function MyListings({
  goldListings,
  tokenListings,
  pendingPurchases,
  onCancelGoldListing,
  onCancelTokenListing,
  isLoading,
}: MyListingsProps) {
  const allListings = [
    ...goldListings.map((l) => ({ ...l, isToken: false })),
    ...tokenListings.map((l) => ({ ...l, isToken: true })),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (allListings.length === 0 && pendingPurchases.length === 0) {
    return (
      <div className="rounded-xl border border-[#3d2b1f] bg-black/40 py-12 text-center">
        <Package className="h-12 w-12 mx-auto text-[#3d2b1f] mb-4" />
        <p className="text-[#a89f94]">No active listings</p>
        <p className="text-sm text-[#a89f94]/60 mt-1">
          List cards from your collection in the Shop
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Purchases Warning */}
      {pendingPurchases.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="h-5 w-5" />
            <span className="font-medium">Pending Purchases: {pendingPurchases.length}</span>
          </div>
          <p className="text-sm text-amber-400/70 mt-1">
            You have transactions awaiting confirmation on the blockchain.
          </p>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {allListings.map((listing) => (
          <ListingCard
            key={listing._id}
            listing={listing}
            isToken={listing.isToken}
            onCancel={() =>
              listing.isToken ? onCancelTokenListing(listing._id) : onCancelGoldListing(listing._id)
            }
          />
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-[#a89f94] pt-4 border-t border-[#3d2b1f]">
        <span>
          {allListings.length} active listing{allListings.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Coins className="h-4 w-4 text-yellow-400" />
            {goldListings.length} gold
          </span>
          <span className="flex items-center gap-1">
            <Wallet className="h-4 w-4 text-primary" />
            {tokenListings.length} token
          </span>
        </div>
      </div>
    </div>
  );
}
