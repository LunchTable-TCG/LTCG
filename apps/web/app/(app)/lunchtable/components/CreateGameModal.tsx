"use client";

import { cn } from "@/lib/utils";
import { Check, Gamepad2, Trophy, X } from "lucide-react";
import { useState } from "react";

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { mode: "casual" | "ranked"; isPrivate?: boolean }) => void;
}

export function CreateGameModal({ isOpen, onClose, onSubmit }: CreateGameModalProps) {
  const [mode, setMode] = useState<"casual" | "ranked">("casual");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate brief delay
    setTimeout(() => {
      onSubmit({ mode, isPrivate });
      setIsSubmitting(false);
      setMode("casual");
      setIsPrivate(false);
    }, 300);
  };

  const handleClose = () => {
    setMode("casual");
    setIsPrivate(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        role="presentation"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleClose();
        }}
      />

      {/* Modal */}
      <div
        data-testid="create-game-modal"
        className="relative w-full max-w-md mx-4 tcg-chat-leather rounded-2xl border border-[#3d2b1f] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
      >
        <div className="ornament-corner ornament-corner-tl" />
        <div className="ornament-corner ornament-corner-tr" />
        <div className="ornament-corner ornament-corner-bl" />
        <div className="ornament-corner ornament-corner-br" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#3d2b1f]">
          <div>
            <h2 className="text-xl font-black text-[#e8e0d5] uppercase tracking-tight">
              Create Game
            </h2>
            <p className="text-xs text-[#a89f94] uppercase tracking-widest mt-1">
              Choose your battle mode
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg border border-[#3d2b1f] bg-black/30 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Casual Mode */}
          <button
            type="button"
            onClick={() => setMode("casual")}
            className={cn(
              "w-full p-4 rounded-xl border-2 transition-all text-left",
              mode === "casual"
                ? "bg-green-500/10 border-green-500/50 ring-2 ring-green-500/20"
                : "bg-black/20 border-[#3d2b1f] hover:border-green-500/30"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  mode === "casual" ? "bg-green-500/20" : "bg-black/30"
                )}
              >
                <Gamepad2
                  className={cn("w-6 h-6", mode === "casual" ? "text-green-500" : "text-[#a89f94]")}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-black uppercase tracking-wide",
                      mode === "casual" ? "text-green-400" : "text-[#e8e0d5]"
                    )}
                  >
                    Casual
                  </span>
                  {mode === "casual" && <Check className="w-4 h-4 text-green-500" />}
                </div>
                <p className="text-xs text-[#a89f94] mt-0.5">Play for fun, no rating changes</p>
              </div>
            </div>
          </button>

          {/* Ranked Mode */}
          <button
            type="button"
            onClick={() => setMode("ranked")}
            className={cn(
              "w-full p-4 rounded-xl border-2 transition-all text-left",
              mode === "ranked"
                ? "bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20"
                : "bg-black/20 border-[#3d2b1f] hover:border-amber-500/30"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  mode === "ranked" ? "bg-amber-500/20" : "bg-black/30"
                )}
              >
                <Trophy
                  className={cn("w-6 h-6", mode === "ranked" ? "text-amber-500" : "text-[#a89f94]")}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-black uppercase tracking-wide",
                      mode === "ranked" ? "text-amber-400" : "text-[#e8e0d5]"
                    )}
                  >
                    Ranked
                  </span>
                  {mode === "ranked" && <Check className="w-4 h-4 text-amber-500" />}
                </div>
                <p className="text-xs text-[#a89f94] mt-0.5">
                  Competitive play, affects your rating
                </p>
              </div>
            </div>
          </button>

          {/* Ranked warning */}
          {mode === "ranked" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-amber-400">
                <strong>Note:</strong> This ranked match will affect your rating. Win to climb the
                ladder!
              </p>
            </div>
          )}

          {/* Private Match Toggle */}
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={cn(
              "w-full p-4 rounded-xl border-2 transition-all text-left",
              isPrivate
                ? "bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/20"
                : "bg-black/20 border-[#3d2b1f] hover:border-purple-500/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-black uppercase tracking-wide text-sm",
                      isPrivate ? "text-purple-400" : "text-[#e8e0d5]"
                    )}
                  >
                    Private Match
                  </span>
                  {isPrivate && <Check className="w-4 h-4 text-purple-500" />}
                </div>
                <p className="text-xs text-[#a89f94] mt-0.5">
                  {isPrivate
                    ? "Only players with the join code can join"
                    : "Anyone can see and join this lobby"}
                </p>
              </div>
              <div
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  isPrivate ? "bg-purple-500" : "bg-[#3d2b1f]"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform",
                    isPrivate ? "right-1" : "left-1"
                  )}
                />
              </div>
            </div>
          </button>

          {/* Private match info */}
          {isPrivate && (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-purple-400">
                <strong>Note:</strong> You'll receive a 6-character join code to share with your
                opponent. They'll need this code to join your lobby.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#3d2b1f] bg-black/20">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-lg border border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 font-bold uppercase tracking-wide text-sm transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide text-sm flex items-center gap-2 transition-all",
              mode === "casual"
                ? "bg-linear-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white"
                : "bg-linear-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-[#1a1614]",
              isSubmitting && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Game
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
