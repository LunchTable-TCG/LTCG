"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/cards";
import type { MarketListing, ShopItem } from "@/types/shop";
import { Box, Coins, Gavel, Gem, Loader2, Package, ShoppingCart, X } from "lucide-react";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-slate-600",
  uncommon: "text-emerald-700",
  rare: "text-blue-700",
  epic: "text-purple-700",
  legendary: "text-amber-700",
};

const PLATFORM_FEE = Number(process.env.NEXT_PUBLIC_MARKETPLACE_FEE_PCT || 0.05);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="paper-panel w-full max-w-md p-6 relative shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-[#fdfbf7] border-[3px] border-black">
        <div className="flex items-center justify-between mb-6 border-b-[3px] border-black pb-4">
          <h2 className="text-2xl font-black uppercase text-black ink-bleed tracking-tighter">
            Purchase Item
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-black/5 text-black rounded-none -mr-2"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
            {item.type === "pack" && <Package className="w-12 h-12 text-black" />}
            {item.type === "box" && <Box className="w-12 h-12 text-black" />}
            {item.type === "currency" && <Coins className="w-12 h-12 text-black" />}
          </div>
          <h3 className="text-xl font-bold text-black uppercase tracking-tight mb-2">{item.name}</h3>
          <p className="text-black/70 font-medium font-mono text-sm mb-3 px-4">{item.description}</p>
          {item.contents && (
            <div className="inline-block bg-black text-white px-3 py-1 font-bold text-sm uppercase tracking-wider transform -rotate-1">
              {item.contents}
            </div>
          )}
          {item.quantity && (
            <p className="text-amber-700 font-black mt-2 text-lg">+{item.quantity.toLocaleString()} Gold</p>
          )}
        </div>

        <div className="space-y-3">
          {item.goldPrice && (
            <Button
              onClick={() => onPurchase(item, false)}
              disabled={isProcessing || !canAffordGold(item.goldPrice)}
              className={cn(
                "w-full justify-between h-12 rounded-none border-[3px] border-black text-black font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all",
                "bg-[#f0e6d2] hover:bg-[#e6dac0]"
              )}
            >
              <span>Pay with Gold</span>
              <span className="flex items-center gap-2 bg-black/5 px-2 py-0.5 rounded">
                <Coins className="w-4 h-4" />
                {item.goldPrice.toLocaleString()}
              </span>
            </Button>
          )}
          {item.gemPrice && (
            <Button
              onClick={() => onPurchase(item, true)}
              disabled={isProcessing || !canAffordGems(item.gemPrice)}
              className={cn(
                "w-full justify-between h-12 rounded-none border-[3px] border-black text-black font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all",
                "bg-[#e0d5f5] hover:bg-[#d0c0e5]"
              )}
            >
              <span>Pay with Gems</span>
              <span className="flex items-center gap-2 bg-black/5 px-2 py-0.5 rounded">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="paper-panel w-full max-w-md p-6 relative shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-[#fdfbf7] border-[3px] border-black">
        <div className="flex items-center justify-between mb-6 border-b-[3px] border-black pb-4">
          <h2 className="text-2xl font-black uppercase text-black ink-bleed tracking-tighter">
            {listing.listingType === "auction" ? "Place Bid" : "Purchase"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-black/5 text-black rounded-none -mr-2"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex gap-4 mb-6 p-4 border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          <div className="w-20 aspect-3/4 border-2 border-black bg-slate-100 flex items-center justify-center shrink-0">
            <Package className="w-8 h-8 text-black/20" />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="font-bold text-black text-lg leading-tight mb-1">{listing.cardName}</h3>
            <p className={cn("text-xs font-black uppercase tracking-wider mb-2", RARITY_COLORS[listing.cardRarity])}>
              {listing.cardRarity}
            </p>
            <p className="text-sm font-mono text-black/60">
              Seller: <span className="text-black font-bold">{listing.sellerName || "Unknown"}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {listing.listingType === "auction" ? (
            <>
              <div className="flex justify-between items-center text-black">
                <span className="font-bold uppercase text-sm tracking-wider opacity-70">Current Bid</span>
                <span className="font-black text-xl flex items-center gap-1">
                  <Coins className="w-5 h-5" />
                  {(listing.currentBid || listing.price).toLocaleString()}
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Enter bid amount"
                  value={bidAmount}
                  onChange={(e) => onBidAmountChange(e.target.value)}
                  className="bg-white border-[3px] border-black text-black font-mono h-12 text-lg rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                />
              </div>
            </>
          ) : (
            <div className="bg-black/5 p-4 border-2 border-dashed border-black/20">
              <div className="flex justify-between text-black mb-2">
                <span className="font-medium">Price</span>
                <span className="font-bold font-mono flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {listing.price.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm text-black/60 mb-3 border-b-2 border-black/10 pb-3">
                <span className="font-mono">Platform Fee (5%)</span>
                <span className="font-mono">{Math.ceil(listing.price * PLATFORM_FEE).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-black text-xl text-black">
                <span className="uppercase tracking-wider">Total</span>
                <span className="flex items-center gap-1">
                  <Coins className="w-5 h-5 text-black" />
                  {Math.ceil(listing.price * (1 + PLATFORM_FEE)).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 rounded-none border-[3px] border-black text-black font-bold uppercase hover:bg-black/5 transition-all"
          >
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
              className="flex-1 h-12 rounded-none bg-orange-500 border-[3px] border-black text-black font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-400 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Gavel className="w-5 h-5 mr-2" />
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
              className="flex-1 h-12 rounded-none bg-emerald-400 border-[3px] border-black text-black font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
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
