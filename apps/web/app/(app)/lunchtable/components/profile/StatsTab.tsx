/**
 * Stats Tab Component
 * Displays player statistics, streaks, and achievements
 */

import { Crown, Star, Zap } from "lucide-react";
import { BADGE_ICONS } from "./constants";
import type { PlayerProfile } from "./types";

interface StatsTabProps {
  profile: PlayerProfile;
  onAchievementClick: (achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    progress?: number;
    maxProgress?: number;
  }) => void;
}

export function StatsTab({ profile, onAchievementClick }: StatsTabProps) {
  const winRate = ((profile.stats.wins / profile.stats.totalGames) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-3 rounded-xl bg-black/30 border border-[#3d2b1f]">
          <p className="text-2xl font-black text-[#d4af37]">{profile.stats.totalGames}</p>
          <p className="text-[10px] text-[#a89f94] uppercase tracking-wider">Games</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-black/30 border border-[#3d2b1f]">
          <p className="text-2xl font-black text-green-400">{profile.stats.wins}</p>
          <p className="text-[10px] text-[#a89f94] uppercase tracking-wider">Wins</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-black/30 border border-[#3d2b1f]">
          <p className="text-2xl font-black text-red-400">{profile.stats.losses}</p>
          <p className="text-[10px] text-[#a89f94] uppercase tracking-wider">Losses</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-black/30 border border-[#3d2b1f]">
          <p className="text-2xl font-black text-[#e8e0d5]">{winRate}%</p>
          <p className="text-[10px] text-[#a89f94] uppercase tracking-wider">Win Rate</p>
        </div>
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-[#3d2b1f]">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-lg font-black text-orange-400">{profile.stats.winStreak}</p>
            <p className="text-[10px] text-[#a89f94] uppercase tracking-wider">Current Streak</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-[#3d2b1f]">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-lg font-black text-purple-400">{profile.stats.longestWinStreak}</p>
            <p className="text-[10px] text-[#a89f94] uppercase tracking-wider">Best Streak</p>
          </div>
        </div>
      </div>

      {/* Achievements Progress */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-[#a89f94] uppercase tracking-wider">Achievements</h4>
        {profile.achievements.map((ach) => {
          const Icon = BADGE_ICONS[ach.icon] || Star;
          const hasProgress = ach.progress !== undefined && ach.maxProgress !== undefined;
          const progressPercent =
            hasProgress && ach.progress !== undefined && ach.maxProgress !== undefined
              ? (ach.progress / ach.maxProgress) * 100
              : 100;

          return (
            <button
              type="button"
              key={ach.id}
              onClick={() => onAchievementClick(ach)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-[#3d2b1f]/50 text-left hover:border-[#d4af37]/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#d4af37]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-[#e8e0d5]">{ach.name}</p>
                  {hasProgress && (
                    <span className="text-[10px] text-[#a89f94]">
                      {ach.progress}/{ach.maxProgress}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#a89f94] mb-1">{ach.description}</p>
                {hasProgress && (
                  <div className="h-1.5 rounded-full bg-black/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-[#d4af37] to-[#f4d03f] transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
