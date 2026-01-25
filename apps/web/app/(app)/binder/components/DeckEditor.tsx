"use client";

import {
  AlertCircle,
  ChevronDown,
  Edit3,
  Check,
  Save,
  Trash2,
  Loader2,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BinderCard, type CardData, type Rarity } from "./BinderCard";
import type { DeckCard } from "../types";
import { DECK_MIN_SIZE } from "../types";

const RARITY_COLORS: Record<Rarity, { bg: string; text: string; border: string }> = {
  legendary: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" },
  epic: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40" },
  rare: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40" },
  uncommon: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/40" },
  common: { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/40" },
};

interface DeckEditorProps {
  deckName: string;
  deckCards: DeckCard[];
  availableCards: CardData[];
  searchQuery: string;
  isEditingName: boolean;
  editingName: string;
  isSaving: boolean;
  onBack: () => void;
  onSave: () => void;
  onClear: () => void;
  onAddCard: (card: CardData) => void;
  onRemoveCard: (cardId: string) => void;
  onStartEditName: () => void;
  onSaveName: () => void;
  onEditNameChange: (name: string) => void;
  onSearchChange: (query: string) => void;
  getCardCount: (cardId: string) => number;
  canAddCard: (card: CardData) => boolean;
}

export function DeckEditor({
  deckName,
  deckCards,
  availableCards,
  searchQuery,
  isEditingName,
  editingName,
  isSaving,
  onBack,
  onSave,
  onClear,
  onAddCard,
  onRemoveCard,
  onStartEditName,
  onSaveName,
  onEditNameChange,
  onSearchChange,
  getCardCount,
  canAddCard,
}: DeckEditorProps) {
  const deckCardCount = useMemo(() => {
    return deckCards.reduce((sum, dc) => sum + dc.count, 0);
  }, [deckCards]);

  const deckStats = useMemo(() => {
    let totalCost = 0;
    let creatureCount = 0;
    let spellCount = 0;

    deckCards.forEach(({ card, count }) => {
      totalCost += card.cost * count;
      if (card.cardType === "creature") creatureCount += count;
      if (card.cardType === "spell") spellCount += count;
    });

    return {
      avgCost: deckCardCount > 0 ? (totalCost / deckCardCount).toFixed(1) : "0",
      creatureCount,
      spellCount,
    };
  }, [deckCards, deckCardCount]);

  return (
    <div className="space-y-6">
      {/* Deck Header */}
      <div className="tcg-chat-leather rounded-2xl p-6 border border-[#3d2b1f]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={onBack}
              className="text-[#a89f94] hover:text-[#e8e0d5]"
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </Button>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => onEditNameChange(e.target.value)}
                  className="w-48 bg-[#1a1510] border-[#3d2b1f] text-[#e8e0d5]"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && onSaveName()}
                />
                <Button
                  size="sm"
                  onClick={onSaveName}
                  className="bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614]"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#e8e0d5]">{deckName}</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onStartEditName}
                  className="text-[#a89f94] hover:text-[#d4af37]"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onClear}
              className="border-[#3d2b1f] text-[#a89f94] hover:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Deck Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p
              className={cn(
                "text-2xl font-black",
                deckCardCount >= DECK_MIN_SIZE ? "text-green-400" : "text-[#d4af37]"
              )}
            >
              {deckCardCount}
            </p>
            <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Cards</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-[#e8e0d5]">{deckStats.avgCost}</p>
            <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Avg Cost</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-blue-400">{deckStats.creatureCount}</p>
            <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Creatures</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-purple-400">{deckStats.spellCount}</p>
            <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Spells</p>
          </div>
        </div>

        {/* Deck Validation */}
        {deckCardCount < DECK_MIN_SIZE && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>
              Deck needs at least {DECK_MIN_SIZE} cards. Currently has {deckCardCount}.
            </span>
          </div>
        )}
      </div>

      {/* Cards in Deck */}
      <div className="tcg-chat-leather rounded-2xl p-6 border border-[#3d2b1f]">
        <h3 className="text-lg font-bold text-[#e8e0d5] mb-4">Cards in Deck</h3>
        {deckCards.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#a89f94]">No cards in deck. Click cards below to add them.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {deckCards
              .sort((a, b) => a.card.cost - b.card.cost)
              .map(({ card, count }) => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-black/30 border border-[#3d2b1f]"
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                      RARITY_COLORS[card.rarity].bg,
                      RARITY_COLORS[card.rarity].text
                    )}
                  >
                    {card.cost}
                  </div>
                  <span className="flex-1 text-sm text-[#e8e0d5]">{card.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveCard(card.id)}
                      className="h-6 w-6 p-0 text-[#a89f94] hover:text-red-400"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold text-[#d4af37]">
                      {count}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAddCard(card)}
                      disabled={!canAddCard(card)}
                      className="h-6 w-6 p-0 text-[#a89f94] hover:text-green-400 disabled:opacity-30"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Available Cards */}
      <div className="tcg-chat-leather rounded-2xl p-6 border border-[#3d2b1f]">
        <h3 className="text-lg font-bold text-[#e8e0d5] mb-4">Available Cards</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89f94]" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1a1510] border border-[#3d2b1f] rounded-lg text-[#e8e0d5] placeholder:text-[#a89f94]/40 focus:outline-none focus:border-[#d4af37]/50 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[600px] overflow-y-auto">
          {availableCards.map((card) => {
            const countInDeck = getCardCount(card.id);
            const canAdd = canAddCard(card);
            return (
              <div
                key={card.id}
                className={cn(
                  "relative transition-all",
                  canAdd ? "" : "opacity-50 cursor-not-allowed"
                )}
              >
                <BinderCard
                  card={card}
                  variant="grid"
                  onClick={() => canAdd && onAddCard(card)}
                  className={cn(canAdd ? "hover:scale-105" : "pointer-events-none")}
                />
                {countInDeck > 0 && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#d4af37] text-[#1a1614] text-xs font-bold flex items-center justify-center pointer-events-none">
                    {countInDeck}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
