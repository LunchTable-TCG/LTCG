"use client";

import { cn } from "@/lib/utils";
import { Check, Flame, Shield, Waves, Zap } from "lucide-react";

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

const DECK_CONFIG: Record<
  string,
  {
    icon: typeof Flame;
    gradient: string;
    border: string;
    iconColor: string;
    selectedBg: string;
  }
> = {
  INFERNAL_DRAGONS: {
    icon: Flame,
    gradient: "from-red-600/20 to-orange-600/20",
    border: "border-red-500/30 hover:border-red-500/60",
    iconColor: "text-red-500",
    selectedBg: "bg-red-500/20",
  },
  ABYSSAL_DEPTHS: {
    icon: Waves,
    gradient: "from-blue-600/20 to-cyan-600/20",
    border: "border-blue-500/30 hover:border-blue-500/60",
    iconColor: "text-blue-500",
    selectedBg: "bg-blue-500/20",
  },
  IRON_LEGION: {
    icon: Shield,
    gradient: "from-slate-500/20 to-zinc-600/20",
    border: "border-slate-400/30 hover:border-slate-400/60",
    iconColor: "text-slate-400",
    selectedBg: "bg-slate-500/20",
  },
  STORM_RIDERS: {
    icon: Zap,
    gradient: "from-yellow-500/20 to-amber-600/20",
    border: "border-yellow-500/30 hover:border-yellow-500/60",
    iconColor: "text-yellow-500",
    selectedBg: "bg-yellow-500/20",
  },
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {decks.map((deck) => {
          const defaultConfig = {
            icon: Shield,
            gradient: "from-slate-500/20 to-zinc-600/20",
            border: "border-slate-400/30 hover:border-slate-400/60",
            iconColor: "text-slate-400",
            selectedBg: "bg-slate-500/20",
          };
          const config = DECK_CONFIG[deck.deckCode] || defaultConfig;
          const Icon = config.icon;
          const isSelected = selectedDeck === deck.deckCode;

          return (
            <button
              key={deck.deckCode}
              type="button"
              onClick={() => onSelect(deck.deckCode)}
              className={cn(
                "relative p-3 rounded-lg border-2 transition-all duration-300 text-left group",
                "bg-linear-to-br",
                config.gradient,
                isSelected
                  ? `${config.selectedBg} border-[#d4af37] ring-1 ring-[#d4af37]/30`
                  : config.border
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
                <Icon className={cn("w-5 h-5", config.iconColor)} />
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
