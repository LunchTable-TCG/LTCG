"use client";

import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Bug,
  Camera,
  Video,
  Coins,
  Users,
  Gamepad2,
  Globe,
  Rocket,
  ChevronRight,
  Crown,
  Swords,
  Trophy,
  Star,
  Layers,
  Award,
  Bot,
} from "lucide-react";
import { useState } from "react";

interface WelcomePopupProps {
  onComplete: () => void;
}

export function WelcomePopup({ onComplete }: WelcomePopupProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // Slide 1: Pioneer Welcome
    {
      id: "pioneer",
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#d4af37] to-[#8b7355] flex items-center justify-center"
          >
            <Crown className="w-10 h-10 text-[#1a1410]" />
          </motion.div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-[#d4af37]">
              Welcome, Pioneer
            </h2>
            <p className="text-[#c4b5a0] text-lg leading-relaxed max-w-md mx-auto">
              You've joined LunchTable in its <span className="text-[#d4af37] font-semibold">Early Alpha</span> —
              a rare honor reserved for those who shape the future.
            </p>
          </div>

          <div className="bg-[#2a1f14]/50 rounded-xl p-4 border border-[#3d2b1f]">
            <p className="text-[#a89f94] text-sm leading-relaxed">
              As an early adopter, you're not just playing a game — you're helping build it.
              Things may break, features will evolve, and your feedback directly influences what comes next.
              <span className="block mt-2 text-[#d4af37] font-semibold">
                This is your table. Help us set it.
              </span>
            </p>
          </div>
        </div>
      ),
    },

    // Slide 2: Bug Reporting & Feedback
    {
      id: "feedback",
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center"
          >
            <Bug className="w-10 h-10 text-white" />
          </motion.div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-[#d4af37]">
              Your Voice Matters
            </h2>
            <p className="text-[#c4b5a0] text-lg leading-relaxed max-w-md mx-auto">
              Found a bug? Have an idea? We've built a powerful feedback tool just for you.
            </p>
          </div>

          <div className="bg-[#2a1f14]/50 rounded-xl p-5 border border-[#3d2b1f] space-y-4">
            <p className="text-[#a89f94] text-sm">
              Look for the <span className="text-purple-400 font-semibold">floating feedback button</span> in the corner of your screen.
            </p>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[#c4b5a0] text-xs font-semibold">Auto Screenshot</p>
                  <p className="text-[#8b7355] text-xs">Captures the moment</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Video className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[#c4b5a0] text-xs font-semibold">Screen Recording</p>
                  <p className="text-[#8b7355] text-xs">Show us the issue</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Bug className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[#c4b5a0] text-xs font-semibold">Bug Reports</p>
                  <p className="text-[#8b7355] text-xs">Help us squash bugs</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[#c4b5a0] text-xs font-semibold">Feature Ideas</p>
                  <p className="text-[#8b7355] text-xs">Shape the future</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 3: $LUNCH Token
    {
      id: "token",
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#d4af37] to-amber-600 flex items-center justify-center"
          >
            <Coins className="w-10 h-10 text-[#1a1410]" />
          </motion.div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-[#d4af37]">
              The $LUNCH Token
            </h2>
            <p className="text-[#c4b5a0] text-lg leading-relaxed max-w-md mx-auto">
              More than currency — it's your stake in the LunchTable universe.
            </p>
          </div>

          <div className="bg-[#2a1f14]/50 rounded-xl p-5 border border-[#3d2b1f] space-y-4">
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-[#c4b5a0] text-sm font-semibold">Tournament Entry & Prizes</p>
                  <p className="text-[#8b7355] text-xs">Compete for real rewards</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 flex items-center justify-center flex-shrink-0">
                  <Swords className="w-5 h-5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-[#c4b5a0] text-sm font-semibold">Card Marketplace</p>
                  <p className="text-[#8b7355] text-xs">Trade and collect rare cards</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-[#c4b5a0] text-sm font-semibold">Buy & Sell Cards</p>
                  <p className="text-[#8b7355] text-xs">Use $LUNCH to trade on the marketplace</p>
                </div>
              </div>
            </div>

            {/* Subscription callout */}
            <div className="mt-4 pt-4 border-t border-[#3d2b1f]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-[#c4b5a0] text-sm font-semibold">Battle Pass & Premium — <span className="text-purple-400">$4.20/mo</span></p>
                  <p className="text-[#8b7355] text-xs">Exclusive cosmetics, rewards & early access</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 4: The Future
    {
      id: "future",
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center"
          >
            <Rocket className="w-10 h-10 text-white" />
          </motion.div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-[#d4af37]">
              What's Coming
            </h2>
            <p className="text-[#c4b5a0] text-lg leading-relaxed max-w-md mx-auto">
              This is just the beginning. The LunchTable universe is expanding.
            </p>
          </div>

          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-emerald-500/20 to-transparent rounded-xl p-4 border border-emerald-500/30 text-left"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-[#c4b5a0] font-bold">New Cards Incoming</p>
                  <p className="text-[#8b7355] text-xs">Fresh cards dropping soon — keep your eyes peeled</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-purple-500/20 to-transparent rounded-xl p-4 border border-purple-500/30 text-left"
            >
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-[#c4b5a0] font-bold">Agent Betting</p>
                  <p className="text-[#8b7355] text-xs">Stake $LUNCH on AI agents battling for glory</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-amber-500/20 to-transparent rounded-xl p-4 border border-amber-500/30 text-left"
            >
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-amber-400" />
                <div>
                  <p className="text-[#c4b5a0] font-bold">Battle Pass Seasons</p>
                  <p className="text-[#8b7355] text-xs">Seasonal rewards, exclusive unlocks & progression</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-rose-500/20 to-transparent rounded-xl p-4 border border-rose-500/30 text-left"
            >
              <div className="flex items-center gap-3">
                <Bot className="w-8 h-8 text-rose-400" />
                <div>
                  <p className="text-[#c4b5a0] font-bold">More Agents</p>
                  <p className="text-[#8b7355] text-xs">A massive roster of AI opponents with unique strategies</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-r from-cyan-500/20 to-transparent rounded-xl p-4 border border-cyan-500/30 text-left"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-[#c4b5a0] font-bold">Table Top Mode</p>
                  <p className="text-[#8b7355] text-xs">An immersive 3D world experience like no other</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      ),
    },

    // Slide 5: Ready
    {
      id: "ready",
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#d4af37] via-amber-500 to-[#8b7355] flex items-center justify-center shadow-lg shadow-[#d4af37]/30"
          >
            <Gamepad2 className="w-12 h-12 text-[#1a1410]" />
          </motion.div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-[#d4af37]">
              Your Seat Awaits
            </h2>
            <p className="text-[#c4b5a0] text-lg leading-relaxed max-w-md mx-auto">
              The cards are shuffled. The table is set.
              <span className="block mt-2 text-[#d4af37] font-semibold text-xl">
                It's time to play.
              </span>
            </p>
          </div>

          <div className="bg-gradient-to-r from-[#d4af37]/20 via-[#d4af37]/10 to-[#d4af37]/20 rounded-xl p-4 border border-[#d4af37]/30">
            <p className="text-[#c4b5a0] text-sm italic">
              "Every legend starts with a single card drawn.
              Today, you draw yours."
            </p>
          </div>
        </div>
      ),
    },
  ];

  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-gradient-to-b from-[#1a1410] to-[#2a1f14] rounded-2xl border border-[#3d2b1f] shadow-2xl overflow-hidden"
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6 pb-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "bg-[#d4af37] w-6"
                  : index < currentSlide
                    ? "bg-[#d4af37]/50"
                    : "bg-[#3d2b1f]"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[420px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {slides[currentSlide]?.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-[#8b7355] hover:text-[#c4b5a0] text-sm transition-colors"
          >
            Skip
          </button>

          <Button
            onClick={handleNext}
            className="bg-gradient-to-r from-[#d4af37] to-amber-600 hover:from-[#e5c349] hover:to-amber-500 text-[#1a1410] font-bold px-6 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-[#d4af37]/20"
          >
            {isLastSlide ? "Enter the Hall" : "Continue"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
