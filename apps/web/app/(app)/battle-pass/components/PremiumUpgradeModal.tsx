"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTokenBalance } from "@/hooks/economy/useTokenBalance";
import {
  formatTokenAmount,
  usePremiumPassTokenPurchase,
} from "@/hooks/progression/usePremiumPassTokenPurchase";
import { useGameWallet } from "@/hooks/wallet/useGameWallet";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Coins,
  Crown,
  Gem,
  Loader2,
  RefreshCw,
  Star,
  XCircle,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  premiumPrice?: number;
  tokenPrice?: number;
  unlockedPremiumRewards: number;
  onPurchase?: () => Promise<unknown>;
  pendingPurchases?: Array<{
    _id: string;
    status: string;
  }>;
}

const premiumBenefits = [
  "Unlock exclusive Premium track rewards",
  "Exclusive card skins and avatars",
  "Bonus XP multiplier for all activities",
  "Priority matchmaking queue",
  "Premium player badge and profile flair",
];

export function PremiumUpgradeModal({
  isOpen,
  onClose,
  premiumPrice,
  tokenPrice,
  unlockedPremiumRewards,
  onPurchase,
  pendingPurchases = [],
}: PremiumUpgradeModalProps) {
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if we're using token purchase flow
  const useTokens = !!tokenPrice && tokenPrice > 0;

  // Wallet and token balance hooks
  const { solanaWallet, isConnected: walletConnected } = useGameWallet();
  const {
    balance,
    rawBalance,
    isLoading: balanceLoading,
    refresh: refreshBalance,
  } = useTokenBalance();

  // Token purchase hook
  const { step, error, initiatePurchase, reset } = usePremiumPassTokenPurchase();

  // Calculate if user has sufficient balance for token purchase
  const hasSufficientBalance = rawBalance !== null && tokenPrice ? rawBalance >= tokenPrice : true;

  // Poll for purchase confirmation
  useEffect(() => {
    if (step !== "waiting" || !pendingPurchases) {
      return;
    }

    const currentPurchase = pendingPurchases[0];

    if (!currentPurchase) {
      return;
    }

    if (currentPurchase.status === "confirmed") {
      reset();
      toast.success("Premium pass purchased!");

      // Refresh balance
      refreshBalance().catch(() => {
        // Silent fail - balance will update on next query
      });

      // Auto-close after 2 seconds
      autoCloseTimer.current = setTimeout(() => {
        onClose();
      }, 2000);
    } else if (currentPurchase.status === "failed") {
      toast.error("Transaction failed. Please try again.");
      reset();
    } else if (currentPurchase.status === "expired") {
      toast.error("Transaction timed out. Please try again.");
      reset();
    }
  }, [step, pendingPurchases, onClose, refreshBalance, reset]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
    }
  }, [isOpen, reset]);

  const handleTokenPurchase = async () => {
    if (!solanaWallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!hasSufficientBalance) {
      toast.error("Insufficient token balance");
      return;
    }

    try {
      await initiatePurchase(solanaWallet);
    } catch (err) {
      // Error handling is done in the hook
      console.error("Token purchase failed:", err);
    }
  };

  const handleGemPurchase = async () => {
    if (!onPurchase) return;

    try {
      await onPurchase();
      toast.success("Premium pass purchased!");
      onClose();
    } catch (err) {
      toast.error("Purchase failed. Please try again.");
    }
  };

  const handleClose = () => {
    // Don't allow closing during signing/waiting
    if (step === "signing") {
      toast.info("Please complete or cancel the transaction in your wallet");
      return;
    }

    if (step === "waiting") {
      toast.info("Transaction is being confirmed. Please wait or the purchase may not complete.");
      return;
    }

    onClose();
  };

  // Render different content based on step (for token purchases)
  const renderContent = () => {
    if (useTokens) {
      switch (step) {
        case "signing":
          return renderSigningStep();
        case "waiting":
          return renderWaitingStep();
        case "error":
          return renderErrorStep();
        default:
          return renderConfirmStep();
      }
    } else {
      return renderConfirmStep();
    }
  };

  const renderConfirmStep = () => (
    <>
      {/* Benefits List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 space-y-3"
      >
        {premiumBenefits.map((benefit, index) => (
          <motion.div
            key={benefit}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
              <Star className="w-3 h-3 text-violet-400" />
            </div>
            <span className="text-sm text-[#e8e0d5]">{benefit}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Price Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/30"
      >
        <div className="flex items-center justify-between">
          <span className="text-[#a89f94]">Price</span>
          <div className="flex items-center gap-2">
            {useTokens && tokenPrice ? (
              <>
                <Coins className="w-5 h-5 text-primary" />
                <span className="text-2xl font-black text-primary">
                  {formatTokenAmount(tokenPrice)} LTCG
                </span>
              </>
            ) : (
              <>
                <Gem className="w-5 h-5 text-blue-400" />
                <span className="text-2xl font-black text-blue-400">
                  {premiumPrice?.toLocaleString() ?? 0}
                </span>
              </>
            )}
          </div>
        </div>
        {unlockedPremiumRewards > 0 && (
          <p className="text-xs text-violet-400 mt-2">
            {unlockedPremiumRewards} premium rewards ready to claim!
          </p>
        )}
      </motion.div>

      {/* Token Balance Check */}
      {useTokens && (
        <>
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
            {!hasSufficientBalance && !balanceLoading && tokenPrice && (
              <p className="text-xs text-red-400/80 mt-2">
                You need {formatTokenAmount(tokenPrice - (rawBalance ?? 0))} more LTCG to complete
                this purchase.
              </p>
            )}
          </div>

          {/* Wallet Not Connected Warning */}
          {!walletConnected && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-200/80">
                    Please connect your wallet to make purchases.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  const renderSigningStep = () => (
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
  );

  const renderWaitingStep = () => (
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
        <p className="text-xs text-[#a89f94] text-center mt-2">Confirming on Solana network</p>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="py-6 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
        <XCircle className="w-8 h-8 text-red-400" />
      </div>
      <div className="text-center">
        <p className="text-[#e8e0d5] font-medium">{error ?? "An unexpected error occurred"}</p>
        <p className="text-sm text-[#a89f94] mt-1">Your tokens have not been charged</p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={step !== "signing" && step !== "waiting"}
        className="sm:max-w-md overflow-hidden"
      >

        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto mb-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-violet-500/20 border-2 border-violet-500">
                <Crown className="w-10 h-10 text-violet-400" />
              </div>
            </div>
          </motion.div>

          <DialogTitle className="text-xl text-violet-400">
            {step === "signing"
              ? "Sign Transaction"
              : step === "waiting"
                ? "Processing Transaction"
                : step === "error"
                  ? "Purchase Failed"
                  : "Upgrade to Premium"}
          </DialogTitle>
          <DialogDescription>
            {step === "signing"
              ? "Please sign the transaction in your wallet"
              : step === "waiting"
                ? "Your transaction has been submitted to the network"
                : step === "error"
                  ? "Something went wrong with your purchase"
                  : "Unlock exclusive rewards and benefits"}
          </DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter className="mt-6">
          {step === "error" ? (
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-[#3d2b1f]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  reset();
                  if (useTokens && solanaWallet) {
                    handleTokenPurchase();
                  } else if (!useTokens) {
                    handleGemPurchase();
                  }
                }}
                className="flex-1 bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : step === "signing" || step === "waiting" ? null : (
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
              >
                Cancel
              </Button>
              <Button
                onClick={useTokens ? handleTokenPurchase : handleGemPurchase}
                disabled={
                  useTokens
                    ? !walletConnected || !hasSufficientBalance || balanceLoading
                    : false
                }
                className="flex-1 bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 hover:from-violet-500 hover:via-violet-400 hover:to-violet-500 text-white font-bold"
              >
                {useTokens ? (
                  <>
                    <Coins className="w-5 h-5 mr-2" />
                    Purchase with LTCG
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    Purchase
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
