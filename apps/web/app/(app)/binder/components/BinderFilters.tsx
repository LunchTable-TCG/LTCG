"use client";

import { cn } from "@/lib/utils";
import { isSortOption } from "@/types";
import type { SortOption } from "@/types";
import type { ViewMode } from "@/types/binder";
import type { Rarity } from "@/types/cards";
import type { CardType, ElementWithNeutral as Element } from "@/types/cards";
import {
  ChevronDown,
  Crown,
  Gem,
  Grid3X3,
  Heart,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

const RARITY_COLORS: Record<Rarity, { bg: string; text: string; border: string }> = {
  legendary: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" },
  epic: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40" },
  rare: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40" },
  uncommon: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/40" },
  common: { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/40" },
};

interface BinderFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedRarity: Rarity | "all";
  setSelectedRarity: (rarity: Rarity | "all") => void;
  selectedElement: Element | "all";
  setSelectedElement: (element: Element | "all") => void;
  selectedType: CardType | "all";
  setSelectedType: (type: CardType | "all") => void;
  sortBy: SortOption;
  setSortBy: (sortBy: SortOption) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (show: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  rarityStats: Record<Rarity, number>;
}

export function BinderFilters({
  searchQuery,
  setSearchQuery,
  selectedRarity,
  setSelectedRarity,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  showFilters,
  setShowFilters,
  showFavoritesOnly,
  setShowFavoritesOnly,
  viewMode,
  setViewMode,
  hasActiveFilters,
  rarityStats,
  selectedElement,
  selectedType,
}: BinderFiltersProps) {
  return (
    <>
      {/* Rarity Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["legendary", "epic", "rare", "uncommon", "common"] as Rarity[]).map((rarity) => {
          const colors = RARITY_COLORS[rarity];
          const isActive = selectedRarity === rarity;
          return (
            <button
              type="button"
              key={rarity}
              onClick={() => setSelectedRarity(selectedRarity === rarity ? "all" : rarity)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 border",
                isActive
                  ? `${colors.bg} ${colors.text} border-2 ${colors.border}`
                  : "bg-black/40 border-[#3d2b1f] text-[#a89f94] hover:bg-[#d4af37]/10 hover:text-[#d4af37] hover:border-[#d4af37]/30"
              )}
            >
              {rarity === "legendary" && <Crown className="w-4 h-4" />}
              {rarity === "epic" && <Gem className="w-4 h-4" />}
              <span className="capitalize">{rarity}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px]",
                  isActive ? "bg-white/10" : "bg-black/30"
                )}
              >
                {rarityStats[rarity]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Controls */}
      <div className="tcg-chat-leather rounded-2xl p-4 mb-6 border border-[#3d2b1f] relative overflow-hidden">
        <div className="ornament-corner ornament-corner-tl opacity-30" />
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94]" />
            <input
              type="text"
              placeholder="Search cards by name, ability, or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-[#1a1510] border border-[#3d2b1f] rounded-xl text-[#e8e0d5] placeholder:text-[#a89f94]/40 focus:outline-none focus:border-[#d4af37]/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/5"
              >
                <X className="w-4 h-4 text-[#a89f94]" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "p-4 rounded-xl border transition-all",
                showFavoritesOnly
                  ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                  : "bg-[#1a1510] border-[#3d2b1f] text-[#a89f94] hover:text-pink-400 hover:border-pink-500/30"
              )}
            >
              <Heart className={cn("w-5 h-5", showFavoritesOnly && "fill-pink-400")} />
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-4 rounded-xl border transition-all",
                hasActiveFilters
                  ? "bg-[#d4af37]/10 border-[#d4af37]/50 text-[#d4af37]"
                  : "bg-[#1a1510] border-[#3d2b1f] text-[#a89f94] hover:text-[#d4af37] hover:border-[#d4af37]/30"
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="uppercase tracking-widest text-xs font-black hidden sm:block">
                Filters
              </span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#d4af37]/20">
                  {
                    [
                      selectedRarity !== "all",
                      selectedElement !== "all",
                      selectedType !== "all",
                      showFavoritesOnly,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => {
                const value = e.target.value;
                if (isSortOption(value)) {
                  setSortBy(value);
                }
              }}
              className="px-4 py-4 bg-[#1a1510] border border-[#3d2b1f] rounded-xl text-[#e8e0d5] focus:outline-none focus:border-[#d4af37]/50 cursor-pointer"
            >
              <option value="rarity">By Rarity</option>
              <option value="name">By Name</option>
              <option value="element">By Element</option>
              <option value="attack">By Attack</option>
              <option value="defense">By Defense</option>
              <option value="cost">By Cost</option>
              <option value="owned">By Owned</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-4 bg-[#1a1510] border border-[#3d2b1f] rounded-xl text-[#a89f94] hover:text-[#d4af37] transition-all"
            >
              <ChevronDown
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  sortOrder === "asc" && "rotate-180"
                )}
              />
            </button>

            <div className="flex rounded-xl overflow-hidden border border-[#3d2b1f] bg-[#1a1510]">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-4 transition-colors",
                  viewMode === "grid"
                    ? "bg-[#d4af37] text-[#1a1614]"
                    : "text-[#a89f94] hover:bg-[#d4af37]/10"
                )}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-4 transition-colors",
                  viewMode === "list"
                    ? "bg-[#d4af37] text-[#1a1614]"
                    : "text-[#a89f94] hover:bg-[#d4af37]/10"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
