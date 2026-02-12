"use client";

import { PlayerCardModal } from "@/components/social/PlayerCardModal";
import { useLeaderboardInteraction } from "@/hooks/social/useLeaderboardInteraction";
import { Loader2 } from "lucide-react";
import { LeaderboardBattleHistory } from "./components/LeaderboardBattleHistory";
import { LeaderboardFilters } from "./components/LeaderboardFilters";
import { LeaderboardHeader } from "./components/LeaderboardHeader";
import { LeaderboardPodium } from "./components/LeaderboardPodium";
import { LeaderboardTable } from "./components/LeaderboardTable";
import { LeaderboardUserStats } from "./components/LeaderboardUserStats";

export default function LeaderboardsPage() {
  const {
    currentUser,
    profileLoading,
    activeType,
    setActiveType,
    activeSegment,
    setActiveSegment,
    selectedPlayer,
    rankings,
    userRank,
    battleHistory,
    lastUpdated,
    userInTop100,
    handlePlayerClick,
    handleOpponentClick,
    closePlayerModal,
  } = useLeaderboardInteraction();

  if (profileLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-yellow-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        <LeaderboardHeader lastUpdated={lastUpdated} />

        <LeaderboardFilters
          activeType={activeType}
          setActiveType={setActiveType}
          activeSegment={activeSegment}
          setActiveSegment={setActiveSegment}
        />

        {userRank && <LeaderboardUserStats userRank={userRank} activeType={activeType} />}

        <LeaderboardPodium
          rankings={rankings as any[]} // Todo: Unify types
          currentUserId={currentUser._id}
          onPlayerClick={handlePlayerClick}
        />

        <LeaderboardTable
          rankings={rankings as any[]}
          currentUserId={currentUser._id}
          activeType={activeType}
          activeSegment={activeSegment}
          onPlayerClick={handlePlayerClick}
          userRank={userRank as any}
          userInTop100={userInTop100}
          currentUser={currentUser}
        />

        <LeaderboardBattleHistory
          history={battleHistory as any[]}
          onOpponentClick={handleOpponentClick}
        />

        <div className="mt-6 text-center text-sm text-[#a89f94]">
          <p>
            Showing top {rankings.length} players {activeSegment !== "all" && `(${activeSegment})`}
          </p>
          <p className="mt-1">Rankings update every 5 minutes</p>
        </div>
      </div>

      <PlayerCardModal
        userId={selectedPlayer?.userId ?? null}
        isOpen={selectedPlayer !== null}
        onClose={closePlayerModal}
        initialData={selectedPlayer ?? undefined}
      />
    </div>
  );
}

