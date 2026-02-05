"use client";

import { getArchetypeIcon } from "@/lib/archetypeIcons";
import { type JsonAbility, getAbilityDisplayText } from "@/lib/cardHelpers";
import { cn } from "@/lib/utils";
import { Flame, Heart, Shield, Star, Waves, Zap } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type Element = "fire" | "water" | "earth" | "wind" | "neutral";
export type CardType = "creature" | "spell" | "trap" | "equipment";

// Re-export for backwards compatibility
export type { JsonAbility };
export { getAbilityDisplayText };

export interface CardData {
  id: string;
  cardDefinitionId?: string; // For deck operations
  name: string;
  rarity: Rarity;
  element: Element;
  cardType: CardType;
  imageUrl?: string;
  attack?: number;
  defense?: number;
  cost: number;
  ability?: JsonAbility;
  flavorText?: string;
  owned: number;
  isFavorite?: boolean;
}

interface BinderCardProps {
  card: CardData;
  variant?: "grid" | "list";
  onClick?: () => void;
  onFavorite?: () => void;
  className?: string;
}

// Rarity styling
const RARITY_CONFIG: Record<Rarity, { color: string; glow: string; border: string; bg: string }> = {
  common: {
    color: "text-gray-400",
    glow: "rgba(156, 163, 175, 0.3)",
    border: "border-gray-500/50",
    bg: "bg-gray-500/10",
  },
  uncommon: {
    color: "text-green-400",
    glow: "rgba(34, 197, 94, 0.4)",
    border: "border-green-500/50",
    bg: "bg-green-500/10",
  },
  rare: {
    color: "text-blue-400",
    glow: "rgba(59, 130, 246, 0.5)",
    border: "border-blue-500/50",
    bg: "bg-blue-500/10",
  },
  epic: {
    color: "text-purple-400",
    glow: "rgba(168, 85, 247, 0.5)",
    border: "border-purple-500/50",
    bg: "bg-purple-500/10",
  },
  legendary: {
    color: "text-amber-400",
    glow: "rgba(245, 158, 11, 0.6)",
    border: "border-amber-500/50",
    bg: "bg-amber-500/10",
  },
};

const RARITY_DOT: Record<Rarity, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

