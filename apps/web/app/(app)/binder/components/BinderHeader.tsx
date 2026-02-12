"use client";

import { BookOpen } from "lucide-react";

interface BinderHeaderProps {
  stats: {
    totalUnique: number;
    totalCards: number;
    favorites: number;
  };
}

export function BinderHeader({ stats }: BinderHeaderProps) {
  return (
    <div className="mb-10 p-6 tcg-chat-leather rounded-2xl relative overflow-hidden border border-[#3d2b1f]">
      <div className="ornament-corner ornament-corner-tl" />
      <div className="ornament-corner ornament-corner-tr" />
      <div className="ornament-corner ornament-corner-bl" />
      <div className="ornament-corner ornament-corner-br" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-[#d4af37]/30 mb-4">
            <BookOpen className="w-4 h-4 text-[#d4af37]" />
            <span className="text-[10px] text-[#d4af37] font-black uppercase tracking-widest">
              Card Vault
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-2 text-[#e8e0d5] uppercase tracking-tighter">
            My Binder
          </h1>
          <p className="text-[#a89f94] font-medium">
            {stats.totalUnique} unique cards • {stats.totalCards} total in collection
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-black/30 p-4 rounded-xl border border-[#3d2b1f]">
          <div className="text-center">
            <p className="text-3xl font-black text-[#d4af37]">{stats.totalUnique}</p>
            <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Unique</p>
          </div>
          <div className="hidden sm:block w-px h-12 bg-[#3d2b1f]" />
          <div className="text-center">
            <p className="text-3xl font-black text-[#e8e0d5]">{stats.totalCards}</p>
            <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Total</p>
          </div>
          <div className="hidden sm:block w-px h-12 bg-[#3d2b1f]" />
          <div className="text-center">
            <p className="text-3xl font-black text-pink-400">{stats.favorites}</p>
            <p className="text-[9px] text-[#a89f94] uppercase tracking-wider">Favorites</p>
          </div>
        </div>
      </div>
    </div>
  );
}
