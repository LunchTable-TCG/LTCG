"use client";

import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { getAssetUrl } from "@/lib/blob";
import { cn } from "@/lib/utils";
import type { ShopItem } from "@/types/shop";
import { Coins, Gem, Package } from "lucide-react";

interface ShopItemCardProps {
  item: ShopItem;
  onPurchase: () => void;
}

export function ShopItemCard({ item, onPurchase }: ShopItemCardProps) {
  return (
    <div
      data-testid="pack-product"
      className="group flex flex-col p-4 rounded-none border-2 border-primary bg-white shadow-zine hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-zine-sm transition-all h-full relative"
    >
      <div className="aspect-square bg-slate-50 border-2 border-primary mb-4 flex items-center justify-center overflow-hidden relative p-4 group-hover:bg-white transition-colors scanner-noise">
        {item.type === "pack" && (
          <Image
            src={getAssetUrl("/assets/shop/foil-pack-generic.png")}
            alt="Booster Pack"
            width={200}
            height={200}
            className="w-full h-full object-contain filter drop-shadow-xl transform group-hover:scale-110 transition-transform duration-300 contrast-125 grayscale group-hover:grayscale-0"
          />
        )}
        {item.type === "box" && (
          <Image
            src={getAssetUrl("/assets/shop/cardboard-box.png")}
            alt="Booster Box"
            width={200}
            height={200}
            className="w-full h-full object-contain filter drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-300 contrast-125 grayscale group-hover:grayscale-0"
          />
        )}
        {!["pack", "box"].includes(item.type) && (
          <Package className="w-20 h-20 text-primary/20 group-hover:text-primary/40 transition-colors" />
        )}

        {item.quantity && (
          <div className="absolute top-2 right-2 bg-reputation text-primary font-black text-xs px-2 py-1 border-2 border-primary uppercase rotate-6 shadow-zine-sm ink-bleed">
            +{item.quantity}
          </div>
        )}
      </div>

      <h3 className="font-black text-xl text-primary uppercase tracking-tight mb-1 leading-none group-hover:text-primary transition-colors ink-bleed">
        {item.name}
      </h3>

      <p className="text-sm font-bold text-primary/60 mb-3 min-h-[2.5em] leading-snug uppercase text-xs">
        {item.description}
      </p>

      {item.contents && (
        <div className="bg-primary/5 border-2 border-primary/10 px-2 py-1 mb-4 inline-self-start self-start">
          <p className="text-[10px] font-black text-primary uppercase tracking-wider">{item.contents}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto">
        {item.goldPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className={cn(
              "tcg-button w-full justify-between h-10 rounded-none border-2 border-primary text-primary font-bold uppercase tracking-wider transition-all",
              "bg-[#fdfbf7] hover:bg-reputation/10"
            )}
            size="sm"
            data-testid="pack-price-gold"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span className="ink-bleed">{item.goldPrice.toLocaleString()}</span>
            </div>
          </Button>
        )}
        {item.gemPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className={cn(
              "tcg-button w-full justify-between h-10 rounded-none border-2 border-primary text-primary font-bold uppercase tracking-wider transition-all",
              "bg-[#fdfbf7] hover:bg-stability/10"
            )}
            size="sm"
            data-testid="pack-price-gems"
          >
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4" />
              <span className="ink-bleed">{item.gemPrice.toLocaleString()}</span>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}
