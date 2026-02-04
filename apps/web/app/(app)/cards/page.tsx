"use client";

import type { Doc } from "@convex/_generated/dataModel";
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { AuthLoading, Authenticated } from "convex/react";
import { Book, Filter, Grid3X3, List, Loader2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  BinderCard,
  BinderCardSkeleton,
  type CardData,
  CardPreviewModal,
  type CardType,
  type Element,
  type Rarity,
} from "../binder/components";

type ViewMode = "grid" | "list";
type SortOption = "name" | "rarity" | "element" | "cost" | "attack" | "type";

const RARITY_ORDER: Record<Rarity, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

const RARITY_COLORS: Record<Rarity, { bg: string; text: string; border: string }> = {
  legendary: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" },
  epic: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40" },
  rare: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40" },
  uncommon: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/40" },
  common: { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/40" },
};

const ELEMENTS: Element[] = ["fire", "water", "earth", "wind", "neutral"];
const RARITIES: Rarity[] = ["legendary", "epic", "rare", "uncommon", "common"];
const CARD_TYPES: CardType[] = ["creature", "spell", "trap", "equipment"];

export default function CardCodexPage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-[#0d0a09]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
            <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
              Opening the Codex...
            </p>
          </div>
        </div>
      </AuthLoading>
      <Authenticated>
        <CardCodexContent />
      </Authenticated>
    </>
  );
}

