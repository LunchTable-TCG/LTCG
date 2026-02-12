"use client";

import { Button } from "@/components/ui/button";
import type { ShopItem } from "@/types/shop";
import { Coins, Gem, Sparkles } from "lucide-react";

interface CurrencyCardProps {
  item: ShopItem;
  onPurchase: () => void;
}

export function CurrencyCard({ item, onPurchase }: CurrencyCardProps) {
  return (
    <div className="p-4 rounded-xl border border-[#3d2b1f] bg-black/40 hover:bg-black/60 transition-all">
      <div className="aspect-square rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4 relative">
        <Coins className="w-20 h-20 text-yellow-400" />
        <Sparkles className="absolute top-2 right-2 w-6 h-6 text-yellow-300 animate-pulse" />
      </div>
      <h3 className="font-bold text-[#e8e0d5] mb-1">{item.name}</h3>
      <p className="text-2xl font-bold text-yellow-400 mb-1">+{item.quantity?.toLocaleString()}</p>
      <p className="text-sm text-[#a89f94] mb-3">{item.description}</p>
      {item.gemPrice && (
        <Button
          onClick={onPurchase}
          className="w-full justify-between bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30"
        >
          <Gem className="w-4 h-4" />
          <span>{item.gemPrice.toLocaleString()}</span>
        </Button>
      )}
    </div>
  );
}
