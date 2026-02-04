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
import { motion } from "framer-motion";
import { Crown, Gem, Star } from "lucide-react";
import { toast } from "sonner";

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  premiumPrice?: number;
  unlockedPremiumRewards: number;
  onPurchase?: () => Promise<unknown>;
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
  unlockedPremiumRewards,
  onPurchase,
}: PremiumUpgradeModalProps) {
  const handlePurchase = async () => {
    if (!onPurchase) return;

    try {
      await onPurchase();
      toast.success("Premium pass purchased!");
      onClose();
    } catch (_err) {
      toast.error("Purchase failed. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md overflow-hidden">
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

          <DialogTitle className="text-xl text-violet-400">Upgrade to Premium</DialogTitle>
          <DialogDescription>Unlock exclusive rewards and benefits</DialogDescription>
        </DialogHeader>

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
              <Gem className="w-5 h-5 text-blue-400" />
              <span className="text-2xl font-black text-blue-400">
                {premiumPrice?.toLocaleString() ?? 0}
              </span>
            </div>
          </div>
          {unlockedPremiumRewards > 0 && (
            <p className="text-xs text-violet-400 mt-2">
              {unlockedPremiumRewards} premium rewards ready to claim!
            </p>
          )}
        </motion.div>

        <DialogFooter className="mt-6">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              className="flex-1 bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 hover:from-violet-500 hover:via-violet-400 hover:to-violet-500 text-white font-bold"
            >
              <Crown className="w-5 h-5 mr-2" />
              Purchase
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
