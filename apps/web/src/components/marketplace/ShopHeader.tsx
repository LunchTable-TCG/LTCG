"use client";

import { cn } from "@/lib/utils";
import type { ShopTab } from "@/types/shop";
import { Coins, Gem, LayoutGrid, ShoppingBag, Store } from "lucide-react";

interface ShopHeaderProps {
  activeTab: ShopTab;
  onTabChange: (tab: ShopTab) => void;
  gold: number;
  gems: number;
}

export function ShopHeader({ activeTab, onTabChange, gold, gems }: ShopHeaderProps) {
  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase text-black ink-bleed tracking-tighter mb-2">
            The Exchange
          </h1>
          <p className="text-black/60 font-medium max-w-md">
            Acquire new cards, trade with other players, and manage your resources.
          </p>
        </div>

        <div className="flex gap-4 self-stretch md:self-auto">
          <div className="flex-1 md:flex-none bg-[#fdfbf7] p-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center min-w-[120px]">
            <span className="text-xs font-black uppercase tracking-wider text-black/50 mb-1">
              Gold
            </span>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-600" />
              <span className="text-xl font-black text-black">{gold.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex-1 md:flex-none bg-[#fdfbf7] p-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center min-w-[120px]">
            <span className="text-xs font-black uppercase tracking-wider text-black/50 mb-1">
              Gems
            </span>
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-purple-600" />
              <span className="text-xl font-black text-black">{gems.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex p-1 bg-black/5 border-2 border-primary gap-1 shadow-zine-sm">
        <button
          type="button"
          onClick={() => onTabChange("shop")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 font-black uppercase tracking-wider transition-all",
            activeTab === "shop"
              ? "bg-primary text-white shadow-zine-sm ink-wash"
              : "hover:bg-black/5 text-black/60 hover:text-black"
          )}
        >
          <Store className="w-5 h-5" />
          <span className="ink-bleed">Shop</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("marketplace")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 font-black uppercase tracking-wider transition-all",
            activeTab === "marketplace"
              ? "bg-primary text-white shadow-zine-sm ink-wash"
              : "hover:bg-black/5 text-black/60 hover:text-black"
          )}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="ink-bleed">Marketplace</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("myListings")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 font-black uppercase tracking-wider transition-all",
            activeTab === "myListings"
              ? "bg-primary text-white shadow-zine-sm ink-wash"
              : "hover:bg-black/5 text-black/60 hover:text-black"
          )}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="ink-bleed">My Listings</span>
        </button>
      </div>
    </div>
  );
}
