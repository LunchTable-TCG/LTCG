"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WalletConnect } from "@/components/wallet";
import { useGameWallet } from "@/hooks/wallet/useGameWallet";
import { typedApi, useConvexMutation } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { AlertCircle, Check, Coins, Loader2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Rarity } from "@/types/cards";

// Constants
const TOKEN_DECIMALS = 6;
const MIN_PRICE_TOKENS = 1; // Minimum 1 token
const PLATFORM_FEE_PERCENT = 0.05; // 5%

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const RARITY_BORDERS: Record<Rarity, string> = {
  common: "border-gray-600",
  uncommon: "border-green-500",
  rare: "border-blue-500",
  epic: "border-purple-500",
  legendary: "border-yellow-500",
};

interface TokenListingDialogProps {
  card: {
    _id: Id<"playerCards">;
    name: string;
    imageUrl?: string;
    rarity: string;
    quantity: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Dialog for listing cards on the token marketplace.
 * Requires wallet connection and allows users to set token prices.
 */
export function TokenListingDialog({
  card,
  open,
  onOpenChange,
  onSuccess,
}: TokenListingDialogProps) {
  const { walletAddress, isConnected, isLoading: walletLoading } = useGameWallet();
  const [priceInput, setPriceInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  const createTokenListing = useConvexMutation(
    typedApi.economy.tokenMarketplace.createTokenListing
  );

  const rarity = card.rarity as Rarity;

  // Parse and validate price input
  const priceValidation = useMemo(() => {
    if (!priceInput) {
      return { valid: false, error: null, rawAmount: 0, displayAmount: 0 };
    }

    const parsed = Number.parseFloat(priceInput);
    if (Number.isNaN(parsed)) {
      return { valid: false, error: "Invalid number", rawAmount: 0, displayAmount: 0 };
    }

    if (parsed < MIN_PRICE_TOKENS) {
      return {
        valid: false,
        error: `Minimum price is ${MIN_PRICE_TOKENS} LTCG`,
        rawAmount: 0,
        displayAmount: parsed,
      };
    }

    // Convert to raw amount (smallest units)
    const rawAmount = Math.floor(parsed * 10 ** TOKEN_DECIMALS);

    return { valid: true, error: null, rawAmount, displayAmount: parsed };
  }, [priceInput]);

  // Calculate what seller receives after fee
  const sellerReceives = useMemo(() => {
    if (!priceValidation.valid) return null;
    const afterFee = priceValidation.displayAmount * (1 - PLATFORM_FEE_PERCENT);
    return afterFee;
  }, [priceValidation]);

  const handleSubmit = async () => {
    if (!priceValidation.valid || !isConnected) return;

    setIsSubmitting(true);
    try {
      await createTokenListing({
        cardId: card._id,
        price: priceValidation.rawAmount,
      });

      toast.success("Card listed successfully!", {
        description: `${card.name} is now listed for ${priceValidation.displayAmount} LTCG`,
      });

      onOpenChange(false);
      onSuccess?.();
      setPriceInput("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create listing";
      toast.error("Listing failed", {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty, numbers, and decimal points
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPriceInput(value);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setPriceInput("");
    }
  };

  // Truncate wallet address for display
  const truncatedWallet = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>List Card for Token</DialogTitle>
            <DialogDescription>Set a price in LTCG tokens for your card</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Card Preview */}
            <div
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg bg-black/40 border",
                RARITY_BORDERS[rarity]
              )}
            >
              {/* Card Image */}
              <div
                className={cn(
                  "w-16 aspect-[3/4] rounded-lg overflow-hidden border flex items-center justify-center bg-black/60",
                  RARITY_BORDERS[rarity]
                )}
              >
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                ) : (
                  <Coins className="w-8 h-8 text-[#d4af37]/50" />
                )}
              </div>

              {/* Card Info */}
              <div className="flex-1">
                <h3 className="font-semibold text-[#e8e0d5]">{card.name}</h3>
                <p className={cn("text-sm capitalize", RARITY_COLORS[rarity])}>{rarity}</p>
                <p className="text-xs text-[#a89f94] mt-1">Quantity owned: {card.quantity}</p>
              </div>
            </div>

            {/* Wallet Status */}
            {walletLoading ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-black/20 border border-[#3d2b1f]">
                <Loader2 className="w-4 h-4 animate-spin text-[#a89f94]" />
                <span className="text-sm text-[#a89f94]">Loading wallet...</span>
              </div>
            ) : isConnected && walletAddress ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <Wallet className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Connected: {truncatedWallet}</span>
                <Check className="w-4 h-4 text-green-400 ml-auto" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-500">Wallet required for token listings</span>
                </div>
                <Button
                  onClick={() => setShowWalletConnect(true)}
                  variant="outline"
                  className="w-full border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            )}

            {/* Price Input - only show if wallet connected */}
            {isConnected && (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="token-price-input"
                    className="block text-sm font-medium text-[#a89f94]"
                  >
                    Price
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4af37]" />
                    <Input
                      id="token-price-input"
                      type="text"
                      inputMode="decimal"
                      value={priceInput}
                      onChange={handlePriceChange}
                      placeholder="Enter price"
                      className="pl-10 pr-16 bg-black/40 border-[#3d2b1f] text-[#e8e0d5] placeholder:text-[#a89f94]/50"
                      disabled={isSubmitting}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#d4af37]">
                      LTCG
                    </span>
                  </div>

                  {/* Validation Error */}
                  {priceValidation.error && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {priceValidation.error}
                    </p>
                  )}

                  {/* Quick Price Buttons */}
                  <div className="flex gap-2 mt-2">
                    {[10, 50, 100, 250, 500].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setPriceInput(amount.toString())}
                        disabled={isSubmitting}
                        className={cn(
                          "px-2 py-1 text-xs rounded transition-colors",
                          "bg-black/40 border border-[#3d2b1f]",
                          "text-[#a89f94] hover:border-[#d4af37] hover:text-[#d4af37]",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee Calculation */}
                {sellerReceives !== null && (
                  <div className="p-3 rounded-lg bg-black/20 border border-[#3d2b1f] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#a89f94]">Listing price</span>
                      <span className="text-[#e8e0d5]">
                        {priceValidation.displayAmount.toLocaleString()} LTCG
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#a89f94]">Platform fee (5%)</span>
                      <span className="text-red-400">
                        -{(priceValidation.displayAmount * PLATFORM_FEE_PERCENT).toLocaleString()}{" "}
                        LTCG
                      </span>
                    </div>
                    <div className="border-t border-[#3d2b1f] pt-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-[#a89f94]">You&apos;ll receive</span>
                        <span className="text-green-400">
                          ~{sellerReceives.toLocaleString()} LTCG
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Platform Fee Notice */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-500/80">
                    <strong>Note:</strong> A 5% platform fee will be deducted from the sale when
                    your card sells. Token transactions are processed on-chain.
                  </p>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-[#3d2b1f]"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold"
                disabled={isSubmitting || !priceValidation.valid || !isConnected || walletLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Listing...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    List for Token
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wallet Connect Dialog */}
      <WalletConnect open={showWalletConnect} onOpenChange={setShowWalletConnect} />
    </>
  );
}
