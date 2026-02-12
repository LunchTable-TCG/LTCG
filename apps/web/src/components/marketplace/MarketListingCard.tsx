"use client";

import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/cards";
import type { MarketListing } from "@/types/shop";
import { Clock, Coins, Package } from "lucide-react";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

interface MarketListingCardProps {
  listing: MarketListing;
  onSelect: () => void;
  isSelected: boolean;
  formatTimeRemaining: (endsAt: number) => string;
}

export function MarketListingCard({
  listing,
  onSelect,
  isSelected,
  formatTimeRemaining,
}: MarketListingCardProps) {
  return (
    <button
      type="button"
      data-testid="marketplace-card"
      className={cn(
        "relative p-3 rounded-xl border border-[#3d2b1f] bg-black/40 hover:bg-black/60 transition-all cursor-pointer text-left w-full",
        isSelected && "ring-2 ring-purple-500"
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          "absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-xs font-bold",
          listing.listingType === "auction" ? "bg-orange-600" : "bg-green-600"
        )}
      >
        {listing.listingType === "auction" ? "Auction" : "Buy Now"}
      </span>

      <div className="aspect-3/4 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mb-3">
        <Package className="w-12 h-12 text-purple-400/50" />
      </div>

      <p className="font-medium text-sm text-[#e8e0d5] truncate mb-1">{listing.cardName}</p>
      <p className={cn("text-xs mb-2", RARITY_COLORS[listing.cardRarity])}>{listing.cardRarity}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="font-bold text-yellow-300">
            {(listing.currentBid || listing.price).toLocaleString()}
          </span>
        </div>
        {listing.listingType === "auction" && listing.endsAt && (
          <div className="flex items-center gap-1 text-xs text-[#a89f94]">
            <Clock className="w-3 h-3" />
            {formatTimeRemaining(listing.endsAt)}
          </div>
        )}
      </div>

      {listing.listingType === "auction" && listing.bidCount !== undefined && (
        <p className="text-xs text-[#a89f94] mt-1">{listing.bidCount} bids</p>
      )}
    </button>
  );
}
