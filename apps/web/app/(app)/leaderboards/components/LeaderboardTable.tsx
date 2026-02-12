import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

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

interface LeaderboardTableProps {
  rankings: RankItem[];
  currentUserId?: string;
  activeType: "ranked" | "casual" | "story";
  activeSegment: "all" | "humans" | "ai";
  onPlayerClick: (player: RankItem) => void;
  userRank?: RankItem;
  userInTop100: boolean;
  currentUser?: { username?: string };
}

export function LeaderboardTable({
  rankings,
  currentUserId,
  activeType,
  onPlayerClick,
  userRank,
  userInTop100,
  currentUser,
}: LeaderboardTableProps) {
  return (
    <div
      data-testid="leaderboard"
      className="rounded-xl bg-black/40 border border-[#3d2b1f] overflow-hidden"
    >
      {/* Header - Hidden on mobile */}
      <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-[#3d2b1f] text-xs font-bold text-[#a89f94] uppercase tracking-wider">
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
          rankings.map((player) => {
            const isCurrentUser = player.userId === currentUserId;
            return (
              <div
                key={player.userId}
                data-testid="leaderboard-entry"
                className={cn(
                  "p-4 hover:bg-white/5 transition-colors",
                  isCurrentUser && "bg-[#d4af37]/10 hover:bg-[#d4af37]/15"
                )}
              >
                {/* Mobile Card Layout */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "text-lg font-bold",
                          player.rank <= 3 ? "text-[#d4af37]" : "text-[#e8e0d5]"
                        )}
                      >
                        #{player.rank}
                      </span>
                      <Avatar className="w-10 h-10 border border-[#3d2b1f]">
                        <AvatarFallback className="bg-[#1a1614] text-[#d4af37] font-bold">
                          {player.username?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        {isCurrentUser ? (
                          <p className="font-medium text-[#d4af37]">
                            {player.username}
                            <span className="text-xs ml-1">(You)</span>
                          </p>
                        ) : (
                          <button
                            type="button"
                            className="font-medium text-[#e8e0d5] hover:text-[#d4af37] text-left"
                            onClick={() => onPlayerClick(player)}
                          >
                            {player.username}
                          </button>
                        )}
                        {player.isAiAgent && (
                          <p className="text-xs text-blue-400 flex items-center gap-1">
                            <Bot className="w-3 h-3" /> AI
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-[#a89f94]">
                        {activeType === "story" ? "XP" : "Rating"}
                      </p>
                      <p className="font-bold text-[#e8e0d5]">{player.rating}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a89f94]">Level</p>
                      <p className="font-semibold text-[#d4af37]">{player.level}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a89f94]">W/L</p>
                      <p className="text-sm">
                        <span className="text-green-400">{player.wins}</span>/
                        <span className="text-red-400">{player.losses}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a89f94]">Win %</p>
                      <p className="font-medium text-[#e8e0d5]">{player.winRate}%</p>
                    </div>
                  </div>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
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
                      {isCurrentUser ? (
                        <p className="font-medium truncate text-[#d4af37]">
                          {player.username}
                          <span className="ml-2 text-xs">(You)</span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          className="font-medium truncate text-[#e8e0d5] hover:text-[#d4af37] text-left"
                          onClick={() => onPlayerClick(player)}
                        >
                          {player.username}
                        </button>
                      )}
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
              </div>
            );
          })
        )}
      </div>

      {/* Current User (if not in top 100) */}
      {userRank && !userInTop100 && currentUser && (
        <>
          <div className="p-2 text-center text-[#a89f94] text-sm border-t border-[#3d2b1f]">
            • • •
          </div>
          <div className="p-4 bg-[#d4af37]/10 border-t border-[#d4af37]/30">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-[#d4af37]">#{userRank.rank}</span>
                <Avatar className="w-10 h-10 border-2 border-[#d4af37]/50">
                  <AvatarFallback className="bg-[#1a1614] text-[#d4af37] font-bold">
                    {currentUser.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium text-[#d4af37]">
                  {currentUser.username} <span className="text-xs">(You)</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-xs text-[#a89f94]">
                    {activeType === "story" ? "XP" : "Rating"}
                  </p>
                  <p className="font-bold text-[#e8e0d5]">{userRank.rating}</p>
                </div>
                <div>
                  <p className="text-xs text-[#a89f94]">Level</p>
                  <p className="font-semibold text-[#d4af37]">{userRank.level}</p>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-center">
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
          </div>
        </>
      )}
    </div>
  );
}
