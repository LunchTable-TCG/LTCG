"use client";

import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/cards";
import type { TokenListing } from "@/types/shop";
import { Gem, Package } from "lucide-react";
import Image from "next/image";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
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
        "relative p-3 rounded-xl border border-[#3d2b1f] bg-black/40 hover:bg-black/60 transition-all cursor-pointer text-left w-full",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-xs font-bold bg-primary text-[#1a1614]">
        Token
      </span>

      <div className="aspect-3/4 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mb-3 overflow-hidden">
        {listing.cardImageUrl ? (
          <Image
            src={listing.cardImageUrl}
            alt={listing.cardName}
            width={100}
            height={140}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-12 h-12 text-purple-400/50" />
        )}
      </div>

      <p className="font-medium text-sm text-[#e8e0d5] truncate mb-1">{listing.cardName}</p>
      <p className={cn("text-xs mb-2 capitalize", RARITY_COLORS[listing.cardRarity])}>
        {listing.cardRarity}
      </p>

      <div className="flex items-center gap-1">
        <Gem className="w-4 h-4 text-primary" />
        <span className="font-bold text-primary">{formatTokenPrice(listing.tokenPrice)} LTCG</span>
      </div>

      <p className="text-xs text-[#a89f94] mt-1">Seller: {listing.sellerUsername}</p>
    </button>
  );
}
