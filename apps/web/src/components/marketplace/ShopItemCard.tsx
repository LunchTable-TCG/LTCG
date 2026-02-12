"use client";

import { Button } from "@/components/ui/button";
import { getAssetUrl } from "@/lib/blob";
import type { ShopItem } from "@/types/shop";
import { Coins, Gem, Package } from "lucide-react";
import Image from "next/image";

interface ShopItemCardProps {
  item: ShopItem;
  onPurchase: () => void;
}

export function ShopItemCard({ item, onPurchase }: ShopItemCardProps) {
  return (
    <div
      data-testid="pack-product"
      className="p-4 rounded-xl border border-[#3d2b1f] bg-black/40 hover:bg-black/60 transition-all"
    >
      <div className="aspect-square rounded-lg bg-linear-to-br from-[#d4af37]/10 to-transparent flex items-center justify-center mb-4 overflow-hidden text-center">
        {item.type === "pack" && (
          <Image
            src={getAssetUrl("/assets/shop/pack.png")}
            alt="Booster Pack"
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        )}
        {item.type === "box" && (
          <Image
            src={getAssetUrl("/assets/shop/box.png")}
            alt="Booster Box"
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        )}
        {!["pack", "box"].includes(item.type) && (
          <Package className="w-20 h-20 text-[#d4af37]/20" />
        )}
      </div>
      <h3 className="font-bold text-[#e8e0d5] mb-1">{item.name}</h3>
      <p className="text-sm text-[#a89f94] mb-2">{item.description}</p>
      {item.contents && <p className="text-xs text-[#d4af37] mb-3">{item.contents}</p>}
      <div className="flex flex-col gap-2">
        {item.goldPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className="w-full justify-between border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
            size="sm"
            data-testid="pack-price"
          >
            <Coins className="w-4 h-4" />
            <span>{item.goldPrice.toLocaleString()}</span>
          </Button>
        )}
        {item.gemPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className="w-full justify-between border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            size="sm"
            data-testid="pack-price"
          >
            <Gem className="w-4 h-4" />
            <span>{item.gemPrice.toLocaleString()}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
