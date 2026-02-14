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
      className="group flex flex-col p-4 rounded-xl border border-border bg-card/40 hover:bg-card/60 hover:border-primary/50 transition-all relative overflow-hidden h-full"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center mb-4 overflow-hidden text-center relative group-hover:from-primary/20 transition-all">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_70%)] opacity-0 group-hover:opacity-20 transition-opacity" />
        {item.type === "pack" && (
          <Image
            src={getAssetUrl("/assets/shop/foil-pack-generic.png")}
            alt="Booster Pack"
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        )}
        {item.type === "box" && (
          <Image
            src={getAssetUrl("/assets/shop/cardboard-box.png")}
            alt="Booster Box"
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        )}
        {!["pack", "box"].includes(item.type) && (
          <Package className="w-20 h-20 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
        )}
      </div>
      <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
        {item.name}
      </h3>
      <p className="text-sm text-muted-foreground mb-2 line-clamp-2 min-h-[2.5em]">
        {item.description}
      </p>
      {item.contents && (
        <div className="bg-primary/10 border border-primary/20 rounded px-2 py-1 mb-3 inline-block">
          <p className="text-xs font-medium text-primary">{item.contents}</p>
        </div>
      )}
      <div className="flex flex-col gap-2 mt-auto">
        {item.goldPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className="w-full justify-between border-primary/30 text-primary hover:bg-primary/10 hover:text-primary-foreground hover:border-primary/50"
            size="sm"
            data-testid="pack-price-gold"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span>{item.goldPrice.toLocaleString()}</span>
            </div>
            <span className="text-xs uppercase tracking-wider opacity-70">Gold</span>
          </Button>
        )}
        {item.gemPrice && (
          <Button
            onClick={onPurchase}
            variant="outline"
            className="w-full justify-between border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 hover:border-purple-500/50"
            size="sm"
            data-testid="pack-price-gems"
          >
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4" />
              <span>{item.gemPrice.toLocaleString()}</span>
            </div>
            <span className="text-xs uppercase tracking-wider opacity-70">Gems</span>
          </Button>
        )}
      </div>
    </div>
  );
}
