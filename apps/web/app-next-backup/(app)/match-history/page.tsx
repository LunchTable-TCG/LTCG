"use client";

import { Button } from "@/components/ui/button";
import { useMatchHistoryInteraction } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronRight,
  Filter,
  History,
  Loader2,
  Skull,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

const resultConfig: Record<
  "victory" | "defeat",
  { label: string; color: string; icon: typeof Trophy; bg: string }
> = {
  victory: {
    label: "Victory",
    color: "text-green-400",
    icon: Trophy,
    bg: "bg-green-500/20 border-green-500/30",
  },
  defeat: {
    label: "Defeat",
    color: "text-red-400",
    icon: Skull,
    bg: "bg-red-500/20 border-red-500/30",
  },
};

const modeLabels: Record<"ranked" | "casual" | "story", string> = {
  ranked: "Ranked",
  casual: "Casual",
  story: "Story",
};

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const _MATCHES_PER_PAGE = 10;

export default function MatchHistoryPage() {
  const {
    currentUser,
    isLoading,
    filter,
    setFilter,
    filteredMatches,
    hasMoreMatches,
    stats,
    loadMore,
  } = useMatchHistoryInteraction();

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-purple-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-8 h-8 text-[#d4af37]" />
            <h1 className="text-3xl font-bold text-[#e8e0d5]">Match History</h1>
          </div>
          <p className="text-[#a89f94]">Review your past battles and performance</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-black/40 border border-[#3d2b1f] text-center">
            <p className="text-2xl font-black text-[#e8e0d5]">{stats.total}</p>
            <p className="text-xs text-[#a89f94]">Total Matches</p>
          </div>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
            <p className="text-2xl font-black text-green-400">{stats.wins}</p>
            <p className="text-xs text-green-400/60">Victories</p>
          </div>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
            <p className="text-2xl font-black text-red-400">{stats.losses}</p>
            <p className="text-xs text-red-400/60">Defeats</p>
          </div>
          <div className="p-4 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-center">
            <p className="text-2xl font-black text-[#d4af37]">{stats.winRate}%</p>
            <p className="text-xs text-[#d4af37]/60">Win Rate</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-5 h-5 text-[#a89f94]" />
          <div className="flex gap-2">
            {(["all", "ranked", "casual", "story"] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setFilter(mode)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  filter === mode
                    ? "bg-[#d4af37] text-[#1a1614]"
                    : "bg-black/40 text-[#a89f94] hover:text-[#e8e0d5] border border-[#3d2b1f]"
                )}
              >
                {mode === "all" ? "All" : modeLabels[mode]}
              </button>
            ))}
          </div>
        </div>

        {/* Match List */}
        <div className="space-y-3">
          {filteredMatches.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-black/40 border border-[#3d2b1f]">
              <History className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
              <p className="text-[#a89f94]">No matches found</p>
            </div>
          ) : (
            filteredMatches.map((match: (typeof filteredMatches)[number]) => {
              const config = resultConfig[match.result as "victory" | "defeat"];
              const Icon = config.icon;

              return (
                <div
                  key={match.id}
                  data-testid="match-entry"
                  className={cn("p-4 rounded-xl border transition-all hover:bg-white/5", config.bg)}
                >
                  <div className="flex items-center gap-4">
                    {/* Result Icon */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        match.result === "victory" || match.result === "win"
                          ? "bg-green-500/20"
                          : "bg-red-500/20"
                      )}
                    >
                      <Icon className={cn("w-6 h-6", config.color)} />
                    </div>

                    {/* Match Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("font-bold", config.color)}>{config.label}</span>
                        <span className="text-[#a89f94]">vs</span>
                        <span className="font-medium text-[#e8e0d5]">
                          {match.opponent.username}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-black/40 text-[10px] text-[#a89f94] uppercase">
                          {modeLabels[match.mode]}
                        </span>
                      </div>
                      {match.xpGained > 0 && (
                        <div className="text-sm text-[#a89f94]">
                          <span className="text-[#d4af37] font-medium">+{match.xpGained} XP</span>
                        </div>
                      )}
                    </div>

                    {/* Rating Change & Time */}
                    <div className="text-right">
                      {match.ratingChange !== undefined && (
                        <div
                          className={cn(
                            "flex items-center justify-end gap-1 font-bold",
                            match.ratingChange > 0 ? "text-green-400" : "text-red-400"
                          )}
                        >
                          {match.ratingChange > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {match.ratingChange > 0 ? "+" : ""}
                          {match.ratingChange}
                        </div>
                      )}
                      <p className="text-xs text-[#a89f94] flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTimeAgo(match.timestamp)}
                      </p>
                    </div>

                    {/* View Details */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#a89f94] hover:text-[#e8e0d5]"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {hasMoreMatches && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              className="border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
              onClick={loadMore}
            >
              Load More Matches
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
