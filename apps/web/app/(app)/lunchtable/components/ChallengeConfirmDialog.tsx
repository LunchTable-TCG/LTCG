"use client";

import { Gamepad2, Swords, Trophy, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChallengeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: "casual" | "ranked") => void;
  opponentUsername: string;
  opponentRank?: string;
}

const RANK_COLORS: Record<string, string> = {
  Bronze: "text-orange-400",
  Silver: "text-gray-300",
  Gold: "text-yellow-500",
  Platinum: "text-blue-400",
  Diamond: "text-cyan-400",
  Master: "text-purple-400",
  Legend: "text-yellow-400",
};

export function ChallengeConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  opponentUsername,
  opponentRank = "Gold",
}: ChallengeConfirmDialogProps) {
  const [selectedMode, setSelectedMode] = useState<"casual" | "ranked">("casual");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsSubmitting(true);
    // Simulate sending challenge
    setTimeout(() => {
      onConfirm(selectedMode);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <>
      {/* Backdrop */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Backdrop overlay for modal */}
      <div
        role="presentation"
        className="fixed inset-0 z-100 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-105 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-sm rounded-2xl tcg-chat-leather border border-[#3d2b1f] shadow-2xl pointer-events-auto animate-in zoom-in-95 fade-in duration-200">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg border border-[#3d2b1f] bg-black/50 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center">
                <Swords className="w-7 h-7 text-[#d4af37]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#e8e0d5] uppercase tracking-wide">
                  Challenge Player
                </h3>
                <p className="text-sm text-[#a89f94]">Send a duel request</p>
              </div>
            </div>

            {/* Opponent Info */}
            <div className="mb-6 p-4 rounded-xl bg-black/30 border border-[#3d2b1f]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center border border-[#d4af37]/30">
                  <span className="text-lg font-black text-[#d4af37]">
                    {opponentUsername[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-[#e8e0d5]">{opponentUsername}</p>
                  <p
                    className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      RANK_COLORS[opponentRank] || "text-[#a89f94]"
                    )}
                  >
                    {opponentRank} Rank
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="mb-6">
              <p className="text-xs font-bold text-[#a89f94] uppercase tracking-wider mb-3">
                Select Game Mode
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Casual */}
                <button
                  type="button"
                  onClick={() => setSelectedMode("casual")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    selectedMode === "casual"
                      ? "bg-green-500/10 border-green-500/50"
                      : "bg-black/20 border-[#3d2b1f] hover:border-green-500/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2
                      className={cn(
                        "w-5 h-5",
                        selectedMode === "casual" ? "text-green-400" : "text-[#a89f94]"
                      )}
                    />
                    <span
                      className={cn(
                        "font-bold text-sm uppercase",
                        selectedMode === "casual" ? "text-green-400" : "text-[#e8e0d5]"
                      )}
                    >
                      Casual
                    </span>
                  </div>
                  <p className="text-[10px] text-[#a89f94]">Play for fun, no rating changes</p>
                </button>

                {/* Ranked */}
                <button
                  type="button"
                  onClick={() => setSelectedMode("ranked")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    selectedMode === "ranked"
                      ? "bg-amber-500/10 border-amber-500/50"
                      : "bg-black/20 border-[#3d2b1f] hover:border-amber-500/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy
                      className={cn(
                        "w-5 h-5",
                        selectedMode === "ranked" ? "text-amber-400" : "text-[#a89f94]"
                      )}
                    />
                    <span
                      className={cn(
                        "font-bold text-sm uppercase",
                        selectedMode === "ranked" ? "text-amber-400" : "text-[#e8e0d5]"
                      )}
                    >
                      Ranked
                    </span>
                  </div>
                  <p className="text-[10px] text-[#a89f94]">Competitive play, affects rating</p>
                </button>
              </div>
            </div>

            {/* Info Text */}
            <p className="text-xs text-[#a89f94] text-center mb-6">
              {opponentUsername} will receive a challenge notification. They have 60 seconds to
              accept.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl border border-[#3d2b1f] bg-black/30 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/30 font-bold uppercase tracking-wide text-sm transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 px-4 py-3 rounded-xl font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                  selectedMode === "casual"
                    ? "bg-linear-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white"
                    : "bg-linear-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-[#1a1614]"
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4" />
                    Challenge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
