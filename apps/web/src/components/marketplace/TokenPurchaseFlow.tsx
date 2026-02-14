"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTokenBalance } from "@/hooks/economy/useTokenBalance";
import { useTokenPurchase } from "@/hooks/marketplace/useTokenPurchase";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

/** Token decimal places for LTCG token */
const TOKEN_DECIMALS = 6;

interface TokenPurchaseFlowProps {
  listing: {
    _id: Id<"marketplaceListings">;
    tokenPrice: number;
    card: {
      name: string;
      imageUrl?: string;
      rarity: string;
    };
    seller: {
      username: string;
    };
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

/**
 * Formats a raw token amount (with 6 decimals) to human-readable format.
 */
function formatTokenAmount(rawAmount: number, decimals = 2) {
  const humanReadable = rawAmount / 10 ** TOKEN_DECIMALS;
  return humanReadable.toFixed(decimals);
}

/**
 * Multi-step purchase flow for buying cards with LTCG tokens.
 *
 * Flow:
 * 1. Confirm Purchase - Review card details and price breakdown
 * 2. Sign Transaction - Privy wallet modal for signing
 * 3. Waiting for Confirmation - Poll for on-chain confirmation
 * 4. Success - Purchase complete
 * 5. Error - Handle failures with retry option
 */
export function TokenPurchaseFlow({
  listing,
  open,
  onOpenChange,
  onSuccess,
}: TokenPurchaseFlowProps) {
  const {
    step,
    error,
    platformFee,
    totalCost,
    hasSufficientBalance,
    walletConnected,
    balanceLoading,
    handleInitiatePurchase,
    handleRetry,
    handleClose,
  } = useTokenPurchase(listing, open, { onSuccess, onOpenChange });

  const { balance, rawBalance } = useTokenBalance();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={step !== "signing" && step !== "waiting"}
      >
        {/* Step 1: Confirm Purchase */}
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Confirm Purchase</DialogTitle>
              <DialogDescription>Review your purchase before confirming</DialogDescription>
            </DialogHeader>

            {/* Card Preview */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-[#3d2b1f]">
              <div className="w-16 h-22 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center overflow-hidden">
                {listing.card.imageUrl ? (
                  <img
                    src={listing.card.imageUrl}
                    alt={listing.card.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-8 h-8 text-purple-400/50" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#e8e0d5]">{listing.card.name}</h3>
                <p
                  className={cn(
                    "text-sm capitalize",
                    RARITY_COLORS[listing.card.rarity] ?? "text-gray-400"
                  )}
                >
                  {listing.card.rarity}
                </p>
                <p className="text-xs text-[#a89f94] mt-1">Seller: {listing.seller.username}</p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 p-4 rounded-xl bg-black/20 border border-[#3d2b1f]">
              <div className="flex justify-between text-sm">
                <span className="text-[#a89f94]">Card Price</span>
                <span className="text-[#e8e0d5] flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  {formatTokenAmount(listing.tokenPrice)} LTCG
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a89f94]">Platform Fee (5%)</span>
                <span className="text-[#a89f94] flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-[#a89f94]" />
                  {formatTokenAmount(platformFee)} LTCG
                  <span className="text-xs">(from seller)</span>
                </span>
              </div>
              <div className="border-t border-[#3d2b1f] pt-3 flex justify-between">
                <span className="font-semibold text-[#e8e0d5]">You Pay</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {formatTokenAmount(totalCost)} LTCG
                </span>
              </div>
            </div>

            {/* Balance Check */}
            <div
              className={cn(
                "p-3 rounded-lg border",
                hasSufficientBalance
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-red-500/10 border-red-500/20"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#a89f94]">Your Balance</span>
                <span
                  className={cn(
                    "font-medium flex items-center gap-1",
                    hasSufficientBalance ? "text-green-400" : "text-red-400"
                  )}
                >
                  <Coins className="w-3.5 h-3.5" />
                  {balanceLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `${balance?.toFixed(2) ?? "0.00"} LTCG`
                  )}
                </span>
              </div>
              {!hasSufficientBalance && !balanceLoading && (
                <p className="text-xs text-red-400/80 mt-2">
                  You need {formatTokenAmount(totalCost - (rawBalance ?? 0))} more LTCG to complete
                  this purchase.
                </p>
              )}
            </div>

            {/* Wallet Not Connected Warning */}
            {!walletConnected && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <p className="text-sm text-yellow-200/80">
                    Please connect your wallet to make purchases.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-[#3d2b1f]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInitiatePurchase}
                disabled={!walletConnected || !hasSufficientBalance || balanceLoading}
                className="flex-1 bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold"
              >
                <Coins className="w-4 h-4 mr-2" />
                Confirm Purchase
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Signing Transaction */}
        {step === "signing" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Sign Transaction</DialogTitle>
              <DialogDescription>Please sign the transaction in your wallet</DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-[#e8e0d5] font-medium">Waiting for wallet confirmation...</p>
                <p className="text-sm text-[#a89f94] mt-1">
                  Your wallet will prompt you to sign the transaction
                </p>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Waiting for Confirmation */}
        {step === "waiting" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Processing Transaction</DialogTitle>
              <DialogDescription>
                Your transaction has been submitted to the network
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-[#e8e0d5] font-medium">Waiting for confirmation...</p>
                <p className="text-sm text-[#a89f94] mt-1">This usually takes a few seconds</p>
              </div>

              <div className="w-full mt-4">
                <Progress value={undefined} className="h-2" />
                <p className="text-xs text-[#a89f94] text-center mt-2">
                  Confirming on Solana network
                </p>
              </div>
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-green-400">Purchase Complete!</DialogTitle>
              <DialogDescription>The card has been added to your collection</DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-[#e8e0d5] font-medium">You now own {listing.card.name}!</p>
                <p className="text-sm text-[#a89f94] mt-1">
                  Check your collection to view your new card
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-[#3d2b1f]"
              >
                Close
              </Button>
              <Button
                asChild
                className="flex-1 bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold"
              >
                <Link href="/binder">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Collection
                </Link>
              </Button>
            </div>
          </>
        )}

        {/* Step 5: Error */}
        {step === "error" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-red-400">Purchase Failed</DialogTitle>
              <DialogDescription>Something went wrong with your purchase</DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-[#e8e0d5] font-medium">
                  {error ?? "An unexpected error occurred"}
                </p>
                <p className="text-sm text-[#a89f94] mt-1">Your tokens have not been charged</p>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-[#3d2b1f]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRetry}
                className="flex-1 bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
