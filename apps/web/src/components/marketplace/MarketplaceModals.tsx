"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/cards";
import type { MarketListing, ShopItem } from "@/types/shop";
import { Box, Coins, Gavel, Gem, Loader2, Package, ShoppingCart, X } from "lucide-react";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const PLATFORM_FEE = 0.05;

interface ShopPurchaseModalProps {
  item: ShopItem | null;
  onClose: () => void;
  isProcessing: boolean;
  canAffordGold: (amount: number) => boolean;
  canAffordGems: (amount: number) => boolean;
  onPurchase: (item: ShopItem, useGems: boolean) => void;
}

export function ShopPurchaseModal({
  item,
  onClose,
  isProcessing,
  canAffordGold,
  canAffordGems,
  onPurchase,
}: ShopPurchaseModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1614] border border-[#3d2b1f] rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#e8e0d5]">Purchase Item</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#a89f94]">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-[#d4af37]/20 flex items-center justify-center">
            {item.type === "pack" && <Package className="w-10 h-10 text-[#d4af37]" />}
            {item.type === "box" && <Box className="w-10 h-10 text-[#d4af37]" />}
            {item.type === "currency" && <Coins className="w-10 h-10 text-[#d4af37]" />}
          </div>
          <h3 className="font-bold text-[#e8e0d5] text-lg">{item.name}</h3>
          <p className="text-[#a89f94] text-sm">{item.description}</p>
          {item.contents && <p className="text-[#d4af37] text-sm mt-1">{item.contents}</p>}
          {item.quantity && (
            <p className="text-yellow-400 font-bold mt-2">+{item.quantity.toLocaleString()} Gold</p>
          )}
        </div>

        <div className="space-y-3">
          {item.goldPrice && (
            <Button
              onClick={() => onPurchase(item, false)}
              disabled={isProcessing || !canAffordGold(item.goldPrice)}
              className="w-full justify-between bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-600/30"
            >
              <span>Pay with Gold</span>
              <span className="flex items-center gap-1">
                <Coins className="w-4 h-4" />
                {item.goldPrice.toLocaleString()}
              </span>
            </Button>
          )}
          {item.gemPrice && (
            <Button
              onClick={() => onPurchase(item, true)}
              disabled={isProcessing || !canAffordGems(item.gemPrice)}
              className="w-full justify-between bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30"
            >
              <span>Pay with Gems</span>
              <span className="flex items-center gap-1">
                <Gem className="w-4 h-4" />
                {item.gemPrice.toLocaleString()}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MarketListingModalProps {
  listing: MarketListing | null;
  onClose: () => void;
  isProcessing: boolean;
  bidAmount: string;
  onBidAmountChange: (value: string) => void;
  canAffordGold: (amount: number) => boolean;
  onPlaceBid: (listingId: string) => void;
  onMarketPurchase: (listingId: string) => void;
}

export function MarketListingModal({
  listing,
  onClose,
  isProcessing,
  bidAmount,
  onBidAmountChange,
  canAffordGold,
  onPlaceBid,
  onMarketPurchase,
}: MarketListingModalProps) {
  if (!listing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1614] border border-[#3d2b1f] rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#e8e0d5]">
            {listing.listingType === "auction" ? "Place Bid" : "Purchase"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#a89f94]">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-black/40">
          <div className="w-16 aspect-3/4 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
            <Package className="w-8 h-8 text-purple-400/50" />
          </div>
          <div>
            <h3 className="font-semibold text-[#e8e0d5]">{listing.cardName}</h3>
            <p className={cn("text-sm", RARITY_COLORS[listing.cardRarity])}>{listing.cardRarity}</p>
            <p className="text-xs text-[#a89f94]">Seller: {listing.sellerName}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {listing.listingType === "auction" ? (
            <>
              <div className="flex justify-between text-[#a89f94]">
                <span>Current Bid:</span>
                <span className="font-bold flex items-center gap-1 text-[#e8e0d5]">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  {(listing.currentBid || listing.price).toLocaleString()}
                </span>
              </div>
              <Input
                type="number"
                placeholder="Enter bid amount"
                value={bidAmount}
                onChange={(e) => onBidAmountChange(e.target.value)}
                className="bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
              />
            </>
          ) : (
            <>
              <div className="flex justify-between text-[#a89f94]">
                <span>Price:</span>
                <span className="font-bold flex items-center gap-1 text-[#e8e0d5]">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  {listing.price.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm text-[#a89f94]">
                <span>Platform Fee (5%):</span>
                <span>{Math.ceil(listing.price * PLATFORM_FEE).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-[#3d2b1f] pt-3 text-[#e8e0d5]">
                <span>Total:</span>
                <span className="text-yellow-300">
                  {Math.ceil(listing.price * (1 + PLATFORM_FEE)).toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 border-[#3d2b1f]">
            Cancel
          </Button>
          {listing.listingType === "auction" ? (
            <Button
              onClick={() => onPlaceBid(listing._id)}
              disabled={
                isProcessing ||
                !bidAmount ||
                Number.parseInt(bidAmount, 10) <= (listing.currentBid || listing.price)
              }
              className="flex-1 bg-orange-600 hover:bg-orange-500"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Gavel className="w-4 h-4 mr-2" />
                  Place Bid
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => onMarketPurchase(listing._id)}
              disabled={
                isProcessing || !canAffordGold(Math.ceil(listing.price * (1 + PLATFORM_FEE)))
              }
              className="flex-1 bg-green-600 hover:bg-green-500"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy Now
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
