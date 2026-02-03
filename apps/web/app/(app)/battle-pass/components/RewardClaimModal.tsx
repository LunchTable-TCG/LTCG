"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Crown, Gift, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { RewardIcon } from "./RewardIcon";

type RewardType = "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";

interface BattlePassReward {
  type: RewardType;
  amount?: number;
  cardId?: string;
  packProductId?: string;
  titleName?: string;
  avatarUrl?: string;
}

interface RewardClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: number;
  track: "free" | "premium";
  reward: BattlePassReward;
  onClaim: () => Promise<void>;
}

export function RewardClaimModal({
  isOpen,
  onClose,
  tier,
  track,
  reward,
  onClaim,
}: RewardClaimModalProps) {
  const [phase, setPhase] = useState<"ready" | "claiming" | "complete">("ready");
  const [showParticles, setShowParticles] = useState(false);

  const isPremium = track === "premium";

  useEffect(() => {
    if (isOpen) {
      setPhase("ready");
      setShowParticles(false);
    }
  }, [isOpen]);

  const handleClaim = async () => {
    setPhase("claiming");
    setShowParticles(true);

    try {
      await onClaim();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setPhase("complete");
    } catch {
      setPhase("ready");
    }
  };

  const handleClose = () => {
    if (phase === "complete") {
      onClose();
    }
  };

  const getRewardLabel = () => {
    switch (reward.type) {
      case "gold":
        return `${reward.amount?.toLocaleString()} Gold`;
      case "gems":
        return `${reward.amount?.toLocaleString()} Gems`;
      case "xp":
        return `${reward.amount?.toLocaleString()} XP`;
      case "card":
        return "Card Reward";
      case "pack":
        return `${reward.amount} Pack${reward.amount && reward.amount > 1 ? "s" : ""}`;
      case "title":
        return reward.titleName || "Title Reward";
      case "avatar":
        return "Avatar Reward";
      default:
        return "Reward";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent showCloseButton={phase === "complete"} className="sm:max-w-md overflow-hidden">
        {/* Particle Effects */}
        <AnimatePresence>
          {showParticles && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: "50%",
                    top: "50%",
                    backgroundColor: isPremium
                      ? i % 3 === 0
                        ? "#8b5cf6"
                        : i % 3 === 1
                          ? "#a78bfa"
                          : "#c4b5fd"
                      : i % 3 === 0
                        ? "#d4af37"
                        : i % 3 === 1
                          ? "#8b4513"
                          : "#f9e29f",
                  }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    scale: [0, 1.5, 0],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: Math.random() * 0.3,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto mb-4"
          >
            <div className="relative">
              <div
                className={cn(
                  "absolute inset-0 rounded-full blur-xl animate-pulse",
                  isPremium ? "bg-violet-500/30" : "bg-[#d4af37]/30"
                )}
              />
              <div
                className={cn(
                  "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500",
                  phase === "complete"
                    ? "bg-green-500/20 border-2 border-green-500"
                    : isPremium
                      ? "bg-violet-500/20 border-2 border-violet-500"
                      : "bg-[#d4af37]/20 border-2 border-[#d4af37]"
                )}
              >
                {phase === "complete" ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring" }}
                  >
                    <Check className="w-10 h-10 text-green-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={phase === "claiming" ? { rotate: 360 } : {}}
                    transition={{
                      duration: 1,
                      repeat: phase === "claiming" ? Number.POSITIVE_INFINITY : 0,
                      ease: "linear",
                    }}
                  >
                    <Gift
                      className={cn("w-10 h-10", isPremium ? "text-violet-400" : "text-[#d4af37]")}
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          <DialogTitle className="text-xl">
            {phase === "complete" ? "Reward Claimed!" : `Tier ${tier} Reward`}
          </DialogTitle>
          <div className="flex items-center justify-center gap-2 mt-1">
            {isPremium && <Crown className="w-4 h-4 text-violet-400" />}
            <span className={cn("text-sm", isPremium ? "text-violet-400" : "text-[#a89f94]")}>
              {isPremium ? "Premium Track" : "Free Track"}
            </span>
          </div>
        </DialogHeader>

        {/* Reward Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div
            className={cn(
              "p-6 rounded-xl border transition-all flex flex-col items-center",
              phase === "complete"
                ? isPremium
                  ? "bg-violet-500/10 border-violet-500/30"
                  : "bg-[#d4af37]/10 border-[#d4af37]/30"
                : "bg-black/20 border-[#3d2b1f]"
            )}
          >
            <motion.div
              animate={phase === "claiming" ? { scale: [1, 1.1, 1] } : {}}
              transition={{
                duration: 0.5,
                repeat: phase === "claiming" ? Number.POSITIVE_INFINITY : 0,
              }}
            >
              <RewardIcon type={reward.type} amount={reward.amount} size="lg" showAmount={false} />
            </motion.div>
            <motion.span
              className={cn(
                "mt-4 text-xl font-bold",
                isPremium ? "text-violet-400" : "text-[#d4af37]"
              )}
              animate={phase === "claiming" ? { scale: [1, 1.1, 1] } : {}}
              transition={{
                duration: 0.3,
                repeat: phase === "claiming" ? Number.POSITIVE_INFINITY : 0,
              }}
            >
              {getRewardLabel()}
            </motion.span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          {phase === "complete" ? (
            <Button
              onClick={onClose}
              className={cn(
                "w-full font-bold py-6",
                isPremium
                  ? "bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 hover:from-violet-500 hover:via-violet-400 hover:to-violet-500"
                  : "bg-gradient-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d]"
              )}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={phase === "claiming"}
              className={cn(
                "w-full font-bold py-6 disabled:opacity-70",
                isPremium
                  ? "bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 hover:from-violet-500 hover:via-violet-400 hover:to-violet-500"
                  : "bg-gradient-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d]"
              )}
            >
              {phase === "claiming" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5 mr-2" />
                  Claim Reward
                </>
              )}
            </Button>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
