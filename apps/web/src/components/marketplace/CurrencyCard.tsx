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
    <div className="group p-4 rounded-xl border border-border bg-card/40 hover:bg-card/60 hover:border-primary/50 transition-all relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="aspect-square rounded-lg bg-primary/10 flex items-center justify-center mb-4 relative overflow-hidden group-hover:bg-primary/15 transition-colors">
        <Coins className="w-20 h-20 text-primary drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]" />
        <Sparkles className="absolute top-2 right-2 w-6 h-6 text-primary animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="font-bold text-foreground mb-1">{item.name}</h3>
      <p className="text-2xl font-bold text-primary mb-1">+{item.quantity?.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.description}</p>
      {item.gemPrice && (
        <Button
          onClick={onPurchase}
          className="w-full justify-between bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 font-medium"
        >
          <div className="flex items-center gap-2">
            <Gem className="w-4 h-4" />
            <span>{item.gemPrice.toLocaleString()}</span>
          </div>
          <span className="text-xs uppercase tracking-wider text-purple-400/70">Buy</span>
        </Button>
      )}
    </div>
  );
}
