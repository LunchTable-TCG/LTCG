import { cn } from "@/lib/utils";
import { Bot, Swords, Trophy, Users, Zap } from "lucide-react";

type LeaderboardType = "ranked" | "casual" | "story";
type PlayerSegment = "all" | "humans" | "ai";

interface LeaderboardFiltersProps {
  activeType: LeaderboardType;
  setActiveType: (type: LeaderboardType) => void;
  activeSegment: PlayerSegment;
  setActiveSegment: (segment: PlayerSegment) => void;
}

export function LeaderboardFilters({
  activeType,
  setActiveType,
  activeSegment,
  setActiveSegment,
}: LeaderboardFiltersProps) {
  const leaderboardTypes: { id: LeaderboardType; label: string; icon: typeof Trophy }[] = [
    { id: "ranked", label: "Ranked (ELO)", icon: Trophy },
    { id: "casual", label: "Casual", icon: Swords },
    { id: "story", label: "Story (XP)", icon: Zap },
  ];

  const playerSegments: { id: PlayerSegment; label: string; icon: typeof Users }[] = [
    { id: "humans", label: "Humans", icon: Users },
    { id: "ai", label: "Agents", icon: Bot },
    { id: "all", label: "Global", icon: Users },
  ];

  return (
    <div className="space-y-4 mb-8">
      {/* Type Tabs */}
      <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
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
      <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
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
    </div>
  );
}
