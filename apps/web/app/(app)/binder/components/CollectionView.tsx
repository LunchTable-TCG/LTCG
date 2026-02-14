"use client";

import { cn } from "@/lib/utils";
import type { SortOption } from "@/types";
import { RARITY_STYLES } from "@ltcg/core/ui";
import {
  ChevronDown,
  Crown,
  Flame,
  Gem,
  Grid3X3,
  Heart,
  List,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Waves,
  X,
  Zap,
} from "lucide-react";
import type { ViewMode } from "../types";
import { BinderCard, type CardData, type Element, type Rarity } from "./BinderCard";

// Use core rarity styles with adjusted opacities for this component
const RARITY_COLORS: Record<Rarity, { bg: string; text: string; border: string }> = {
  legendary: { ...RARITY_STYLES.legendary, bg: "bg-amber-500/20", border: "border-amber-500/40" },
  epic: { ...RARITY_STYLES.epic, bg: "bg-purple-500/20", border: "border-purple-500/40" },
  rare: { ...RARITY_STYLES.rare, bg: "bg-blue-500/20", border: "border-blue-500/40" },
  uncommon: { ...RARITY_STYLES.uncommon, bg: "bg-green-500/20", border: "border-green-500/40" },
  common: { ...RARITY_STYLES.common, bg: "bg-gray-500/20", border: "border-gray-500/40" },
};

const ELEMENT_CONFIG: Record<Element, { icon: typeof Flame; color: string }> = {
  fire: { icon: Flame, color: "text-red-500" },
  water: { icon: Waves, color: "text-blue-500" },
  earth: { icon: Shield, color: "text-slate-400" },
  wind: { icon: Zap, color: "text-yellow-500" },
  neutral: { icon: Star, color: "text-gray-400" },
};

interface CollectionStats {
  byRarity: Record<Rarity, number>;
}

interface CollectionViewProps {
  cards: CardData[];
  stats: CollectionStats;
  viewMode: ViewMode;
  searchQuery: string;
  selectedRarity: Rarity | "all";
  selectedElement: Element | "all";
  selectedType: "stereotype" | "spell" | "trap" | "class" | "all";
  sortBy: SortOption;
  sortOrder: "asc" | "desc";
  showFilters: boolean;
  showFavoritesOnly: boolean;
  hasActiveFilters: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchChange: (query: string) => void;
  onRarityChange: (rarity: Rarity | "all") => void;
  onElementChange: (element: Element | "all") => void;
  onTypeChange: (type: "stereotype" | "spell" | "trap" | "class" | "all") => void;
  onSortByChange: (sort: SortOption) => void;
  onSortOrderToggle: () => void;
  onToggleFilters: () => void;
  onToggleFavoritesOnly: () => void;
  onClearFilters: () => void;
  onCardClick: (card: CardData) => void;
  onFavoriteToggle: (cardId: string) => void;
}

