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
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Crown, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedPremiumRewards: number;
  onPurchase?: (planInterval: "month" | "year") => Promise<unknown>;
}

const premiumBenefits = [
  "Unlock exclusive Premium track rewards",
  "Exclusive card skins and avatars",
  "Bonus XP multiplier for all activities",
  "Priority matchmaking queue",
  "Premium player badge and profile flair",
];

const plans = [
  {
    id: "month" as const,
    name: "Monthly",
    price: "$9.99",
    period: "/month",
    description: "Cancel anytime",
  },
  {
    id: "year" as const,
    name: "Yearly",
    price: "$99.99",
    period: "/year",
    description: "Save 17%",
    badge: "Best Value",
  },
];

export function PremiumUpgradeModal({
  isOpen,
  onClose,
  unlockedPremiumRewards,
  onPurchase,
}: PremiumUpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!onPurchase) return;

    setIsLoading(true);
    try {
      await onPurchase(selectedPlan);
      // The function redirects to Stripe, so we don't need to close the modal
    } catch (_err) {
      toast.error("Failed to start checkout. Please try again.");
      setIsLoading(false);
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

        {/* Plan Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 grid grid-cols-2 gap-3"
        >
          {plans.map((plan) => (
            <button
              type="button"
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all text-left",
                selectedPlan === plan.id
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-[#3d2b1f] bg-black/20 hover:border-violet-500/50"
              )}
            >
              {plan.badge && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[#e8e0d5]">{plan.name}</span>
                {selectedPlan === plan.id && (
                  <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-violet-400">{plan.price}</span>
                <span className="text-xs text-[#a89f94]">{plan.period}</span>
              </div>
              <p className="text-xs text-[#a89f94] mt-1">{plan.description}</p>
            </button>
          ))}
        </motion.div>

        {unlockedPremiumRewards > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-violet-400 text-center mt-2"
          >
            {unlockedPremiumRewards} premium rewards ready to claim!
          </motion.p>
        )}

        <DialogFooter className="mt-6">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 hover:from-violet-500 hover:via-violet-400 hover:to-violet-500 text-white font-bold"
            >
              <Crown className="w-5 h-5 mr-2" />
              {isLoading ? "Starting checkout..." : "Subscribe"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
