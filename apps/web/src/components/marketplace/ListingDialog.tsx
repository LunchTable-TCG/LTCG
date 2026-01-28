"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Coins, Loader2, Package, X } from "lucide-react";
import { useState } from "react";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface Card {
  cardDefinitionId: Id<"cardDefinitions">;
  name: string;
  rarity: Rarity;
}

interface ListingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  onConfirm: (listingType: "fixed" | "auction", price: number, duration?: number) => Promise<void>;
  isSubmitting?: boolean; // Optional external submitting state
  progressText?: string; // Optional progress text for multi-card listing
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const SUGGESTED_PRICES: Record<Rarity, number> = {
  common: 50,
  uncommon: 100,
  rare: 250,
  epic: 500,
  legendary: 1000,
};

const AUCTION_DURATIONS = [
  { label: "1 Hour", value: 1 * 60 * 60 * 1000 },
  { label: "6 Hours", value: 6 * 60 * 60 * 1000 },
  { label: "12 Hours", value: 12 * 60 * 60 * 1000 },
  { label: "24 Hours", value: 24 * 60 * 60 * 1000 },
  { label: "3 Days", value: 3 * 24 * 60 * 60 * 1000 },
];

export function ListingDialog({
  isOpen,
  onClose,
  card,
  onConfirm,
  isSubmitting: externalIsSubmitting,
  progressText,
}: ListingDialogProps) {
  const [listingType, setListingType] = useState<"fixed" | "auction">("fixed");
  const [price, setPrice] = useState(SUGGESTED_PRICES[card.rarity].toString());
  const [duration, setDuration] = useState(AUCTION_DURATIONS[3]!.value);
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);

  // Use external submitting state if provided, otherwise use internal
  const isSubmitting = externalIsSubmitting ?? internalIsSubmitting;

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const priceNum = Number.parseInt(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return;
    }

    setInternalIsSubmitting(true);
    try {
      await onConfirm(listingType, priceNum, listingType === "auction" ? duration : undefined);
      // Only close if not using external submitting (parent handles flow)
      if (externalIsSubmitting === undefined) {
        onClose();
      }
    } catch (error) {
      // Error is handled by parent
    } finally {
      setInternalIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1614] border border-[#3d2b1f] rounded-xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#e8e0d5]">List Card on Marketplace</h2>
            {progressText && <p className="text-xs text-[#d4af37] mt-1">{progressText}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[#a89f94] hover:text-[#e8e0d5]"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Card Preview */}
        <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-black/40">
          <div className="w-16 aspect-3/4 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
            <Package className="w-8 h-8 text-purple-400/50" />
          </div>
          <div>
            <h3 className="font-semibold text-[#e8e0d5]">{card.name}</h3>
            <p className={cn("text-sm capitalize", RARITY_COLORS[card.rarity])}>{card.rarity}</p>
          </div>
        </div>

        {/* Listing Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#a89f94] mb-2">Listing Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setListingType("fixed")}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-left",
                listingType === "fixed"
                  ? "border-[#d4af37] bg-[#d4af37]/10"
                  : "border-[#3d2b1f] bg-black/20 hover:border-[#3d2b1f]/50"
              )}
              disabled={isSubmitting}
            >
              <div className="font-bold text-[#e8e0d5] mb-1">Buy Now</div>
              <div className="text-xs text-[#a89f94]">Instant sale at fixed price</div>
            </button>
            <button
              onClick={() => setListingType("auction")}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-left",
                listingType === "auction"
                  ? "border-[#d4af37] bg-[#d4af37]/10"
                  : "border-[#3d2b1f] bg-black/20 hover:border-[#3d2b1f]/50"
              )}
              disabled={isSubmitting}
            >
              <div className="font-bold text-[#e8e0d5] mb-1">Auction</div>
              <div className="text-xs text-[#a89f94]">Players bid, highest wins</div>
            </button>
          </div>
        </div>

        {/* Price Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#a89f94] mb-2">
            {listingType === "auction" ? "Starting Bid" : "Price"}
          </label>
          <div className="relative">
            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400" />
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-10 bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
              placeholder="Enter price"
              min="1"
              disabled={isSubmitting}
            />
          </div>
          <div className="mt-2 flex gap-2">
            {[50, 100, 250, 500, 1000].map((suggestedPrice) => (
              <button
                key={suggestedPrice}
                onClick={() => setPrice(suggestedPrice.toString())}
                className="px-2 py-1 text-xs rounded bg-black/40 border border-[#3d2b1f] text-[#a89f94] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                disabled={isSubmitting}
              >
                {suggestedPrice}
              </button>
            ))}
          </div>
        </div>

        {/* Auction Duration (only for auctions) */}
        {listingType === "auction" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#a89f94] mb-2">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5]"
              disabled={isSubmitting}
            >
              {AUCTION_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fee Notice */}
        <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-500/80">
            <strong>Note:</strong> A 5% platform fee will be deducted from the sale price when your
            card sells.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-[#3d2b1f]"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold"
            disabled={isSubmitting || !price || Number.parseInt(price) <= 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Listing...
              </>
            ) : (
              "Create Listing"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
