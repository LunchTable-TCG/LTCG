"use client";

import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { getArchetypeTheme } from "@/lib/archetypeThemes";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Loader2,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Waves,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface WelcomeGuideDialogProps {
  isOpen: boolean;
  onComplete: (selectedDeck: string) => void;
  username?: string;
  isClaiming?: boolean;
}

type Step = "welcome" | "deck";

/** Map archetype/element to a Lucide icon */
const ARCHETYPE_ICONS: Record<string, typeof Flame> = {
  fire: Flame,
  water: Waves,
  earth: Shield,
  wind: Zap,
  dark: Skull,
  infernal_dragons: Flame,
  abyssal_depths: Waves,
  iron_legion: Shield,
  storm_riders: Zap,
  storm_elementals: Zap,
  necro_empire: Skull,
};

export function WelcomeGuideDialog({
  isOpen,
  onComplete,
  username = "Traveler",
  isClaiming = false,
}: WelcomeGuideDialogProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);

  const starterDecks = useConvexQuery(typedApi.agents.agents.getStarterDecks, isOpen ? {} : "skip");

  if (!isOpen) return null;

  const handleComplete = () => {
    if (selectedDeck) {
      onComplete(selectedDeck);
    }
  };

  const selectedDeckData = starterDecks?.find(
    (d: { deckCode: string }) => d.deckCode === selectedDeck
  );
  const selectedTheme = selectedDeckData ? getArchetypeTheme(selectedDeckData.archetype) : null;
  const SelectedIcon = selectedDeckData
    ? ARCHETYPE_ICONS[selectedDeckData.archetype] ?? Shield
    : Shield;

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center">
      {/* Backdrop with magical particles */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md">
        {/* Floating particles */}
        <div className="absolute top-[20%] left-[10%] w-2 h-2 bg-[#d4af37]/60 rounded-full animate-float-slow" />
        <div className="absolute top-[40%] left-[80%] w-1.5 h-1.5 bg-[#d4af37]/40 rounded-full animate-float-delayed" />
        <div className="absolute top-[60%] left-[25%] w-1 h-1 bg-[#d4af37]/50 rounded-full animate-float-slow" />
        <div className="absolute top-[30%] left-[65%] w-2 h-2 bg-[#d4af37]/30 rounded-full animate-float" />
        <div className="absolute top-[70%] left-[45%] w-1.5 h-1.5 bg-[#d4af37]/40 rounded-full animate-float-delayed" />
      </div>

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 tcg-chat-leather rounded-2xl border border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/10 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="ornament-corner ornament-corner-tl" />
        <div className="ornament-corner ornament-corner-tr" />
        <div className="ornament-corner ornament-corner-bl" />
        <div className="ornament-corner ornament-corner-br" />

        {/* Progress indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#3d2b1f]">
          <div
            className="h-full bg-linear-to-r from-[#d4af37] to-[#f4d03f] transition-all duration-500"
            style={{ width: step === "welcome" ? "50%" : "100%" }}
          />
        </div>

        {/* Step 1: Welcome */}
        {step === "welcome" && (
          <div className="p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-linear-to-br from-[#d4af37]/20 to-[#8b4513]/20 border border-[#d4af37]/30 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-[#d4af37]" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-black text-[#e8e0d5] uppercase tracking-tight mb-2">
              Welcome to the Arena
            </h1>
            <p className="text-lg text-[#d4af37] font-bold mb-6">{username}</p>

            {/* Welcome text */}
            <div className="max-w-md mx-auto space-y-4 text-[#a89f94] text-sm leading-relaxed mb-8">
              <p>
                You've arrived at the <span className="text-[#d4af37] font-bold">Lunchtable</span> —
                where legends are forged through battle and strategy.
              </p>
              <p>
                Before you can challenge other players, you'll need to choose your
                <span className="text-[#e8e0d5] font-bold"> Starter Deck</span>. Each deck embodies
                a different elemental power and playstyle.
              </p>
            </div>

            {/* Features preview */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
              <div className="p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
                <Swords className="w-5 h-5 mx-auto text-[#d4af37] mb-1" />
                <p className="text-[10px] text-[#a89f94] uppercase tracking-wide">Battle</p>
              </div>
              <div className="p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
                <BookOpen className="w-5 h-5 mx-auto text-[#d4af37] mb-1" />
                <p className="text-[10px] text-[#a89f94] uppercase tracking-wide">Collect</p>
              </div>
              <div className="p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
                <Sparkles className="w-5 h-5 mx-auto text-[#d4af37] mb-1" />
                <p className="text-[10px] text-[#a89f94] uppercase tracking-wide">Rise</p>
              </div>
            </div>

            {/* Next button */}
            <button
              type="button"
              onClick={() => setStep("deck")}
              className="tcg-button-primary px-8 py-4 font-black uppercase tracking-wide text-sm flex items-center gap-2 mx-auto"
            >
              Choose Your Deck
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Deck Selection */}
        {step === "deck" && (
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-[#e8e0d5] uppercase tracking-tight mb-2">
                Choose Your Path
              </h2>
              <p className="text-sm text-[#a89f94]">
                Select a starter deck that matches your playstyle
              </p>
            </div>

            {/* Deck grid */}
            {!starterDecks ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {starterDecks.map((deck: { deckCode: string; name: string; archetype: string; description: string; playstyle: string }) => {
                  const theme = getArchetypeTheme(deck.archetype);
                  const Icon = ARCHETYPE_ICONS[deck.archetype] ?? Shield;
                  const isSelected = selectedDeck === deck.deckCode;
                  const colorClass = `text-${theme.color}-500`;
                  const bgClass = `bg-${theme.color}-500/10`;

                  return (
                    <button
                      type="button"
                      key={deck.deckCode}
                      onClick={() => setSelectedDeck(deck.deckCode)}
                      className={cn(
                        "relative p-5 rounded-xl border-2 transition-all text-left group",
                        isSelected
                          ? `${bgClass} border-${theme.color}-500 shadow-lg ${theme.glowColor}`
                          : "bg-black/20 border-[#3d2b1f] hover:border-[#d4af37]/30"
                      )}
                    >
                      {/* Selected indicator */}
                      {isSelected && (
                        <div
                          className={cn(
                            "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center",
                            bgClass
                          )}
                        >
                          <Check className={cn("w-4 h-4", colorClass)} />
                        </div>
                      )}

                      {/* Icon */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all",
                          isSelected ? bgClass : "bg-black/40 group-hover:bg-black/60"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-6 h-6 transition-all",
                            isSelected ? colorClass : "text-[#a89f94] group-hover:text-[#e8e0d5]"
                          )}
                        />
                      </div>

                      {/* Name */}
                      <h3
                        className={cn(
                          "font-black text-base uppercase tracking-wide mb-1",
                          isSelected ? colorClass : "text-[#e8e0d5]"
                        )}
                      >
                        {deck.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-[#a89f94] mb-2 leading-relaxed">
                        {deck.description}
                      </p>

                      {/* Playstyle badge */}
                      <span
                        className={cn(
                          "inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                          isSelected ? `${bgClass} ${colorClass}` : "bg-black/40 text-[#a89f94]"
                        )}
                      >
                        {deck.playstyle}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected deck summary */}
            {selectedDeckData && selectedTheme && (
              <div className="p-4 rounded-xl bg-black/30 border border-[#d4af37]/30 mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center",
                      `bg-${selectedTheme.color}-500/10`
                    )}
                  >
                    <SelectedIcon className={cn("w-7 h-7", `text-${selectedTheme.color}-500`)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-[#a89f94] uppercase tracking-widest mb-1">
                      Your Chosen Deck
                    </p>
                    <p className={cn("font-black uppercase tracking-wide", `text-${selectedTheme.color}-500`)}>
                      {selectedDeckData.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="px-4 py-2 rounded-lg border border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 font-bold uppercase tracking-wide text-sm transition-all"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={!selectedDeck || isClaiming}
                className={cn(
                  "px-8 py-3 rounded-xl font-black uppercase tracking-wide text-sm flex items-center gap-2 transition-all",
                  selectedDeck
                    ? "tcg-button-primary"
                    : "bg-[#3d2b1f]/50 text-[#a89f94]/50 cursor-not-allowed border border-[#3d2b1f]"
                )}
              >
                {isClaiming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isClaiming ? "Claiming..." : "Begin Your Journey"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
