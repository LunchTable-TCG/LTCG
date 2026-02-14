"use client";

import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/cards";
import type { TokenListing } from "@/types/shop";
import { Gem, Package } from "lucide-react";
import Image from "next/image";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-slate-400",
  uncommon: "text-emerald-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

const TOKEN_DECIMALS = 6;

interface TokenListingCardProps {
  listing: TokenListing;
  onSelect: () => void;
  isSelected: boolean;
}

export function TokenListingCard({ listing, onSelect, isSelected }: TokenListingCardProps) {
  const formatTokenPrice = (rawAmount: number) => {
    const humanReadable = rawAmount / 10 ** TOKEN_DECIMALS;
    return humanReadable.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <button
      type="button"
      data-testid="token-marketplace-card"
      className={cn(
        "group relative p-3 rounded-xl border border-border bg-card/40 hover:bg-card/60 transition-all cursor-pointer text-left w-full h-full flex flex-col overflow-hidden",
        isSelected ? "ring-2 ring-primary border-primary bg-primary/10" : "hover:border-primary/50"
      )}
      onClick={onSelect}
    >
      <span className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-md text-[10px] font-bold bg-primary/20 text-primary border border-primary/40 uppercase tracking-wider backdrop-blur-sm">
        Token
      </span>

      <div className="aspect-3/4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3 border border-primary/20 group-hover:border-primary/40 transition-colors overflow-hidden">
        {listing.cardImageUrl ? (
          <Image
            src={listing.cardImageUrl}
            alt={listing.cardName}
            width={100}
            height={140}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-12 h-12 text-primary/40 group-hover:text-primary/60 transition-colors" />
        )}
      </div>

      <p className="font-bold text-sm text-foreground truncate mb-1 group-hover:text-primary transition-colors">
        {listing.cardName}
      </p>
      <p
        className={cn(
          "text-xs mb-3 font-medium capitalize tracking-wider",
          RARITY_COLORS[listing.cardRarity]
        )}
      >
        {listing.cardRarity}
      </p>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
        <div className="flex items-center gap-1">
          <Gem className="w-4 h-4 text-primary" />
          <span className="font-bold text-primary">{formatTokenPrice(listing.tokenPrice)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">by {listing.sellerUsername}</p>
      </div>
    </button>
  );
}
