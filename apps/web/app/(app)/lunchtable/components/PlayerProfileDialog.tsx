"use client";

import { useCurrency } from "@/hooks";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChallengeConfirmDialog } from "./ChallengeConfirmDialog";

import { AgentsTab } from "./profile/AgentsTab";
import { BadgesTab } from "./profile/BadgesTab";
import { CallingCardSection } from "./profile/CallingCardSection";
import { DetailPopup } from "./profile/DetailPopup";
// Import profile components
import { ProfileHeader } from "./profile/ProfileHeader";
import { ProfileTabs } from "./profile/ProfileTabs";
import { StatsTab } from "./profile/StatsTab";

// Import types
import type { DetailItem, PlayerProfile } from "./profile/types";

interface PlayerProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

function calculateRankFromElo(elo: number): { tier: string; division: number; lp: number } {
  if (elo < 1000) return { tier: "Bronze", division: 3, lp: elo % 100 };
  if (elo < 1200) return { tier: "Bronze", division: 2, lp: elo % 100 };
  if (elo < 1400) return { tier: "Bronze", division: 1, lp: elo % 100 };
  if (elo < 1600) return { tier: "Silver", division: 3, lp: elo % 100 };
  if (elo < 1800) return { tier: "Silver", division: 2, lp: elo % 100 };
  if (elo < 2000) return { tier: "Silver", division: 1, lp: elo % 100 };
  if (elo < 2200) return { tier: "Gold", division: 3, lp: elo % 100 };
  if (elo < 2400) return { tier: "Gold", division: 2, lp: elo % 100 };
  if (elo < 2600) return { tier: "Gold", division: 1, lp: elo % 100 };
  if (elo < 2800) return { tier: "Platinum", division: 3, lp: elo % 100 };
  if (elo < 3000) return { tier: "Platinum", division: 2, lp: elo % 100 };
  if (elo < 3200) return { tier: "Platinum", division: 1, lp: elo % 100 };
  if (elo < 3400) return { tier: "Diamond", division: 3, lp: elo % 100 };
  if (elo < 3600) return { tier: "Diamond", division: 2, lp: elo % 100 };
  if (elo < 3800) return { tier: "Diamond", division: 1, lp: elo % 100 };
  if (elo < 4000) return { tier: "Master", division: 3, lp: elo % 100 };
  if (elo < 4200) return { tier: "Master", division: 2, lp: elo % 100 };
  if (elo < 4400) return { tier: "Master", division: 1, lp: elo % 100 };
  return { tier: "Legend", division: 1, lp: elo % 100 };
}

