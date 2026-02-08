"use client";

import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";
import { useEffect, useRef } from "react";
import type { RewardType } from "@/types/economy";
import { TierReward } from "./TierReward";

interface BattlePassReward {
  type: RewardType;
  amount?: number;
  cardId?: string;
  packProductId?: string;
  titleName?: string;
  avatarUrl?: string;
}

interface BattlePassTier {
  tier: number;
  freeReward?: BattlePassReward;
  premiumReward?: BattlePassReward;
  isMilestone: boolean;
  isUnlocked: boolean;
  freeRewardClaimed: boolean;
  premiumRewardClaimed: boolean;
  canClaimFree: boolean;
  canClaimPremium: boolean;
}

interface TierTrackProps {
  tiers: BattlePassTier[];
  currentTier: number;
  isPremium: boolean;
  onClaimReward: (tier: number, track: "free" | "premium") => void;
}

export function TierTrack({ tiers, currentTier, isPremium, onClaimReward }: TierTrackProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentTierRef = useRef<HTMLDivElement>(null);

  // Scroll to current tier on mount and when tier changes
  useEffect(() => {
    if (currentTierRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = currentTierRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Center the current tier in the viewport
      const scrollLeft =
        element.offsetLeft - container.offsetLeft - containerRect.width / 2 + elementRect.width / 2;

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: "smooth",
      });
    }
  }, [currentTier]);

  return (
    <div className="relative">
      {/* Track Labels */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-violet-400" />
          <span className="text-sm font-bold text-violet-400 uppercase tracking-wide">
            Premium Track
          </span>
          {!isPremium && <span className="text-xs text-[#a89f94] ml-2">(Upgrade to unlock)</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#d4af37] uppercase tracking-wide">
            Free Track
          </span>
        </div>
      </div>

      {/* Scrollable Track Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#3d2b1f] scrollbar-track-transparent"
      >
        <div className="flex gap-0 min-w-max">
          {tiers.map((tier) => {
            const isCurrentTier = tier.tier === currentTier;
            const isPastTier = tier.tier < currentTier;

            return (
              <div
                key={tier.tier}
                ref={isCurrentTier ? currentTierRef : undefined}
                className="flex flex-col items-center"
              >
                {/* Premium Reward Row */}
                <div className="mb-2">
                  <TierReward
                    tier={tier.tier}
                    reward={tier.premiumReward}
                    isPremiumTrack={true}
                    isPremiumUser={isPremium}
                    isUnlocked={tier.isUnlocked}
                    isClaimed={tier.premiumRewardClaimed}
                    canClaim={tier.canClaimPremium}
                    isMilestone={tier.isMilestone}
                    onClaim={() => onClaimReward(tier.tier, "premium")}
                  />
                </div>

                {/* Tier Number & Progress Bar */}
                <div className="relative flex flex-col items-center w-20">
                  {/* Connector line */}
                  <div
                    className={cn(
                      "absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2",
                      tier.tier === 1 ? "left-1/2" : "",
                      tier.tier === tiers.length ? "right-1/2" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "h-full transition-colors",
                        isPastTier || isCurrentTier ? "bg-[#d4af37]" : "bg-[#3d2b1f]"
                      )}
                    />
                  </div>

                  {/* Tier number circle */}
                  <div
                    className={cn(
                      "relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                      isCurrentTier && [
                        "bg-[#d4af37] text-[#1a1614] ring-4 ring-[#d4af37]/30",
                        "shadow-lg shadow-[#d4af37]/30",
                      ],
                      isPastTier && "bg-[#d4af37]/20 text-[#d4af37] border-2 border-[#d4af37]",
                      !isPastTier &&
                        !isCurrentTier &&
                        "bg-[#1a1614] text-[#a89f94] border-2 border-[#3d2b1f]"
                    )}
                  >
                    {tier.tier}
                  </div>
                </div>

                {/* Free Reward Row */}
                <div className="mt-2">
                  <TierReward
                    tier={tier.tier}
                    reward={tier.freeReward}
                    isPremiumTrack={false}
                    isPremiumUser={isPremium}
                    isUnlocked={tier.isUnlocked}
                    isClaimed={tier.freeRewardClaimed}
                    canClaim={tier.canClaimFree}
                    isMilestone={tier.isMilestone}
                    onClaim={() => onClaimReward(tier.tier, "free")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gradient fade edges */}
      <div className="absolute top-0 left-0 bottom-4 w-8 bg-gradient-to-r from-[#0d0a09] to-transparent pointer-events-none z-10" />
      <div className="absolute top-0 right-0 bottom-4 w-8 bg-gradient-to-l from-[#0d0a09] to-transparent pointer-events-none z-10" />
    </div>
  );
}
