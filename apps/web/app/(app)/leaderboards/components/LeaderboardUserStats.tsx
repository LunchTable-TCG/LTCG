"use client";

interface RankItem {
  rating: number;
  rank: number;
  level: number;
  percentile: number;
}

interface LeaderboardUserStatsProps {
  userRank: RankItem;
  activeType: "ranked" | "casual" | "story";
}

export function LeaderboardUserStats({ userRank, activeType }: LeaderboardUserStatsProps) {
  return (
    <div className="mb-6 p-4 bg-linear-to-r from-[#d4af37]/10 to-transparent border border-[#d4af37]/30 rounded-lg">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <p className="text-xl font-semibold text-[#e8e0d5]">Top {100 - userRank.percentile}%</p>
        </div>
      </div>
    </div>
  );
}
