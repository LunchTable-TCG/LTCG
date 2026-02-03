"use client";

import type { TournamentBracket as TournamentBracketType } from "@/hooks/social/useTournament";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useState } from "react";
import { MatchCard } from "./MatchCard";

interface TournamentBracketProps {
  bracket: TournamentBracketType;
  currentUserId?: Id<"users">;
}

export function TournamentBracket({ bracket, currentUserId }: TournamentBracketProps) {
  const [activeRound, setActiveRound] = useState(Math.max(bracket.tournament.currentRound || 1, 1));

  const totalRounds = bracket.rounds.length;
  const currentRound = bracket.rounds.find((r) => r.roundNumber === activeRound);

  // Mobile: Show one round at a time with navigation
  // Desktop: Show full bracket visualization

  return (
    <div className="space-y-6">
      {/* Round Navigation (Mobile) */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            type="button"
            onClick={() => setActiveRound((r) => Math.max(1, r - 1))}
            disabled={activeRound <= 1}
            className={cn(
              "p-2 rounded-lg border transition-colors",
              activeRound <= 1
                ? "border-[#3d2b1f] text-[#3d2b1f] cursor-not-allowed"
                : "border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h3 className="font-black text-[#e8e0d5] uppercase tracking-wide">
              {currentRound?.roundName || `Round ${activeRound}`}
            </h3>
            <p className="text-xs text-[#a89f94]">
              {activeRound} of {totalRounds}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveRound((r) => Math.min(totalRounds, r + 1))}
            disabled={activeRound >= totalRounds}
            className={cn(
              "p-2 rounded-lg border transition-colors",
              activeRound >= totalRounds
                ? "border-[#3d2b1f] text-[#3d2b1f] cursor-not-allowed"
                : "border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50"
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Round Matches */}
        <div className="space-y-3">
          {currentRound?.matches.map((match) => (
            <MatchCard key={match._id} match={match} currentUserId={currentUserId} />
          ))}
          {(!currentRound || currentRound.matches.length === 0) && (
            <div className="text-center py-8 text-[#a89f94]">
              <p>No matches in this round yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Full Bracket View */}
      <div className="hidden lg:block">
        {/* Round Headers */}
        <div className="flex justify-between mb-4">
          {bracket.rounds.map((round) => (
            <div
              key={round.roundNumber}
              className={cn(
                "flex-1 text-center px-2",
                round.roundNumber === bracket.tournament.currentRound && "relative"
              )}
            >
              <h3
                className={cn(
                  "font-bold uppercase tracking-wide text-sm",
                  round.roundNumber === bracket.tournament.currentRound
                    ? "text-[#d4af37]"
                    : "text-[#a89f94]"
                )}
              >
                {round.roundName}
              </h3>
              <p className="text-xs text-[#a89f94]/60">
                {round.matches.length} match{round.matches.length !== 1 ? "es" : ""}
              </p>
              {round.roundNumber === bracket.tournament.currentRound && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Bracket Grid */}
        <div className="flex gap-4 overflow-x-auto pb-4 tcg-scrollbar-thin">
          {bracket.rounds.map((round, roundIndex) => {
            // Calculate vertical spacing based on round
            const matchHeight = 180; // Approximate height of MatchCard
            const spacing = Math.pow(2, roundIndex) * 20; // Increase spacing per round

            return (
              <div
                key={round.roundNumber}
                className="flex-shrink-0 flex flex-col justify-around"
                style={{
                  minWidth: "280px",
                  gap: `${spacing}px`,
                }}
              >
                {round.matches.map((match) => (
                  <div
                    key={match._id}
                    className="relative"
                    style={{ minHeight: `${matchHeight}px` }}
                  >
                    <MatchCard match={match} currentUserId={currentUserId} />

                    {/* Connector Lines */}
                    {roundIndex < bracket.rounds.length - 1 && (
                      <div className="absolute top-1/2 -right-4 w-4 h-px bg-[#3d2b1f]" />
                    )}
                  </div>
                ))}

                {round.matches.length === 0 && (
                  <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-[#3d2b1f] bg-black/20">
                    <p className="text-sm text-[#a89f94]/50">Waiting...</p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Winner Column */}
          {bracket.tournament.winnerId && (
            <div className="flex-shrink-0 flex items-center justify-center min-w-[200px]">
              <div className="p-6 rounded-xl bg-linear-to-br from-[#d4af37]/20 to-amber-600/10 border-2 border-[#d4af37]/50 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#d4af37]/20 border-2 border-[#d4af37] flex items-center justify-center mb-3">
                  <Trophy className="w-8 h-8 text-[#d4af37]" />
                </div>
                <p className="text-[10px] text-[#a89f94] uppercase tracking-widest mb-1">
                  Champion
                </p>
                <p className="font-black text-[#d4af37] text-lg">
                  {bracket.tournament.winnerUsername}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Round Dots (Mobile Navigation Indicator) */}
      <div className="lg:hidden flex justify-center gap-2">
        {bracket.rounds.map((round) => (
          <button
            key={round.roundNumber}
            type="button"
            onClick={() => setActiveRound(round.roundNumber)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors",
              activeRound === round.roundNumber
                ? "bg-[#d4af37]"
                : "bg-[#3d2b1f] hover:bg-[#d4af37]/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
