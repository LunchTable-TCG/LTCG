"use client";

import { Trophy } from "lucide-react";

interface LeaderboardHeaderProps {
  lastUpdated?: number;
}

export function LeaderboardHeader({ lastUpdated }: LeaderboardHeaderProps) {
  return (
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
  );
}
