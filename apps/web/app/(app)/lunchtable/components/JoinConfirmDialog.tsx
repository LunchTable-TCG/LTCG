"use client";

import { cn } from "@/lib/utils";
import type { Element } from "@/types/cards";
import type { MatchMode } from "@/types/common";
import { Flame, Gamepad2, Shield, Swords, Trophy, Waves, X, Zap } from "lucide-react";

interface GameLobbyEntry {
  id: string;
  hostName: string;
  hostRank: string;
  deckArchetype: Element;
  mode: MatchMode;
}

interface JoinConfirmDialogProps {
  game: GameLobbyEntry;
  onConfirm: () => void;
  onCancel: () => void;
}

const ARCHETYPE_CONFIG = {
  dropout: {
    icon: Flame,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    name: "Dropout",
  },
  prep: {
    icon: Waves,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    name: "Prep",
  },
  geek: {
    icon: Shield,
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    name: "Geek",
  },
  freak: {
    icon: Sparkles,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    name: "Freak",
  },
  nerd: {
    icon: Zap,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    name: "Nerd",
  },
  goodie_two_shoes: {
    icon: Star,
    color: "text-slate-100",
    bg: "bg-slate-500/10",
    border: "border-slate-400/30",
    name: "Goodie Two-Shoes",
  },
};

const RANK_COLORS: Record<string, string> = {
  Bronze: "text-orange-400",
  Silver: "text-gray-300",
  Gold: "text-yellow-500",
  Platinum: "text-blue-400",
  Diamond: "text-cyan-400",
  Master: "text-purple-400",
  Legend: "text-yellow-400",
};

export function JoinConfirmDialog({ game, onConfirm, onCancel }: JoinConfirmDialogProps) {
  const archetype = ARCHETYPE_CONFIG[game.deckArchetype];
  const ArchetypeIcon = archetype.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        role="presentation"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm mx-4 tcg-chat-leather rounded-2xl border border-[#3d2b1f] shadow-2xl overflow-hidden">
        <div className="ornament-corner ornament-corner-tl opacity-50" />
        <div className="ornament-corner ornament-corner-tr opacity-50" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#3d2b1f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center">
              <Swords className="w-5 h-5 text-[#d4af37]" />
            </div>
            <h2 className="text-lg font-black text-[#e8e0d5] uppercase tracking-tight">
              Join Game?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg border border-[#3d2b1f] bg-black/30 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-[#a89f94] text-center">You are about to challenge:</p>

          {/* Opponent Card */}
          <div className="p-4 rounded-xl bg-black/30 border border-[#3d2b1f]">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center border border-[#d4af37]/20">
                <span className="text-xl font-black text-[#d4af37]">
                  {game.hostName[0]?.toUpperCase()}
                </span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-[#e8e0d5]">{game.hostName}</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      RANK_COLORS[game.hostRank] || "text-[#a89f94]"
                    )}
                  >
                    {game.hostRank}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Deck Archetype */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center",
                        archetype.bg
                      )}
                    >
                      <ArchetypeIcon className={cn("w-3 h-3", archetype.color)} />
                    </div>
                    <span className="text-[10px] text-[#a89f94] uppercase tracking-wider">
                      {archetype.name}
                    </span>
                  </div>

                  {/* Mode Badge */}
                  <div
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded",
                      game.mode === "ranked"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-green-500/20 text-green-400"
                    )}
                  >
                    {game.mode === "ranked" ? (
                      <Trophy className="w-3 h-3" />
                    ) : (
                      <Gamepad2 className="w-3 h-3" />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      {game.mode}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning for Ranked */}
          {game.mode === "ranked" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-400 text-center">
                This is a <strong>ranked</strong> match. Your rating will be affected.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t border-[#3d2b1f] bg-black/20">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-lg border border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 font-bold uppercase tracking-wide text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-lg bg-linear-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold uppercase tracking-wide text-sm shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Swords className="w-4 h-4" />
            Join Battle
          </button>
        </div>
      </div>
    </div>
  );
}
