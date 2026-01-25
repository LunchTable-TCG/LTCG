"use client";

import { FolderOpen, Layers, Plus, Star, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DECK_MIN_SIZE } from "../types";

interface DeckListItem {
  id: string;
  name: string;
  cardCount: number;
}

interface DeckListProps {
  decks: DeckListItem[] | undefined;
  activeDeckId: string | undefined;
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: (name: string) => Promise<void>;
  onSetActiveDeck: (deckId: string) => Promise<void>;
  onDeleteDeck: (deckId: string) => Promise<void>;
}

export function DeckList({
  decks,
  activeDeckId,
  onSelectDeck,
  onCreateDeck,
  onSetActiveDeck,
  onDeleteDeck,
}: DeckListProps) {
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;
    await onCreateDeck(newDeckName.trim());
    setNewDeckName("");
    setIsCreatingDeck(false);
  };

  return (
    <div className="tcg-chat-leather rounded-2xl p-6 border border-[#3d2b1f]">
      <h2 className="text-lg font-bold text-[#e8e0d5] mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-[#d4af37]" />
        My Decks
      </h2>

      {isCreatingDeck ? (
        <div className="flex gap-2 mb-4">
          <Input
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="Enter deck name..."
            className="flex-1 bg-[#1a1510] border-[#3d2b1f] text-[#e8e0d5]"
            onKeyDown={(e) => e.key === "Enter" && handleCreateDeck()}
            autoFocus
          />
          <Button
            onClick={handleCreateDeck}
            disabled={!newDeckName.trim()}
            className="bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614]"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => {
              setIsCreatingDeck(false);
              setNewDeckName("");
            }}
            variant="outline"
            className="border-[#3d2b1f] text-[#a89f94]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => setIsCreatingDeck(true)}
          className="w-full bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] mb-4"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Deck
        </Button>
      )}

      {!decks || decks.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/40" />
          <p className="text-[#a89f94]">No decks yet. Create your first deck!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decks.map((deck) => {
            const isActive = activeDeckId === deck.id;
            const isValidDeck = deck.cardCount >= DECK_MIN_SIZE;
            return (
              <div
                key={deck.id}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer group text-left",
                  isActive
                    ? "bg-[#d4af37]/10 border-[#d4af37] ring-2 ring-[#d4af37]/20"
                    : "bg-black/30 border-[#3d2b1f] hover:border-[#d4af37]/50"
                )}
                onClick={() => onSelectDeck(deck.id)}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    isActive ? "bg-[#d4af37]/30" : "bg-[#d4af37]/20"
                  )}
                >
                  {isActive ? (
                    <Star className="w-6 h-6 text-[#d4af37] fill-[#d4af37]" />
                  ) : (
                    <Layers className="w-6 h-6 text-[#d4af37]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "font-bold",
                        isActive ? "text-[#d4af37]" : "text-[#e8e0d5]"
                      )}
                    >
                      {deck.name}
                    </p>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] text-[9px] font-black uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#a89f94]">
                    {deck.cardCount} cards
                    {!isValidDeck && " - Incomplete (min 30)"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!isActive && isValidDeck && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetActiveDeck(deck.id);
                      }}
                      className="bg-[#d4af37]/20 hover:bg-[#d4af37] text-[#d4af37] hover:text-[#1a1614] border border-[#d4af37]/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star className="w-3 h-3 mr-1" />
                      Set Active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDeck(deck.id);
                    }}
                    className="text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
