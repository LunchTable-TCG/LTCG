"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLeaderboard, useProfile } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  Bot,
  Crown,
  Loader2,
  Medal,
  Minus,
  Swords,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

type LeaderboardType = "ranked" | "casual" | "story";
type PlayerSegment = "all" | "humans" | "ai";

const rankColors: Record<number, string> = {
  1: "from-yellow-500/30 to-amber-600/20 border-yellow-500/50",
  2: "from-gray-300/30 to-slate-400/20 border-gray-400/50",
  3: "from-amber-600/30 to-orange-700/20 border-amber-600/50",
};

const rankIcons: Record<number, typeof Trophy> = {
  1: Crown,
  2: Medal,
  3: Medal,
};

export default function LeaderboardsPage() {
  const { profile: currentUser, isLoading: profileLoading } = useProfile();

  const [activeType, setActiveType] = useState<LeaderboardType>("ranked");
  const [activeSegment, setActiveSegment] = useState<PlayerSegment>("all");

  // Use leaderboard hook with filters
  const leaderboardData = useLeaderboard(activeType, activeSegment);
  const {
    rankings = [],
    myRank: userRank,
    battleHistory = [],
    lastUpdated,
    isLoading = true,
  } = leaderboardData || {};

  const leaderboardTypes: { id: LeaderboardType; label: string; icon: typeof Trophy }[] = [
    { id: "ranked", label: "Ranked (ELO)", icon: Trophy },
    { id: "casual", label: "Casual", icon: Swords },
    { id: "story", label: "Story (XP)", icon: Zap },
  ];

  const playerSegments: { id: PlayerSegment; label: string; icon: typeof Users }[] = [
    { id: "all", label: "All Players", icon: Users },
    { id: "humans", label: "Humans Only", icon: Users },
    { id: "ai", label: "AI Agents", icon: Bot },
  ];

  if (profileLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  // Check if current user is in top 100
  const userInTop100 = rankings.some(
    (p: (typeof rankings)[number]) => p.userId === currentUser._id
  );

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-yellow-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[#d4af37]" />
            <h1 className="text-3xl font-bold text-[#e8e0d5]">Leaderboards</h1>
          </div>
          <p className="text-[#a89f94]">See how you rank against other players</p>
          {lastUpdated && (
            <p className="text-xs text-[#a89f94] mt-1">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Type Tabs */}
        <div className="flex gap-2 mb-4 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
          {leaderboardTypes.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeType === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveType(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all",
                  isActive
                    ? "bg-[#d4af37] text-[#1a1614]"
                    : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Segment Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
          {playerSegments.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSegment === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveSegment(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm",
                  isActive
                    ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50"
                    : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
                )}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* User's Current Rank Card */}
        {userRank && (
          <div className="mb-6 p-4 bg-linear-to-r from-[#d4af37]/10 to-transparent border border-[#d4af37]/30 rounded-lg">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[#a89f94] mb-1">Your Rank</p>
                <p className="text-2xl font-bold text-[#d4af37]">#{userRank.rank}</p>
              </div>
              <div>
                <p className="text-sm text-[#a89f94] mb-1">
                  {activeType === "story" ? "XP" : "Rating"}
                </p>
                <p className="text-xl font-semibold text-[#e8e0d5]">{userRank.rating}</p>
              </div>
              <div>
                <p className="text-sm text-[#a89f94] mb-1">Level</p>
                <p className="text-xl font-semibold text-[#e8e0d5]">{userRank.level}</p>
              </div>
              <div>
                <p className="text-sm text-[#a89f94] mb-1">Percentile</p>
                <p className="text-xl font-semibold text-[#e8e0d5]">
                  Top {100 - userRank.percentile}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        {rankings.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            {[2, 1, 3].map((position) => {
              const player = rankings[position - 1];
              if (!player) return null;
              const Icon = rankIcons[position] || Medal;
              const isFirst = position === 1;
              const isCurrentUser = player.userId === currentUser._id;

              return (
                <div
                  key={position}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border bg-linear-to-b",
                    rankColors[position],
                    isFirst && "order-2 -mt-4",
                    isCurrentUser && "ring-2 ring-[#d4af37]"
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                      position === 1
                        ? "bg-yellow-500/30"
                        : position === 2
                          ? "bg-gray-400/30"
                          : "bg-amber-600/30"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6",
                        position === 1
                          ? "text-yellow-400"
                          : position === 2
                            ? "text-gray-300"
                            : "text-amber-500"
                      )}
                    />
                  </div>
                  <Avatar className="w-16 h-16 border-2 border-[#3d2b1f] mb-2">
                    <AvatarFallback className="bg-[#1a1614] text-[#d4af37] text-xl font-bold">
                      {player.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-bold text-[#e8e0d5] text-center truncate w-full">
                    {player.username || "Unknown"}
                    {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-black",
                      position === 1
                        ? "text-yellow-400"
                        : position === 2
                          ? "text-gray-300"
                          : "text-amber-500"
                    )}
                  >
                    {player.rating}
                  </p>
                  <p className="text-xs text-[#a89f94]">
                    {player.wins}W / {player.losses}L ({player.winRate}%)
                  </p>
                  {player.isAiAgent && (
                    <div className="mt-1 px-2 py-0.5 bg-blue-500/20 rounded-full">
                      <p className="text-xs text-blue-400 flex items-center gap-1">
                        <Bot className="w-3 h-3" /> AI
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="rounded-xl bg-black/40 border border-[#3d2b1f] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-[#3d2b1f] text-xs font-bold text-[#a89f94] uppercase tracking-wider">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2 text-center">{activeType === "story" ? "XP" : "Rating"}</div>
            <div className="col-span-2 text-center">Level</div>
            <div className="col-span-2 text-center">W/L</div>
            <div className="col-span-1 text-center">Win %</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#3d2b1f]">
            {rankings.length === 0 ? (
              <div className="p-8 text-center text-[#a89f94]">
                <p>No players found for this leaderboard yet.</p>
                <p className="text-sm mt-2">Be the first to play!</p>
              </div>
            ) : (
              rankings.map((player: (typeof rankings)[number]) => {
                const isCurrentUser = player.userId === currentUser._id;
                return (
                  <div
                    key={player.userId}
                    className={cn(
                      "grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors",
                      isCurrentUser && "bg-[#d4af37]/10 hover:bg-[#d4af37]/15"
                    )}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "font-bold",
                          player.rank <= 3 ? "text-[#d4af37]" : "text-[#e8e0d5]"
                        )}
                      >
                        #{player.rank}
                      </span>
                    </div>

                    {/* Player */}
                    <div className="col-span-4 flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-[#3d2b1f]">
                        <AvatarFallback className="bg-[#1a1614] text-[#d4af37] font-bold">
                          {player.username?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-medium truncate",
                            isCurrentUser ? "text-[#d4af37]" : "text-[#e8e0d5]"
                          )}
                        >
                          {player.username}
                          {isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
                        </p>
                        {player.isAiAgent && (
                          <p className="text-xs text-blue-400 flex items-center gap-1">
                            <Bot className="w-3 h-3" /> AI Agent
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Rating/XP */}
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-[#e8e0d5]">{player.rating}</span>
                    </div>

                    {/* Level */}
                    <div className="col-span-2 text-center">
                      <span className="font-semibold text-[#d4af37]">{player.level}</span>
                    </div>

                    {/* W/L */}
                    <div className="col-span-2 text-center text-sm">
                      <span className="text-green-400">{player.wins}</span>
                      <span className="text-[#a89f94] mx-1">/</span>
                      <span className="text-red-400">{player.losses}</span>
                    </div>

                    {/* Win % */}
                    <div className="col-span-1 text-center">
                      <span className="text-[#e8e0d5] font-medium">{player.winRate}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Current User (if not in top 100) */}
          {userRank && !userInTop100 && (
            <>
              <div className="p-2 text-center text-[#a89f94] text-sm border-t border-[#3d2b1f]">
                • • •
              </div>
              <div className="grid grid-cols-12 gap-4 p-4 items-center bg-[#d4af37]/10 border-t border-[#d4af37]/30">
                <div className="col-span-1">
                  <span className="font-bold text-[#d4af37]">#{userRank.rank}</span>
                </div>
                <div className="col-span-4 flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-[#d4af37]/50">
                    <AvatarFallback className="bg-[#1a1614] text-[#d4af37] font-bold">
                      {currentUser.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-[#d4af37]">
                    {currentUser.username} <span className="text-xs">(You)</span>
                  </p>
                </div>
                <div className="col-span-2 text-center font-bold text-[#e8e0d5]">
                  {userRank.rating}
                </div>
                <div className="col-span-2 text-center font-semibold text-[#d4af37]">
                  {userRank.level}
                </div>
                <div className="col-span-2 text-center text-sm">
                  <span className="text-[#a89f94]">-</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-[#a89f94]">-</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Battle History Section */}
        {battleHistory.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <Swords className="w-6 h-6 text-[#d4af37]" />
              <h2 className="text-2xl font-bold text-[#e8e0d5]">Recent Matches</h2>
            </div>

            <div className="rounded-xl bg-black/40 border border-[#3d2b1f] overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-[#3d2b1f] text-xs font-bold text-[#a89f94] uppercase tracking-wider">
                <div className="col-span-1">Result</div>
                <div className="col-span-4">Opponent</div>
                <div className="col-span-2 text-center">Rating Change</div>
                <div className="col-span-2 text-center">Before</div>
                <div className="col-span-2 text-center">After</div>
                <div className="col-span-1 text-center">Time</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#3d2b1f]">
                {battleHistory.map((match) => {
                  const isWin = match.result === "win";
                  const ratingChanged = match.ratingChange !== 0;

                  return (
                    <div
                      key={match._id}
                      className={cn(
                        "grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors",
                        isWin ? "bg-green-500/5" : "bg-red-500/5"
                      )}
                    >
                      {/* Result */}
                      <div className="col-span-1">
                        <div
                          className={cn(
                            "px-2 py-1 rounded text-xs font-bold text-center",
                            isWin ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {isWin ? "WIN" : "LOSS"}
                        </div>
                      </div>

                      {/* Opponent */}
                      <div className="col-span-4 flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-[#3d2b1f]">
                          <AvatarFallback className="bg-[#1a1614] text-[#d4af37] text-xs font-bold">
                            {match.opponentUsername[0]}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-[#e8e0d5] truncate">
                          {match.opponentUsername}
                        </p>
                      </div>

                      {/* Rating Change */}
                      <div className="col-span-2 text-center">
                        {ratingChanged ? (
                          <div className="flex items-center justify-center gap-1">
                            {match.ratingChange > 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                            <span
                              className={cn(
                                "font-bold",
                                match.ratingChange > 0 ? "text-green-400" : "text-red-400"
                              )}
                            >
                              {match.ratingChange > 0 ? "+" : ""}
                              {match.ratingChange}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Minus className="w-4 h-4 text-[#a89f94]" />
                            <span className="text-[#a89f94] font-medium ml-1">0</span>
                          </div>
                        )}
                      </div>

                      {/* Rating Before */}
                      <div className="col-span-2 text-center">
                        <span className="text-[#a89f94]">{match.ratingBefore}</span>
                      </div>

                      {/* Rating After */}
                      <div className="col-span-2 text-center">
                        <span className="font-medium text-[#e8e0d5]">{match.ratingAfter}</span>
                      </div>

                      {/* Time */}
                      <div className="col-span-1 text-center">
                        <span className="text-xs text-[#a89f94]">
                          {new Date(match.completedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-[#a89f94]">
          <p>
            Showing top {rankings.length} players {activeSegment !== "all" && `(${activeSegment})`}
          </p>
          <p className="mt-1">Rankings update every 5 minutes</p>
        </div>
      </div>
    </div>
  );
}
