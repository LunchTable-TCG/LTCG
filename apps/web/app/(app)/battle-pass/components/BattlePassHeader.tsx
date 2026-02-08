"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Clock, Crown, Sparkles, Star, Trophy } from "lucide-react";

interface BattlePassHeaderProps {
  seasonName?: string;
  battlePassName: string;
  currentTier: number;
  totalTiers: number;
  currentXP: number;
  xpPerTier: number;
  xpToNextTier: number;
  xpProgress: number;
  daysRemaining: number;
  isPremium: boolean;
  onUpgradeClick: () => void;
}

export function BattlePassHeader({
  seasonName,
  battlePassName,
  currentTier,
  totalTiers,
  currentXP,
  xpPerTier,
  xpToNextTier,
  xpProgress,
  daysRemaining,
  isPremium,
  onUpgradeClick,
}: BattlePassHeaderProps) {
  const isMaxTier = currentTier >= totalTiers;
  const xpInCurrentTier = currentXP % xpPerTier;

  return (
    <div className="mb-8">
      {/* Title Row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[#d4af37]" />
            <h1 className="text-3xl font-bold text-[#e8e0d5]">Battle Pass</h1>
            {isPremium && (
              <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 text-sm font-bold flex items-center gap-1">
                <Crown className="w-4 h-4" />
                Premium
              </span>
            )}
          </div>
          <p className="text-[#a89f94]">
            {seasonName ? `${seasonName} - ` : ""}
            {battlePassName}
          </p>
        </div>

        {/* Time Remaining */}
        <div className="text-right">
          <div className="flex items-center gap-2 text-[#a89f94]">
            <Clock className="w-5 h-5" />
            <span className="text-lg">
              <span
                className={cn("font-bold", daysRemaining <= 7 ? "text-red-400" : "text-[#e8e0d5]")}
              >
                {daysRemaining}
              </span>{" "}
              days remaining
            </span>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
        <div className="flex items-center justify-between gap-8">
          {/* Current Tier Display */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center border-4",
                  isPremium
                    ? "bg-violet-500/20 border-violet-500"
                    : "bg-[#d4af37]/20 border-[#d4af37]"
                )}
              >
                <div className="text-center">
                  <div
                    className={cn(
                      "text-3xl font-black",
                      isPremium ? "text-violet-400" : "text-[#d4af37]"
                    )}
                  >
                    {currentTier}
                  </div>
                  <div className="text-xs text-[#a89f94] uppercase tracking-wide">Tier</div>
                </div>
              </div>
              {isMaxTier && (
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-6 h-6 text-[#d4af37]" />
                </div>
              )}
            </div>

            {/* XP Progress */}
            <div className="flex-1 min-w-[200px]">
              {isMaxTier ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-[#d4af37]">
                    <Star className="w-5 h-5" />
                    <span className="text-lg font-bold">Max Tier Reached!</span>
                    <Star className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-[#a89f94] mt-1">
                    {currentXP.toLocaleString()} total XP earned
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#a89f94]">
                      Progress to Tier {currentTier + 1}
                    </span>
                    <span className="text-sm font-bold text-[#e8e0d5]">
                      {xpInCurrentTier.toLocaleString()} / {xpPerTier.toLocaleString()} XP
                    </span>
                  </div>
                  <Progress
                    value={xpProgress}
                    className={cn("h-4 bg-black/50", isPremium && "[&>div]:bg-violet-500")}
                  />
                  <p className="text-xs text-[#a89f94] mt-2 text-right">
                    {xpToNextTier.toLocaleString()} XP to next tier
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Premium Upgrade Button (if not premium) */}
          {!isPremium && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 hover:from-violet-500 hover:via-violet-400 hover:to-violet-500 text-white font-bold transition-all flex items-center gap-2 shadow-lg shadow-violet-500/25"
            >
              <Crown className="w-5 h-5" />
              <span>Upgrade to Premium</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