function CardCodexContent() {
  // Fetch ALL card definitions
  const allCards = useConvexQuery(apiAny.core.cards.getAllCardDefinitions, {});

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<Rarity | "all">("all");
  const [selectedElement, setSelectedElement] = useState<Element | "all">("all");
  const [selectedType, setSelectedType] = useState<CardType | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("rarity");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Transform card definitions to CardData format
  const cards: CardData[] = useMemo(() => {
    if (!allCards) return [];

    return allCards.map((card: Doc<"cardDefinitions">) => ({
      id: card._id,
      cardDefinitionId: card._id,
      name: card.name,
      rarity: card.rarity as Rarity,
      element: (card.attribute === "fire" ||
      card.attribute === "water" ||
      card.attribute === "earth" ||
      card.attribute === "wind"
        ? card.attribute
        : "neutral") as Element,
      cardType: card.cardType as CardType,
      attack: card.attack,
      defense: card.defense,
      cost: card.cost ?? 0,
      ability: card.ability,
      flavorText: card.flavorText,
      imageUrl: card.imageUrl,
      owned: 0, // Not showing ownership in codex
      isFavorite: false,
    }));
  }, [allCards]);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (card) =>
          card.name.toLowerCase().includes(query) || card.flavorText?.toLowerCase().includes(query)
      );
    }

    // Rarity filter
    if (selectedRarity !== "all") {
      result = result.filter((card) => card.rarity === selectedRarity);
    }

    // Element filter
    if (selectedElement !== "all") {
      result = result.filter((card) => card.element === selectedElement);
    }

    // Type filter
    if (selectedType !== "all") {
      result = result.filter((card) => card.cardType === selectedType);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "rarity":
          comparison = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
          break;
        case "element":
          comparison = a.element.localeCompare(b.element);
          break;
        case "cost":
          comparison = a.cost - b.cost;
          break;
        case "attack":
          comparison = (a.attack ?? 0) - (b.attack ?? 0);
          break;
        case "type":
          comparison = a.cardType.localeCompare(b.cardType);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [cards, searchQuery, selectedRarity, selectedElement, selectedType, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const byRarity = RARITIES.reduce(
      (acc, r) => ({ ...acc, [r]: cards.filter((c) => c.rarity === r).length }),
      {} as Record<Rarity, number>
    );
    return { total: cards.length, byRarity };
  }, [cards]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRarity("all");
    setSelectedElement("all");
    setSelectedType("all");
  };

  const hasActiveFilters =
    searchQuery || selectedRarity !== "all" || selectedElement !== "all" || selectedType !== "all";

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-[#d4af37]/5 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37] mb-4">
            <Book className="w-8 h-8 text-[#d4af37]" />
          </div>
          <h1 className="text-3xl font-bold text-[#e8e0d5] mb-2">Card Codex</h1>
          <p className="text-[#a89f94] max-w-md mx-auto">
            Browse every card in the realm. Study their powers, plan your strategies.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="px-4 py-2 rounded-lg bg-black/40 border border-[#3d2b1f]">
            <span className="text-[#a89f94] text-sm">Total Cards: </span>
            <span className="text-[#e8e0d5] font-bold">{stats.total}</span>
          </div>
          {RARITIES.map((rarity) => (
            <button
              key={rarity}
              type="button"
              onClick={() => setSelectedRarity(selectedRarity === rarity ? "all" : rarity)}
              className={cn(
                "px-3 py-2 rounded-lg border transition-all text-sm",
                selectedRarity === rarity
                  ? `${RARITY_COLORS[rarity].bg} ${RARITY_COLORS[rarity].border} ${RARITY_COLORS[rarity].text}`
                  : "bg-black/40 border-[#3d2b1f] text-[#a89f94] hover:border-[#d4af37]/30"
              )}
            >
              <span className="capitalize">{rarity}</span>
              <span className="ml-1 opacity-60">({stats.byRarity[rarity]})</span>
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards by name..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border border-[#3d2b1f] text-[#e8e0d5] placeholder-[#a89f94]/50 focus:outline-none focus:border-[#d4af37]/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a89f94] hover:text-[#e8e0d5]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all",
                showFilters || hasActiveFilters
                  ? "bg-[#d4af37]/20 border-[#d4af37]/50 text-[#d4af37]"
                  : "bg-black/40 border-[#3d2b1f] text-[#a89f94] hover:border-[#d4af37]/30"
              )}
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#d4af37]" />}
            </button>

            {/* View Mode */}
            <div className="flex rounded-xl bg-black/40 border border-[#3d2b1f] p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === "grid" ? "bg-[#d4af37]/20 text-[#d4af37]" : "text-[#a89f94]"
                )}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === "list" ? "bg-[#d4af37]/20 text-[#d4af37]" : "text-[#a89f94]"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="p-4 rounded-xl bg-black/40 border border-[#3d2b1f] space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Element Filter */}
                <div>
                  <label className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
                    Element
                  </label>
                  <select
                    value={selectedElement}
                    onChange={(e) => setSelectedElement(e.target.value as Element | "all")}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5] focus:outline-none focus:border-[#d4af37]/50"
                  >
                    <option value="all">All Elements</option>
                    {ELEMENTS.map((el) => (
                      <option key={el} value={el} className="capitalize">
                        {el.charAt(0).toUpperCase() + el.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
                    Card Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as CardType | "all")}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5] focus:outline-none focus:border-[#d4af37]/50"
                  >
                    <option value="all">All Types</option>
                    {CARD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5] focus:outline-none focus:border-[#d4af37]/50"
                  >
                    <option value="rarity">Rarity</option>
                    <option value="name">Name</option>
                    <option value="cost">Mana Cost</option>
                    <option value="attack">Attack</option>
                    <option value="element">Element</option>
                    <option value="type">Type</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
                    Order
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5] focus:outline-none focus:border-[#d4af37]/50"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-[#d4af37] hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-[#a89f94]">
          Showing {filteredCards.length} of {stats.total} cards
        </div>

        {/* Card Grid/List */}
        {!allCards ? (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3"
                : "space-y-2"
            )}
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <BinderCardSkeleton key={i} variant={viewMode} />
            ))}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-16 rounded-xl bg-black/40 border border-[#3d2b1f]">
            <Search className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
            <p className="text-[#e8e0d5] font-bold mb-2">No cards found</p>
            <p className="text-[#a89f94]">Try adjusting your filters</p>
          </div>
        ) : (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3"
                : "space-y-2"
            )}
          >
            {filteredCards.map((card) => (
              <BinderCard
                key={card.id}
                card={card}
                variant={viewMode}
                onClick={() => setPreviewCard(card)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Preview Modal */}
      <CardPreviewModal
        card={previewCard}
        isOpen={!!previewCard}
        onClose={() => setPreviewCard(null)}
      />
    </div>
  );
}