export function CollectionView({
  cards,
  stats,
  viewMode,
  searchQuery,
  selectedRarity,
  selectedElement,
  selectedType,
  sortBy,
  sortOrder,
  showFilters,
  showFavoritesOnly,
  hasActiveFilters,
  onViewModeChange,
  onSearchChange,
  onRarityChange,
  onElementChange,
  onTypeChange,
  onSortByChange,
  onSortOrderToggle,
  onToggleFilters,
  onToggleFavoritesOnly,
  onClearFilters,
  onCardClick,
  onFavoriteToggle,
}: CollectionViewProps) {
  return (
    <div data-testid="collection-view">
      {/* Rarity Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["legendary", "epic", "rare", "uncommon", "common"] as Rarity[]).map((rarity) => {
          const colors = RARITY_COLORS[rarity];
          const isActive = selectedRarity === rarity;
          return (
            <button
              type="button"
              key={rarity}
              onClick={() => onRarityChange(selectedRarity === rarity ? "all" : rarity)}
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
                {stats.byRarity[rarity]}
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-[#1a1510] border border-[#3d2b1f] rounded-xl text-[#e8e0d5] placeholder:text-[#a89f94]/40 focus:outline-none focus:border-[#d4af37]/50"
              data-testid="collection-search"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/5"
              >
                <X className="w-4 h-4 text-[#a89f94]" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onToggleFavoritesOnly}
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
              onClick={onToggleFilters}
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
              onChange={(e) => onSortByChange(e.target.value as SortOption)}
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
              onClick={onSortOrderToggle}
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
                onClick={() => onViewModeChange("grid")}
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
                onClick={() => onViewModeChange("list")}
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

      {/* Expanded Filters */}
      {showFilters && (
        <div className="tcg-chat-leather rounded-2xl p-5 mb-6 border border-[#3d2b1f] relative overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="ornament-corner ornament-corner-tl opacity-30" />
          <div className="flex flex-wrap items-end gap-6 relative z-10">
            {/* Element Filter */}
            <div className="space-y-2">
              <span className="text-[10px] text-[#a89f94] font-black uppercase tracking-widest block">
                Element
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onElementChange("all")}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all",
                    selectedElement === "all"
                      ? "bg-[#d4af37] text-[#1a1614] border-[#d4af37]"
                      : "bg-black/30 text-[#a89f94] border-[#3d2b1f] hover:border-[#d4af37]/30"
                  )}
                >
                  All
                </button>
                {(["fire", "water", "earth", "wind"] as Element[]).map((el) => {
                  const config = ELEMENT_CONFIG[el];
                  const Icon = config.icon;
                  const isActive = selectedElement === el;
                  return (
                    <button
                      type="button"
                      key={el}
                      onClick={() => onElementChange(selectedElement === el ? "all" : el)}
                      className={cn(
                        "p-2 rounded-lg border transition-all",
                        isActive
                          ? `bg-${el === "fire" ? "red" : el === "water" ? "blue" : el === "earth" ? "slate" : "yellow"}-500/20 border-${el === "fire" ? "red" : el === "water" ? "blue" : el === "earth" ? "slate" : "yellow"}-500/50 ${config.color}`
                          : "bg-black/30 text-[#a89f94] border-[#3d2b1f] hover:border-[#d4af37]/30"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card Type Filter */}
            <div className="space-y-2">
              <span className="text-[10px] text-[#a89f94] font-black uppercase tracking-widest block">
                Card Type
              </span>
              <div className="flex gap-2">
                {(["all", "stereotype", "spell", "trap", "class"] as const).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => onTypeChange(type)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all",
                      selectedType === type
                        ? "bg-[#d4af37] text-[#1a1614] border-[#d4af37]"
                        : "bg-black/30 text-[#a89f94] border-[#3d2b1f] hover:border-[#d4af37]/30"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="flex items-center gap-1 px-3 py-2 text-[#d4af37] hover:text-[#f9e29f] hover:bg-[#d4af37]/10 rounded-lg transition-all text-xs font-bold"
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-[#a89f94] mb-4">Showing {cards.length} cards</p>

      {/* Card Grid/List */}
      {cards.length === 0 ? (
        <div className="text-center py-24 tcg-chat-leather rounded-2xl border border-[#3d2b1f] relative overflow-hidden">
          <div className="ornament-corner ornament-corner-tl opacity-50" />
          <div className="ornament-corner ornament-corner-tr opacity-50" />
          <div className="w-24 h-24 rounded-2xl bg-[#3d2b1f]/30 mx-auto mb-6 flex items-center justify-center border border-[#3d2b1f] relative z-10">
            <Grid3X3 className="w-12 h-12 text-[#d4af37] opacity-40" />
          </div>
          {hasActiveFilters ? (
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#e8e0d5] mb-3 uppercase tracking-tighter">
                No Cards Found
              </p>
              <p className="text-[#a89f94] mb-6 max-w-md mx-auto">
                Your search didn't match any cards in your collection. Try adjusting your filters.
              </p>
              <button
                type="button"
                onClick={onClearFilters}
                className="tcg-button-primary px-6 py-3 font-bold uppercase tracking-wide"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#e8e0d5] mb-3 uppercase tracking-tighter">
                Your Binder is Empty
              </p>
              <p className="text-[#a89f94] mb-6 max-w-md mx-auto">
                Start collecting cards by opening packs or winning matches!
              </p>
              <button
                type="button"
                className="tcg-button-primary px-6 py-3 font-bold uppercase tracking-wide flex items-center gap-2 mx-auto"
              >
                <Sparkles className="w-5 h-5" />
                Visit Shop
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              : "space-y-3"
          )}
        >
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
            >
              <BinderCard
                card={card}
                variant={viewMode}
                onClick={() => onCardClick(card)}
                onFavorite={() => onFavoriteToggle(card.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
