"use client";

import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/cards";
import type { MarketListing } from "@/types/shop";
import { Clock, Coins, Package } from "lucide-react";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-slate-400",
  uncommon: "text-emerald-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
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
        "group relative p-3 rounded-xl border border-border bg-card/40 hover:bg-card/60 transition-all cursor-pointer text-left w-full h-full flex flex-col overflow-hidden",
        isSelected ? "ring-2 ring-primary border-primary bg-primary/10" : "hover:border-primary/50"
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          "absolute top-2 right-2 z-10 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider shadow-sm border",
          listing.listingType === "auction"
            ? "bg-orange-950/80 text-orange-400 border-orange-500/50"
            : "bg-emerald-950/80 text-emerald-400 border-emerald-500/50"
        )}
      >
        {listing.listingType === "auction" ? "Auction" : "Buy Now"}
      </span>

      <div className="aspect-3/4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3 border border-primary/20 group-hover:border-primary/40 transition-colors">
        <Package className="w-12 h-12 text-primary/40 group-hover:text-primary/60 transition-colors" />
      </div>
      <p className="font-bold text-sm text-foreground truncate mb-1 group-hover:text-primary transition-colors">
        {listing.cardName}
      </p>
      <p
        className={cn(
          "text-xs mb-3 font-medium uppercase tracking-wider",
          RARITY_COLORS[listing.cardRarity]
        )}
      >
        {listing.cardRarity}
      </p>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-bold text-primary">
            {(listing.currentBid || listing.price).toLocaleString()}
          </span>
        </div>
        {listing.listingType === "auction" && listing.endsAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-black/40 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />
            {formatTimeRemaining(listing.endsAt)}
          </div>
        )}
      </div>

      {listing.listingType === "auction" && listing.bidCount !== undefined && (
        <p className="text-xs text-muted-foreground mt-1 text-right">{listing.bidCount} bids</p>
      )}
    </button>
  );
}
