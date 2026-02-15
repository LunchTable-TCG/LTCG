"use client";

import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/cards";
import type { MarketListing } from "@/types/shop";
import { Clock, Coins, Package } from "lucide-react";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-slate-600",
  uncommon: "text-emerald-700",
  rare: "text-blue-700",
  epic: "text-purple-700",
  legendary: "text-amber-700",
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
        "group relative p-3 rounded-none border-[3px] border-black bg-white transition-all cursor-pointer text-left w-full h-full flex flex-col overflow-hidden",
        isSelected
          ? "ring-4 ring-black ring-offset-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px] z-10"
          : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          "absolute top-2 right-2 z-10 px-2 py-0.5 border-2 border-black text-[10px] uppercase font-black tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
          listing.listingType === "auction"
            ? "bg-orange-400 text-black"
            : "bg-emerald-400 text-black"
        )}
      >
        {listing.listingType === "auction" ? "Auction" : "Buy Now"}
      </span>

      <div className="aspect-3/4 bg-slate-100 border-2 border-black mb-3 flex items-center justify-center p-4 group-hover:bg-slate-50 transition-colors">
        <Package className="w-12 h-12 text-black/20 group-hover:text-black/40 transition-colors" />
      </div>

      <p className="font-bold text-sm text-black truncate mb-1 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
        {listing.cardName}
      </p>
      <p
        className={cn(
          "text-xs mb-3 font-black uppercase tracking-wider",
          RARITY_COLORS[listing.cardRarity]
        )}
      >
        {listing.cardRarity}
      </p>

      <div className="flex items-center justify-between mt-auto pt-2 border-t-2 border-black/10">
        <div className="flex items-center gap-1.5 bg-yellow-400/20 px-2 py-1 rounded border border-black/10">
          <Coins className="w-3.5 h-3.5 text-black" />
          <span className="font-black text-black">
            {(listing.currentBid || listing.price).toLocaleString()}
          </span>
        </div>

        {listing.listingType === "auction" && listing.endsAt && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-black uppercase bg-slate-200 px-1.5 py-0.5 border border-black/20">
            <Clock className="w-3 h-3" />
            {formatTimeRemaining(listing.endsAt)}
          </div>
        )}
      </div>

      {listing.listingType === "auction" && listing.bidCount !== undefined && (
        <p className="text-[10px] font-mono text-black/50 mt-1 text-right">
          {listing.bidCount} bids
        </p>
      )}
    </button>
  );
}