const ELEMENT_CONFIG: Record<Element, { icon: typeof Flame; color: string; bg: string }> = {
  fire: { icon: Flame, color: "text-red-500", bg: "bg-red-500/20" },
  water: { icon: Waves, color: "text-blue-500", bg: "bg-blue-500/20" },
  earth: { icon: Shield, color: "text-slate-400", bg: "bg-slate-500/20" },
  wind: { icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/20" },
  neutral: { icon: Star, color: "text-gray-400", bg: "bg-gray-500/20" },
};

export function BinderCard({
  card,
  variant = "grid",
  onClick,
  onFavorite: _onFavorite,
  className,
}: BinderCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const rarity = RARITY_CONFIG[card.rarity];

  console.log("🃏 Rendering BinderCard:", card.name, "imageUrl:", card.imageUrl);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!cardRef.current || variant !== "grid") return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateYValue = (mouseX / (rect.width / 2)) * 12;
    const rotateXValue = -(mouseY / (rect.height / 2)) * 12;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovering(false);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  // Grid variant - full card with 3D tilt
  if (variant === "grid") {
    return (
      <button
        ref={cardRef}
        type="button"
        data-testid="card-item"
        className={cn("group cursor-pointer text-left", className)}
        style={{ perspective: "1000px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onClick={onClick}
      >
        <div
          className={cn(
            "relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden border-2 transition-all duration-150 ease-out bg-gray-900",
            rarity.border
          )}
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHovering ? 1.05 : 1})`,
            transformStyle: "preserve-3d",
            boxShadow: isHovering
              ? `0 25px 50px -12px ${rarity.glow}, 0 0 40px ${rarity.glow}`
              : "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
            minHeight: "200px",
          }}
        >
          {/* Card Background */}
          <div className={cn("absolute inset-0", rarity.bg)}>
            {/* Solid dark background */}
            <div className="absolute inset-0 bg-gray-800" />

            {/* Large card type watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <div className={cn("text-8xl font-black uppercase", rarity.color)}>
                {card.cardType[0]}
              </div>
            </div>
          </div>

          {/* Shine effect on hover */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: isHovering ? 1 : 0,
              background: `radial-gradient(circle at ${50 + rotateY * 2}% ${50 + rotateX * 2}%, rgba(255,255,255,0.25) 0%, transparent 60%)`,
            }}
          />

          {/* Rarity indicator */}
          <div
            className="absolute top-2 left-2 w-3 h-3 rounded-full"
            style={{
              backgroundColor: RARITY_DOT[card.rarity],
              boxShadow: `0 0 10px ${RARITY_DOT[card.rarity]}`,
            }}
          />

          {/* Archetype Icon Badge */}
          <div className="absolute top-2 right-2 w-7 h-7 rounded-lg overflow-hidden border border-white/20 bg-black/40 backdrop-blur-sm">
            <Image
              src={getArchetypeIcon(card.element)}
              alt={`${card.element} archetype`}
              width={28}
              height={28}
              className="object-cover"
              unoptimized
            />
          </div>

          {/* Card Name */}
          <div className="absolute bottom-10 left-0 right-0 px-2">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/10">
              <p className={cn("text-[10px] font-bold text-center truncate", rarity.color)}>
                {card.name}
              </p>
            </div>
          </div>

          {/* Attack/Defense Stats */}
          {card.attack !== undefined && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
              <div className="bg-red-600/90 rounded px-1.5 py-0.5 border border-red-400/50">
                <span className="text-white font-black text-[10px]">{card.attack}</span>
              </div>
              <div className="bg-green-600/90 rounded px-1.5 py-0.5 border border-green-400/50">
                <span className="text-white font-black text-[10px]">{card.defense}</span>
              </div>
            </div>
          )}

          {/* Cost */}
          <div className="absolute bottom-2 left-2 w-6 h-6 rounded-lg bg-blue-600/90 flex items-center justify-center border border-blue-400/50">
            <span className="text-white font-black text-[10px]">{card.cost}</span>
          </div>

          {/* Owned count */}
          {card.owned > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white border border-white/10">
              x{card.owned}
            </div>
          )}

          {/* Favorite indicator */}
          {card.isFavorite && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2">
              <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
            </div>
          )}
        </div>
      </button>
    );
  }

  // List variant - horizontal row
  const element = ELEMENT_CONFIG[card.element] || ELEMENT_CONFIG.neutral;

  return (
    <button
      type="button"
      data-testid="card-item"
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl tcg-chat-leather border border-[#3d2b1f] hover:border-[#d4af37]/30 cursor-pointer transition-all group text-left w-full",
        className
      )}
      onClick={onClick}
    >
      {/* Card Thumbnail */}
      <div
        className={cn(
          "relative w-14 h-20 rounded-lg overflow-hidden shrink-0 border-2 bg-gray-800",
          rarity.border,
          rarity.bg
        )}
        style={{
          boxShadow: `0 0 15px ${rarity.glow}`,
        }}
      >
        {/* Card type watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <div className={cn("text-3xl font-black uppercase", rarity.color)}>
            {card.cardType[0]}
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-bold text-[#e8e0d5] truncate">{card.name}</p>
          <span
            className={cn(
              "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
              rarity.bg,
              rarity.color
            )}
          >
            {card.rarity.charAt(0)}
          </span>
          {card.isFavorite && <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#a89f94]">
          <span className="capitalize">{card.cardType}</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Image
              src={getArchetypeIcon(card.element)}
              alt={`${card.element} archetype`}
              width={14}
              height={14}
              className="rounded-sm"
              unoptimized
            />
            <span className={element.color}>{card.element}</span>
          </div>
          {card.attack !== undefined && (
            <>
              <span>•</span>
              <span className="text-red-400">ATK {card.attack}</span>
              <span className="text-blue-400">DEF {card.defense}</span>
            </>
          )}
        </div>
      </div>

      {/* Owned & Cost */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-center">
          <p className="text-lg font-black text-[#d4af37]">{card.owned}</p>
          <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">owned</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <span className="text-blue-400 font-black">{card.cost}</span>
        </div>
      </div>
    </button>
  );
}

// Skeleton loader
export function BinderCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  if (variant === "grid") {
    return <div className="w-full aspect-[2.5/3.5] rounded-xl bg-[#3d2b1f]/30 animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-[#3d2b1f]/30 animate-pulse">
      <div className="w-14 h-20 rounded-lg bg-[#3d2b1f]/50" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-[#3d2b1f]/50 rounded" />
        <div className="h-3 w-24 bg-[#3d2b1f]/50 rounded" />
      </div>
    </div>
  );
}
