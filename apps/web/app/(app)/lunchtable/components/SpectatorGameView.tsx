"use client";

import { useSpectator } from "@/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Eye, Loader2, Scroll, Users, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface SpectatorGameViewProps {
  lobbyId: Id<"gameLobbies">;
  onExit: () => void;
}

export function SpectatorGameView({ lobbyId, onExit }: SpectatorGameViewProps) {
  const eventLogRef = useRef<HTMLDivElement>(null);

  // Use spectator hook
  const { spectatorView: gameState, joinAsSpectator, leaveAsSpectator } = useSpectator(lobbyId);

  // Real-time game events (play-by-play feed)
  const gameEvents = useQuery(api.gameplay.gameEvents.getRecentGameEvents, {
    lobbyId,
    limit: 50,
  });

  // Auto-scroll event log to bottom when new events arrive
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [gameEvents]);

  // Track spectator join/leave
  useEffect(() => {
    if (!gameState) return;

    // Join as spectator when component mounts
    joinAsSpectator(lobbyId).catch(console.error);

    // Leave as spectator when component unmounts
    return () => {
      leaveAsSpectator(lobbyId).catch(console.error);
    };
  }, [lobbyId, joinAsSpectator, leaveAsSpectator]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a09]">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative">
      {/* Header */}
      <div className="border-b border-[#3d2b1f] bg-black/40 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Eye className="w-5 h-5 text-[#d4af37]" />
            <h1 className="text-xl font-bold text-[#e8e0d5]">
              Spectating: {gameState.host.username} vs {gameState.opponent?.username}
            </h1>
            <div className="flex items-center gap-1 text-sm text-[#a89f94]">
              <Users className="w-4 h-4" />
              <span>{gameState.spectatorCount} watching</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      </div>

      {/* Game View */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Turn Info */}
        <div className="mb-6 p-4 bg-black/40 border border-[#3d2b1f] rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#a89f94]">Turn</p>
              <p className="text-2xl font-bold text-[#d4af37]">{gameState.turnNumber}</p>
            </div>
            <div>
              <p className="text-sm text-[#a89f94]">Current Player</p>
              <p className="text-lg font-semibold text-[#e8e0d5]">
                {gameState.currentTurnPlayerId === gameState.host.userId
                  ? gameState.host.username
                  : gameState.opponent?.username}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#a89f94]">Mode</p>
              <p className="text-lg capitalize text-[#e8e0d5]">{gameState.mode}</p>
            </div>
          </div>
        </div>

        {/* Two-column layout: Game Board + Event Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Board (2/3 width on large screens) */}
          <div className="lg:col-span-2 bg-black/40 border border-[#3d2b1f] rounded-lg p-6">
            {gameState.boardState ? (
              <div className="space-y-6">
                {/* Current Phase Indicator */}
                <div className="text-center">
                  <span className="inline-block px-4 py-2 bg-[#d4af37]/20 border border-[#d4af37] rounded-lg text-[#d4af37] text-sm font-semibold uppercase tracking-wider">
                    {gameState.boardState.currentPhase} Phase
                  </span>
                </div>

                {/* Opponent's Side (Top) */}
                <div className="space-y-3 pb-6 border-b-2 border-[#d4af37]/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#e8e0d5]">
                      {gameState.opponent?.username}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[#a89f94]">
                        LP:{" "}
                        <span className="text-[#d4af37] font-bold">
                          {gameState.boardState.opponentLifePoints}
                        </span>
                      </span>
                      <span className="text-[#a89f94]">
                        Deck:{" "}
                        <span className="text-[#e8e0d5]">
                          {gameState.boardState.opponentDeckCount}
                        </span>
                      </span>
                      <span className="text-[#a89f94]">
                        Hand:{" "}
                        <span className="text-[#e8e0d5]">
                          {gameState.boardState.opponentHandCount}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Opponent's Field */}
                  <div className="grid grid-cols-5 gap-2">
                    {/* Monster Zone */}
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const monster = gameState.boardState?.opponentBoard[idx];
                      return (
                        <div
                          key={`opp-monster-${idx}`}
                          className="aspect-2/3 rounded border border-[#3d2b1f] bg-black/20 flex items-center justify-center text-xs text-[#a89f94]"
                        >
                          {monster ? (
                            <div className="text-center p-1">
                              <p className="font-semibold text-[#e8e0d5] truncate">
                                {monster.isFaceDown ? "???" : monster.name}
                              </p>
                              {!monster.isFaceDown && (
                                <p className="text-[10px] text-[#d4af37]">
                                  {monster.currentAttack}/{monster.currentDefense}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span>Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Opponent's Spell/Trap Zone */}
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const st = gameState.boardState?.opponentSpellTrapZone[idx];
                      return (
                        <div
                          key={`opp-st-${idx}`}
                          className="aspect-2/3 rounded border border-[#3d2b1f] bg-black/20 flex items-center justify-center text-[10px] text-[#a89f94]"
                        >
                          {st ? (
                            <span className="text-[#e8e0d5]">
                              {st.isFaceDown ? "Set" : st.name}
                            </span>
                          ) : (
                            <span>Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Opponent's Graveyard Count */}
                  <div className="text-right text-sm text-[#a89f94]">
                    Graveyard:{" "}
                    <span className="text-[#e8e0d5]">
                      {gameState.boardState.opponentGraveyard.length}
                    </span>
                  </div>
                </div>

                {/* Host's Side (Bottom) */}
                <div className="space-y-3 pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#e8e0d5]">{gameState.host.username}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[#a89f94]">
                        LP:{" "}
                        <span className="text-[#d4af37] font-bold">
                          {gameState.boardState.hostLifePoints}
                        </span>
                      </span>
                      <span className="text-[#a89f94]">
                        Deck:{" "}
                        <span className="text-[#e8e0d5]">{gameState.boardState.hostDeckCount}</span>
                      </span>
                      <span className="text-[#a89f94]">
                        Hand:{" "}
                        <span className="text-[#e8e0d5]">{gameState.boardState.hostHandCount}</span>
                      </span>
                    </div>
                  </div>

                  {/* Host's Spell/Trap Zone */}
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const st = gameState.boardState?.hostSpellTrapZone[idx];
                      return (
                        <div
                          key={`host-st-${idx}`}
                          className="aspect-2/3 rounded border border-[#3d2b1f] bg-black/20 flex items-center justify-center text-[10px] text-[#a89f94]"
                        >
                          {st ? (
                            <span className="text-[#e8e0d5]">
                              {st.isFaceDown ? "Set" : st.name}
                            </span>
                          ) : (
                            <span>Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Host's Monster Zone */}
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const monster = gameState.boardState?.hostBoard[idx];
                      return (
                        <div
                          key={`host-monster-${idx}`}
                          className="aspect-2/3 rounded border border-[#3d2b1f] bg-black/20 flex items-center justify-center text-xs text-[#a89f94]"
                        >
                          {monster ? (
                            <div className="text-center p-1">
                              <p className="font-semibold text-[#e8e0d5] truncate">
                                {monster.isFaceDown ? "???" : monster.name}
                              </p>
                              {!monster.isFaceDown && (
                                <p className="text-[10px] text-[#d4af37]">
                                  {monster.currentAttack}/{monster.currentDefense}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span>Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Host's Graveyard Count */}
                  <div className="text-right text-sm text-[#a89f94]">
                    Graveyard:{" "}
                    <span className="text-[#e8e0d5]">
                      {gameState.boardState.hostGraveyard.length}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-[#a89f94]">Loading board state...</p>
            )}
          </div>

          {/* Event Feed (1/3 width on large screens) */}
          <div className="bg-black/40 border border-[#3d2b1f] rounded-lg p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#3d2b1f]">
              <Scroll className="w-4 h-4 text-[#d4af37]" />
              <h3 className="text-sm font-bold text-[#e8e0d5] uppercase tracking-wide">
                Event Log
              </h3>
            </div>

            {/* Event Log (scrollable) */}
            <div
              ref={eventLogRef}
              className="flex-1 overflow-y-auto space-y-2 max-h-[500px] pr-2"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#3d2b1f #0d0a09",
              }}
            >
              {gameEvents && gameEvents.length > 0 ? (
                gameEvents.map((event: NonNullable<typeof gameEvents>[number]) => (
                  <div
                    key={event.eventId}
                    className="p-2 rounded bg-black/20 border border-[#3d2b1f]/50 hover:border-[#d4af37]/30 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-[#d4af37] font-bold shrink-0 mt-0.5">
                        T{event.turnNumber}
                      </span>
                      <p className="text-xs text-[#e8e0d5] leading-relaxed">{event.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-[#a89f94] text-xs py-8">
                  <p>Waiting for game events...</p>
                  <p className="mt-2 text-[10px]">Events will appear here as the game progresses</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
