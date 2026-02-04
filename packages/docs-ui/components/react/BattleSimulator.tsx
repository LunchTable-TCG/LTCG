/**
 * BattleSimulator Component
 * Interactive battle scenario playback for documentation
 * Use as a React island in Astro: <BattleSimulator client:load />
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';

export type BattlePhase =
  | 'draw'
  | 'main1'
  | 'battle'
  | 'main2'
  | 'end';

export interface CardInZone {
  id: string;
  name: string;
  attack?: number;
  health?: number;
  element: string;
  tapped?: boolean;
}

export interface PlayerFieldState {
  playerName: string;
  lifePoints: number;
  mana: number;
  maxMana: number;
  hand: CardInZone[];
  field: CardInZone[];
  graveyard: CardInZone[];
  deckCount: number;
}

export interface Turn {
  number: number;
  player: string;
  phase: BattlePhase;
  action: string;
  description: string;
  player1State: PlayerFieldState;
  player2State: PlayerFieldState;
  highlightZone?: 'hand' | 'field' | 'graveyard';
  highlightCard?: string;
}

export interface BattleScenario {
  title: string;
  description: string;
  turns: Turn[];
}

interface BattleSimulatorProps {
  scenario: BattleScenario;
  autoPlay?: boolean;
  initialSpeed?: number;
  className?: string;
}

const phaseLabels: Record<BattlePhase, string> = {
  draw: 'Draw Phase',
  main1: 'Main Phase 1',
  battle: 'Battle Phase',
  main2: 'Main Phase 2',
  end: 'End Phase'
};

const phaseColors: Record<BattlePhase, string> = {
  draw: '#06b6d4',
  main1: '#22c55e',
  battle: '#ff6b35',
  main2: '#22c55e',
  end: '#a89f94'
};

export function BattleSimulator({
  scenario,
  autoPlay = false,
  initialSpeed = 2000,
  className
}: BattleSimulatorProps) {
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(initialSpeed);

  const turnData = scenario.turns[currentTurn];
  const totalTurns = scenario.turns.length;

  const goToTurn = useCallback((index: number) => {
    setCurrentTurn(Math.max(0, Math.min(index, totalTurns - 1)));
    setIsPlaying(false);
  }, [totalTurns]);

  const handlePrev = () => goToTurn(currentTurn - 1);
  const handleNext = () => goToTurn(currentTurn + 1);

  const handlePlay = () => {
    if (currentTurn >= totalTurns - 1) {
      setCurrentTurn(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);
  const handleReset = () => goToTurn(0);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTurn(prev => {
        if (prev >= totalTurns - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, totalTurns, speed]);

  if (!turnData) {
    return (
      <div className="p-4 border border-red-500 rounded-lg bg-red-500/10">
        <p className="text-red-400">Error: Invalid turn data</p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'battle-simulator rounded-lg overflow-hidden my-6',
        className
      )}
      style={{
        background: 'linear-gradient(180deg, #171314 0%, #0a0503 100%)',
        border: '2px solid #5c4033',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(147, 51, 234, 0.2) 0%, transparent 100%)',
          borderBottom: '1px solid #3d2b25'
        }}
      >
        <h3
          className="text-xl font-bold text-[#e8e0d5] mb-1"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {scenario.title}
        </h3>
        <p className="text-sm text-[#a89f94]">{scenario.description}</p>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-[#3d2b25] bg-[#1a1311]">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          {/* Playback buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentTurn === 0}
              className="px-3 py-2 rounded font-medium text-sm transition-all disabled:opacity-40"
              style={{
                background: '#261f1c',
                color: '#e8e0d5',
                border: '1px solid #5c4033'
              }}
            >
              ⏮️ Prev
            </button>

            {isPlaying ? (
              <button
                onClick={handlePause}
                className="px-4 py-2 rounded font-medium text-sm"
                style={{
                  background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                  color: '#1a1311'
                }}
              >
                ⏸️ Pause
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="px-4 py-2 rounded font-medium text-sm"
                style={{
                  background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                  color: '#1a1311'
                }}
              >
                ▶️ {currentTurn >= totalTurns - 1 ? 'Replay' : 'Play'}
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={currentTurn >= totalTurns - 1}
              className="px-3 py-2 rounded font-medium text-sm transition-all disabled:opacity-40"
              style={{
                background: '#261f1c',
                color: '#e8e0d5',
                border: '1px solid #5c4033'
              }}
            >
              Next ⏭️
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-2 rounded font-medium text-sm"
              style={{
                background: '#3d2b25',
                color: '#a89f94',
                border: '1px solid #5c4033'
              }}
            >
              🔄
            </button>
          </div>

          {/* Turn counter */}
          <div className="text-sm text-[#a89f94]">
            <span className="font-semibold text-[#e8e0d5]">Turn {turnData.number}</span>
            <span className="mx-2">•</span>
            <span>Step {currentTurn + 1}/{totalTurns}</span>
          </div>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-3 mt-3">
          <label className="text-xs font-semibold text-[#a89f94]">Speed:</label>
          <input
            type="range"
            min="500"
            max="5000"
            step="500"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-32 accent-[#d4af37]"
          />
          <span className="text-xs text-[#6b5b4f]">{speed}ms</span>
        </div>
      </div>

      {/* Current turn info */}
      <div className="p-4 border-b border-[#3d2b25]">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#a89f94] uppercase">
                {turnData.player}'s Turn
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'rgba(147, 51, 234, 0.3)',
                  color: '#c084fc'
                }}
              >
                {turnData.action}
              </span>
            </div>
            <p className="text-sm text-[#e8e0d5]">{turnData.description}</p>
          </div>

          {/* Phase indicator */}
          <div
            className="px-3 py-1 rounded text-xs font-semibold"
            style={{
              background: `${phaseColors[turnData.phase]}20`,
              color: phaseColors[turnData.phase],
              border: `1px solid ${phaseColors[turnData.phase]}40`
            }}
          >
            {phaseLabels[turnData.phase]}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#261f1c] rounded-full h-2 overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((currentTurn + 1) / totalTurns) * 100}%`,
              background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)'
            }}
          />
        </div>
      </div>

      {/* Battle field */}
      <div className="p-4 bg-[#0f0c0a]">
        <div className="grid md:grid-cols-2 gap-4">
          <PlayerField
            state={turnData.player1State}
            isActive={turnData.player === turnData.player1State.playerName}
            highlightZone={
              turnData.player === turnData.player1State.playerName
                ? turnData.highlightZone
                : undefined
            }
            highlightCard={turnData.highlightCard}
          />
          <PlayerField
            state={turnData.player2State}
            isActive={turnData.player === turnData.player2State.playerName}
            highlightZone={
              turnData.player === turnData.player2State.playerName
                ? turnData.highlightZone
                : undefined
            }
            highlightCard={turnData.highlightCard}
          />
        </div>
      </div>

      {/* Turn history */}
      <details className="group border-t border-[#3d2b25]">
        <summary className="p-4 cursor-pointer text-sm font-semibold text-[#a89f94] hover:text-[#d4af37] transition-colors">
          Turn History ({totalTurns} steps)
        </summary>
        <div className="p-4 pt-0 space-y-2 max-h-64 overflow-y-auto">
          {scenario.turns.map((turn, idx) => (
            <button
              key={idx}
              onClick={() => goToTurn(idx)}
              className={clsx(
                'w-full text-left p-2 rounded text-xs transition-all border',
                idx === currentTurn
                  ? 'bg-[#3d2b25] border-[#9333ea]'
                  : 'bg-[#1a1311] border-[#261f1c] hover:border-[#5c4033]'
              )}
            >
              <span className="font-semibold text-[#a89f94]">Turn {turn.number}:</span>{' '}
              <span className="text-[#e8e0d5]">{turn.action}</span>
              <span className="text-[#6b5b4f]"> - {turn.description}</span>
            </button>
          ))}
        </div>
      </details>

      {/* Completion message */}
      {currentTurn >= totalTurns - 1 && !isPlaying && (
        <div
          className="p-4 text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.2) 0%, transparent 100%)',
            borderTop: '2px solid #22c55e'
          }}
        >
          <p className="text-[#22c55e] font-semibold">
            ✨ Scenario Complete! Click "Replay" to watch again.
          </p>
        </div>
      )}
    </div>
  );
}

