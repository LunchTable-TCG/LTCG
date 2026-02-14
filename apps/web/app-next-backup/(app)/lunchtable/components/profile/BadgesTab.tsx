/**
 * Badges Tab Component
 * Displays player's earned badges
 */

import { Medal, Star } from "lucide-react";
import { BADGE_ICONS } from "./constants";
import type { PlayerProfile } from "./types";

interface BadgesTabProps {
  profile: PlayerProfile;
  onBadgeClick: (badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: number;
  }) => void;
}

export function BadgesTab({ profile, onBadgeClick }: BadgesTabProps) {
  if (profile.badges.length === 0) {
    return (
      <div className="text-center py-8">
        <Medal className="w-12 h-12 text-[#a89f94]/30 mx-auto mb-3" />
        <p className="text-[#a89f94]">No badges earned yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {profile.badges.map((badge) => {
        const Icon = BADGE_ICONS[badge.icon] || Star;
        return (
          <button
            type="button"
            key={badge.id}
            data-testid="achievement"
            onClick={() => onBadgeClick(badge)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-black/30 border border-[#3d2b1f] hover:border-[#d4af37]/30 transition-all text-left hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#d4af37]/30 to-[#8b4513]/30 flex items-center justify-center border border-[#d4af37]/30">
              <Icon className="w-6 h-6 text-[#d4af37]" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#e8e0d5]">{badge.name}</p>
              <p className="text-xs text-[#a89f94]">{badge.description}</p>
              <p className="text-[10px] text-[#a89f94]/60 mt-1">
                Earned {new Date(badge.earnedAt).toLocaleDateString()}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