export function PlayerProfileDialog({ isOpen, onClose, username }: PlayerProfileDialogProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "badges" | "agents">("stats");
  const [selectedDetail, setSelectedDetail] = useState<DetailItem | null>(null);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);

  // Currency hook for wager challenges
  const { gold } = useCurrency();

  // Challenge mutation
  const sendChallengeMutation = useConvexMutation(typedApi.social.challenges.sendChallenge);

  // Fetch comprehensive user profile
  const userData = useConvexQuery(typedApi.core.users.getUserProfile, { username });

  // Fetch user's unlocked achievements
  const unlockedAchievements = useConvexQuery(
    typedApi.progression.achievements.getUnlockedAchievements,
    { username }
  );

  const handleChallengeConfirm = async (mode: "casual" | "ranked", wagerAmount?: number) => {
    try {
      await sendChallengeMutation({
        opponentUsername: username,
        mode,
        wagerAmount,
      });
      const wagerText = wagerAmount ? ` with a ${wagerAmount.toLocaleString()} gold wager` : "";
      toast.success(`Challenge sent to ${username}${wagerText}!`);
      setShowChallengeDialog(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send challenge";
      toast.error(errorMessage);
    }
  };

  const openCardDetail = (
    card: {
      id: string;
      name: string;
      element: "fire" | "water" | "earth" | "wind";
      rarity?: "common" | "rare" | "epic" | "legendary";
      timesPlayed?: number;
      attack?: number;
      defense?: number;
      cost?: number;
      ability?: string;
      flavorText?: string;
    },
    isCallingCard: boolean
  ) => {
    setSelectedDetail({
      type: "card",
      id: card.id,
      name: card.name,
      description: isCallingCard
        ? "This player's signature card - their calling card that represents their playstyle."
        : "This player's most frequently used card in battle.",
      element: card.element,
      rarity: card.rarity,
      timesPlayed: card.timesPlayed,
      attack: card.attack,
      defense: card.defense,
      cost: card.cost,
      ability: card.ability,
      flavorText: card.flavorText,
    });
  };

  const openBadgeDetail = (badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: number;
    rarity?: "common" | "rare" | "epic" | "legendary";
    howToEarn?: string;
  }) => {
    setSelectedDetail({
      type: "badge",
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earnedAt: badge.earnedAt,
      flavorText: badge.howToEarn,
      rarity: badge.rarity,
    });
  };

  const openAchievementDetail = (ach: {
    id: string;
    name: string;
    description: string;
    icon: string;
    progress?: number;
    maxProgress?: number;
    howToComplete?: string;
    reward?: string;
  }) => {
    setSelectedDetail({
      type: "achievement",
      id: ach.id,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      progress: ach.progress,
      maxProgress: ach.maxProgress,
      flavorText: ach.howToComplete,
      ability: ach.reward,
    });
  };

  if (!isOpen) return null;

  // Build profile from real user data
  const profile: PlayerProfile | null = userData
    ? {
        id: userData._id,
        username: userData.username || username,
        rank: {
          casual: calculateRankFromElo(userData.casualRating),
          ranked: calculateRankFromElo(userData.rankedElo),
        },
        stats: {
          totalGames: userData.totalWins + userData.totalLosses,
          wins: userData.totalWins,
          losses: userData.totalLosses,
          winStreak: 0, // currentWinStreak removed from schema
          longestWinStreak: 0, // longestWinStreak removed from schema
        },
        socials: {},
        agents: [],
        mostPlayedCard: {
          id: "placeholder",
          name: "Most Played Card",
          element: "fire",
          timesPlayed: 0,
        },
        callingCard: null,
        badges: unlockedAchievements
          ? unlockedAchievements.map((ach: NonNullable<typeof unlockedAchievements>[number]) => ({
              id: ach.achievementId,
              name: ach.name,
              description: ach.description,
              icon: ach.icon,
              earnedAt: ach.unlockedAt || Date.now(),
            }))
          : [],
        achievements: unlockedAchievements
          ? unlockedAchievements.map((ach: NonNullable<typeof unlockedAchievements>[number]) => ({
              id: ach.achievementId,
              name: ach.name,
              description: ach.description,
              icon: ach.icon,
              progress: 100,
              maxProgress: 100,
              howToComplete: ach.description,
              reward: "",
            }))
          : [],
        joinedAt: userData.createdAt || Date.now(),
        status: "online",
      }
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        className="fixed inset-0 z-80 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-85 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl tcg-chat-leather border border-[#3d2b1f] shadow-2xl pointer-events-auto animate-in zoom-in-95 fade-in duration-300">
          {/* Decorative corners */}
          <div className="ornament-corner ornament-corner-tl" />
          <div className="ornament-corner ornament-corner-tr" />
          <div className="ornament-corner ornament-corner-bl" />
          <div className="ornament-corner ornament-corner-br" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg border border-[#3d2b1f] bg-black/50 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Loading or Content */}
          {!profile ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <ProfileHeader profile={profile} onChallenge={() => setShowChallengeDialog(true)} />

              {/* Calling Card & Most Played */}
              <CallingCardSection profile={profile} onCardClick={openCardDetail} />

              {/* Tabs */}
              <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

              {/* Tab Content */}
              <div className="p-6 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#3d2b1f] scrollbar-track-transparent">
                {activeTab === "stats" && (
                  <StatsTab profile={profile} onAchievementClick={openAchievementDetail} />
                )}
                {activeTab === "badges" && (
                  <BadgesTab profile={profile} onBadgeClick={openBadgeDetail} />
                )}
                {activeTab === "agents" && <AgentsTab profile={profile} />}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#3d2b1f] bg-black/30">
                <p className="text-center text-[10px] text-[#a89f94]">
                  Member since{" "}
                  {new Date(profile.joinedAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Popup */}
      {selectedDetail && (
        <DetailPopup detail={selectedDetail} onClose={() => setSelectedDetail(null)} />
      )}

      {/* Challenge Dialog */}
      {showChallengeDialog && profile && (
        <ChallengeConfirmDialog
          isOpen={showChallengeDialog}
          onClose={() => setShowChallengeDialog(false)}
          onConfirm={handleChallengeConfirm}
          opponentUsername={username}
          opponentRank={profile.rank.ranked.tier}
          playerGold={gold}
        />
      )}
    </>
  );
}
