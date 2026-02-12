"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, Crown, Medal, Trophy } from "lucide-react";

interface RankItem {
  userId: string;
  username: string;
  rating: number;
  rank: number;
  wins: number;
  losses: number;
  winRate: number;
  level: number;
  isAiAgent?: boolean;
}

interface LeaderboardPodiumProps {
  rankings: RankItem[];
  currentUserId?: string;
  onPlayerClick: (player: RankItem) => void;
}

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

export function LeaderboardPodium({
  rankings,
  currentUserId,
  onPlayerClick,
}: LeaderboardPodiumProps) {
  if (rankings.length < 3) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
      {[2, 1, 3].map((position) => {
        const player = rankings[position - 1];
        if (!player) return null;
        const Icon = rankIcons[position] || Medal;
        const isFirst = position === 1;
        const isCurrentUser = player.userId === currentUserId;

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
            {isCurrentUser ? (
              <p className="font-bold text-[#e8e0d5] text-center truncate w-full">
                {player.username || "Unknown"}
                <span className="text-xs ml-1">(You)</span>
              </p>
            ) : (
              <button
                type="button"
                className="font-bold text-[#e8e0d5] hover:text-[#d4af37] text-center truncate w-full"
                onClick={() => onPlayerClick(player)}
              >
                {player.username || "Unknown"}
              </button>
            )}
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
  );
}
