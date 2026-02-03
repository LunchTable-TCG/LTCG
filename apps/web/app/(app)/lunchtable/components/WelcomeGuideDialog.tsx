"use client";

import { cn } from "@/lib/utils";
import {
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Shield,
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
}

type Step = "welcome" | "deck";

const STARTER_DECKS = [
  {
    id: "fire",
    name: "Infernal Dragons",
    archetype: "fire",
    icon: Flame,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    selectedBorder: "border-red-500",
    glow: "shadow-red-500/20",
    description: "Aggressive beatdown with burn damage",
    playstyle: "Aggro",
    quote: '"Strike fast, burn bright."',
  },
  {
    id: "water",
    name: "Abyssal Depths",
    archetype: "water",
    icon: Waves,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    selectedBorder: "border-blue-500",
    glow: "shadow-blue-500/20",
    description: "Control the tides with bounce and freeze",
    playstyle: "Control",
    quote: '"Patience wins wars."',
  },
  {
    id: "earth",
    name: "Iron Legion",
    archetype: "earth",
    icon: Shield,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-400/30",
    selectedBorder: "border-slate-400",
    glow: "shadow-slate-500/20",
    description: "Build an unbreakable defense",
    playstyle: "Midrange",
    quote: '"Stand firm, outlast all."',
  },
  {
    id: "wind",
    name: "Storm Riders",
    archetype: "wind",
    icon: Zap,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    selectedBorder: "border-yellow-500",
    glow: "shadow-yellow-500/20",
    description: "Strike fast with tempo plays",
    playstyle: "Tempo",
    quote: '"Swift as lightning."',
  },
];

export function WelcomeGuideDialog({
  isOpen,
  onComplete,
  username = "Traveler",
}: WelcomeGuideDialogProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleComplete = () => {
    if (selectedDeck) {
      onComplete(selectedDeck);
    }
  };

  const selectedDeckInfo = STARTER_DECKS.find((d) => d.id === selectedDeck);

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
      <div className="panel-ornate rounded-2xl w-full max-w-2xl mx-4 shadow-2xl shadow-[#d4af37]/10 overflow-hidden animate-in zoom-in-95 fade-in duration-300">

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
              className="btn-fantasy-primary rounded-xl mx-auto"
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
            <div className="grid grid-cols-2 gap-4 mb-6">
              {STARTER_DECKS.map((deck) => {
                const Icon = deck.icon;
                const isSelected = selectedDeck === deck.id;

                return (
                  <button
                    type="button"
                    key={deck.id}
                    onClick={() => setSelectedDeck(deck.id)}
                    className={cn(
                      "relative p-5 rounded-xl border-2 transition-all text-left group",
                      isSelected
                        ? `${deck.bg} ${deck.selectedBorder} shadow-lg ${deck.glow}`
                        : "bg-black/20 border-[#3d2b1f] hover:border-[#d4af37]/30"
                    )}
                  >
                    {/* Selected indicator */}
                    {isSelected && (
                      <div
                        className={cn(
                          "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center",
                          deck.bg
                        )}
                      >
                        <Check className={cn("w-4 h-4", deck.color)} />
                      </div>
                    )}

                    {/* Icon */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all",
                        isSelected ? deck.bg : "bg-black/40 group-hover:bg-black/60"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-6 h-6 transition-all",
                          isSelected ? deck.color : "text-[#a89f94] group-hover:text-[#e8e0d5]"
                        )}
                      />
                    </div>

                    {/* Name */}
                    <h3
                      className={cn(
                        "font-black text-base uppercase tracking-wide mb-1",
                        isSelected ? deck.color : "text-[#e8e0d5]"
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
                        isSelected ? `${deck.bg} ${deck.color}` : "bg-black/40 text-[#a89f94]"
                      )}
                    >
                      {deck.playstyle}
                    </span>

                    {/* Quote - only show when selected */}
                    {isSelected && (
                      <p className="mt-3 pt-3 border-t border-current/20 text-[10px] italic text-[#a89f94]">
                        {deck.quote}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected deck summary */}
            {selectedDeckInfo && (
              <div className="p-4 rounded-xl bg-black/30 border border-[#d4af37]/30 mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center",
                      selectedDeckInfo.bg
                    )}
                  >
                    <selectedDeckInfo.icon className={cn("w-7 h-7", selectedDeckInfo.color)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-[#a89f94] uppercase tracking-widest mb-1">
                      Your Chosen Deck
                    </p>
                    <p className={cn("font-black uppercase tracking-wide", selectedDeckInfo.color)}>
                      {selectedDeckInfo.name}
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
                className="btn-fantasy-secondary rounded-lg"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={!selectedDeck}
                className={cn(
                  "rounded-xl flex items-center gap-2",
                  selectedDeck
                    ? "btn-fantasy-primary"
                    : "bg-[#3d2b1f]/50 text-[#a89f94]/50 cursor-not-allowed border border-[#3d2b1f] px-6 py-3"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Begin Your Journey
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
