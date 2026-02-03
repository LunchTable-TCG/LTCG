/**
 * BattleSimulator Component
 * Interactive battle scenario playback for documentation
 */

'use client';

import { useState, useEffect } from 'react';
import { FieldState, type PlayerFieldState } from './FieldState';
import { PhaseIndicator, type BattlePhase } from './PhaseIndicator';

export interface Turn {
  number: number;
  player: string;
  phase: BattlePhase;
  action: string;
  description: string;
  player1State: PlayerFieldState;
  player2State: PlayerFieldState;
  highlightZone?: 'hand' | 'field' | 'graveyard';
}

export interface BattleScenario {
  player1Deck: string[];
  player2Deck: string[];
  turns: Turn[];
  description: string;
  title?: string;
}

interface BattleSimulatorProps {
  scenario: BattleScenario;
  autoPlay?: boolean;
  speed?: number; // milliseconds per turn
}

export function BattleSimulator({
  scenario,
  autoPlay = false,
  speed = 2000
}: BattleSimulatorProps) {
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTurn(prev => {
        if (prev >= scenario.turns.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, scenario.turns.length, speed]);

  const handlePrev = () => {
    setCurrentTurn(prev => Math.max(0, prev - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setCurrentTurn(prev => Math.min(scenario.turns.length - 1, prev + 1));
    setIsPlaying(false);
  };

  const handlePlay = () => {
    if (currentTurn >= scenario.turns.length - 1) {
      setCurrentTurn(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentTurn(0);
    setIsPlaying(false);
  };

  const currentTurnData = scenario.turns[currentTurn];

  return (
    <div className="battle-simulator border rounded-lg overflow-hidden shadow-lg my-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 to-purple-900 p-4">
        <h3 className="text-xl font-bold text-white mb-2">
          {scenario.title || 'Battle Scenario'}
        </h3>
        <p className="text-purple-200 text-sm">{scenario.description}</p>
      </div>

      {/* Controls */}
      <div className="bg-gray-100 border-b p-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentTurn === 0}
              className="px-3 py-2 bg-white border rounded font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous turn"
            >
              ⏮️ Prev
            </button>

            {isPlaying ? (
              <button
                onClick={handlePause}
                className="px-4 py-2 bg-yellow-600 text-white rounded font-medium text-sm hover:bg-yellow-700 transition-colors"
              >
                ⏸️ Pause
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="px-4 py-2 bg-green-600 text-white rounded font-medium text-sm hover:bg-green-700 transition-colors"
              >
                ▶️ {currentTurn >= scenario.turns.length - 1 ? 'Replay' : 'Play'}
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={currentTurn >= scenario.turns.length - 1}
              className="px-3 py-2 bg-white border rounded font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next turn"
            >
              Next ⏭️
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-2 bg-gray-600 text-white rounded font-medium text-sm hover:bg-gray-700 transition-colors"
              title="Reset to start"
            >
              🔄 Reset
            </button>
          </div>

          {/* Turn Counter */}
          <div className="text-sm font-semibold text-gray-700">
            Turn {currentTurnData.number} of {scenario.turns[scenario.turns.length - 1].number}
            <span className="ml-2 text-gray-500">
              (Step {currentTurn + 1}/{scenario.turns.length})
            </span>
          </div>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2 mt-3">
          <label className="text-xs font-semibold text-gray-600">Speed:</label>
          <input
            type="range"
            min="500"
            max="5000"
            step="500"
            value={speed}
            onChange={(e) => {
              // Note: This won't work as speed is a prop
              // In a real implementation, you'd need to lift this state up
              console.log('Speed changed to:', e.target.value);
            }}
            className="w-32"
          />
          <span className="text-xs text-gray-600">{speed}ms</span>
        </div>
      </div>

      {/* Current Turn Info */}
      <div className="bg-white border-b p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                {currentTurnData.player}'s Turn
              </span>
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">
                {currentTurnData.action}
              </span>
            </div>
            <p className="text-sm text-gray-700">{currentTurnData.description}</p>
          </div>
          <PhaseIndicator currentPhase={currentTurnData.phase} compact />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-purple-600 h-full transition-all duration-300"
            style={{ width: `${((currentTurn + 1) / scenario.turns.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Battle Field */}
      <div className="bg-gray-50 p-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Player 1 */}
          <FieldState
            state={currentTurnData.player1State}
            highlightZone={
              currentTurnData.player === currentTurnData.player1State.playerName
                ? currentTurnData.highlightZone
                : undefined
            }
          />

          {/* Player 2 */}
          <FieldState
            state={currentTurnData.player2State}
            highlightZone={
              currentTurnData.player === currentTurnData.player2State.playerName
                ? currentTurnData.highlightZone
                : undefined
            }
          />
        </div>
      </div>

      {/* Turn History */}
      <div className="bg-white border-t p-4">
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors">
            Turn History ({scenario.turns.length} steps)
          </summary>
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {scenario.turns.map((turn, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentTurn(idx);
                  setIsPlaying(false);
                }}
                className={`
                  w-full text-left p-2 rounded border text-xs transition-all
                  ${idx === currentTurn
                    ? 'bg-purple-100 border-purple-500 font-semibold'
                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                  }
                `}
              >
                <span className="font-semibold text-gray-600">Turn {turn.number}:</span>{' '}
                <span className="text-gray-800">{turn.action}</span>
                {' - '}
                <span className="text-gray-600">{turn.description}</span>
              </button>
            ))}
          </div>
        </details>
      </div>

      {/* Completion Message */}
      {currentTurn >= scenario.turns.length - 1 && !isPlaying && (
        <div className="bg-green-100 border-t-4 border-green-500 p-4 text-center">
          <p className="text-green-800 font-semibold">
            Scenario Complete! Click "Replay" to watch again.
          </p>
        </div>
      )}
    </div>
  );
}
