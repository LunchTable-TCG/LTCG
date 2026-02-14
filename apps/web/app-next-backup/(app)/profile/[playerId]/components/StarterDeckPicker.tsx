"use client";

import { getArchetypeTheme } from "@/lib/archetypeThemes";
import { cn } from "@/lib/utils";
import { Check, Flame, Shield, Skull, Sparkles, Waves, Zap } from "lucide-react";

interface StarterDeck {
  name: string;
  deckCode: string;
  archetype: string;
  description: string;
  playstyle: string;
  cardCount: number;
}

interface StarterDeckPickerProps {
  decks: StarterDeck[];
  selectedDeck: string | null;
  onSelect: (deckCode: string) => void;
}

/** Map archetype to a Lucide icon */
const ARCHETYPE_ICONS: Record<string, typeof Flame> = {
  dropout: Flame,
  prep: Shield,
  geek: Zap,
  freak: Skull,
  nerd: Waves,
  goodie_two_shoes: Sparkles,
};

export function StarterDeckPicker({ decks, selectedDeck, onSelect }: StarterDeckPickerProps) {
  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <h3 className="text-base font-black text-[#e8e0d5] uppercase tracking-wider">
          Choose Your Agent's Deck
        </h3>
        <p className="text-[#a89f94] text-[10px] mt-1">
          Select the archetype that matches your agent's playstyle
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {decks.map((deck) => {
          const theme = getArchetypeTheme(deck.archetype);
          const Icon = ARCHETYPE_ICONS[deck.archetype] ?? Shield;
          const isSelected = selectedDeck === deck.deckCode;

          return (
            <button
              key={deck.deckCode}
              type="button"
              onClick={() => onSelect(deck.deckCode)}
              className={cn(
                "relative p-3 rounded-lg border-2 transition-all duration-300 text-left group",
                "bg-linear-to-br",
                `from-${theme.color}-600/20 to-${theme.color}-500/10`,
                isSelected
                  ? `bg-${theme.color}-500/20 border-[#d4af37] ring-1 ring-[#d4af37]/30`
                  : `${theme.borderColor} hover:border-${theme.color}-500/60`
              )}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#d4af37] flex items-center justify-center">
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                  "bg-black/30 border border-white/10",
                  "group-hover:scale-110 transition-transform"
                )}
              >
                <Icon className={cn("w-5 h-5", `text-${theme.color}-500`)} />
              </div>

              {/* Name */}
              <h4
                className={cn(
                  "font-black text-[11px] uppercase tracking-wide mb-1 leading-tight",
                  isSelected ? "text-[#d4af37]" : "text-[#e8e0d5]"
                )}
              >
                {deck.name.replace(" Starter", "")}
              </h4>

              {/* Playstyle Badge */}
              <span
                className={cn(
                  "inline-block text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mb-1",
                  "bg-black/30 text-[#a89f94]"
                )}
              >
                {deck.playstyle}
              </span>

              {/* Description - hidden on small, shown on md */}
              <p className="hidden md:block text-[#a89f94] text-[10px] leading-tight line-clamp-2">
                {deck.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
