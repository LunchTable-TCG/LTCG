"use client";

import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { getArchetypeTheme } from "@/lib/archetypeThemes";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Flame,
  Loader2,
  Shield,
  Skull,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface StarterDeckStepProps {
  onComplete: () => void;
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

function getArchetypeIcon(archetype: string) {
  return ARCHETYPE_ICONS[archetype] ?? Shield;
}

/**
 * Starter deck selection step of the onboarding flow.
 * Player picks one of the available themed decks to start with.
 */
export function StarterDeckStep({ onComplete }: StarterDeckStepProps) {
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const starterDecks = useConvexQuery(typedApi.agents.agents.getStarterDecks, {});
  const selectStarterDeckMutation = useConvexMutation(typedApi.core.decks.selectStarterDeck);

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

      {/* Loading state */}
      {!starterDecks && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
        </div>
      )}

      {/* Deck Grid */}
      {starterDecks && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6"
        >
          {starterDecks.map((deck: { deckCode: string; name: string; archetype: string; description: string; playstyle: string; cardCount: number }, index: number) => {
            const theme = getArchetypeTheme(deck.archetype);
            const Icon = getArchetypeIcon(deck.archetype);
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
                  `from-${theme.color}-600/20 to-${theme.color}-500/10`,
                  isSelected
                    ? `bg-${theme.color}-500/20 border-[#d4af37] ring-2 ring-[#d4af37]/30`
                    : `${theme.borderColor} hover:border-${theme.color}-500/60`
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
                  <Icon className={cn("w-6 h-6", `text-${theme.color}-500`)} />
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
      )}

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
