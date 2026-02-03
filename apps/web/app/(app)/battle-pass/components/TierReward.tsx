"use client";

import { cn } from "@/lib/utils";
import { Check, Crown, Lock } from "lucide-react";
import { MilestoneIcon, RewardIcon } from "./RewardIcon";

type RewardType = "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";

interface BattlePassReward {
  type: RewardType;
  amount?: number;
  cardId?: string;
  packProductId?: string;
  titleName?: string;
  avatarUrl?: string;
}

interface TierRewardProps {
  tier: number;
  reward?: BattlePassReward;
  isPremiumTrack: boolean;
  isPremiumUser: boolean;
  isUnlocked: boolean;
  isClaimed: boolean;
  canClaim: boolean;
  isMilestone?: boolean;
  onClaim: () => void;
}

export function TierReward({
  tier: _tier,
  reward,
  isPremiumTrack,
  isPremiumUser,
  isUnlocked,
  isClaimed,
  canClaim,
  isMilestone = false,
  onClaim,
}: TierRewardProps) {
  // tier is passed for potential future use (e.g., logging, analytics)
  void _tier;

  // No reward for this tier/track
  if (!reward) {
    return (
      <div className="w-20 h-24 flex items-center justify-center">
        <div className="w-16 h-16 rounded-lg border border-dashed border-[#3d2b1f]/50" />
      </div>
    );
  }

  const showClaim = canClaim && !isClaimed;

  return (
    <div className="relative w-20 flex flex-col items-center">
      {/* Milestone indicator */}
      {isMilestone && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <MilestoneIcon />
        </div>
      )}

      {/* Reward card */}
      <button
        onClick={showClaim ? onClaim : undefined}
        disabled={!showClaim}
        className={cn(
          "relative w-16 h-20 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 p-1",
          // Claimed state
          isClaimed && [
            "bg-green-500/10 border-green-500/50",
            isPremiumTrack && "bg-violet-500/10 border-violet-500/50",
          ],
          // Claimable state
          showClaim && [
            "cursor-pointer",
            isPremiumTrack
              ? "bg-violet-500/20 border-violet-500 hover:bg-violet-500/30 animate-pulse"
              : "bg-[#d4af37]/20 border-[#d4af37] hover:bg-[#d4af37]/30 animate-pulse",
          ],
          // Locked (tier not reached)
          !isUnlocked && "bg-black/20 border-[#3d2b1f] opacity-50",
          // Premium locked (tier reached but no premium)
          isUnlocked && isPremiumTrack && !isPremiumUser && [
            "bg-black/30 border-violet-500/30 opacity-70",
          ],
          // Unlocked but not yet claimable (already claimed or can't claim)
          isUnlocked && !showClaim && !isClaimed && "bg-black/20 border-[#3d2b1f]"
        )}
      >
        {/* Claimed checkmark overlay */}
        {isClaimed && (
          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center z-10">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                isPremiumTrack ? "bg-violet-500" : "bg-green-500"
              )}
            >
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
        )}

        {/* Lock overlay for premium track without premium */}
        {isUnlocked && isPremiumTrack && !isPremiumUser && !isClaimed && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10">
            <Crown className="w-6 h-6 text-violet-400" />
          </div>
        )}

        {/* Lock overlay for tier not reached */}
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10">
            <Lock className="w-5 h-5 text-[#a89f94]" />
          </div>
        )}

        {/* Reward content */}
        <RewardIcon type={reward.type} amount={reward.amount} size="sm" showAmount={true} />
      </button>

      {/* Premium crown badge */}
      {isPremiumTrack && (
        <div className="absolute -top-1 -right-1 z-20">
          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
            <Crown className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
