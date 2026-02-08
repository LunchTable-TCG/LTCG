"use client";

import { useBattlePass } from "@/hooks";
import { cn } from "@/lib/utils";
import { Gift, Loader2, Trophy } from "lucide-react";
import { useState } from "react";
import { BattlePassHeader } from "./components/BattlePassHeader";
import { PremiumUpgradeModal } from "./components/PremiumUpgradeModal";
import { RewardClaimModal } from "./components/RewardClaimModal";
import type { RewardType } from "@/types/economy";
import { TierTrack } from "./components/TierTrack";

interface BattlePassReward {
  type: RewardType;
  amount?: number;
  cardId?: string;
  packProductId?: string;
  titleName?: string;
  avatarUrl?: string;
}

interface ClaimModalState {
  isOpen: boolean;
  tier: number;
  track: "free" | "premium";
  reward: BattlePassReward | null;
}

export default function BattlePassPage() {
  const {
    status,
    tiers,
    isLoading,
    hasActiveBattlePass,
    isPremium,
    currentTier,
    totalTiers,
    xpProgress,
    xpToNextTier,
    daysRemaining,
    totalClaimableCount,
    claimableFreeCount,
    claimablePremiumCount,
    claimReward,
    claimAllRewards,
    purchasePremium,
  } = useBattlePass();

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [claimModalState, setClaimModalState] = useState<ClaimModalState>({
    isOpen: false,
    tier: 0,
    track: "free",
    reward: null,
  });
  const [isClaimingAll, setIsClaimingAll] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  // No active battle pass
  if (!hasActiveBattlePass || !status) {
    return (
      <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-violet-900/10 via-[#0d0a09] to-[#0d0a09]" />
        <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
          <div className="text-center py-16 rounded-xl bg-black/40 border border-[#3d2b1f]">
            <Trophy className="w-16 h-16 text-[#a89f94]/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#e8e0d5] mb-2">No Active Battle Pass</h2>
            <p className="text-[#a89f94] max-w-md mx-auto">
              There is no active battle pass season at the moment. Check back later for the next
              season with exciting new rewards!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle reward claim from tier track
  const handleClaimFromTrack = (tier: number, track: "free" | "premium") => {
    const tierData = tiers.find((t) => t.tier === tier);
    if (!tierData) return;

    const reward = track === "free" ? tierData.freeReward : tierData.premiumReward;
    if (!reward) return;

    setClaimModalState({
      isOpen: true,
      tier,
      track,
      reward,
    });
  };

  // Handle single reward claim
  const handleClaimReward = async () => {
    await claimReward(claimModalState.tier, claimModalState.track);
  };

  // Handle claim all
  const handleClaimAll = async () => {
    if (totalClaimableCount === 0) return;
    setIsClaimingAll(true);
    try {
      await claimAllRewards();
    } finally {
      setIsClaimingAll(false);
    }
  };

  // Calculate unlocked premium rewards for modal
  const unlockedPremiumRewards = tiers.filter(
    (t) => t.isUnlocked && t.premiumReward && !t.premiumRewardClaimed
  ).length;

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))]",
          isPremium
            ? "from-violet-900/10 via-[#0d0a09] to-[#0d0a09]"
            : "from-yellow-900/10 via-[#0d0a09] to-[#0d0a09]"
        )}
      />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header Section */}
        <BattlePassHeader
          seasonName={status.seasonName}
          battlePassName={status.name}
          currentTier={currentTier}
          totalTiers={totalTiers}
          currentXP={status.currentXP}
          xpPerTier={status.xpPerTier}
          xpToNextTier={xpToNextTier}
          xpProgress={xpProgress}
          daysRemaining={daysRemaining}
          isPremium={isPremium}
          onUpgradeClick={() => setShowPremiumModal(true)}
        />

        {/* Claim All Button */}
        {totalClaimableCount > 0 && (
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={handleClaimAll}
              disabled={isClaimingAll}
              className={cn(
                "px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2",
                isPremium
                  ? "bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 hover:from-violet-500 hover:via-violet-400 hover:to-violet-500"
                  : "bg-gradient-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d]",
                "text-white shadow-lg disabled:opacity-70"
              )}
            >
              {isClaimingAll ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  <span>
                    Claim All ({totalClaimableCount})
                    {isPremium && claimablePremiumCount > 0 && (
                      <span className="ml-1 text-xs opacity-80">
                        ({claimableFreeCount}F + {claimablePremiumCount}P)
                      </span>
                    )}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tier Track */}
        <div className="p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
          <TierTrack
            tiers={tiers}
            currentTier={currentTier}
            isPremium={isPremium}
            onClaimReward={handleClaimFromTrack}
          />
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-[#a89f94]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#d4af37]/20 border border-[#d4af37]" />
            <span>Claimable Free</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-violet-500/20 border border-violet-500" />
            <span>Claimable Premium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/10 border border-green-500/50" />
            <span>Claimed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-black/20 border border-[#3d2b1f] opacity-50" />
            <span>Locked</span>
          </div>
        </div>
      </div>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        unlockedPremiumRewards={unlockedPremiumRewards}
        onPurchase={purchasePremium}
      />

      {/* Reward Claim Modal */}
      {claimModalState.reward && (
        <RewardClaimModal
          isOpen={claimModalState.isOpen}
          onClose={() => setClaimModalState((s) => ({ ...s, isOpen: false }))}
          tier={claimModalState.tier}
          track={claimModalState.track}
          reward={claimModalState.reward}
          onClaim={handleClaimReward}
        />
      )}
    </div>
  );
}
