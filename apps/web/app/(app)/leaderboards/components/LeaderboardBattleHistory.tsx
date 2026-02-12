"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Minus, Swords, TrendingDown, TrendingUp } from "lucide-react";

interface BattleMatch {
  _id: string;
  result: "win" | "loss";
  opponentUsername: string;
  ratingChange: number;
  ratingBefore: number;
  ratingAfter: number;
  completedAt: number;
  opponentId: string;
}

interface LeaderboardBattleHistoryProps {
  history: BattleMatch[];
  onOpponentClick: (match: BattleMatch) => void;
}

export function LeaderboardBattleHistory({
  history,
  onOpponentClick,
}: LeaderboardBattleHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <Swords className="w-6 h-6 text-[#d4af37]" />
        <h2 className="text-2xl font-bold text-[#e8e0d5]">Recent Matches</h2>
      </div>

      <div className="rounded-xl bg-black/40 border border-[#3d2b1f] overflow-hidden">
        {/* Header - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-[#3d2b1f] text-xs font-bold text-[#a89f94] uppercase tracking-wider">
          <div className="col-span-1">Result</div>
          <div className="col-span-4">Opponent</div>
          <div className="col-span-2 text-center">Rating Change</div>
          <div className="col-span-2 text-center">Before</div>
          <div className="col-span-2 text-center">After</div>
          <div className="col-span-1 text-center">Time</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#3d2b1f]">
          {history.map((match) => {
            const isWin = match.result === "win";
            const ratingChanged = match.ratingChange !== 0;

            return (
              <div
                key={match._id}
                className={cn(
                  "p-4 hover:bg-white/5 transition-colors",
                  isWin ? "bg-green-500/5" : "bg-red-500/5"
                )}
              >
                {/* Mobile Card Layout */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "px-2 py-1 rounded text-xs font-bold",
                          isWin ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        )}
                      >
                        {isWin ? "WIN" : "LOSS"}
                      </div>
                      <Avatar className="w-8 h-8 border border-[#3d2b1f]">
                        <AvatarFallback className="bg-[#1a1614] text-[#d4af37] text-xs font-bold">
                          {match.opponentUsername[0]}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="font-medium text-[#e8e0d5] hover:text-[#d4af37]"
                        onClick={() => onOpponentClick(match)}
                      >
                        {match.opponentUsername}
                      </button>
                    </div>
                    <span className="text-xs text-[#a89f94]">
                      {new Date(match.completedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-[#a89f94]">Change</p>
                      {ratingChanged ? (
                        <div className="flex items-center justify-center gap-1">
                          {match.ratingChange > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          )}
                          <span
                            className={cn(
                              "text-sm font-bold",
                              match.ratingChange > 0 ? "text-green-400" : "text-red-400"
                            )}
                          >
                            {match.ratingChange > 0 ? "+" : ""}
                            {match.ratingChange}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#a89f94]">0</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-[#a89f94]">Before</p>
                      <p className="text-sm text-[#e8e0d5]">{match.ratingBefore}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a89f94]">After</p>
                      <p className="text-sm font-medium text-[#e8e0d5]">{match.ratingAfter}</p>
                    </div>
                  </div>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
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
                    <button
                      type="button"
                      className="font-medium text-[#e8e0d5] hover:text-[#d4af37] truncate text-left"
                      onClick={() => onOpponentClick(match)}
                    >
                      {match.opponentUsername}
                    </button>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
