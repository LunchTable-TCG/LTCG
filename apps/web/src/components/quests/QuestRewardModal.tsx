"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Coins, Gift, Sparkles, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface QuestReward {
  gold?: number;
  xp?: number;
  items?: { name: string; quantity: number; rarity?: string }[];
}

interface QuestRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  questName: string;
  rewards: QuestReward;
  onClaim: () => Promise<void>;
}

export function QuestRewardModal({
  isOpen,
  onClose,
  questName,
  rewards,
  onClaim,
}: QuestRewardModalProps) {
  const [phase, setPhase] = useState<"ready" | "claiming" | "complete">("ready");
  const [showParticles, setShowParticles] = useState(false);

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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent showCloseButton={phase === "complete"} className="sm:max-w-md overflow-hidden">
        {/* Particle Effects */}
        <AnimatePresence>
          {showParticles && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 30 }, (_, i) => i).map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: "50%",
                    top: "50%",
                    backgroundColor: i % 3 === 0 ? "#d4af37" : i % 3 === 1 ? "#8b4513" : "#f9e29f",
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
              <div className="absolute inset-0 bg-[#d4af37]/30 rounded-full blur-xl animate-pulse" />
              <div
                className={cn(
                  "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500",
                  phase === "complete"
                    ? "bg-green-500/20 border-2 border-green-500"
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
                    <Gift className="w-10 h-10 text-[#d4af37]" />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          <DialogTitle className="text-xl">
            {phase === "complete" ? "Rewards Claimed!" : "Quest Complete!"}
          </DialogTitle>
          <p className="text-[#a89f94] text-sm mt-1">{questName}</p>
        </DialogHeader>

        {/* Rewards Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 space-y-4"
        >
          {/* Gold Reward */}
          {rewards.gold && rewards.gold > 0 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all",
                phase === "complete"
                  ? "bg-yellow-500/10 border-yellow-500/30"
                  : "bg-black/20 border-[#3d2b1f]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="font-medium text-[#e8e0d5]">Gold</span>
              </div>
              <motion.span
                className="text-xl font-black text-yellow-400"
                animate={phase === "claiming" ? { scale: [1, 1.2, 1] } : {}}
                transition={{
                  duration: 0.3,
                  repeat: phase === "claiming" ? Number.POSITIVE_INFINITY : 0,
                }}
              >
                +{rewards.gold.toLocaleString()}
              </motion.span>
            </motion.div>
          )}

          {/* XP Reward */}
          {rewards.xp && rewards.xp > 0 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all",
                phase === "complete"
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-black/20 border-[#3d2b1f]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <span className="font-medium text-[#e8e0d5]">Experience</span>
              </div>
              <motion.span
                className="text-xl font-black text-blue-400"
                animate={phase === "claiming" ? { scale: [1, 1.2, 1] } : {}}
                transition={{
                  duration: 0.3,
                  delay: 0.1,
                  repeat: phase === "claiming" ? Number.POSITIVE_INFINITY : 0,
                }}
              >
                +{rewards.xp.toLocaleString()} XP
              </motion.span>
            </motion.div>
          )}

          {/* Item Rewards */}
          {rewards.items && rewards.items.length > 0 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              {rewards.items.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                    phase === "complete"
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-black/20 border-[#3d2b1f]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <span className="font-medium text-[#e8e0d5]">{item.name}</span>
                      {item.rarity && (
                        <span className="ml-2 text-xs text-purple-400">({item.rarity})</span>
                      )}
                    </div>
                  </div>
                  <span className="text-lg font-bold text-purple-400">x{item.quantity}</span>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          {phase === "complete" ? (
            <Button
              onClick={onClose}
              className="w-full bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] text-white font-bold py-6"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={phase === "claiming"}
              className="w-full bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] text-white font-bold py-6 disabled:opacity-70"
            >
              {phase === "claiming" ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    className="mr-2"
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5 mr-2" />
                  Claim Rewards
                </>
              )}
            </Button>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
