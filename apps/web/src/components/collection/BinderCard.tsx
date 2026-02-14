"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CardData } from "@/types/binder";
import { RARITY_STYLES } from "@ltcg/core/ui";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";

interface BinderCardProps {
  card: CardData;
  onClick?: () => void;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  className?: string;
  delay?: number;
}

/**
 * BinderCard - A card display for the collection binder.
 * Follows the LunchTable Zine aesthetic with paper textures and ink borders.
 */
export function BinderCard({
  card,
  onClick,
  onFavoriteToggle,
  className,
  delay = 0,
}: BinderCardProps) {
  const rarityStyle = RARITY_STYLES[card.rarity as keyof typeof RARITY_STYLES] || RARITY_STYLES.common;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        "paper-panel group relative flex flex-col aspect-[2.5/3.5] overflow-hidden p-2 cursor-pointer transition-all",
        "border-2 border-primary hover:shadow-[4px_4px_0px_0px_rgba(18,18,18,1)]",
        className
      )}
    >
      {/* Favorite Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFavoriteToggle?.(e);
        }}
        className={cn(
          "absolute top-3 right-3 z-20 p-1.5 rounded-full border-2 border-primary bg-white shadow-[2px_2px_0px_0px_rgba(18,18,18,1)] transition-transform hover:scale-110",
          card.isFavorite ? "text-amber-500" : "text-slate-300"
        )}
      >
        <Star className={cn("w-4 h-4", card.isFavorite && "fill-current")} />
      </button>

      {/* Card Image Wrapper */}
      <div className="relative flex-1 bg-slate-100 border-2 border-primary overflow-hidden">
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={card.name}
            fill
            className="object-cover grayscale hover:grayscale-0 transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary/20 font-black italic uppercase text-xs">
            No Artwork
          </div>
        )}

        {/* Quantity Badge */}
        {card.owned !== undefined && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 border-2 border-primary bg-white shadow-[2px_2px_0px_0px_rgba(18,18,18,1)] font-black text-xs">
            x{card.owned}
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="mt-2 space-y-1">
        <h4 className="font-black text-xs uppercase italic tracking-tighter truncate ink-bleed">
          {card.name}
        </h4>

        <div className="flex items-center justify-between gap-1">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-black uppercase px-1 py-0 rounded-none border-2 border-primary bg-white shadow-[1px_1px_0px_0px_rgba(18,18,18,1)]",
              rarityStyle.text
            )}
          >
            {card.rarity}
          </Badge>

          <div className="flex items-center gap-1">
             <span className="text-[10px] font-black uppercase opacity-60">
               {card.cardType}
             </span>
          </div>
        </div>
      </div>

      {/* TCG Stats Overlay (Visual Only in Binder) */}
      {(card.attack !== undefined || card.defense !== undefined) && (
        <div className="absolute bottom-8 left-2 right-2 flex justify-between pointer-events-none">
           <div className="bg-primary text-white text-[10px] font-black px-1.5 border-2 border-primary shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
             {card.attack ?? 0}
           </div>
           <div className="bg-white text-primary text-[10px] font-black px-1.5 border-2 border-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
             {card.defense ?? 0}
           </div>
        </div>
      )}
    </motion.div>
  );
}
