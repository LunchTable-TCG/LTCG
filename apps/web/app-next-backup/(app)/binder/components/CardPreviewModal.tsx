"use client";

import { cn } from "@/lib/utils";
import { Check, Copy, Flame, Heart, Shield, Sparkles, Star, Waves, X, Zap } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { type CardData, type Element, type Rarity, getAbilityDisplayText } from "./BinderCard";

interface CardPreviewModalProps {
  card: CardData | null;
  isOpen: boolean;
  onClose: () => void;
  onFavorite?: (cardId: string) => void;
}

// Rarity styling
const RARITY_CONFIG: Record<
  Rarity,
  { color: string; glow: string; border: string; bg: string; label: string }
> = {
  common: {
    color: "text-gray-400",
    glow: "rgba(156, 163, 175, 0.3)",
    border: "border-gray-500/50",
    bg: "bg-gray-500/10",
    label: "Common",
  },
  uncommon: {
    color: "text-green-400",
    glow: "rgba(34, 197, 94, 0.4)",
    border: "border-green-500/50",
    bg: "bg-green-500/10",
    label: "Uncommon",
  },
  rare: {
    color: "text-blue-400",
    glow: "rgba(59, 130, 246, 0.5)",
    border: "border-blue-500/50",
    bg: "bg-blue-500/10",
    label: "Rare",
  },
  epic: {
    color: "text-purple-400",
    glow: "rgba(168, 85, 247, 0.5)",
    border: "border-purple-500/50",
    bg: "bg-purple-500/10",
    label: "Epic",
  },
  legendary: {
    color: "text-amber-400",
    glow: "rgba(245, 158, 11, 0.6)",
    border: "border-amber-500/50",
    bg: "bg-amber-500/10",
    label: "Legendary",
  },
};

const ELEMENT_CONFIG: Record<
  Element,
  { icon: typeof Flame; color: string; bg: string; label: string }
> = {
  red: { icon: Flame, color: "text-red-500", bg: "bg-red-500/20", label: "Red" },
  blue: { icon: Waves, color: "text-blue-500", bg: "bg-blue-500/20", label: "Blue" },
  yellow: { icon: Sparkles, color: "text-yellow-500", bg: "bg-yellow-500/20", label: "Yellow" },
  purple: { icon: Star, color: "text-purple-500", bg: "bg-purple-500/20", label: "Purple" },
  green: { icon: Shield, color: "text-green-500", bg: "bg-green-500/20", label: "Green" },
  white: { icon: Zap, color: "text-slate-100", bg: "bg-slate-500/20", label: "White" },
};

export function CardPreviewModal({ card, isOpen, onClose, onFavorite }: CardPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !card) return null;

  const rarity = RARITY_CONFIG[card.rarity];
  const element = ELEMENT_CONFIG[card.element];
  const ElementIcon = element.icon;

  const handleCopyId = () => {
    navigator.clipboard.writeText(card.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFavorite = () => {
    if (onFavorite) {
      onFavorite(card.id);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-100 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-105 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-modal-title"
          className="relative w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl tcg-chat-leather border border-[#3d2b1f] shadow-2xl pointer-events-auto animate-in zoom-in-95 fade-in duration-200 overflow-hidden"
          style={{
            boxShadow: `0 0 100px ${rarity.glow}`,
          }}
        >
          <div className="ornament-corner ornament-corner-tl" />
          <div className="ornament-corner ornament-corner-tr" />
          <div className="ornament-corner ornament-corner-bl" />
          <div className="ornament-corner ornament-corner-br" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg border border-[#3d2b1f] bg-black/50 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row">
            {/* Card Image Section */}
            <div className="md:w-2/5 p-4 sm:p-6 flex items-center justify-center bg-black/30">
              <div
                className={cn(
                  "relative w-full max-w-[200px] aspect-[2.5/3.5] rounded-xl overflow-hidden border-2",
                  rarity.border
                )}
                style={{
                  boxShadow: `0 0 40px ${rarity.glow}`,
                }}
              >
                {card.imageUrl ? (
                  <Image src={card.imageUrl} alt={card.name} fill className="object-cover" />
                ) : (
                  <div
                    className={cn(
                      "w-full h-full flex flex-col items-center justify-center p-4",
                      rarity.bg
                    )}
                  >
                    <div
                      className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center mb-4",
                        element.bg
                      )}
                    >
                      <ElementIcon className={cn("w-10 h-10", element.color)} />
                    </div>
                    <p
                      className={cn(
                        "text-center font-black text-base uppercase tracking-wide",
                        rarity.color
                      )}
                    >
                      {card.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card Details Section */}
            <div className="md:w-3/5 p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2
                    id="card-modal-title"
                    className={cn("text-2xl font-black uppercase tracking-tight", rarity.color)}
                  >
                    {card.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                        rarity.border,
                        rarity.color
                      )}
                    >
                      {rarity.label}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1",
                        "border-[#3d2b1f]",
                        element.color
                      )}
                    >
                      <ElementIcon className="w-3 h-3" />
                      {element.label}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#3d2b1f] text-[#a89f94]">
                      {card.cardType}
                    </span>
                  </div>
                </div>

                {/* Favorite Button */}
                <button
                  type="button"
                  onClick={handleFavorite}
                  className={cn(
                    "p-2 rounded-lg border transition-all",
                    card.isFavorite
                      ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                      : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-pink-500/50 hover:text-pink-400"
                  )}
                >
                  <Heart className={cn("w-5 h-5", card.isFavorite && "fill-pink-400")} />
                </button>
              </div>

              {/* Stats */}
              {(card.attack !== undefined ||
                card.defense !== undefined ||
                card.cost !== undefined) && (
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xl sm:text-2xl font-black text-blue-400">{card.cost}</p>
                    <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Cost</p>
                  </div>
                  {card.attack !== undefined && (
                    <div className="text-center p-2 sm:p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-xl sm:text-2xl font-black text-red-400">{card.attack}</p>
                      <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Attack</p>
                    </div>
                  )}
                  {card.defense !== undefined && (
                    <div className="text-center p-2 sm:p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-xl sm:text-2xl font-black text-green-400">
                        {card.defense}
                      </p>
                      <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Defense</p>
                    </div>
                  )}
                </div>
              )}

              {/* Ability */}
              {card.ability && (
                <div className="mb-4 p-4 rounded-lg bg-black/30 border border-[#3d2b1f]">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[#d4af37]" />
                    <p className="text-xs font-black text-[#d4af37] uppercase tracking-wider">
                      Ability
                    </p>
                  </div>
                  <p className="text-sm text-[#e8e0d5] leading-relaxed">
                    {getAbilityDisplayText(card.ability)}
                  </p>
                </div>
              )}

              {/* Flavor Text */}
              {card.flavorText && (
                <p className="text-xs text-[#a89f94]/70 italic border-l-2 border-[#d4af37]/30 pl-3 mb-4">
                  {card.flavorText}
                </p>
              )}

              {/* Owned Count */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-[#3d2b1f]">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-[#a89f94] uppercase tracking-wider">You Own</p>
                  <p className="text-lg font-black text-[#d4af37]">{card.owned}</p>
                  <p className="text-xs text-[#a89f94]">copies</p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#3d2b1f] bg-black/30 text-[#a89f94] hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-all text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy ID
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
