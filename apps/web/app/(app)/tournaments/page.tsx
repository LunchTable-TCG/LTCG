"use client";

import { useTournamentInteraction } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  Crown,
  Hash,
  History as HistoryIcon,
  Loader2,
  Medal,
  Plus,
  Trophy,
  Users,
} from "lucide-react";

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th";
  return `${n}${suffix}`;
}

import {
  CreateTournamentModal,
  JoinByCodeModal,
  RegisterModal,
  TournamentCard,
  UserTournamentCard,
} from "./components";

export default function TournamentsPage() {
  const {
    activeTab,
    setActiveTab,
    registeringForTournament,
    setRegisteringForTournament,
    showCreateModal,
    setShowCreateModal,
    showJoinCodeModal,
    setShowJoinCodeModal,
    gold,
    activeTournaments,
    communityTournaments,
    myHostedTournament,
    history,
    stats,
    selectedTournament,
    tournamentsLoading,
    historyLoading,
    communityLoading,
    hostedLoading,
    handleRegister,
    handleJoinCommunityTournament,
    canCreateTournament,
  } = useTournamentInteraction();

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-amber-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-[#d4af37]" />
              <h1 className="text-3xl font-bold text-[#e8e0d5]">Tournaments</h1>
            </div>
            <p className="text-[#a89f94]">
              Compete in single-elimination tournaments for glory and prizes
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJoinCodeModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-purple-400 font-bold text-sm uppercase tracking-wider transition-all"
            >
              <Hash className="w-4 h-4" />
              Join by Code
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              disabled={!canCreateTournament}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all",
                canCreateTournament
                  ? "bg-linear-to-r from-[#d4af37] to-amber-500 hover:from-amber-500 hover:to-[#d4af37] text-[#1a1614] shadow-lg"
                  : "bg-[#3d2b1f] text-[#6b5d52] cursor-not-allowed"
              )}
              title={
                canCreateTournament
                  ? "Create a tournament"
                  : "You already have an active tournament"
              }
            >
              <Plus className="w-4 h-4" />
              Create Tournament
            </button>
          </div>
        </div>

        {/* My Hosted Tournament Banner */}
        {myHostedTournament && (
          <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-purple-400 uppercase tracking-wider">
                    Your Tournament
                  </p>
                  <p className="font-bold text-[#e8e0d5]">{myHostedTournament.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-[#a89f94]">Players: </span>
                  <span className="text-[#e8e0d5] font-bold">
                    {myHostedTournament.registeredCount}/{myHostedTournament.maxPlayers}
                  </span>
                </div>
                {myHostedTournament.joinCode && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-purple-500/30">
                    <span className="text-xs text-[#a89f94]">Code:</span>
                    <span className="font-mono font-bold text-purple-400">
                      {myHostedTournament.joinCode}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar (if user has tournament history) */}
        {stats && stats.tournamentsPlayed > 0 && (
          <div className="mb-6 p-4 bg-linear-to-r from-[#d4af37]/10 to-transparent border border-[#d4af37]/30 rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">
                  Tournaments Played
                </p>
                <p className="text-xl font-bold text-[#e8e0d5]">{stats.tournamentsPlayed}</p>
              </div>
              <div>
                <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">
                  Tournaments Won
                </p>
                <p className="text-xl font-bold text-[#d4af37]">{stats.tournamentsWon}</p>
              </div>
              <div>
                <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">
                  Total Prize Won
                </p>
                <p className="text-xl font-bold text-amber-400">{stats.totalPrizeWon} Gold</p>
              </div>
              <div>
                <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">
                  Best Placement
                </p>
                <p className="text-xl font-bold text-[#e8e0d5]">
                  {stats.bestPlacement ? getOrdinalSuffix(stats.bestPlacement) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">
                  Match Win Rate
                </p>
                <p className="text-xl font-bold text-green-400">{stats.winRate.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all",
              activeTab === "active"
                ? "bg-[#d4af37] text-[#1a1614]"
                : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
            )}
          >
            <Trophy className="w-4 h-4" />
            <span>Official</span>
            {activeTournaments.length > 0 && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  activeTab === "active"
                    ? "bg-[#1a1614]/20 text-[#1a1614]"
                    : "bg-[#d4af37]/20 text-[#d4af37]"
                )}
              >
                {activeTournaments.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("community")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all",
              activeTab === "community"
                ? "bg-[#d4af37] text-[#1a1614]"
                : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
            )}
          >
            <Users className="w-4 h-4" />
            <span>Community</span>
            {communityTournaments.length > 0 && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  activeTab === "community"
                    ? "bg-[#1a1614]/20 text-[#1a1614]"
                    : "bg-purple-500/20 text-purple-400"
                )}
              >
                {communityTournaments.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all",
              activeTab === "history"
                ? "bg-[#d4af37] text-[#1a1614]"
                : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
            )}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === "active" ? (
          <div>
            {tournamentsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
              </div>
            ) : activeTournaments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament._id}
                    tournament={tournament}
                    onRegister={() => setRegisteringForTournament(tournament._id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Trophy}
                title="No Official Tournaments"
                description="Check back later for upcoming official tournaments!"
              />
            )}
          </div>
        ) : activeTab === "community" ? (
          <div>
            {communityLoading || hostedLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
              </div>
            ) : communityTournaments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {communityTournaments.map((tournament) => (
                  <UserTournamentCard
                    key={tournament._id}
                    tournament={tournament}
                    onJoin={handleJoinCommunityTournament}
                    showJoinCode={tournament._id === myHostedTournament?._id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No Community Tournaments"
                description="Be the first to create a community tournament!"
                action={
                  canCreateTournament ? (
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 flex items-center gap-2 px-5 py-3 rounded-lg bg-linear-to-r from-[#d4af37] to-amber-500 hover:from-amber-500 hover:to-[#d4af37] text-[#1a1614] font-bold text-sm uppercase tracking-wider shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Create Tournament
                    </button>
                  ) : null
                }
              />
            )}
          </div>
        ) : (
          <div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
              </div>
            ) : history.length > 0 ? (
              <div className="rounded-xl bg-black/40 border border-[#3d2b1f] overflow-hidden">
                {/* Table Header - Desktop */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-[#3d2b1f] text-xs font-bold text-[#a89f94] uppercase tracking-wider">
                  <div className="col-span-4">Tournament</div>
                  <div className="col-span-2 text-center">Placement</div>
                  <div className="col-span-2 text-center">Record</div>
                  <div className="col-span-2 text-center">Prize</div>
                  <div className="col-span-2 text-center">Date</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#3d2b1f]">
                  {history.map((entry) => (
                    <div key={entry._id} className="p-4 hover:bg-white/5 transition-colors">
                      {/* Mobile Layout */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[#e8e0d5]">{entry.tournamentName}</h3>
                          <span
                            className={cn(
                              "px-2 py-1 rounded text-xs font-bold",
                              entry.placement === 1
                                ? "bg-[#d4af37]/20 text-[#d4af37]"
                                : entry.placement === 2
                                  ? "bg-gray-400/20 text-gray-300"
                                  : entry.placement <= 4
                                    ? "bg-amber-600/20 text-amber-500"
                                    : "bg-[#3d2b1f] text-[#a89f94]"
                            )}
                          >
                            {getOrdinalSuffix(entry.placement)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs text-[#a89f94]">Record</p>
                            <p className="text-sm">
                              <span className="text-green-400">{entry.matchesWon}</span>/
                              <span className="text-[#e8e0d5]">{entry.matchesPlayed}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#a89f94]">Prize</p>
                            <p className="text-sm text-amber-400">
                              {entry.prizeWon > 0 ? `${entry.prizeWon} Gold` : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#a89f94]">Date</p>
                            <p className="text-sm text-[#e8e0d5]">
                              {new Date(entry.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                        {/* Tournament Name */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              entry.placement === 1
                                ? "bg-[#d4af37]/20"
                                : entry.placement <= 4
                                  ? "bg-amber-600/20"
                                  : "bg-[#3d2b1f]"
                            )}
                          >
                            {entry.placement === 1 ? (
                              <Crown className="w-5 h-5 text-[#d4af37]" />
                            ) : (
                              <Medal className="w-5 h-5 text-[#a89f94]" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#e8e0d5]">{entry.tournamentName}</p>
                            <p className="text-xs text-[#a89f94]">{entry.maxPlayers} players</p>
                          </div>
                        </div>

                        {/* Placement */}
                        <div className="col-span-2 text-center">
                          <span
                            className={cn(
                              "inline-block px-3 py-1 rounded text-sm font-bold",
                              entry.placement === 1
                                ? "bg-[#d4af37]/20 text-[#d4af37]"
                                : entry.placement === 2
                                  ? "bg-gray-400/20 text-gray-300"
                                  : entry.placement <= 4
                                    ? "bg-amber-600/20 text-amber-500"
                                    : "bg-[#3d2b1f] text-[#a89f94]"
                            )}
                          >
                            {getOrdinalSuffix(entry.placement)}
                          </span>
                        </div>

                        {/* Record */}
                        <div className="col-span-2 text-center">
                          <span className="text-green-400 font-bold">{entry.matchesWon}</span>
                          <span className="text-[#a89f94] mx-1">/</span>
                          <span className="text-[#e8e0d5]">{entry.matchesPlayed}</span>
                        </div>

                        {/* Prize */}
                        <div className="col-span-2 text-center">
                          {entry.prizeWon > 0 ? (
                            <span className="text-amber-400 font-bold">{entry.prizeWon} Gold</span>
                          ) : (
                            <span className="text-[#a89f94]">-</span>
                          )}
                        </div>

                        {/* Date */}
                        <div className="col-span-2 text-center">
                          <span className="text-[#a89f94] text-sm">
                            {new Date(entry.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={HistoryIcon}
                title="No Tournament History"
                description="Join a tournament to start building your history!"
              />
            )}
          </div>
        )}
      </div>

      {/* Register Modal (for official tournaments) */}
      {selectedTournament && (
        <RegisterModal
          tournament={selectedTournament}
          isOpen={registeringForTournament !== null}
          onClose={() => setRegisteringForTournament(null)}
          onConfirm={handleRegister}
        />
      )}

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userGoldBalance={gold}
      />

      {/* Join by Code Modal */}
      <JoinByCodeModal
        isOpen={showJoinCodeModal}
        onClose={() => setShowJoinCodeModal(false)}
        userGoldBalance={gold}
      />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Trophy;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#3d2b1f]/30 border border-[#3d2b1f] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#a89f94]/50" />
      </div>
      <h4 className="text-lg font-black text-[#e8e0d5] uppercase tracking-wide mb-1">{title}</h4>
      <p className="text-sm text-[#a89f94]">{description}</p>
      {action}
    </div>
  );
}
