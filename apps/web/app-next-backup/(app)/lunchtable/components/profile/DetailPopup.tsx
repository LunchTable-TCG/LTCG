/**
 * Detail Popup Component
 * Universal modal for displaying card, badge, and achievement details
 */

import { cn } from "@/lib/utils";
import { Star, X } from "lucide-react";
import { BADGE_ICONS, ELEMENT_CONFIG, RARITY_CONFIG } from "./constants";
import type { DetailItem } from "./types";

interface DetailPopupProps {
  detail: DetailItem | null;
  onClose: () => void;
}

export function DetailPopup({ detail, onClose }: DetailPopupProps) {
  if (!detail) return null;

  return (
    <>
      {/* Detail Backdrop */}
      <div
        role="presentation"
        className="fixed inset-0 z-90 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />

      {/* Detail Panel */}
      <div className="fixed inset-0 z-95 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-md rounded-2xl tcg-chat-leather border border-[#3d2b1f] shadow-2xl pointer-events-auto animate-in zoom-in-95 fade-in duration-200">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg border border-[#3d2b1f] bg-black/50 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Card Detail */}
          {detail.type === "card" && (
            <div className="p-6">
              {/* Card Header */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={cn(
                    "w-16 h-16 rounded-xl flex items-center justify-center border-2",
                    detail.element && ELEMENT_CONFIG[detail.element].bg,
                    detail.rarity ? RARITY_CONFIG[detail.rarity].border : "border-[#3d2b1f]"
                  )}
                >
                  {detail.element &&
                    (() => {
                      const Icon = ELEMENT_CONFIG[detail.element].icon;
                      return (
                        <Icon className={cn("w-8 h-8", ELEMENT_CONFIG[detail.element].color)} />
                      );
                    })()}
                </div>
                <div className="flex-1">
                  <h3
                    className={cn(
                      "text-xl font-black mb-1",
                      detail.rarity ? RARITY_CONFIG[detail.rarity].color : "text-[#e8e0d5]"
                    )}
                  >
                    {detail.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    {detail.rarity && (
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                          RARITY_CONFIG[detail.rarity].border,
                          RARITY_CONFIG[detail.rarity].color
                        )}
                      >
                        {detail.rarity}
                      </span>
                    )}
                    {detail.element && (
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          ELEMENT_CONFIG[detail.element].color
                        )}
                      >
                        {detail.element}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Stats */}
              {(detail.attack !== undefined ||
                detail.defense !== undefined ||
                detail.cost !== undefined) && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {detail.cost !== undefined && (
                    <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <p className="text-lg font-black text-blue-400">{detail.cost}</p>
                      <p className="text-[9px] text-[#a89f94] uppercase">Cost</p>
                    </div>
                  )}
                  {detail.attack !== undefined && (
                    <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-lg font-black text-red-400">{detail.attack}</p>
                      <p className="text-[9px] text-[#a89f94] uppercase">Attack</p>
                    </div>
                  )}
                  {detail.defense !== undefined && (
                    <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-lg font-black text-green-400">{detail.defense}</p>
                      <p className="text-[9px] text-[#a89f94] uppercase">Defense</p>
                    </div>
                  )}
                </div>
              )}

              {/* Card Ability */}
              {detail.ability && (
                <div className="mb-4 p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
                  <p className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-1">
                    Ability
                  </p>
                  <p className="text-sm text-[#e8e0d5]">{detail.ability}</p>
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-[#a89f94] mb-3">{detail.description}</p>

              {/* Flavor Text */}
              {detail.flavorText && (
                <p className="text-xs text-[#a89f94]/70 italic border-l-2 border-[#d4af37]/30 pl-3">
                  {detail.flavorText}
                </p>
              )}

              {/* Times Played */}
              {detail.timesPlayed !== undefined && (
                <div className="mt-4 pt-3 border-t border-[#3d2b1f]">
                  <p className="text-xs text-[#a89f94]">
                    Played{" "}
                    <span className="text-[#d4af37] font-bold">
                      {detail.timesPlayed.toLocaleString()}
                    </span>{" "}
                    times by this player
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Badge Detail */}
          {detail.type === "badge" && (
            <div className="p-6">
              {/* Badge Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-linear-to-br from-[#d4af37]/30 to-[#8b4513]/30 flex items-center justify-center border border-[#d4af37]/30">
                  {(() => {
                    const Icon = BADGE_ICONS[detail.icon || "star"] || Star;
                    return <Icon className="w-8 h-8 text-[#d4af37]" />;
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-[#e8e0d5] mb-1">{detail.name}</h3>
                  {detail.rarity && (
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                        detail.rarity === "epic"
                          ? "border-purple-500/50 text-purple-400"
                          : detail.rarity === "rare"
                            ? "border-blue-500/50 text-blue-400"
                            : "border-gray-500/50 text-gray-400"
                      )}
                    >
                      {detail.rarity} Badge
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-[#e8e0d5] mb-4">{detail.description}</p>

              {/* How to Earn */}
              {detail.flavorText && (
                <div className="mb-4 p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
                  <p className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-1">
                    How to Earn
                  </p>
                  <p className="text-sm text-[#a89f94]">{detail.flavorText}</p>
                </div>
              )}

              {/* Earned Date */}
              {detail.earnedAt && (
                <div className="pt-3 border-t border-[#3d2b1f]">
                  <p className="text-xs text-[#a89f94]">
                    Earned on{" "}
                    <span className="text-[#d4af37] font-bold">
                      {new Date(detail.earnedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Achievement Detail */}
          {detail.type === "achievement" && (
            <div className="p-6">
              {/* Achievement Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-[#d4af37]/20 flex items-center justify-center border border-[#d4af37]/30">
                  {(() => {
                    const Icon = BADGE_ICONS[detail.icon || "star"] || Star;
                    return <Icon className="w-8 h-8 text-[#d4af37]" />;
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-[#e8e0d5] mb-1">{detail.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#d4af37]/30 text-[#d4af37]">
                    Achievement
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-[#e8e0d5] mb-4">{detail.description}</p>

              {/* Progress */}
              {detail.progress !== undefined && detail.maxProgress !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-[#a89f94] uppercase tracking-wider">
                      Progress
                    </p>
                    <span className="text-sm font-bold text-[#d4af37]">
                      {detail.progress} / {detail.maxProgress}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-black/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-[#d4af37] to-[#f4d03f] transition-all"
                      style={{
                        width: `${(detail.progress / detail.maxProgress) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#a89f94] mt-1 text-right">
                    {((detail.progress / detail.maxProgress) * 100).toFixed(1)}% Complete
                  </p>
                </div>
              )}

              {/* How to Complete */}
              {detail.flavorText && (
                <div className="mb-4 p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
                  <p className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-1">
                    How to Complete
                  </p>
                  <p className="text-sm text-[#a89f94]">{detail.flavorText}</p>
                </div>
              )}

              {/* Reward */}
              {detail.ability && (
                <div className="p-3 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30">
                  <p className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-1">
                    Reward
                  </p>
                  <p className="text-sm text-[#e8e0d5]">{detail.ability}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