interface PlayerFieldProps {
  state: PlayerFieldState;
  isActive: boolean;
  highlightZone?: 'hand' | 'field' | 'graveyard';
  highlightCard?: string;
}

function PlayerField({ state, isActive, highlightZone, highlightCard }: PlayerFieldProps) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: isActive
          ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.1) 0%, rgba(0,0,0,0.3) 100%)'
          : 'rgba(0,0,0,0.3)',
        border: isActive ? '1px solid #d4af37' : '1px solid #3d2b25'
      }}
    >
      {/* Player header */}
      <div className="flex items-center justify-between mb-3">
        <h4
          className="font-semibold"
          style={{
            color: isActive ? '#d4af37' : '#e8e0d5',
            fontFamily: 'Cinzel, serif'
          }}
        >
          {state.playerName}
        </h4>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#ff6b35]">❤️ {state.lifePoints}</span>
          <span className="text-[#06b6d4]">💧 {state.mana}/{state.maxMana}</span>
          <span className="text-[#a89f94]">📚 {state.deckCount}</span>
        </div>
      </div>

      {/* Zones */}
      <div className="space-y-2">
        {/* Hand */}
        <Zone
          label="Hand"
          cards={state.hand}
          isHighlighted={highlightZone === 'hand'}
          highlightCard={highlightCard}
        />

        {/* Field */}
        <Zone
          label="Field"
          cards={state.field}
          isHighlighted={highlightZone === 'field'}
          highlightCard={highlightCard}
          showStats
        />

        {/* Graveyard */}
        <Zone
          label="Graveyard"
          cards={state.graveyard}
          isHighlighted={highlightZone === 'graveyard'}
          highlightCard={highlightCard}
          compact
        />
      </div>
    </div>
  );
}

