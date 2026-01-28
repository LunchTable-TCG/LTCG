/**
 * Calling Card Section Component
 * Displays player's calling card and most played card
 */

import { cn } from "@/lib/utils";
import { Heart, Sparkles } from "lucide-react";
import { ELEMENT_CONFIG, RARITY_CONFIG } from "./constants";
import type { PlayerProfile } from "./types";

interface CallingCardSectionProps {
  profile: PlayerProfile;
  onCardClick: (
    card: {
      id: string;
      name: string;
      element: "fire" | "water" | "earth" | "wind";
      rarity?: "common" | "rare" | "epic" | "legendary";
      timesPlayed?: number;
    },
    isCallingCard: boolean
  ) => void;
}

export function CallingCardSection({ profile, onCardClick }: CallingCardSectionProps) {
  return (
    <div className="px-6 pb-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Calling Card */}
        <div className="relative p-4 rounded-xl bg-black/30 border border-[#3d2b1f]">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-[#a89f94] uppercase tracking-wider">
              Calling Card
            </span>
          </div>
          {profile.callingCard ? (
            <button
              type="button"
              onClick={() => {
                if (profile.callingCard) {
                  onCardClick(profile.callingCard, true);
                }
              }}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                RARITY_CONFIG[profile.callingCard.rarity].border,
                RARITY_CONFIG[profile.callingCard.rarity].glow,
                "hover:brightness-110"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    ELEMENT_CONFIG[profile.callingCard.element].bg
                  )}
                >
                  {(() => {
                    const Icon = ELEMENT_CONFIG[profile.callingCard.element].icon;
                    return (
                      <Icon
                        className={cn("w-5 h-5", ELEMENT_CONFIG[profile.callingCard.element].color)}
                      />
                    );
                  })()}
                </div>
                <div>
                  <p
                    className={cn(
                      "font-bold text-sm",
                      RARITY_CONFIG[profile.callingCard.rarity].color
                    )}
                  >
                    {profile.callingCard.name}
                  </p>
                  <p className="text-[10px] text-[#a89f94] uppercase tracking-wider">
                    {profile.callingCard.rarity}
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <p className="text-sm text-[#a89f94]/50 italic">No calling card set</p>
          )}
        </div>

        {/* Most Played Card */}
        <div className="relative p-4 rounded-xl bg-black/30 border border-[#3d2b1f]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span className="text-xs font-bold text-[#a89f94] uppercase tracking-wider">
              Most Played
            </span>
          </div>
          <button
            type="button"
            onClick={() => onCardClick(profile.mostPlayedCard, false)}
            className="w-full p-3 rounded-lg border border-[#3d2b1f] text-left transition-all hover:border-[#d4af37]/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  ELEMENT_CONFIG[profile.mostPlayedCard.element].bg
                )}
              >
                {(() => {
                  const Icon = ELEMENT_CONFIG[profile.mostPlayedCard.element].icon;
                  return (
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        ELEMENT_CONFIG[profile.mostPlayedCard.element].color
                      )}
                    />
                  );
                })()}
              </div>
              <div>
                <p className="font-bold text-sm text-[#e8e0d5]">{profile.mostPlayedCard.name}</p>
                <p className="text-[10px] text-[#a89f94]">
                  Played {profile.mostPlayedCard.timesPlayed.toLocaleString()} times
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
