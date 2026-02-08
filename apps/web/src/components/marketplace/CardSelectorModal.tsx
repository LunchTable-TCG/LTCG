"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Package, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Rarity } from "@/types/cards";

interface CardData {
  cardDefinitionId: Id<"cardDefinitions">;
  playerCardId: Id<"playerCards">;
  name: string;
  rarity: Rarity;
  quantity: number;
}

interface CardSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CardData[] | undefined;
  onSelectCard: (card: CardData) => void;
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const RARITY_BG: Record<Rarity, string> = {
  common: "from-gray-600/30 to-gray-800/30",
  uncommon: "from-green-600/30 to-green-800/30",
  rare: "from-blue-600/30 to-blue-800/30",
  epic: "from-purple-600/30 to-purple-800/30",
  legendary: "from-yellow-600/30 to-amber-800/30",
};

export function CardSelectorModal({
  isOpen,
  onClose,
  cards,
  onSelectCard,
}: CardSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");

  const filteredCards = useMemo(() => {
    if (!cards) return [];

    let filtered = cards;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((card) => card.name.toLowerCase().includes(query));
    }

    // Rarity filter
    if (rarityFilter !== "all") {
      filtered = filtered.filter((card) => card.rarity === rarityFilter);
    }

    // Sort by rarity (legendary first) then name
    const rarityOrder: Record<Rarity, number> = {
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1,
    };

    return filtered.sort((a, b) => {
      const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name);
    });
  }, [cards, searchQuery, rarityFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1a1614] border border-[#3d2b1f] rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#3d2b1f]">
          <div>
            <h2 className="text-xl font-bold text-[#e8e0d5]">Select Card to List</h2>
            <p className="text-sm text-[#a89f94] mt-1">Choose a card from your collection</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[#a89f94] hover:text-[#e8e0d5]"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-[#3d2b1f] flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89f94]" />
            <Input
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/40 border-[#3d2b1f] text-[#e8e0d5]"
            />
          </div>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as Rarity | "all")}
            className="px-4 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5]"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {cards === undefined ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
              <h3 className="text-lg font-semibold text-[#e8e0d5] mb-2">No Cards Found</h3>
              <p className="text-[#a89f94]">
                {searchQuery || rarityFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Open some packs to add cards to your collection"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredCards.map((card) => (
                <button
                  type="button"
                  key={card.playerCardId}
                  onClick={() => {
                    onSelectCard(card);
                    onClose();
                  }}
                  className="group relative aspect-3/4 rounded-xl overflow-hidden transition-all hover:scale-105 cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-full h-full p-3 bg-linear-to-br border-2 flex flex-col",
                      RARITY_BG[card.rarity],
                      card.rarity === "legendary"
                        ? "border-yellow-400"
                        : card.rarity === "epic"
                          ? "border-purple-400"
                          : card.rarity === "rare"
                            ? "border-blue-400"
                            : card.rarity === "uncommon"
                              ? "border-green-400"
                              : "border-gray-500"
                    )}
                  >
                    {/* Quantity Badge */}
                    {card.quantity > 1 && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#d4af37] text-[#1a1614]">
                        ×{card.quantity}
                      </span>
                    )}

                    {/* Card Image Placeholder */}
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-full h-full rounded bg-black/30 flex items-center justify-center">
                        <Package className={cn("w-8 h-8", RARITY_COLORS[card.rarity])} />
                      </div>
                    </div>

                    {/* Card Info */}
                    <div className="mt-2">
                      <p className="text-xs font-bold text-[#e8e0d5] truncate">{card.name}</p>
                      <p
                        className={cn(
                          "text-[10px] font-medium capitalize",
                          RARITY_COLORS[card.rarity]
                        )}
                      >
                        {card.rarity}
                      </p>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-[#d4af37]/0 group-hover:bg-[#d4af37]/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-[#e8e0d5] font-bold text-sm bg-[#d4af37] px-3 py-1 rounded">
                      Select
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#3d2b1f]">
          <Button onClick={onClose} variant="outline" className="w-full border-[#3d2b1f]">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
