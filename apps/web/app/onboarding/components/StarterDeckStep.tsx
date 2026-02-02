"use client";

import { apiAny, useConvexMutation } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight, Check, Flame, Loader2, Shield, Sparkles, Waves, Zap } from "lucide-react";
import { useState } from "react";

interface StarterDeckStepProps {
  onComplete: () => void;
}

// Starter deck definitions (matching convex/seeds/starterDecks.ts)
const STARTER_DECKS = [
  {
    name: "Infernal Dragons",
    deckCode: "INFERNAL_DRAGONS",
    archetype: "fire",
    description: "Harness the fury of fire dragons. Aggressive beatdown with burn damage.",
    playstyle: "Aggro",
    cardCount: 45,
  },
  {
    name: "Abyssal Depths",
    deckCode: "ABYSSAL_DEPTHS",
    archetype: "water",
    description: "Control the tides of battle. Bounce and freeze your opponent's threats.",
    playstyle: "Control",
    cardCount: 45,
  },
  {
    name: "Iron Legion",
    deckCode: "IRON_LEGION",
    archetype: "earth",
    description: "Build an unbreakable defense. High DEF monsters that protect each other.",
    playstyle: "Midrange",
    cardCount: 45,
  },
  {
    name: "Storm Riders",
    deckCode: "STORM_RIDERS",
    archetype: "wind",
    description: "Strike fast and draw cards. Direct attacks and tempo plays.",
    playstyle: "Tempo",
    cardCount: 45,
  },
] as const;

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

/**
 * Starter deck selection step of the onboarding flow.
 * Player picks one of four themed decks to start with.
 */
export function StarterDeckStep({ onComplete }: StarterDeckStepProps) {
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectStarterDeckMutation = useConvexMutation(apiAny.core.decks.selectStarterDeck);

  const handleSubmit = async () => {
    if (!selectedDeck) {
      setError("Please select a deck to continue");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await selectStarterDeckMutation({ deckCode: selectedDeck });
      onComplete();
    } catch (err) {
      console.error("Failed to select starter deck:", err);
      setError("Failed to select deck. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-[#d4af37]/30 text-[10px] text-[#d4af37] font-black uppercase tracking-widest mb-5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Step 2 of 2
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-black mb-3">
          <span className="text-[#e8e0d5] uppercase tracking-tighter">Choose Your Deck</span>
        </h1>
        <p className="text-[#a89f94] text-sm font-medium italic">
          Select the archetype that matches your playstyle
        </p>
      </div>

      {/* Deck Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        {STARTER_DECKS.map((deck, index) => {
          const defaultConfig = {
            icon: Shield,
            gradient: "from-slate-500/20 to-zinc-600/20",
            border: "border-slate-400/30 hover:border-slate-400/60",
            iconColor: "text-slate-400",
            selectedBg: "bg-slate-500/20",
          };
          const config = DECK_CONFIG[deck.deckCode] ?? defaultConfig;
          const Icon = config.icon;
          const isSelected = selectedDeck === deck.deckCode;

          return (
            <motion.button
              key={deck.deckCode}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              onClick={() => setSelectedDeck(deck.deckCode)}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all duration-300 text-left group",
                "bg-linear-to-br",
                config.gradient,
                isSelected
                  ? `${config.selectedBg} border-[#d4af37] ring-2 ring-[#d4af37]/30`
                  : config.border
              )}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#d4af37] flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-black" />
                </motion.div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-3",
                  "bg-black/30 border border-white/10",
                  "group-hover:scale-110 transition-transform"
                )}
              >
                <Icon className={cn("w-6 h-6", config.iconColor)} />
              </div>

              {/* Name */}
              <h4
                className={cn(
                  "font-black text-sm uppercase tracking-wide mb-1",
                  isSelected ? "text-[#d4af37]" : "text-[#e8e0d5]"
                )}
              >
                {deck.name}
              </h4>

              {/* Playstyle Badge */}
              <span
                className={cn(
                  "inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-2",
                  "bg-black/30 text-[#a89f94]"
                )}
              >
                {deck.playstyle}
              </span>

              {/* Description */}
              <p className="text-[#a89f94] text-[11px] leading-tight line-clamp-2">
                {deck.description}
              </p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center mb-4"
        >
          {error}
        </motion.div>
      )}

      {/* Submit button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={handleSubmit}
        disabled={submitting || !selectedDeck}
        className="group relative w-full py-4 rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed bg-linear-to-r from-[#8b4513] via-[#d4af37] to-[#8b4513] hover:from-[#a0522d] hover:via-[#f9e29f] hover:to-[#a0522d] transition-all duration-300 shadow-lg hover:shadow-gold"
      >
        <span className="relative flex items-center justify-center gap-2 text-lg font-black uppercase tracking-widest text-white">
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Preparing Deck...
            </>
          ) : (
            <>
              Begin Your Journey
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </span>
      </motion.button>
    </motion.div>
  );
}
