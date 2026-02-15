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
      className="group flex flex-col p-4 rounded-none border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all h-full relative"
    >
      <div className="aspect-square bg-slate-100 border-[3px] border-black mb-4 flex items-center justify-center overflow-hidden relative p-4 group-hover:bg-slate-50 transition-colors">
        {item.type === "pack" && (
          <Image
            src={getAssetUrl("/assets/shop/foil-pack-generic.png")}
            alt="Booster Pack"
            width={200}
            height={200}
            className="w-full h-full object-contain filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300"
          />
        )}
        {item.type === "box" && (
          <Image
            src={getAssetUrl("/assets/shop/cardboard-box.png")}
            alt="Booster Box"
            width={200}
            height={200}
            className="w-full h-full object-contain filter drop-shadow-xl transform group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {!["pack", "box"].includes(item.type) && (
          <Package className="w-20 h-20 text-black/20 group-hover:text-black/40 transition-colors" />
        )}

        {item.quantity && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-black font-black text-xs px-2 py-1 border-2 border-black uppercase rotate-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            +{item.quantity}
          </div>
        )}
      </div>

      <h3 className="font-black text-xl text-black uppercase tracking-tight mb-1 leading-none group-hover:text-indigo-600 transition-colors">
        {item.name}
      </h3>

      <p className="text-sm font-medium text-black/60 mb-3 min-h-[2.5em] leading-snug">
        {item.description}
      </p>

      {item.contents && (
        <div className="bg-black/5 border-2 border-black/10 px-2 py-1 mb-4 inline-self-start self-start">
          <p className="text-xs font-bold text-black uppercase tracking-wider">{item.contents}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto">
        {item.goldPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className={cn(
              "w-full justify-between h-10 rounded-none border-[3px] border-black text-black font-bold uppercase tracking-wider transition-all",
              "bg-[#f0e6d2] hover:bg-[#e6dac0] hover:translate-x-[1px] hover:translate-y-[1px]"
            )}
            size="sm"
            data-testid="pack-price-gold"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span>{item.goldPrice.toLocaleString()}</span>
            </div>
          </Button>
        )}
        {item.gemPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className={cn(
              "w-full justify-between h-10 rounded-none border-[3px] border-black text-black font-bold uppercase tracking-wider transition-all",
              "bg-[#e0d5f5] hover:bg-[#d0c0e5] hover:translate-x-[1px] hover:translate-y-[1px]"
            )}
            size="sm"
            data-testid="pack-price-gems"
          >
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4" />
              <span>{item.gemPrice.toLocaleString()}</span>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}