interface ZoneProps {
  label: string;
  cards: CardInZone[];
  isHighlighted?: boolean;
  highlightCard?: string;
  showStats?: boolean;
  compact?: boolean;
}

function Zone({ label, cards, isHighlighted, highlightCard, showStats, compact }: ZoneProps) {
  return (
    <div
      className={clsx(
        'rounded p-2 transition-all',
        isHighlighted && 'ring-2 ring-[#d4af37]'
      )}
      style={{ background: 'rgba(0,0,0,0.3)' }}
    >
      <div className="text-xs font-semibold text-[#6b5b4f] mb-1 uppercase tracking-wider">
        {label} ({cards.length})
      </div>
      <div className={clsx('flex flex-wrap gap-1', compact && 'gap-0.5')}>
        {cards.length === 0 ? (
          <span className="text-xs text-[#3d2b25] italic">Empty</span>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className={clsx(
                'rounded px-2 py-1 text-xs transition-all',
                card.tapped && 'opacity-60',
                highlightCard === card.id && 'ring-2 ring-[#22c55e]'
              )}
              style={{
                background: '#261f1c',
                border: '1px solid #3d2b25',
                fontSize: compact ? '10px' : '12px'
              }}
            >
              <span className="text-[#e8e0d5]">{card.name}</span>
              {showStats && card.attack !== undefined && card.health !== undefined && (
                <span className="ml-1 text-[#a89f94]">
                  ({card.attack}/{card.health})
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default BattleSimulator;
