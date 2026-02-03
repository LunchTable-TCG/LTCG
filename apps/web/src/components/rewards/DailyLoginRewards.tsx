"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Calendar, Check, Coins, Gem, Gift, Package, Sparkles, Star } from "lucide-react";
import { useEffect, useState } from "react";

interface DayReward {
  day: number;
  type: "gold" | "gems" | "pack" | "special";
  amount: number;
  label?: string;
  claimed: boolean;
  isToday: boolean;
}

interface DailyLoginRewardsProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  onClaim: (day: number) => Promise<void>;
}

const WEEKLY_REWARDS: Omit<DayReward, "claimed" | "isToday">[] = [
  { day: 1, type: "gold", amount: 100 },
  { day: 2, type: "gold", amount: 150 },
  { day: 3, type: "gems", amount: 25 },
  { day: 4, type: "gold", amount: 200 },
  { day: 5, type: "pack", amount: 1, label: "Starter Pack" },
  { day: 6, type: "gold", amount: 300 },
  { day: 7, type: "special", amount: 1, label: "Weekly Chest" },
];

const rewardIcons = {
  gold: Coins,
  gems: Gem,
  pack: Package,
  special: Gift,
};

const rewardColors = {
  gold: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  gems: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  pack: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  special: "text-[#d4af37] bg-[#d4af37]/20 border-[#d4af37]/30",
};

export function DailyLoginRewards({
  isOpen,
  onClose,
  currentStreak,
  onClaim,
}: DailyLoginRewardsProps) {
  const [claiming, setClaiming] = useState<number | null>(null);
  const [rewards, setRewards] = useState<DayReward[]>([]);

  useEffect(() => {
    // Generate rewards based on current streak
    const todayIndex = (currentStreak - 1) % 7;
    setRewards(
      WEEKLY_REWARDS.map((r, i) => ({
        ...r,
        claimed: i < todayIndex,
        isToday: i === todayIndex,
      }))
    );
  }, [currentStreak]);

  const handleClaim = async (day: number) => {
    setClaiming(day);
    await onClaim(day);
    setRewards((prev) =>
      prev.map((r) => (r.day === day ? { ...r, claimed: true, isToday: false } : r))
    );
    setClaiming(null);
  };

  const todayReward = rewards.find((r) => r.isToday);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg overflow-hidden">
        <DialogHeader className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-[#d4af37]/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37] flex items-center justify-center">
                <Calendar className="w-8 h-8 text-[#d4af37]" />
              </div>
            </div>
          </motion.div>

          <DialogTitle className="text-xl">Daily Login Rewards</DialogTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Star className="w-4 h-4 text-[#d4af37]" />
            <span className="text-[#d4af37] font-bold">{currentStreak} Day Streak!</span>
          </div>
        </DialogHeader>

        {/* Rewards Grid */}
        <div className="grid grid-cols-7 gap-2 my-6">
          {rewards.map((reward, index) => {
            const Icon = rewardIcons[reward.type];
            const colorClass = rewardColors[reward.type];
            const isClaimed = reward.claimed;
            const isToday = reward.isToday;
            const isFuture = !isClaimed && !isToday;

            return (
              <motion.div
                key={reward.day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative flex flex-col items-center p-2 rounded-lg border transition-all",
                  isClaimed && "bg-green-500/10 border-green-500/30",
                  isToday && `${colorClass} ring-2 ring-[#d4af37]`,
                  isFuture && "bg-black/20 border-[#3d2b1f] opacity-50"
                )}
              >
                <span className="text-[10px] text-[#a89f94] mb-1">Day {reward.day}</span>
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center mb-1",
                    isClaimed ? "bg-green-500/20" : colorClass.split(" ")[1]
                  )}
                >
                  {isClaimed ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Icon className={cn("w-4 h-4", colorClass.split(" ")[0])} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    isClaimed ? "text-green-400" : colorClass.split(" ")[0]
                  )}
                >
                  {reward.label || (reward.type === "gems" ? reward.amount : `${reward.amount}`)}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Today's Reward Claim */}
        {todayReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-4 rounded-xl border relative overflow-hidden",
              todayReward.type === "special"
                ? "bg-[#d4af37]/10 border-[#d4af37]/30"
                : "bg-[#d4af37]/10 border-[#d4af37]/30"
            )}
          >
            {/* Gold Metal Texture for Special Rewards */}
            {todayReward.type === "special" && (
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "url(/assets/textures/gold-metal.png)",
                  backgroundSize: "512px 512px",
                  backgroundRepeat: "repeat",
                }}
              />
            )}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    rewardColors[todayReward.type].split(" ").slice(1).join(" ")
                  )}
                >
                  {(() => {
                    const Icon = rewardIcons[todayReward.type];
                    return (
                      <Icon
                        className={cn("w-6 h-6", rewardColors[todayReward.type].split(" ")[0])}
                      />
                    );
                  })()}
                </div>
                <div>
                  <p className="font-bold text-[#e8e0d5]">Today&apos;s Reward</p>
                  <p className={cn("text-sm", rewardColors[todayReward.type].split(" ")[0])}>
                    {todayReward.label || `${todayReward.amount} ${todayReward.type}`}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleClaim(todayReward.day)}
                disabled={claiming !== null}
                className="bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold"
              >
                {claiming === todayReward.day ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Claim
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Already claimed message */}
        {!todayReward && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
            <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-green-400 font-bold">Today&apos;s reward claimed!</p>
            <p className="text-[#a89f94] text-sm">Come back tomorrow for more rewards</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
