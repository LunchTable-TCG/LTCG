
"use client";

import { useMatchStream } from "@/hooks/useMatchStream";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface MatchBoardProps {
  matchId: Id<"gameLobbies">;
}

export function MatchBoard({ matchId }: MatchBoardProps) {
  const { meta, gameState, isLoading, isSpectator, userSeat } = useMatchStream(matchId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-t-transparent border-primary animate-spin" />
          <p className="text-xl font-fantasy tracking-widest uppercase">Summoning Table...</p>
        </div>
      </div>
    );
  }

  if (!gameState || !meta) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-red-500">
        <p>Failed to load match data.</p>
      </div>
    );
  }

  // Fantasy Asset Paths
  const ASSETS = {
    boardBg: "/brand/backgrounds/ltcg-hero-1536x1024.branded.png", // Placeholder
    woodPanel: "/brand/ui/fantasy_panel_bg.alpha.png",
    cardBack: "/brand/ui/panel_grimoire.alpha.png", // Placeholder for card back
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 opacity-50">
        <Image
          src={ASSETS.boardBg}
          alt="Board Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" /> {/* Dimmer */}
      </div>

      {/* Game UI Layer */}
      <div className="relative z-10 flex h-full flex-col justify-between p-4">

        {/* Opponent Area */}
        <div className="flex flex-col items-center gap-2">

            {/* Opponent Hand (Masked/Face Down) */}
            <div className="flex gap-[-2rem] justify-center">
                {gameState.opponentHand.map((card: any, i: number) => (
                    <div key={i} className="relative w-24 h-36 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-xl translate-y-[-2rem] hover:translate-y-0 transition-transform">
                        {/* Card Back */}
                        <div className="w-full h-full bg-indigo-900 rounded flex items-center justify-center">
                            <span className="text-xs text-white/20">Card</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Opponent Board */}
            <div className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                 {/* Backrow */}
                 <div className="flex gap-2">
                    {gameState.opponentSpellTrapZone.map((card: any, i: number) => (
                        <div key={`opp-st-${i}`} className="w-20 h-28 border border-dashed border-white/20 rounded flex items-center justify-center">
                             {card.isFaceDown ? "Set" : card.name || "Empty"}
                        </div>
                    ))}
                 </div>
                 {/* Monsters */}
                 <div className="flex gap-2">
                    {gameState.opponentBoard.map((card: any, i: number) => (
                        <div key={`opp-m-${i}`} className="w-20 h-28 border border-white/40 rounded flex items-center justify-center bg-red-900/20">
                             {card.isFaceDown ? "Set" : card.name || "Empty"}
                        </div>
                    ))}
                 </div>
            </div>
        </div>

        {/* Center / Field Area */}
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white drop-shadow-md">Turn {gameState.turnNumber}</h2>
                <div className="text-sm text-gray-300 uppercase tracking-widest">{gameState.currentPhase}</div>
            </div>
        </div>

        {/* Player Area */}
        <div className="flex flex-col items-center gap-2">

            {/* Player Board */}
            <div className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                 {/* Monsters */}
                 <div className="flex gap-2">
                    {gameState.hostBoard.map((card: any, i: number) => (
                        <div key={`host-m-${i}`} className="w-20 h-28 border border-white/40 rounded flex items-center justify-center bg-blue-900/20 cursor-pointer hover:bg-blue-800/40 transition-colors">
                             {card.name || "Empty"}
                        </div>
                    ))}
                 </div>
                 {/* Backrow */}
                 <div className="flex gap-2">
                    {gameState.hostSpellTrapZone.map((card: any, i: number) => (
                        <div key={`host-st-${i}`} className="w-20 h-28 border border-dashed border-white/20 rounded flex items-center justify-center cursor-pointer">
                             {card.name || "Empty"}
                        </div>
                    ))}
                 </div>
            </div>

            {/* Player Hand */}
            <div className="flex gap-[-1rem] justify-center translate-y-4 hover:translate-y-0 transition-transform duration-300">
                {gameState.hostHand.map((card: any, i: number) => (
                    <div key={card._id} className="relative w-32 h-48 bg-slate-100 border-2 border-slate-300 rounded-lg shadow-2xl hover:scale-110 hover:z-50 transition-all cursor-pointer -ml-8 first:ml-0">
                         <div className="p-2 text-xs font-bold text-black overflow-hidden h-full">
                            {card.name}
                            <div className="mt-1 text-[10px] font-normal">{card.abilityText?.slice(0,50)}...</div>
                         </div>
                    </div>
                ))}
            </div>
        </div>

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 p-4 bg-black/80 text-white rounded-lg border border-gold-500/50">
            <div className="text-xl font-bold">{meta.hostUsername}</div>
            <div className="text-sm text-yellow-500">LP: {gameState.hostLifePoints}</div>
        </div>
        <div className="absolute top-4 right-4 p-4 bg-black/80 text-white rounded-lg border border-red-500/50 text-right">
            <div className="text-xl font-bold">{meta.opponentUsername || "Waiting..."}</div>
            <div className="text-sm text-red-500">LP: {gameState.opponentLifePoints}</div>
        </div>

      </div>
    </div>
  );
}
